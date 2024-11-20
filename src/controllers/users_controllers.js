import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import google from './google_drive_controllers.js';
import emailCheck from 'node-email-check';
import notifyAdmin from '../modules/nodemailer.js';
import services from '../services/_services.js';
import { cache } from '../modules/node-cache.js';

const initialize = async (req, res) => {
	try {
		const newUser = await new db.User({
			lastActivity: new Date(Date.now()),
			tokenFB: req.body.token,
			trackings: [],
		}).save();
		const servicesData = cache.get('Service') ?? (await services.servicesData());
		res.status(200).json({ userId: newUser.id, servicesData });
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'Initialize user',
			{ lastActivity, tokenFB: req.body.token },
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
		if (!user) return res.status(400).json({ error: 'Not authorized' });
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
	const { userId, token, lastEvents, servicesCount, servicesVersions, driveLoggedIn, version } =
		req.body;

	try {
		let user = await db.User.findById(userId);
		if (!user) {
			await remove(token);
			return res.status(200).json({ error: 'user not found' });
		}
		await update(user, token);
		let response = {};
		response.data = await tracking.syncronize(JSON.parse(lastEvents));
		response.driveStatus =
			driveLoggedIn == 'true'
				? await google.syncronizeDrive(userId, luxon.getDate())
				: 'Not logged in';
		response.statusMessage =
			cache.get('StatusMessage') ?? (await db.StatusMessage.find())[0].message;
		response.updatedServices = await services.check(
			cache.get('Service'),
			servicesCount,
			servicesVersions,
		);
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'syncronize',
			{ userId, token, lastEvents, servicesCount, servicesVersions, driveLoggedIn, version },
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

	function checkClaimMessage() {
		let isValid = true;
		let includedWords = [
			'código',
			'codigo',
			'cuánto',
			'encomienda',
			'envío',
			'esperando',
			'estado',
			'llego',
			'llega',
			'llegaria',
			'nombre',
			'necesito',
			'numero',
			'número',
			'paquete',
			'pendiente',
			'saber',
			'tarda',
			'tiempo',
			'-',
			'reclamo',
			'mí',
			'tarjeta',
			'Nº',
			'pieza',
			'rastrear',
			'seguir',
			'pedido',
		];
		let lCLastEvent = message.toLowerCase();
		for (let word of includedWords) {
			if (lCLastEvent.includes(word)) {
				isValid = false;
			}
		}
		if (!isNaN(parseFloat(message))) isValid = false;
		return isValid;
	}

	try {
		if (message.includes('text ') || email.includes('text ')) return;
		let emailIsValid = await emailCheck.isValid(email);
		if (!emailIsValid) return res.status(403).json({ error: 'email not valid' });
		if (!checkClaimMessage()) return res.status(400).json({ error: 'message not valid' });
		const { id } = await new db.Contact({ userId, message, email }).save();
		res.status(200).json({ requestId: id });
		await notifyAdmin([{ userId, email, message }], 'User Contact');
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'User contact',
			{ userId, message, email },
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
