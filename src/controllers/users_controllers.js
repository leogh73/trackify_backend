import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import google from './google_controllers.js';

const initialize = async (req, res) => {
	if (req.body.token === 'BLACKLISTED') return res.status(400).json({ error: 'token not valid' });
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
		// let lastestVersion = (await Models.Version.find({}))[0].version;
		// if (!version || version !== lastestVersion)
		// 	return res.status(200).json({ error: 'User not found' });
		let response = {};
		let user = await update(userId, token);
		if (user.error) {
			response.error = user.error;
		} else {
			response.data =
				lastEvents !== '[]' ? await tracking.sincronize(user, JSON.parse(lastEvents)) : [];
			response.driveStatus =
				driveLoggedIn == 'true'
					? await google.sincronizeDrive(userId, currentDate)
					: 'Not logged in';
		}
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
		let response = await tracking.check(JSON.parse(trackingData).idMDB);
		res.status(200).json(response);
	} catch (error) {
		console.log(error);
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

const trackingsCycle = async (req, res) => {
	try {
		await tracking.checkCycle();
		res.status(200).json({ message: 'TRACKINGS CHECK CYCLE COMPLETED' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'TRACKINGS CHECK CYCLE FAILED', message: error.toString() });
	}
};

const usersCycle = async (req, res) => {
	try {
		let usersCollection = await Models.User.find({});
		let removeUsers = [];
		for (let userData of usersCollection) {
			let dateToday = new Date(Date.now());
			let difference = dateToday.getTime() - userData.lastActivity.getTime();
			let totalDays = Math.floor(difference / (1000 * 3600 * 24));
			if (totalDays > 31) removeUsers.push(remove(userData.tokenFB));
		}
		await Promise.all(removeUsers);
		res.status(200).json({ message: 'USERS CHECK CYCLE COMPLETED' });
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog('User check cycle', error.toString(), error, message.date, message.time);
		res.status(500).json({ error: 'USERS CHECK CYCLE FAILED', message: error.toString() });
	}
};

const remove = async (token) => {
	let removeTasks = [];
	removeTasks.push(Models.User.findOneAndDelete({ tokenFB: token }));
	if ((await Models.User.findOne({ tokenFB: token })).trackings.length)
		removeTasks.push(Models.Tracking.deleteMany({ token: token }));
	await Promise.all(removeTasks);
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

export default {
	initialize,
	trackingAction,
	sincronize,
	check,
	contactForm,
	trackingsCycle,
	usersCycle,
	remove,
};
