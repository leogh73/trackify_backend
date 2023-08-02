import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import google from './google_controllers.js';
import emailCheck from 'node-email-check';

const initialize = async (req, res) => {
	if (req.body.token === 'BLACKLISTED') return;
	const newUser = new db.User({
		lastActivity: new Date(Date.now()),
		tokenFB: req.body.token,
		trackings: [],
	});

	try {
		const result = await newUser.save();
		res.status(200).json({ userId: result['id'] });
	} catch (error) {
		let message = luxon.errorMessage();
		await db.storeLog(
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
		let response;
		if (action == 'add') {
			const { title, service, code } = req.body;
			response = await tracking.add(userId, title, service, code, false, null);
		} else {
			const { trackingIds } = req.body;
			await tracking.remove(userId, JSON.parse(trackingIds));
			response = { 'Eliminación completada': trackingIds };
		}
		let statusCode = response.lastEvent == 'No hay datos' ? 404 : 200;
		res.status(statusCode).json(response);
	} catch (error) {
		let message = luxon.errorMessage();
		if (req.body.service !== 'Correo Argentino')
			await db.storeLog(
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
		let user = await db.User.findById(userId);
		// if (!user || !version) {
		// 	await remove(token);
		// 	return res
		// 		.status(200)
		// 		.json({ error: !user ? 'User not found' : 'Lastest version not found' });
		// }
		let eventsList = JSON.parse(lastEvents);
		let response = {};
		await update(user, token);
		response.data = await tracking.syncronize(user, eventsList);
		response.driveStatus =
			driveLoggedIn == 'true'
				? await google.syncronizeDrive(user.id, currentDate)
				: 'Not logged in';
		console.log(response);
		res.status(200).json(response);
	} catch (error) {
		console.log(error);
		let message = luxon.errorMessage();
		await db.storeLog(
			'syncronize',
			{ userId, token, lastEvents, currentDate, driveLoggedIn },
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
		let response = await tracking.check(req.body.trackingId ?? JSON.parse(trackingData).idMDB);
		console.log(response);
		res.status(200).json(response);
	} catch (error) {
		console.log(error);
		let message = luxon.errorMessage();
		await db.storeLog('Check', { userId, trackingData }, error, message.date, message.time);
		res.status(500).json(message);
	}
};

const contactForm = async (req, res) => {
	const { userId, message, email } = req.body;
	try {
		if (message.includes('text ') || email.includes('text '))
			return res.status(404).json({ error: 'content not valid' });
		let emailIsValid = await emailCheck.isValid(email);
		if (!emailIsValid) return res.status(400).json({ error: 'email not valid' });
		const { id } = await new db.Contact({ userId, message, email }).save();
		res.status(200).json({ requestId: id });
	} catch (error) {
		let message = luxon.errorMessage();
		await db.storeLog(
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
	removeTasks.push(db.User.findOneAndDelete({ tokenFB: token }));
	if ((await db.User.findOne({ tokenFB: token })).trackings.length)
		removeTasks.push(db.Tracking.deleteMany({ token: token }));
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
