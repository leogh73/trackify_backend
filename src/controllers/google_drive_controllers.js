import { google } from 'googleapis';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import vars from '../modules/crypto-js.js';
import trackings from './trackings_controllers.js';

const oauth2Client = new google.auth.OAuth2(
	vars.GOOGLE_CLIENT_ID,
	vars.GOOGLE_CLIENT_SECRET,
	vars.GOOGLE_REDIRECT_URI,
);

const initialize = async (req, res) => {
	const { userId, authCode, email } = req.body;

	try {
		let tokens = (await oauth2Client.getToken(authCode)).tokens;
		let user = await db.User.findById(userId);
		let existingAuth = await db.GoogleDrive.findOne({ email: email });
		if (existingAuth) {
			user.googleDrive.auth = existingAuth.id;
			if (tokens.refresh_token) {
				await db.GoogleDrive.findOneAndUpdate(
					{ _id: existingAuth._id },
					{ $set: { auth: tokens } },
				);
			}
		} else {
			const { id } = await new db.GoogleDrive({
				auth: tokens,
				email,
			}).save();
			user.googleDrive.auth = id;
		}
		await user.save();
		res.status(200).json(tokens);
	} catch (error) {
		await db.saveLog('Google initialize', { userId, authCode, email }, error);
		res.status(500).json(message);
	}
};
//
const consult = async (req, res) => {
	const { userId } = req.body;

	try {
		const { user, driveAuth, drive } = await userDriveInstance(userId);
		let backupFiles = await findBackups(user, driveAuth, drive);
		if (backupFiles.length && !backupFiles[0].currentDevice)
			backupFiles.unshift({ date: null, currentDevice: true });
		res.status(200).json({ backups: backupFiles, email: driveAuth.email });
	} catch (error) {
		await db.saveLog('Google consult', { userId }, error);
		res.status(500).json(message);
	}
};

const createUpdate = async (req, res) => {
	const { userId, userData } = req.body;

	try {
		const { user, driveAuth, drive } = await userDriveInstance(userId);
		let backupFiles = await findBackups(user, driveAuth, drive);
		let result = await createUpdateBackup(user, driveAuth, drive, backupFiles, userData);
		let response;
		if (result.data.id) {
			const { date, time, activeTrackings, archivedTrackings, deviceModel } = JSON.parse(userData);
			response = {
				id: result.data.id,
				date: `${date} - ${time}`,
				activeTrackings: activeTrackings.length,
				archivedTrackings: archivedTrackings.length,
				deviceModel,
				currentDevice: true,
				selected: false,
			};
		}
		res.status(200).json(response);
	} catch (error) {
		await db.saveLog('Google create/update', { userId, userData }, error);
		res.status(500).json(message);
	}
};

const restore = async (req, res) => {
	const { userId, backupId } = req.body;
	try {
		const { user, drive } = await userDriveInstance(userId);
		let userData = (
			await drive.files.get({
				fileId: backupId,
				alt: 'media',
			})
		).data;
		if (user.trackings.length) await trackings.remove(userId, user.trackings);
		userData.activeTrackings = (
			await Promise.allSettled(userData.activeTrackings.map((t) => addTracking(t, userId)))
		)
			.filter((result) => result.status == 'fulfilled')
			.map((result) => result.value);
		if (userData.mercadoLibre) {
			user.mercadoLibre = userData.mercadoLibre;
			await user.save();
		}
		res.status(200).json(userData);
	} catch (error) {
		await db.saveLog('Google restore', { userId, backupId }, error);
		res.status(500).json(message);
	}
};

const remove = async (req, res) => {
	const { userId, backupId } = req.body;
	try {
		const { driveAuth, drive } = await userDriveInstance(userId);
		let userDB = await db.User.findOne({ 'googleDrive.backupId': backupId });
		let userAuth = userDB.googleDrive.auth;
		userDB.googleDrive = { auth: userAuth };
		driveAuth.backupIds.splice(driveAuth.backupIds.indexOf(backupId), 1);
		await userDB.save();
		await driveAuth.save();
		await drive.files.delete({ fileId: backupId });
		res.status(200).json({ message: 'OK' });
	} catch (error) {
		await db.saveLog('Google remove', { userId, backupId }, error);
		res.status(500).json(message);
	}
};

const addTracking = async (tracking, userId) => {
	const { title, service, code, lastCheck, events, moreData } = tracking;
	const { trackingId } = await trackings.add(userId, title, service, code, { events, moreData });
	tracking.idMDB = trackingId;
	return tracking;
};

const userDriveInstance = async (userId) => {
	let user = await db.User.findById(userId);
	let googleDrive = await db.GoogleDrive.findById(user.googleDrive.auth);
	oauth2Client.setCredentials(googleDrive.auth);
	return {
		user,
		driveAuth: googleDrive,
		drive: google.drive({
			version: 'v3',
			auth: oauth2Client,
		}),
	};
};

const findBackups = async (user, driveAuth, drive) => {
	let backupFiles = [];
	if (!driveAuth.backupIds.length) return backupFiles;
	backupFiles = await Promise.all(driveAuth.backupIds.map((id) => readBackup(drive, id)));
	if (user.googleDrive.backupId) {
		let deviceBackup = backupFiles.filter((b) => b.id == user.googleDrive.backupId);
		let dBackupIndex = backupFiles.indexOf(deviceBackup[0]);
		backupFiles.splice(dBackupIndex, 1);
		deviceBackup[0].currentDevice = true;
		backupFiles.unshift(deviceBackup[0]);
	}
	return backupFiles;
};

const readBackup = async (drive, backupId) => {
	const { date, time, activeTrackings, archivedTrackings, deviceModel } = (
		await drive.files.get({
			fileId: backupId,
			alt: 'media',
		})
	).data;

	return {
		id: backupId,
		date: `${date} - ${time}`,
		activeTrackings: activeTrackings.length,
		archivedTrackings: archivedTrackings.length,
		deviceModel,
		currentDevice: false,
		selected: false,
	};
};

const createUpdateBackup = async (user, driveAuth, drive, backupFiles, userData) => {
	if (user.mercadoLibre) {
		let data = JSON.parse(userData);
		data.mercadoLibre = user.mercadoLibre;
		userData = data;
	}

	let result;
	if (backupFiles.length && backupFiles[0]?.currentDevice) {
		result = await drive.files.update({
			fileId: backupFiles[0].id,
			media: {
				mimeType: 'application/json',
				body: JSON.stringify(userData),
			},
		});
	} else {
		result = await drive.files.create({
			requestBody: {
				name: 'TrackeAR',
			},
			media: {
				mimeType: 'application/json',
				body: JSON.stringify(userData),
			},
			uploadType: 'media',
		});
		user.googleDrive.backupId = result.data.id;
		driveAuth.backupIds.push(result.data.id);
		await user.save();
		await driveAuth.save();
	}
	return result;
};

const syncronizeDrive = async (userId, currentDate) => {
	const { user, driveAuth, drive } = await userDriveInstance(userId);
	let driveStatus = 'Backup not found';
	if (user.googleDrive.backupId)
		driveStatus = await backupDriveStatus(user, driveAuth, drive, currentDate);
	return driveStatus;
};

const backupDriveStatus = async (user, driveAuth, drive, currentDate) => {
	let response = 'Not present';
	let backupFile = await findBackups(user, driveAuth, drive);
	if (backupFile.length) {
		const { date } = await readBackup(drive, backupFile[0].id);
		response = backupDateCheck(date.split(' - ')[0], currentDate);
	}
	return response;
};

const backupDateCheck = (date, currentDate) => {
	let backupDateDivided = date.split('/');
	let currentDateDivided = currentDate.split('/');
	let dateToday = new Date(currentDateDivided[2], currentDateDivided[1], currentDateDivided[0]);
	let dateDrive = new Date(backupDateDivided[2], backupDateDivided[1], backupDateDivided[0]);
	let difference = dateToday.getTime() - dateDrive.getTime();
	let totalDays = Math.floor(difference / (1000 * 3600 * 24));
	let driveStatus;
	if (!totalDays) driveStatus = 'Up to date';
	if (totalDays) driveStatus = 'Update required';
	return driveStatus;
};

export default {
	initialize,
	consult,
	createUpdate,
	restore,
	remove,
	syncronizeDrive,
	userDriveInstance,
	backupDriveStatus,
};
