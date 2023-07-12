import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import google from './google_controllers.js';
import emailCheck from 'node-email-check';
import trackings_controllers from './trackings_controllers.js';

const initialize = async (req, res) => {
	if (req.body.token === 'BLACKLISTED') return;
	const newUser = new Models.User({
		lastActivity: new Date(Date.now()),
		tokenFB: req.body.token,
		trackings: [],
	});

	try {
		const result = await newUser.save();
		res.status(200).json({ userId: result['id'] });
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog(
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
		let statusCode = response.lastEvent == 'No hay datos' ? 404 : 200;
		res.status(statusCode).json(response);
	} catch (error) {
		console.log(error);
		let message = luxon.errorMessage();
		if (req.body.service !== 'Correo Argentino')
			await Models.storeLog(
				'Tracking action',
				{ userId, action, body: req.body },
				error,
				message.date,
				message.time,
			);
		res.status(500).json(message);
	}
};

const sincronize = async (req, res) => {
	const { userId, token, lastEvents, currentDate, driveLoggedIn, version } = req.body;

	try {
		let user = await Models.User.findById(userId);
		// if (!user || !version) {
		// 	await remove(token);
		// 	return res
		// 		.status(200)
		// 		.json({ error: !user ? 'User not found' : 'Lastest version not found' });
		// }
		let eventsList = JSON.parse(lastEvents);
		let response = {};
		await update(user, token);
		response.data = await tracking.sincronize(user, eventsList);
		response.driveStatus =
			driveLoggedIn == 'true'
				? await google.sincronizeDrive(user.id, currentDate)
				: 'Not logged in';
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog(
			'Sincronize',
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
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog('Check', { userId, trackingData }, error, message.date, message.time);
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
		const { id } = await new Models.Contact({ userId, message, email }).save();
		res.status(200).json({ requestId: id });
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog(
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
	removeTasks.push(Models.User.findOneAndDelete({ tokenFB: token }));
	if ((await Models.User.findOne({ tokenFB: token })).trackings.length)
		removeTasks.push(Models.Tracking.deleteMany({ token: token }));
	await Promise.all(removeTasks);
};

const update = async (user, token) => {
	user.lastActivity = new Date(Date.now());
	if (token !== user.tokenFB) {
		await Models.Tracking.updateMany({ token: user.tokenFB }, { $set: { token: token } });
		user.tokenFB = token;
	}
	await user.save();
};

const trackingsCycle = async (req, res) => {
	try {
		await tracking.checkCycle();
		res.status(200).json({ message: 'TRACKINGS CHECK CYCLE COMPLETED' });
	} catch (error) {
		res.status(500).json({ error: 'TRACKINGS CHECK CYCLE FAILED', message: error.toString() });
	}
};

const cleanUpCycle = async (req, res) => {
	let dateToday = new Date(Date.now());
	const calculateDays = (timeStamp) => {
		let difference = dateToday.getTime() - timeStamp.getTime();
		return Math.floor(difference / (1000 * 3600 * 24));
	};

	try {
		let dbQueries = await Promise.all([
			Models.User.find({}),
			Models.Tracking.find({ completed: true }),
		]);
		let removeOperations = [];
		for (let user of dbQueries[0]) {
			let daysElapsed = calculateDays(user.lastActivity);
			if (daysElapsed > 31) removeOperations.push(remove(user.tokenFB));
		}
		let userTrackingResults = dbQueries[0].map((user) => {
			return { userId: user._id, ids: [], token: user.tokenFB };
		});
		for (let tracking of dbQueries[1]) {
			let daysElapsed = calculateDays(tracking.lastCheck);
			if (daysElapsed > 14)
				userTrackingResults[
					userTrackingResults.findIndex((t) => t.token === tracking.token)
				].ids.push(tracking._id);
		}
		let filteredResults = userTrackingResults.filter((r) => r.ids.length);
		if (filteredResults.length) {
			for (let userResult of filteredResults) {
				removeOperations.push(trackings_controllers.remove(userResult.userId, userResult.ids));
			}
		}
		if (removeOperations.length) await Promise.all(removeOperations);
		res.status(200).json({ message: 'CLEAN UP CYCLE COMPLETED' });
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog(
			'Clean up operation',
			error.toString(),
			error,
			message.date,
			message.time,
		);
		res.status(500).json({ error: 'CLEAN UP CYCLE FAILED', message: error.toString() });
	}
};

export default {
	initialize,
	trackingAction,
	sincronize,
	check,
	contactForm,
	remove,
	trackingsCycle,
	cleanUpCycle,
};
