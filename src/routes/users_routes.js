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

// import vars from '../modules/crypto-js.js';
// import got from 'got';

// router.get('/test', async (req, res) => {
// 	try {
// let data = JSON.parse(
// 	(
// 		await got.post(`${vars.PLAYWRIGHT_API_RENAPER_URL}`, {
// 			json: { code: '682257040' },
// 		})
// 	).body,
// );

// let data = JSON.parse(
// 	(
// 		await got.post(`${vars.PLAYWRIGHT_API_CLICOH_URL}`, {
// 			json: { code: 'HWUIN94250' },
// 		})
// 	).body,
// );

// 	res.json({
// 		status: 200,
// 		message: data,
// 	});
// } catch (error) {
// console.error(error);
// 		return res.status(500).send({ 'Server Error': `${error}` });
// 	}
// });

import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';

router.post('/test', async (req, res) => {
	const { code } = req.body;
	let userId = '648a462c11599687032094ad';

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
				'dNxIVJHVS_2VAEmX2qE_V4:APA91bGCbYsudFklot95YOJIG1BCofVfCzQNS0_hHd4oAkEsaff2i7gLJhM0HTtLrdwFMPb3XS0hRFxJvvkUxVJ1W_Dwpa2nsOuNEX71WwthPONQzSRrVVEwndZGf4wX-vfUXqlHA8A7',
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
