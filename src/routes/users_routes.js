import express from 'express';
export const router = express.Router();
import luxon from '../modules/luxon.js';
import Models from '../modules/mongodb.js';
import trackings from '../controllers/trackings_controllers.js';
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/sincronize', user.sincronize);
router.post('/check', user.check);
router.post('/contact', user.contactForm);

router.get('/cycle', async (req, res) => {
	try {
		await trackings.checkCycle();
		res.status(200).json({ message: 'CHECK CYCLE COMPLETED' });
	} catch (error) {
		let message = luxon.errorMessage();
		await Models.storeLog('Check cycle', error.toString(), error, message.date, message.time);
		res.status(500).json({ error: 'CHECK CYCLE FAILED', message: error.toString() });
	}
});

import vars from '../modules/crypto-js.js';
import got from 'got';

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

		let data = await renaper.checkStart('682257040');

		res.json({
			status: 200,
			message: data,
		});
	} catch (error) {
		// console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});
