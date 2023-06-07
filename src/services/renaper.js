import got from 'got';
import vars from '../modules/crypto-js.js';

async function check(code, lastEvent) {
	let data = JSON.parse(
		(
			await got.post(`${vars.PLAYWRIGHT_API_RENAPER_URL}`, {
				json: { code: code },
			})
		).body,
	);

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
	check,
	convertFromDrive,
};
