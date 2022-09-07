import vars from '../modules/crypto-js.js';
import got from 'got';
import { load } from 'cheerio';

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
			service: 'EcaPack',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let dividedCode = code.split('-');
	let consult = await got(
		`${vars.ECAPACK_API_URL.replace('dividedCode0', dividedCode[0])
			.replace('dividedCode1', dividedCode[1])
			.replace('dividedCode2', dividedCode[2])}`,
	);
	const $ = load(consult.body);

	let rowList = [];
	$('body > div > table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	let eventsList = [];
	let chunkSize = 4;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		let chunk = rowList.slice(i, i + chunkSize);
		let date = chunk[0].split('Fecha: : ')[1].split(' ')[0].split('-').join('/');
		let time = chunk[0].split('Fecha: : ')[1].split(' ')[1];
		let location = chunk[1].split('- ')[0].split('Lugar: ')[1].split('-').join(' - ');
		let sign = chunk[3].split(':').join(': ');
		if (!chunk[3].length) sign = 'Sin datos';
		let event = {
			date,
			time,
			location,
			sign,
		};
		eventsList.push(event);
	}
	eventsList.reverse();

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList);
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList) {
	let response = {
		events: eventsList,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].location} - ${eventsList[0].sign}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.location} - ${e.sign}`);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsListFinal = [];
	if (eventIndex) eventsListFinal = eventsList.slice(0, eventIndex);

	let response = { events: eventsListFinal };
	if (eventsListFinal.length) response.lastEvent = eventsText[0];

	return response;
}

function convertFromDrive(driveData) {
	const { events } = driveData;
	return {
		events,
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].location} - ${events[0].sign}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
