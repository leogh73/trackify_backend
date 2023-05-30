import vars from '../modules/crypto-js.js';
import got from 'got';

async function checkStart(code) {
	try {
		return await startCheck(code, null);
	} catch (error) {
		console.log(error);
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
			service: 'ViaCargo',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let response = await got.post(`${vars.VIACARGO_API_URL.replace('code', code)}`);
	console.log(response);
	let data = JSON.parse(response.body).ok[0].objeto;

	let eventsList = data.listaEventos.map((e) => {
		return {
			date: e.fechaEvento.split(' ')[0],
			time: e.fechaEvento.split(' ')[1],
			location: e.deleNombre,
			status: e.descripcion,
		};
	});

	let origin = {
		senderName: capitalizeText(data.nombreRemitente),
		senderDni: data.nitRemitente,
		address: capitalizeText(data.direccionRemitente),
		zipCode: data.codigoPostalRemitente,
		state: data.poblacionRemitente,
		date: data.fechaHoraAdmision.split(' ')[0],
		time: data.fechaHoraAdmision.split(' ')[1],
	};

	let destiny = {
		receiverName: capitalizeText(data.nombreDestinatario),
		receiverDni: data.nitDestinatario,
		address: capitalizeText(data.direccionDestinatario),
		zipCode: data.codigoPostalDestinatario,
		state: data.poblacionDestinatario,
		phone: data.telefonoDestinatario,
		dateDelivered: `${
			data.fechaHoraEntrega?.split(' ')[0] ? data.fechaHoraEntrega.split(' ')[0] : 'Sin datos'
		}`,
		timeDelivered: `${
			data.fechaHoraEntrega?.split(' ')[1] ? data.fechaHoraEntrega.split(' ')[1] : 'Sin datos'
		}`,
	};

	let aditional = {
		weightDeclared: `${data.kilos + ' kg.'}`,
		numberOfPieces: data.numeroTotalPiezas,
		service: capitalizeText(data.descripcionServicio),
		sign: `${data.nifQuienRecibe ? data.nifQuienRecibe : '-'}`,
	};

	function capitalizeText(text) {
		let newText = text
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
		return newText;
	}

	if (!lastEvent) {
		response = startResponse(eventsList, origin, destiny, aditional);
	} else {
		response = updateResponse(eventsList, destiny, lastEvent);
	}

	return response;
}

function startResponse(eventsList, origin, destiny, aditional) {
	let response = {
		events: eventsList,
		origin,
		destiny,
		aditional,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].location} - ${eventsList[0].status}`,
	};

	return response;
}

function updateResponse(eventsList, destiny, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.location} - ${e.status}`);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = eventsList.slice(0, eventIndex);

	let response = {
		events: eventsResponse,
	};

	if (eventsResponse.length) {
		response.destiny = {
			dateDelivered: destiny.dateDelivered,
			timeDelivered: destiny.timeDelivered,
		};
		response.lastEvent = eventsText[0];
	}

	return response;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		origin: {
			senderName: otherData[0][0],
			senderDni: otherData[0][1],
			address: otherData[0][2],
			zipCode: otherData[0][3],
			state: otherData[0][4],
			date: otherData[0][5],
			time: otherData[0][6],
		},
		destiny: {
			receiverName: otherData[1][0],
			receiverDni: otherData[1][1],
			address: otherData[1][2],
			zipCode: otherData[1][3],
			state: otherData[1][4],
			phone: otherData[1][5],
			dateDelivered: otherData[1][6],
			timeDelivered: otherData[1][7],
		},
		aditional: {
			weightDeclared: otherData[2][0],
			numberOfPieces: otherData[2][1],
			service: otherData[2][2],
			sign: otherData[2][3],
		},
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].location} - ${events[0].status}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
