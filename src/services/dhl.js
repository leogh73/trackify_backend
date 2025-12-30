import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent, extraData) {
	let selectLanguage = {
		Español: 'es',
		English: 'en',
	};
	let language = selectLanguage[extraData.language] ?? 'es';
	let consult;
	try {
		consult = await got(`${vars.DHL_API_URL}${code}&language=${language}`, {
			headers: {
				Accept: 'application/json',
				'DHL-API-Key': `${vars.DHL_API_KEY}`,
			},
		});
	} catch (error) {
		if (
			JSON.parse(error.response.body).detail === 'No shipment with given tracking number found.'
		) {
			return { error: 'No data' };
		}
	}
	let result = JSON.parse(consult.body).shipments[0];

	let startEventsList = result.events.map((e) => {
		let { date, time } = utils.dateStringHandler(e.timestamp);
		return {
			date,
			time,
			location: e.location.address.addressLocality,
			description: e.description.trim(),
		};
	});

	let eventsList = utils.sortEventsByDate(startEventsList);

	const { id, status, details, service, origin, destination } = result;

	let { date, time } = utils.dateStringHandler(status.timestamp);

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

	let shippingDetail = origin
		? {
				Número: id,
				Servicio: service,
				Origen: origin.address.addressLocality,
				Destino: destination.address.addressLocality,
		  }
		: { 'Sin datos': 'Sin datos' };

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
			detailsData.Fecha = utils.dateStringHandler(details.proofOfDelivery.timestamp);
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
		url: `https://www.dhl.com/ar-es/home/rastreo.html?tracking-id=${code}&submit=1`,
		extraData: { ...extraData, language: extraData.language ?? 'Español' },
	};
}

const patterns = [
	// Specific DHL patterns to avoid conflicts
	new RegExp(/^[A-Z]{3}\d{7}$/i), // DHL eCommerce (3 letters + 7 digits)
	new RegExp(/^[A-Z]{2}\d{16,18}$/i), // DHL eCommerce GM format
	new RegExp(/^GM\d{16}$/), // DHL Global Mail
	new RegExp(/^J[A-Z]{2}\d{10}$/i), // DHL Global Forwarding
	new RegExp(/^\d{4}[- ]\d{4}[- ]\d{2}$/), // DHL formatted - require separators
	new RegExp(/^[1-7]\d{9}$/), // DHL Express (10 digits) - avoid 8xxx and 9xxx
	new RegExp(/^[1-7]\d{10}$/), // DHL Express extended (11 digits)
	// Legacy pattern - consolidated to avoid duplicates
	new RegExp(/^[1-7]\d{2}[- ]\d{8}$/), // Legacy DHL with separators
];

function testCode(code) {
	let pass = false;
	for (let pattern of patterns) {
		if (pattern.test(code)) {
			return true;
		}
	}
	return pass;
}

export default { check, testCode };
