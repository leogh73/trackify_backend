import vars from '../modules/crypto-js.js';
import got from 'got';

async function check(code, lastEvent) {
	const consult = await got(`${vars.DHL_API_URL.replace('code', code)}`, {
		headers: {
			Accept: 'application/json',
			'DHL-API-Key': `${vars.DHL_API_KEY}`,
		},
	});
	const data = JSON.parse(consult.body).shipments[0];

	let eventsList = data.events.map((e) => {
		return {
			date: convertDate(e.timestamp.split('T')[0]),
			time: e.timestamp.split('T')[1],
			location: e.location.address.addressLocality,
			description: translateText(e.description),
		};
	});

	let response;
	if (!lastEvent) {
		response = startResponse(data, eventsList);
	} else {
		response = updateResponse(data, eventsList, lastEvent);
	}

	return response;
}

function startResponse(data, eventsList) {
	const shipping = {
		id: data.id,
		service: data.service,
		origin: data.origin.address.addressLocality,
		destiny: data.destination.address.addressLocality,
		status: {
			date: convertDate(data.status.timestamp.split('T')[0]),
			time: data.status.timestamp.split('T')[1],
			location: data.status.location.address.addressLocality,
			moreDetails: 'Sin datos',
			nextStep: 'Sin datos',
			statusCode: translateText(data.status.statusCode),
			status: translateText(data.status.status),
			description: translateText(data.status.description),
		},
	};
	if (data.status.remark) {
		shipping.status.moreDetails = translateText(data.status.remark);
		shipping.status.nextStep = translateText(data.status.nextSteps);
	}

	const details = {
		totalPieces: data.details.totalNumberOfPieces,
		pieceIds: data.details.pieceIds,
		signatureUrl: 'Sin datos',
		documentUrl: 'Sin datos',
		date: 'Sin datos',
		time: 'Sin datos',
		signedType: 'Sin datos',
		signedName: 'Sin datos',
	};
	if (data.details.proofOfDelivery) {
		details.signatureUrl = data.details.proofOfDelivery.signatureUrl;
		details.documentUrl = data.details.proofOfDelivery.documentUrl;
		if (data.details.proofOfDelivery.timestamp) {
			details.date = convertDate(data.details.proofOfDelivery.timestamp.split('T')[0]);
			details.time = data.details.proofOfDelivery.timestamp.split('T')[1];
		}
		if (data.details.proofOfDelivery.signed) {
			details.signedType = data.details.proofOfDelivery.signed.type;
			details.signedName = data.details.proofOfDelivery.signed.name;
		}
	}

	let response = {
		events: eventsList,
		shipping,
		details,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].location} - ${eventsList[0].description}`,
	};

	return response;
}

function updateResponse(data, eventsList, lastEvent) {
	const status = {
		date: convertDate(data.status.timestamp.split('T')[0]),
		time: data.status.timestamp.split('T')[1],
		location: data.status.location.address.addressLocality,
		statusCode: translateText(data.status.statusCode),
		status: translateText(data.status.status),
		description: translateText(data.status.description),
	};

	if (data.status.remark !== undefined) {
		status['moreDetails'] = translateText(data.status.remark);
		status['nextStep'] = translateText(data.status.nextSteps);
	}

	let eventsText = eventsList.map(
		(e) => `${e.date} - ${e.time} - ${e.location} - ${e.description}`,
	);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsListFinal = [];
	if (eventIndex) eventsListFinal = eventsList.slice(0, eventIndex);

	let response = { events: eventsListFinal };
	if (eventsListFinal.length) {
		response.status = status;
		response.lastEvent = eventsText[0];
	}

	return response;
}

function translateText(text) {
	if (text.startsWith('Delivered - Signed for by')) {
		text = text.replace('Delivered - Signed for by', 'Envío entregado - Firmado por');
	} else if (text.startsWith('With delivery courier')) {
		text = text.replace('With delivery courier', 'Envío en route de entrega');
	} else if (text.startsWith('Arrived at DHL Delivery Facility')) {
		text = text.replace('Arrived at DHL Delivery Facility', 'Llegado a oficinas de DHL');
	} else if (text.startsWith('Departed Facility in')) {
		text = text.replace('Departed Facility in', 'Salida de un centro de tránsito de DHL en');
	} else if (text.startsWith('Shipment on hold')) {
		text = text.replace('Shipment on hold', 'Envío en espera en centro de DHL.');
	} else if (text.startsWith('Processed at')) {
		text = text.replace('Processed at', 'Procesado en');
	} else if (text.startsWith('Clearance processing complete at')) {
		text = text.replace('Clearance processing complete at', 'Proceso de Aduana finalizado en');
	} else if (text.startsWith('transit')) {
		text = text.replace('transit', 'En tránsito');
	} else if (text.startsWith('DHL needs further information')) {
		text = text.replace(
			'DHL needs further information from the importer.',
			'Para continuar con el proceso de liberación de aduana, se requiere información adicional por parte del destinatario.',
		);
	} else if (text.startsWith('A DHL representative shall attempt')) {
		text = text.replace(
			'A DHL representative shall attempt to contact the importer or please contact DHL Customer Service for further assistance. Customer should contact DHL Customer Service if not reached by DHL',
			'Un representante de DHL obtendrá la información requerida de parte del destinatario para proceder con la liberación de aduana',
		);
	} else if (text.startsWith('Customs status updated')) {
		text = text.replace('Customs status updated', 'Actualización del estatus de aduanas');
	} else if (text.startsWith('Clearance event')) {
		text = text.replace('Clearance event', 'En proceso de liberación de aduana.');
	} else if (text.startsWith('Processed for clearance at')) {
		text = text.replace('Processed for clearance at', 'Proceso de Aduana iniciado en');
	} else if (text.startsWith('Arrived at Sort Facility')) {
		text = text.replace('Arrived at Sort Facility', 'Llegada a un centro de tránsito de DHL en');
	} else if (text.startsWith('Transferred through')) {
		text = text.replace('Transferred through', 'Envío en tránsito por');
	} else if (text.startsWith('Shipment information received')) {
		text = text.replace(
			'Shipment information received',
			'Su envío ha sido generado pero aún no ha sido entregado a DHL.',
		);
	} else if (text.startsWith('delivered')) {
		text = text.replace('delivered', 'Entregado');
	} else if (text.startsWith('Shipment picked up')) {
		text = text.replace('Shipment picked up', 'Envío retirado/recolectado.');
	} else if (text.startsWith('Delivered')) {
		text = text.replace('Delivered', 'Entregado');
	} else if (text.startsWith('Shipment has departed from a DHL facility')) {
		text = text.replace(
			'Shipment has departed from a DHL facility',
			'Envío ha salido de una estación de',
		);
	} else if (text.startsWith('Arrived at DHL Sort Facility')) {
		text = text.replace('Arrived at DHL Sort Facility', 'Envío arribado a una estación de DHL');
	} else if (text.startsWith('Shipment is out with courier for delivery')) {
		text = text.replace(
			'Shipment is out with courier for delivery',
			'Envío en ruta con un mensajero para su entrega',
		);
	}
	return text;
}

function convertDate(date) {
	let dateToday = new Date(date);
	let newDate =
		dateToday.getDate() + '/' + (dateToday.getMonth() + 1) + '/' + dateToday.getFullYear();
	return newDate;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		service: {
			id: otherData[0][0],
			service: otherData[0][1],
			origin: otherData[0][2],
			destiny: otherData[0][3],
		},
		status: {
			date: otherData[1][0],
			time: otherData[1][1],
			location: otherData[1][2],
			moreDetails: otherData[1][3],
			nextStep: otherData[1][4],
			statusCode: otherData[1][5],
			status: otherData[1][6],
			description: otherData[1][7],
		},
		details: {
			totalPieces: otherData[2][0],
			pieceIds: otherData[3][0].split(' - '),
			signatureUrl: otherData[2][1],
			documentUrl: otherData[2][2],
			date: otherData[2][3],
			time: otherData[2][4],
			signedType: otherData[2][5],
			signedName: otherData[2][6],
		},
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].location} - ${eventsList[0].description}`,
	};
}

export default {
	check,
	convertFromDrive,
};
