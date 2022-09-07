import vars from '../modules/crypto-js.js';
import got from 'got';

async function checkStart(code) {
	try {
		return await startCheck(code, null);
	} catch (error) {
		return {
			error: 'Ha ocurrido un error. Reintente más tarde',
			lastEvent: error.response.statusCode === 404 ? 'No hay datos' : null,
		};
	}
}

async function checkUpdate(code, lastEvent) {
	try {
		return await startCheck(code, lastEvent);
	} catch (error) {
		return {
			service: 'Andreani',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	const events = await got(`${vars.ANDREANI_API_URL1.replace('code', code)}`, {
		timeout: { response: 10000 },
	});
	const visits = await got(`${vars.ANDREANI_API_URL2.replace('code', code)}`, {
		timeout: { response: 10000 },
	});

	const resultEvents = JSON.parse(events.body);
	const resultVisits = JSON.parse(visits.body);

	let eventsList = resultEvents.map((e) => {
		let motive = 'Sin datos';
		let location = 'Sin datos';
		if (e.motivo) motive = e.motivo;
		if (e.sucursal.trim(' ').length) location = e.sucursal;
		return {
			date: e.fecha.dia.split('-').join('/'),
			time: e.fecha.hora,
			condition: e.estado,
			motive: motive,
			location: location,
		};
	});

	let visitsList = resultVisits.visitas.map((v) => {
		return {
			date: v.fecha,
			time: v.hora,
			motive: v.motivo,
		};
	});

	let newVisitList = {
		visits: visitsList,
		pendingVisits: resultVisits.visitasPendientes,
	};

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, newVisitList);
	} else {
		response = updateResponse(eventsList, newVisitList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, newVisitList) {
	let response = {
		events: eventsList,
		visits: newVisitList,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].condition} - ${eventsList[0].motive} - ${eventsList[0].location}`,
	};

	return response;
}

function updateResponse(eventsList, newVisitList, lastEvent) {
	let eventsText = eventsList.map(
		(e) => `${e.date} - ${e.time} - ${e.condition} - ${e.motive} - ${e.location}`,
	);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = eventsList.slice(0, eventIndex);

	let response = { events: eventsResponse };
	if (eventsResponse.length) {
		response.visits = newVisitList;
		response.lastEvent = eventsText[0];
	}

	return response;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		visits: {
			visits: [{ date: otherData[0][0], time: otherData[0][1], motive: otherData[0][2] }],
			pendingVisits: otherData[1][0],
		},
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].condition} - ${events[0].motive} - ${events[0].location}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
