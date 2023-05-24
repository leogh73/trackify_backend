import express from 'express';
export const router = express.Router();
import Models from '../modules/mongodb.js';
import trackings from '../controllers/trackings_controllers.js';
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
// router.post('/:userId/:action', user.trackingAction);
router.post('/sincronize', user.sincronize);
router.post('/check', user.check);
// router.post('/contact', user.contactForm);

router.get('/cycle', async (req, res) => {
	try {
		await trackings.checkCycle();
		res.status(200).json({ message: 'CHECK CYCLE COMPLETED' });
	} catch (error) {
		await Models.storeLog('Check cycle', null, error, message.date, message.time);
		res.status(500).json(message);
		res.status(500).json({ error: 'CHECK CYCLE FAILED' });
	}
});

import vars from '../modules/crypto-js.js';
import got from 'got';
import sendNotification from '../modules/firebase_notification.js';

router.get('/test', async (req, res) => {
	try {
		// let data = JSON.parse(
		// 	(
		// 		await got.post(`http://localhost:5000/renaper`, {
		// 			json: { code: '682257040' },
		// 		})
		// 	).body,
		// );

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

		sendNotification({
			token: '',
			results: [{ title: 'Prueba' }],
		});

		res.json({
			status: 200,
			message: data,
		});
	} catch (error) {
		// console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});
