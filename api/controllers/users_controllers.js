import Models from '../modules/mongodb.js';
import sendNotification from '../modules/firebase_notification.js';
import luxon from '../modules/luxon.js';

import tracking from './trackings_controllers.js';
import google from './google_controllers.js';

const initialize = async (req, res) => {
	const newUser = new Models.User({
		lastActivity: new Date(Date.now()),
		tokenFB: req.body.token,
		trackings: [],
	});

	try {
		const result = await newUser.save();
		res.status(200).json({ userId: result['id'] });
	} catch (error) {
		res.status(404).json(errorMessage());
	}
};

const trackingAction = async (req, res) => {
	const { userId, action } = req.params;
	try {
		let response;
		if (action == 'add') {
			const { title, service, code } = req.body;
			let checkDate = luxon.getDate();
			let checkTime = luxon.getTime();
			response = await tracking.add(
				userId,
				title,
				service,
				code,
				checkDate,
				checkTime,
				false,
				null,
			);
		} else {
			const { trackingIds } = req.body;
			await tracking.remove(userId, JSON.parse(trackingIds));
			response = { 'Eliminación completada': trackingIds };
		}
		let statusCode = response.lastEvent == 'No hay datos' ? 204 : 200;
		res.status(statusCode).json(response);
	} catch (error) {
		res.status(404).json(errorMessage());
	}
};

const sincronize = async (req, res) => {
	const { userId, token, lastEvents, currentDate, driveLoggedIn } = req.body;
	try {
		let response = {};
		// let response = {};
		let user = await update(userId, token);
		if (user.error) {
			response.error = user.error;
		} else {
			let dataStatus = [];
			if (lastEvents != '[]') dataStatus = await tracking.sincronize(user, JSON.parse(lastEvents));
			let driveStatus = 'Not logged in';
			if (driveLoggedIn == 'true') {
				const { user, driveAuth, drive } = await google.userDriveInstance(userId);
				driveStatus = 'Backup not found';
				if (user.googleDrive.backupId) {
					driveStatus = await google.backupDriveStatus(user, driveAuth, drive, currentDate);
				}
			}
			response.data = dataStatus;
			response.driveStatus = driveStatus;
		}
		res.status(200).json(response);
	} catch (error) {
		console.log(error);
		res.status(404).json(errorMessage());
	}
};

const check = async (req, res) => {
	const { trackingId } = req.body;
	try {
		let response = await tracking.check(trackingId);
		res.status(200).json(response);
	} catch (error) {
		res.status(404).json(errorMessage());
	}
};

const remove = async (token) => {
	await Models.Tracking.deleteMany({ token: token });
	return await Models.User.findOneAndDelete({ tokenFB: token });
};

const update = async (userId, token) => {
	let user = await Models.User.findById(userId);
	if (!user) return { error: 'User not found' };
	user.lastActivity = new Date(Date.now());
	if (token !== user.tokenFB) {
		await Models.Tracking.updateMany({ token: user.tokenFB }, { $set: { token: token } });
		user.tokenFB = token;
	}
	await user.save();
	return user;
};

const checkCycle = async () => {
	let usersCollection = (await Models.User.find({})).map((user) => {
		return { token: user.tokenFB, lastActivity: user.lastActivity };
	});
	for (let userData of usersCollection) {
		let dateToday = new Date(Date.now());
		let difference = dateToday.getTime() - userData.lastActivity.getTime();
		let totalDays = Math.floor(difference / (1000 * 3600 * 24));
		if (totalDays > 31) await remove(userData.token);
	}
	let activeTokens = (await Models.User.find({}))
		.filter((user) => user.trackings.length)
		?.map((user) => user.tokenFB);
	return activeTokens;
};

const serviceRequest = async (req, res) => {
	const { userId, service, code, email } = req.body;
	try {
		const { id } = await new Models.ServiceRequest({ userId, service, code, email }).save();
		res.status(200).json({ requestId: id });
	} catch (error) {
		res.status(404).json({
			error: 'Ha ocurrido un error. Reintente más tarde',
		});
		console.log(error);
	}
};

const errorMessage = () => {
	return {
		error: 'Ha ocurrido un error. Reintente más tarde',
		checkDate: luxon.getDate(),
		checkTime: luxon.getTime(),
	};
};

export default {
	initialize,
	trackingAction,
	sincronize,
	check,
	remove,
	checkCycle,
	serviceRequest,
};
