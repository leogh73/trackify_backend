import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(`${vars.DHL_API_URL}${code}&language=es`, {
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
		let { date, time } = services.dateStringHandler(e.timestamp);
		return {
			date,
			time,
			location: e.location.address.addressLocality,
			description: e.description.trim(),
		};
	});

	const { id, service, origin, destination, status, details } = result;

	let { date, time } = services.dateStringHandler(status.timestamp);

	let shippingStatus = {
		Fecha: date,
		Hora: time,
		Ubicación: status.location.address.addressLocality,
		'Más detalles': status.remark ?? 'Sin datos',
		'Próximo paso': status.nextSteps ?? 'Sin datos',
		'Código de estado': status.statusCode,
		Estado: status.status,
		Descripción: status.description,
	};

	if (lastEvent) {
		if (result.status.remark !== undefined) {
			shippingStatus['Más detalles'] = result.status.remark;
			shippingStatus['Próximo paso'] = result.status.nextSteps;
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
			detailsData.Fecha = services.dateStringHandler(details.proofOfDelivery.timestamp);
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
