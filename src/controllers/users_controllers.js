import Models from '../modules/mongodb.js';
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
		let message = luxon.errorMessage();
		await Models.storeLog(
			'Initialize user',
			{ lastActivity: newUser.lastActivity, tokenFB: newUser.tokenFB },
			error,
			message.date,
			message.time,
		);
		console.log(error);
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
		await Models.storeLog(
			'Tracking action',
			{ userId, action, body: req.body },
			error,
			message.date,
			message.time,
		);
		console.log(error);
		res.status(500).json(message);
	}
};

const sincronize = async (req, res) => {
	const { userId, token, lastEvents, currentDate, driveLoggedIn } = req.body;
	try {
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
		console.log(error);
		res.status(500).json(message);
	}
};

const check = async (req, res) => {
	const { trackingId } = req.body;
	try {
		let response = await tracking.check(trackingId);
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog('Check', { trackingId }, error, message.date, message.time);
		console.log(error);
		res.status(500).json(message);
	}
};

const remove = async (userId, token) => {
	let removeTasks = [];
	removeTasks.push(Models.User.findOneAndDelete({ _id: userId }));
	if (!!token) removeTasks.push(Models.Tracking.deleteMany({ token: token }));
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

const checkCycle = async () => {
	let usersCollection = (await Models.User.find({})).map((user) => {
		return {
			id: user._id,
			token: user.tokenFB,
			lastActivity: user.lastActivity,
			trackings: user.trackings,
		};
	});
	let removeUsers = [];
	for (let userData of usersCollection) {
		if (userData.token === 'BLACKLISTED') {
			removeUsers.push(remove(userData.id, null));
		} else {
			let dateToday = new Date(Date.now());
			let difference = dateToday.getTime() - userData.lastActivity.getTime();
			let totalDays = Math.floor(difference / (1000 * 3600 * 24));
			if (totalDays > 31) removeUsers.push(remove(userData.id, userData.token));
		}
	}
	await Promise.all(removeUsers);
	let activeTokens = usersCollection
		.filter((user) => user.trackings.length)
		?.map((user) => user.token);
	return activeTokens;
};

const contactForm = async (req, res) => {
	const { userId, message, email } = req.body;
	try {
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
		console.log(error);
		res.status(500).json(message);
	}
};

export default {
	initialize,
	trackingAction,
	sincronize,
	check,
	remove,
	checkCycle,
	contactForm,
};
