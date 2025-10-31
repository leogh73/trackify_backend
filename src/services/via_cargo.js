import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let splittedData = vars.VIACARGO_API_URL.split('----');

	let consult = await got(`${splittedData[0]}${code}`, {
		headers: {
			'content-type': 'application/json',
			origin: 'https://formularios.viacargo.com.ar',
			referer: `https://formularios.viacargo.com.ar/seguimiento-envio/${code}`,
			'public-key': splittedData[1],
		},
	});

	let result = JSON.parse(consult.body);

	if (!result.ok.length) {
		return { error: 'No data' };
	}

	let data = result.ok[0].objeto;

	let eventsList = data.listaEventos.map((e) => {
		return {
			date: e.fechaEvento.split(' ')[0],
			time: e.fechaEvento.split(' ')[1],
			location: e.deleNombre,
			status: e.descripcion,
		};
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
