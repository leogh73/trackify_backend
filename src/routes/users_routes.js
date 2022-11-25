import express from 'express';
export const router = express.Router();
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
		res.status(500).json({ error: 'CHECK CYCLE FAILED' });
	}
});

import playwright from 'playwright-aws-lambda';
import vars from '../modules/crypto-js.js';

router.get('/test', async (req, res) => {
	try {
		const browser = await playwright.launchChromium({
			headless: false,
			ignoreDefaultArgs: ['--disable-extensions'],
		});
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.goto(`${vars.RENAPER_API_URL1}`, {
			waitUntil: 'load',
		});

		const timeout = () =>
			new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('FUNCTION TIMEOUT');
				}, 12000);
			});

		const fetchData = async () => {
			await page.type('#tramite', '682257040');
			let response = await (
				await Promise.all([
					page.waitForResponse(
						(res) => res.url() === `${vars.RENAPER_API_URL2}` && res.status() === 200,
					),
					page.click('#btn-consultar'),
				])
			)[0].json();
			if (response.errors) {
				await page.reload();
				return await fetchData();
			} else return response;
		};
		let data = await Promise.race([fetchData(), timeout()]);
		await browser.close();

		res.json({
			status: 200,
			message: data,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).send({ 'Server Error': `${error}` });
	}
});
