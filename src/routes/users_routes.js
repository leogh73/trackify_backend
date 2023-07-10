import express from 'express';
export const router = express.Router();
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/sincronize', user.sincronize);
router.post('/check', user.check);
router.post('/contact', user.contactForm);

router.get('/trackingsCycle', user.trackingsCycle);
router.get('/usersCycle', user.usersCycle);

import vars from '../modules/crypto-js.js';
import got from 'got';

router.get('/test1', async (req, res) => {
	try {
		// let trackingIds = (await Models.Log.find({ actionName: 'check cycle' })).map((log) => log.id);
		// await Models.Log.deleteMany({ _id: { $in: trackingIds } });

		// let data = await _services.checkHandler(
		// 	'MDCargas',
		// 	'R050500020601',
		// 	'04/07/2023 - 19:30:08 - Se encuentra recibido en Agencia RIO TERCERO (CADETERIA)',
		// );

		let trackings = await Models.Tracking.find({ completed: false });
		let operations = [];
		let includedWords = [
			'entregado',
			'entregada',
			'entregamos',
			'devuelto',
			'entrega en',
			'devolución',
			'rehusado',
			'no pudo ser retirado',
		];
		for (let t of trackings) {
			for (let w of includedWords) {
				if (t.result.lastEvent.toLowerCase().includes(w))
					operations.push(
						Models.Tracking.findOneAndUpdate({ _id: t._id }, { $set: { completed: true } }),
					);
			}
		}
		await Promise.all(operations);

		res.json({
			status: 200,
			message: 'included',
		});
	} catch (error) {
		console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});

import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import _services from '../services/_services.js';

router.post('/test2', async (req, res) => {
	const { code } = req.body;
	let userId = '64aaaf6c7d4785821aec2b6f';

	let checkDate = luxon.getDate();
	let checkTime = luxon.getTime();
	console.log('EC2FQ31777987');
	console.log('R-0487-00009330');

	try {
		// let result = {
		// 	events: [
		// 		{
		// 			date: '27/05/2022',
		// 			time: '01:48:00',
		// 			detail: 'El envío ha salido del centro de distribución de OCASA (Iriarte - Argentina).',
		// 		},
		// 		{
		// 			date: '24/05/2022',
		// 			time: '18:51:45',
		// 			detail:
		// 				'Pasamos a buscar el envío por el domicilio del remitente y lo estamos llevando a nuestra planta para iniciar el proceso de entrega.',
		// 		},
		// 		{
		// 			date: '24/05/2022',
		// 			time: '18:51:45',
		// 			detail:
		// 				'El envío ya está confirmado para que lo retiremos por el domicilio del remitente.',
		// 		},
		// 	],
		// 	trackingNumber: '41395878142',
		// 	lastEvent:
		// 		'27/05/2022 - 01:48:00 - El envío ha salido del centro de distribución de OCASA (Iriarte - Argentina).',
		// };

		let result = {
			events: [
				{
					date: '04/07/2023',
					time: '19:30:08',
					status: 'Se encuentra recibido en Agencia RIO TERCERO (CADETERIA)',
				},
			],
			lastEvent:
				'04/07/2023 - 19:30:08 - Se encuentra recibido en Agencia RIO TERCERO (CADETERIA)',
		};

		let newTracking = new Models.Tracking({
			title: code,
			service: 'MDCargas',
			code,
			checkDate,
			checkTime,
			token:
				'e8Z-gUPCRbuFFfyxLgmPR7:APA91bGxEI2pYAFvHpYa5PQmZ7BGN8pDKufaSdqH0KuahpC0Cdj7WFCnlaT5eX6rLv50qYDXv6W6JYhZrb8VbFR6_8aJnhDro1KhtqX82RhfyNe-rDY_TpPipZONJKkPLHnaljrj__Bv',
			result,
			completed: false,
		});
		const addedTracking = await newTracking.save();
		let trackingId = addedTracking._id;
		let user = await Models.User.findById(userId);
		user.trackings.push(trackingId);
		user.save();
		result.checkDate = checkDate;
		result.checkTime = checkTime;
		result.trackingId = trackingId;

		res.status(200).json(result);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});
