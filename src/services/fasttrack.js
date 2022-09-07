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
			service: 'FastTrack',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let response1 = await got(`${vars.FASTTRACK_API_URL1}`);
	const $ = load(response1.body);
	let token = $('head > meta[name="csrf-token"]').attr('content');
	let response2 = await got(
		`${vars.FASTTRACK_API_URL2.replace('code', code).replace('TOKEN', token)}`,
	);
	let result = JSON.parse(response2.body);

	let eventsList = result.guia.fechas.map((f) => {
		return {
			date: f.fecha,
			time: f.hora,
			status: f.estado,
		};
	});

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
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].status}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.status}`);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = eventsList.slice(0, eventIndex);

	let response = { events: eventsResponse };
	if (eventsResponse.length) response.lastEvent = eventsText[0];

	return response;
}

function convertFromDrive(driveData) {
	const { events } = driveData;
	return {
		events,
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].status}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
