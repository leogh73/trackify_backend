import got from 'got';
import vars from '../modules/crypto-js.js';
import db from '../modules/mongodb.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consult = await got(`${vars.VIACARGO_API_URL}${code}`, {
		headers: {
			'content-type': 'application/json',
			origin: 'https://formularios.viacargo.com.ar',
			referer: `https://formularios.viacargo.com.ar/seguimiento-envio/${code}`,
			'public-key': vars.VIACARGO_PUBLIC_KEY,
		},
	});

	let result = JSON.parse(consult.body);

	if (!result.ok.length) {
		return { error: 'No data' };
	}

	let data = result.ok[0].objeto;

	let startEventsList = data.listaEventos.map((e) => {
		let splittedDate = e.fechaEvento.split(' ')[0].split('/');
		let splittedTime = e.fechaEvento.split(' ')[1].split(':');
		return {
			dateObject: Date(
				splittedDate[2],
				splittedDate[1] - 1,
				splittedDate[0],
				splittedTime[0],
				splittedTime[1],
			),
			date: e.fechaEvento.split(' ')[0],
			time: e.fechaEvento.split(' ')[1],
			location: e.deleNombre,
			status: e.descripcion,
		};
	});

	startEventsList.sort((e1, e2) => e2.dateObject - e1.dateObject);

	let eventsList = startEventsList.map((e) => {
		delete e.dateObject;
		return e;
	});

	let destination = {
		'Nombre del destinatario': utils.capitalizeText(false, data.nombreDestinatario),
		'DNI del destinatario': data.nitDestinatario,
		Dirección: utils.capitalizeText(false, data.direccionDestinatario),
		'Código postal': data.codigoPostalDestinatario,
		Localidad: data.poblacionDestinatario,
		Provincia: data.nombreProvinciaDestinatario,
		Teléfono: data.telefonoDestinatario,
		'Fecha de entrega': `${
			data.fechaHoraEntrega?.split(' ')[0] ? data.fechaHoraEntrega.split(' ')[0] : 'Sin datos'
		}`,
		'Hora de entrega': `${
			data.fechaHoraEntrega?.split(' ')[1] ? data.fechaHoraEntrega.split(' ')[1] : 'Sin datos'
		}`,
	};

	if (lastEvent) {
		let response = services.updateResponseHandler(eventsList, lastEvent);
		if (response.lastEvent) {
			response.destination = {
				dateDelivered: destination['Fecha de entrega'],
				timeDelivered: destination['Hora de entrega'],
			};
			response.moreData = [
				{
					title: 'DESTINO',
					data: destination,
				},
			];
		}
		return response;
	}

	let origin = {
		Nombre: utils.capitalizeText(false, data.nombreRemitente),
		DNI: data.nitRemitente,
		Dirección: utils.capitalizeText(false, data.direccionRemitente),
		'Código postal': data.codigoPostalRemitente,
		Localidad: data.poblacionRemitente,
		Fecha: data.fechaHoraAdmision.split(' ')[0],
		Hora: data.fechaHoraAdmision.split(' ')[1],
	};

	let otherData = {
		'Peso declarado': `${data.kilos + ' kg.'}`,
		'Número de piezas': data.numeroTotalPiezas,
		Servicio: utils.capitalizeText(false, data.descripcionServicio),
		Firma: `${data.nifQuienRecibe ? data.nifQuienRecibe : '-'}`,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'DESTINO',
				data: destination,
			},
			{
				title: 'ORIGEN',
				data: origin,
			},
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 12 && /^\d+$/.test(code) && code.slice(0, 4) === '9990') {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
