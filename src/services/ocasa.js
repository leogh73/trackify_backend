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
			service: 'OCASA',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let consult = await got(`${process.env.OCASA_API_URL.replace('code', code)}`, {
		https: {
			rejectUnauthorized: false,
		},
	});
	const $ = load(consult.body);

	let data = [];
	$('#griddetalle > tbody > tr > td').each(function () {
		data.push($(this).text());
	});
	let trackingNumber = $('label#lblseguimiento.text-gris').text();

	let eventsList = [];
	let chunkSize = 3;
	for (let i = 0; i < data.length; i += chunkSize) {
		let chunk = data.slice(i, i + chunkSize);
		let newChunk = [];
		chunk.forEach((c) => newChunk.push(c.trim()));
		newChunk = newChunk.slice(0, 2);
		let event = {
			date: newChunk[0].split(' ')[0],
			time: newChunk[0].split(' ')[1],
			detail: newChunk[1],
		};
		eventsList.push(event);
	}

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, trackingNumber);
		if (data[0] == 'No hay registros para mostrar') response.lastEvent = 'No hay datos';
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, trackingNumber) {
	let response = {
		events: eventsList,
		trackingNumber: trackingNumber,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].detail}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.detail}`);
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
		trackingNumber: otherData[0][0],
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].detail}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
