import vars from '../modules/crypto-js.js';
import got from 'got';

async function check(code, lastEvent) {
	let data = JSON.parse(
		(await got.post(`${vars.PLAYWRIGHT_API_ENVIOPACK_URL}`, { json: { code } })).body,
	)[0];
	if (!data) return { lastEvent: 'No hay datos' };

	let eventsList = data.tracking.map((e) => {
		let time = e.fecha.substr(e.fecha.length - 5);
		return {
			date: e.fecha.split(time)[0].trim(),
			time,
			status: e.mensaje,
		};
	});
	eventsList.reverse();

	let otherData = {
		service: data.correo ?? 'Sin datos',
		locality: data.localidad,
		state: data.provincia,
	};

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, otherData);
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, otherData) {
	let response = {
		events: eventsList,
		otherData,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].status}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.status}`);
	let eventIndex = eventsText.indexOf(lastEvent);

	let listEventsFinal = [];
	if (eventIndex) listEventsFinal = eventsList.slice(0, eventIndex);

	let response = {
		events: listEventsFinal,
	};

	if (listEventsFinal.length) response.lastEvent = eventsText[0];

	return response;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		otherData: {
			service: otherData[0][0],
			locality: otherData[0][1],
			state: otherData[0][2],
		},
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].status}`,
	};
}

export default {
	check,
	convertFromDrive,
};
