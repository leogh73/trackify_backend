import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(`${vars.DHL_API_URL}${code}`, {
			headers: {
				Accept: 'application/json',
				'DHL-API-Key': `${vars.DHL_API_KEY}`,
			},
		});
	} catch (error) {
		if (JSON.parse(error.response.body).detail === 'No shipment with given tracking number found.')
			return { error: 'No data' };
	}
	let result = JSON.parse(consult.body).shipments[0];

	let eventsList = result.events.map((e) => {
		return {
			date: convertDate(e.timestamp.split('T')[0]),
			time: e.timestamp.split('T')[1].split(':00')[0],
			location: e.location.address.addressLocality,
			description: translateText(e.description),
		};
	});

	const { id, service, origin, destination, status, details } = result;

	let shippingStatus = {
		Fecha: convertDate(status.timestamp.split('T')[0]),
		Hora: status.timestamp.split('T')[1],
		Ubicación: status.location.address.addressLocality,
		'Más detalles': 'Sin datos',
		'Próximo paso': 'Sin datos',
		'Código de estado': translateText(status.statusCode),
		Estado: translateText(status.status),
		Descripción: translateText(status.description),
	};

	if (lastEvent) {
		if (result.status.remark !== undefined) {
			shippingStatus['Más detalles'] = translateText(result.status.remark);
			shippingStatus['Próximo paso'] = translateText(result.status.nextSteps);
		}

		let response = services.updateResponseHandler(eventsList, lastEvent);

		if (response.lastEvent) {
			response.moreData = [
				{
					title: 'ESTADO DE ENVIO',
					data: shippingStatus,
				},
			];
		}

		return response;
	}

	let shippingDetail = {
		Número: id,
		Servicio: service,
		Origen: origin.address.addressLocality,
		Destino: destination.address.addressLocality,
	};

	if (status.remark) {
		shipping.status.moreDetails = translateText(status.remark);
		shipping.status.nextStep = translateText(status.nextSteps);
	}

	let detailsData = {
		'Cantidad de piezas': details.totalNumberOfPieces,
		'Números de piezas': details.pieceIds,
		'Link de firma': 'Sin datos',
		'Link de documento': 'Sin datos',
		Fecha: 'Sin datos',
		Hora: 'Sin datos',
		'Tipo de firma': 'Sin datos',
		'Firmado por': 'Sin datos',
	};

	if (details.proofOfDelivery) {
		detailsData['Link de firma'] = details.proofOfDelivery.signatureUrl;
		detailsData['Link de documento'] = details.proofOfDelivery.documentUrl;
		if (details.proofOfDelivery.timestamp) {
			detailsData.Fecha = convertDate(details.proofOfDelivery.timestamp.split('T')[0]);
			detailsData.Hora = details.proofOfDelivery.timestamp.split('T')[1];
		}
		if (details.proofOfDelivery.signed) {
			detailsData['Tipo de firma'] = result.details.proofOfDelivery.signed.type;
			detailsData['Firmado por'] = result.details.proofOfDelivery.signed.name;
		}
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'DETALLE DE ENVIO',
				data: shippingDetail,
			},
			{
				title: 'ESTADO DE ENVIO',
				data: shippingStatus,
			},
			{
				title: 'DETALLE',
				data: detailsData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };

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
		dateToday.getDate() +
		'/' +
		(dateToday.getMonth() + 1).toString().padStart(2, 0) +
		'/' +
		dateToday.getFullYear();
	return newDate;
}
