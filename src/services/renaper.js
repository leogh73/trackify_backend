import got from 'got';
import vars from '../modules/crypto-js.js';
import luxon from '../modules/luxon.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got.post(`${vars.PLAYWRIGHT_API_URL}/api`, {
		json: { service: 'Renaper', code },
	});
	let result = JSON.parse(consult.body);

	if (result.errors?.title === 'Número de trámite incorrecto, no se encontró información.')
		return { error: 'No data' };

	let {
		fecha_ultimo_estado,
		descripcion_ultimo_estado,
		oficina_remitente,
		correo,
		descripcion_tramite,
		clase_tramite,
		tipo_dni,
	} = result.data;

	let paperKind = {
		Nombre: descripcion_tramite,
		Clase: services.capitalizeText(false, clase_tramite),
		'Tipo de DNI': services.capitalizeText(false, tipo_dni),
		Correo: correo,
	};

	let senderOffice = {
		Nombre: services.capitalizeText(false, oficina_remitente.descripcion),
		Dirección: services.capitalizeText(false, oficina_remitente.domicilio),
		'Código postal': services.capitalizeText(false, oficina_remitente.codigo_postal),
		Provincia: services.capitalizeText(false, oficina_remitente.provincia),
	};

	let eventsPresent = result.data.tramitesUI[0].historico ? true : false;

	let event = {
		date: fecha_ultimo_estado.split('-').reverse().join('/'),
		time: luxon.getTime(),
		status: services.capitalizeText(false, descripcion_ultimo_estado),
	};

	let eventsList = eventsPresent
		? result.data.tramitesUI[0].historico.map((event) => {
				return {
					date: event.FechaCambio.split(' ')[0].split('-').join('/'),
					time: event.FechaCambio.split(' ')[1],
					status: services.capitalizeText(true, event.EstadoMotivo),
				};
		  })
		: [event];

	if (lastEvent)
		return eventsPresent
			? services.updateResponseHandler(eventsList, lastEvent)
			: { events: event.status === lastEvent.split(' - ')[2] ? [] : [event] };

	return {
		events: eventsList,
		moreData: [
			{ title: 'TRÁMITE', data: paperKind },
			{ title: 'OFICINA REMITENTE', data: senderOffice },
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
