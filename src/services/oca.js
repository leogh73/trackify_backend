import vars from '../modules/crypto-js.js';
import got from 'got';

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
			service: 'OCA',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let consultEvents = await got.post(`${vars.OCA_API_URL}`, {
		json: { numberOfSend: code },
	});
	let resultEvents = JSON.parse(consultEvents.body).d;

	let eventsList = resultEvents.map((e) => {
		return {
			date: e.DateShow.split(' ')[0],
			time: e.DateShow.split(' ')[1],
			status: e.State.trim(),
			motive: e.Razon,
			location: e.Sucursal.trim(),
		};
	});
	eventsList.reverse();

	let productNumber = resultEvents[0].NroProducto;

	let originData;
	if (!lastEvent) {
		let consultOrigin = await got.post(
			'http://www5.oca.com.ar/ocaepakNet/Views/ConsultaTracking/TrackingOrigin.aspx/GetOrigen',
			{ json: { idOrdenRetiro: resultEvents[0].IdOrdenRetiro } },
		);
		let resultOrigin = JSON.parse(consultOrigin.body).d;

		originData = {
			name: resultOrigin.LastName,
			address: resultOrigin.Street,
			number: resultOrigin.Number,
			zipCode: resultOrigin.ZipCode.trim(),
			locality: resultOrigin.Locality.trim(),
			state: resultOrigin.State.trim(),
			email: resultOrigin.Email,
			phone: resultOrigin.Conctact,
		};
	}

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, productNumber, originData);
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, productNumber, originData) {
	let response = {
		events: eventsList,
		origin: originData,
		productNumber: productNumber,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].status} - ${eventsList[0].motive} - ${eventsList[0].location}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map(
		(e) => `${e.date} - ${e.time} - ${e.status} - ${e.motive} - ${e.location}`,
	);
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
		origin: {
			name: otherData[0][0],
			address: otherData[0][1],
			number: otherData[0][2],
			zipCode: otherData[0][3],
			locality: otherData[0][4],
			state: otherData[0][5],
			email: otherData[0][6],
			phone: otherData[0][7],
		},
		productNumber: otherData[1][0],
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].status} - ${events[0].motive} - ${events[0].location}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
