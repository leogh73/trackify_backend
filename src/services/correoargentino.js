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
			service: 'Correo Argentino',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let consult = await got(`${vars.CORREOARGENTINO_API_URL.replace('code', code)}`);
	const $ = load(consult.body);

	let rowsList = [];
	$('#no-more-tables > table > tbody > tr > td').each(function () {
		rowsList.push($(this).text());
	});

	let eventsList = [];
	let chunkSize = 4;
	for (let i = 0; i < rowsList.length; i += chunkSize) {
		let chunk = rowsList.slice(i, i + chunkSize);
		let date = chunk[0].split(' ')[0].split('-').join('/');
		let time = chunk[0].split(' ')[1];
		let condition = chunk[3];
		if (!condition.length) condition = 'Sin datos';
		let event = {
			date,
			time,
			location: chunk[1],
			description: chunk[2],
			condition,
		};
		eventsList.push(event);
	}

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
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].location} - ${eventsList[0].description} - ${eventsList[0].condition}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map(
		(e) => `${e.date} - ${e.time} - ${e.location} - ${e.description} - ${e.condition}`,
	);
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
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].location} - ${events[0].description} - ${events[0].condition}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
