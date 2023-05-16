import express from 'express';
export const router = express.Router();
import Models from '../modules/mongodb.js';
import trackings from '../controllers/trackings_controllers.js';
import user from '../controllers/users_controllers.js';
import puppeteer from 'puppeteer';

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
		await Models.storeLog('Check cycle', null, error, message.date, message.time);
		res.status(500).json(message);
		res.status(500).json({ error: 'CHECK CYCLE FAILED' });
	}
});

// import playwright from 'playwright-aws-lambda';
import vars from '../modules/crypto-js.js';

router.get('/test', async (req, res) => {
	try {
		// const browser = await playwright.launchChromium({ headless: false });
		// const context = await browser.newContext();
		// const page = await context.newPage();

		const browser = await puppeteer.launch({
			args: ['--disable-setuid-sandbox', '--no-sandbox', '--single-process', '--no-zygote'],
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
		});

		const page = await browser.newPage();

		await page.goto(`${vars.CLICOH_API_URL1}`, {
			waitUntil: 'load',
		});

		await page.type("input[name='codigo']", `${'HWUIN94250'}`);

		let xhrCatcher = page.waitForResponse(
			(response) =>
				response.url().includes('check_package/') && response.request().method() != 'OPTIONS',
		);

		page.click('.fa.fa-search');
		let data = await (await xhrCatcher).json();

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
