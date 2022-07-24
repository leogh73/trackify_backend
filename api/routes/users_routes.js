import express from 'express';
export const router = express.Router();
// import puppeteer from 'puppeteer';
// import chromium from 'chrome-aws-lambda';
import playwright from 'playwright-aws-lambda';
import trackings_controllers from '../controllers/trackings_controllers.js';

import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/sincronize', user.sincronize);
router.post('/check', user.check);
router.post('/request', user.serviceRequest);

router.get('/cycle', trackings_controllers.checkCycle);
router.get('/test', async (req, res) => {
	try {
		const browser = await playwright.launchChromium({ headless: true });
		const context = await browser.newContext();
		const page = await context.newPage();
		// const browser = await playwright.chromium.launch({
		// args: chromium.args,
		// defaultViewport: chromium.defaultViewport,
		// executablePath: await chromium.executablePath,
		// headless: true,
		// });

		// await page.goto(`${process.env.CLICOH_API_URL1}`, {
		// 	waitUntil: 'load',
		// });

		// await page.type("input[name='codigo']", 'HWUIN94250');
		// let data = await (
		// 	await Promise.all([
		// 		page.waitForResponse(
		// 			(response) =>
		// 				response.url() === `${process.env.CLICOH_API_URL2}` &&
		// 				response.request().method() === 'POST',
		// 		),
		// 		page.click('.fa.fa-search'),
		// 	])
		// )[0].json();
		// await browser.close();

		await page.goto(`${process.env.RENAPER_API_URL1}`, {
			waitUntil: 'load',
		});

		// let timeout = false;
		// setTimeout(() => {
		// 	timeout = true;
		// }, 15000);
		const checkData = async () => {
			await page.type('#tramite', '682257040');
			let data = await (
				await Promise.all([
					page.waitForResponse(
						(response) =>
							response.url() === `${process.env.RENAPER_API_URL2}` && response.status() === 200,
						{ timeout: 20000 },
					),
					page.click('#btn-consultar'),
				])
			)[0].json();
			if (data.errors) {
				await page.reload();
				return await checkData();
			} else return data;
		};
		let data = await checkData();

		// let data = await (
		// 	await Promise.all([
		// 		page.waitForResponse(
		// 			(response) =>
		// 				response.url() === `${process.env.RENAPER_API_URL2}` && response.status() === 200,
		// 			{ timeout: 20000 },
		// 		),
		// 		page.click('#btn-consultar'),
		// 	])
		// )[0].json();

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

// router.get('/test', async (req, res) => {
// 	try {
// const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
// 		const page = await browser.newPage();

// 		await page.goto(`${process.env.CLICOH_API_URL1}`);
// 		await page.waitForSelector("input[name='codigo']");
// 		await page.type("input[name='codigo']", 'HWUIN94250');
// 		let data = await (
// 			await Promise.all([
// 				page.waitForResponse(
// 					(response) =>
// 						response.url() === `${process.env.CLICOH_API_URL2}` &&
// 						response.request().method() === 'POST',
// 				),
// 				page.click('.fa.fa-search'),
// 			])
// 		)[0].json();
// 		await browser.close();
// 		res.json({
// 			status: 200,
// 			message: data,
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		return res.status(500).send({ 'Server Error': `${error}` });
// 	}
// });

// router.get('/test', async (req, res) => {
// 	try {
// 		res.json({
// 			status: 200,
// 			message: 'Get data has successfully',
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		return res.status(500).send('Server error');
// 	}
// });
