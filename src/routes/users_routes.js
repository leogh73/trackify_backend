import express from 'express';
export const router = express.Router();
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/syncronize', user.syncronize);
router.post('/check', user.check);
router.post('/contact', user.contactForm);

import vars from '../modules/crypto-js.js';
import got from 'got';

// router.get('/test1', async (req, res) => {
// 	try {
// let trackingIds = (await db.Log.find({ actionName: 'check cycle' })).map((log) => log.id);
// await db.Log.deleteMany({ _id: { $in: trackingIds } });
// 		let data = await services.checkHandler('ViaCargo', '999015947577', null);
// 		res.json({
// 			status: 200,
// 			message: data,
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		return res.status(500).send({ 'Server Error': `${error}` });
// 	}
// });

import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import services from '../services/_services.js';

router.post('/test2', async (req, res) => {
	const { code } = req.body;
	let userId = '64aec87f5fdb5dccfa16d495';

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

		const newTracking = await db.Tracking({
			title: code,
			service: 'MDCargas',
			code,
			checkDate,
			checkTime,
			lastCheck: new Date(Date.now()),
			token:
				'd0BLIsxxS1OOVAgQni27CW:APA91bFQIIaLPMxwfBnWInTgTB1VMl6V6hnq97KLwBmlaxBUWzUqqQr8sNHwo6CLfI5Q-Q4YoyVaq3JPpdGj439own7yITu3G4VfarRfcPcgLAU20Eo4-1viKUP0QuuNsB6W2125LrmL',
			result,
			completed: false,
		});
		const addedTracking = await newTracking.save();
		let trackingId = addedTracking._id;
		let user = await db.User.findById(userId);
		console.log(user);
		user.trackings.push(trackingId);
		result.checkDate = checkDate;
		result.checkTime = checkTime;
		result.trackingId = trackingId;
		await user.save();

		res.status(200).json(result);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});
