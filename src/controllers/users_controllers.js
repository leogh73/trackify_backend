import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import google from './google_drive_controllers.js';
import emailCheck from 'node-email-check';
// import notifyAdmin from '../modules/nodemailer.js';

const initialize = async (req, res) => {
	if (req.body.token === 'BLACKLISTED') return;

	try {
		const newUser = await new db.User({
			lastActivity: new Date(Date.now()),
			tokenFB: req.body.token,
			trackings: [],
		}).save();
		res.status(200).json({ userId: newUser.id });
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'Initialize user',
			{ lastActivity: newUser.lastActivity, tokenFB: newUser.tokenFB },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const trackingAction = async (req, res) => {
	const { userId, action } = req.params;

	try {
		let user = await db.User.findById(userId);
		if (!user) res.status(400).json({ error: 'Not authorized' });
		let response;
		if (action == 'add') {
			const { title, service, code } = req.body;
			response = await tracking.add(user, title, service, code, false);
		} else {
			const { trackingIds } = req.body;
			await tracking.remove(userId, JSON.parse(trackingIds));
			response = { trackingIds };
		}
		let statusCode = response.error ? 500 : 200;
		res.status(statusCode).json(response);
	} catch (error) {
		let message = luxon.errorMessage(error);
		if (req.body.service !== 'Correo Argentino')
			await db.saveLog(
				'Tracking action',
				{ userId, action, body: req.body },
				error,
				message.date,
				message.time,
			);
		res.status(500).json(message);
	}
};

const syncronize = async (req, res) => {
	const { userId, token, lastEvents, currentDate, driveLoggedIn, version } = req.body;

	try {
		let dbQueries = await Promise.all([db.User.findById(userId), db.StatusMessage.find()]);
		let user = dbQueries[0];
		if (!user) {
			await remove(token);
			let errorMessage = 'User not found';
			return res.status(200).json({ syncError: errorMessage });
		}
		let eventsList = JSON.parse(lastEvents);
		let response = {};
		await update(user, token);
		response.data = await tracking.syncronize(user, eventsList);
		response.driveStatus =
			driveLoggedIn == 'true'
				? await google.syncronizeDrive(user.id, currentDate)
				: 'Not logged in';
		response.statusMessage = dbQueries[1][0].message;
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'syncronize',
			{ userId, token, lastEvents, currentDate, driveLoggedIn, version },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const check = async (req, res) => {
	const { userId, trackingData } = req.body;

	try {
		let response = await tracking.check(userId, JSON.parse(trackingData));
		let statusCode = response.result.error ? 500 : 200;
		res.status(statusCode).json(response);
	} catch (error) {
		console.log(error);
		let message = luxon.errorMessage(error);
		await db.saveLog('Check', { userId, trackingData }, error, message.date, message.time);
		res.status(500).json(message);
	}
};

const contactForm = async (req, res) => {
	const { userId, message, email } = req.body;
	try {
		if (message.includes('text ') || email.includes('text ')) return;
		let emailIsValid = await emailCheck.isValid(email);
		if (!emailIsValid) return res.status(400).json({ error: 'email not valid' });
		const { id } = await new db.Contact({ userId, message, email }).save();
		// await notifyAdmin([{ userId, email, message }], true);
		res.status(200).json({ requestId: id });
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'Service request',
			{ userId, service, code, email },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const remove = async (token) => {
	let removeTasks = [];
	let user = await db.User.findOne({ tokenFB: token });
	if (user) {
		removeTasks.push(db.User.findOneAndDelete({ tokenFB: token }));
		if (user.trackings.length) removeTasks.push(db.Tracking.deleteMany({ token: token }));
	}
	await Promise.all(removeTasks);
};

const update = async (user, token) => {
	user.lastActivity = new Date(Date.now());
	if (token !== user.tokenFB) {
		await db.Tracking.updateMany({ token: user.tokenFB }, { $set: { token: token } });
		user.tokenFB = token;
	}
	await user.save();
};

export default {
	initialize,
	trackingAction,
	syncronize,
	check,
	contactForm,
	remove,
};
