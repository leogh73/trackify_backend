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

// router.get('/test', async (req, res) => {
// 	try {
// let data = JSON.parse(
// 	(
// 		await got.post(`${vars.PLAYWRIGHT_API_RENAPER_URL}`, {
// 			json: { code: '682257040' },
// 		})
// 	).body,
// );

// 		let data = await _services.checkHandler('DHL', '2271618790', null);

// 		res.json({
// 			status: 200,
// 			message: data,
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		return res.status(500).send({ 'Server Error': `${error}` });
// 	}
// });

import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import _services from '../services/_services.js';

router.post('/test', async (req, res) => {
	const { code } = req.body;
	let userId = '648f5a4683c4603618886df8';

	let checkDate = luxon.getDate();
	let checkTime = luxon.getTime();
	console.log('EC2FQ31777987');

	try {
		let result = {
			events: [
				{
					date: '27/05/2022',
					time: '01:48:00',
					detail: 'El envío ha salido del centro de distribución de OCASA (Iriarte - Argentina).',
				},
				{
					date: '24/05/2022',
					time: '18:51:45',
					detail:
						'Pasamos a buscar el envío por el domicilio del remitente y lo estamos llevando a nuestra planta para iniciar el proceso de entrega.',
				},
				{
					date: '24/05/2022',
					time: '18:51:45',
					detail:
						'El envío ya está confirmado para que lo retiremos por el domicilio del remitente.',
				},
			],
			trackingNumber: '41395878142',
			lastEvent:
				'27/05/2022 - 01:48:00 - El envío ha salido del centro de distribución de OCASA (Iriarte - Argentina).',
		};

		let newTracking = new Models.Tracking({
			title: code,
			service: 'OCASA',
			code,
			checkDate,
			checkTime,
			token:
				'esWlsXE2QRa2-uoqjbLWwT:APA91bG-0J_FKkpo9B8IcyzML2Fx6V_iiB0OtJubJIK0G-Oc-QlurPi1G66ItLvL83YMm8M853PxyHXLAPbpaHlQq99-iVwii6f4Zbquj-zwDYJaHU3jfxXWOXGenAO7gRGKXfoOTkwO',
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
