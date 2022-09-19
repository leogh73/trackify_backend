import vars from '../modules/crypto-js.js';
import playwright from 'playwright-aws-lambda';

async function checkStart(code) {
	try {
		return await startCheck(code, null);
	} catch (error) {
		return {
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function checkUpdate(code, lastEvent) {
	try {
		return await startCheck(code, lastEvent);
	} catch (error) {
		return {
			service: 'Renaper',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	const browser = await playwright.launchChromium({ headless: false });
	const context = await browser.newContext();
	const page = await context.newPage();

	await page.goto(`${vars.RENAPER_API_URL1}`, {
		waitUntil: 'load',
	});

	let timeout = false;
	let fetchDataTimeout = setTimeout(() => {
		timeout = true;
	}, 15000);

	const checkData = async () => {
		await page.type('#tramite', `${code}`);
		let data = await (
			await Promise.all([
				page.waitForResponse(
					(response) => response.url() === `${vars.RENAPER_API_URL2}` && response.status() === 200,
				),
				page.click('#btn-consultar'),
			])
		)[0].json();
		if (data.errors && !timeout) {
			await page.reload();
			return await checkData();
		} else {
			clearTimeout(fetchDataTimeout);
			return data;
		}
	};
	let data = await checkData();
	await browser.close();

	let eventsList = data.data.tramitesUI[0].historico.map((e) => {
		const { evento, estado, fecha, planta } = e;
		let dateTime = fecha.split(' ');
		let date = dateTime[0].split('-').join('/');
		let time = dateTime[1];
		return {
			date,
			time,
			plant: planta,
			description: evento,
			motive: estado == '' ? 'Sin datos' : estado,
		};
	});

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, data);
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, data) {
	const { clase_tramite, descripcion_tramite, tipo_retiro, tipo_tramite } = data.data;
	let paperDetails = {
		paperClass: clase_tramite,
		paperKind: tipo_tramite,
		description: descripcion_tramite,
		pickUp: tipo_retiro,
	};

	const { descripcion, domicilio, codigo_postal, provincia } = data.data.oficina_remitente;
	let originOffice = {
		description: descripcion,
		address: domicilio,
		state: provincia,
		zipCode: codigo_postal,
	};

	let response = {
		events: eventsList,
		details: paperDetails,
		origin: originOffice,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].plant} - ${eventsList[0].description} - ${eventsList[0].motive}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map(
		(e) => `${e.date} - ${e.time} - ${e.plant} - ${e.description} - ${e.motive}`,
	);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = eventsList.slice(0, eventIndex);

	let response = { events: eventsResponse };
	if (eventsResponse.length) response.lastEvent = eventsText[0];

	return response;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		details: {
			paperClass: otherData[0][0],
			paperKind: otherData[0][1],
			description: otherData[0][2],
			pickUp: otherData[0][3],
		},
		origin: {
			description: otherData[1][0],
			address: otherData[1][1],
			state: otherData[1][2],
			zipCode: otherData[1][3],
		},
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].plant} - ${events[0].description} - ${events[0].motive}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
