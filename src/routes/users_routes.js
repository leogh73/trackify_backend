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
