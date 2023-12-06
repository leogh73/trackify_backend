import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got.post(`${vars.VIACARGO_API_URL}${code}`);
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		if (response.body === 'No encontrado') return { error: 'No data' };
	}
	let result = JSON.parse(consult.body).ok[0].objeto;

	let eventsList = result.listaEventos.map((e) => {
		return {
			date: e.fechaEvento.split(' ')[0],
			time: e.fechaEvento.split(' ')[1],
			location: e.deleNombre,
			status: e.descripcion,
		};
	});

	let destination = {
		'Nombre del destinatario': services.capitalizeText(false, result.nombreDestinatario),
		'DNI del destinatario': result.nitDestinatario,
		Dirección: services.capitalizeText(false, result.direccionDestinatario),
		'Código postal': result.codigoPostalDestinatario,
		Provincia: result.poblacionDestinatario,
		Teléfono: result.telefonoDestinatario,
		'Fecha de entrega': `${
			result.fechaHoraEntrega?.split(' ')[0] ? result.fechaHoraEntrega.split(' ')[0] : 'Sin datos'
		}`,
		'Hora de entrega': `${
			result.fechaHoraEntrega?.split(' ')[1] ? result.fechaHoraEntrega.split(' ')[1] : 'Sin datos'
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
		Nombre: services.capitalizeText(false, result.nombreRemitente),
		DNI: result.nitRemitente,
		Dirección: services.capitalizeText(false, result.direccionRemitente),
		'Código postal': result.codigoPostalRemitente,
		Provincia: result.poblacionRemitente,
		Fecha: result.fechaHoraAdmision.split(' ')[0],
		Hora: result.fechaHoraAdmision.split(' ')[1],
	};

	let otherData = {
		'Peso declarado': `${result.kilos + ' kg.'}`,
		'Número de piezas': result.numeroTotalPiezas,
		Servicio: services.capitalizeText(false, result.descripcionServicio),
		Firma: `${result.nifQuienRecibe ? result.nifQuienRecibe : '-'}`,
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

export default { check };
