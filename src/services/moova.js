import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(vars.MOOVA_API_URL.replace('code', code));
	} catch (error) {
		if (error.response.statusCode === 404) {
			return { error: 'No data' };
		}
	}

	let result = JSON.parse(consult.body);

	let { address_to, to_contact, status_history, company, courier } = result;

	const formatter = new Intl.DateTimeFormat('es-AR', {
		year: '2-digit',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: 'America/Buenos_Aires',
		timeZoneName: 'short',
	});

	let eventsList = status_history.map((e) => {
		let newDate = formatter
			.format(new Date(e.created_at + '+0000'))
			.split(' ART')[0]
			.split(', ');
		return {
			date: newDate[0],
			time: newDate[1],
			detail: eventTranslate(e.status),
		};
	});

	let otherData = {
		Destinatario: to_contact,
		'Dirección de destinatario': address_to.formatted_address,
		Remitente: company.name,
		Conductor: courier.name,
	};

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function eventTranslate(text) {
	switch (text) {
		case 'DRAFT':
			return 'Ingresado';
		case 'READY':
			return 'Listo';
		case 'CONFIRMED':
			return 'Confirmado';
		case 'ATPICKUPPOINT':
			return 'En punto de recogida';
		case 'PICKEDUP':
			return 'Recogido';
		case 'INTRANSIT':
			return 'En tránsito';
		case 'INCIDENCE':
			return 'Incidencia';
		case 'DELIVERED':
			return 'Entregado';
		default:
			return 'Sin datos';
	}
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 32) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
