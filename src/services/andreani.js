import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult1;
	try {
		consult1 = await got(vars.ANDREANI_API_URL1.replace('code', code));
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		if (JSON.parse(response.body).message === 'Envío no encontrado') {
			return { error: 'No data' };
		}
	}

	let resultEvents = JSON.parse(consult1.body);

	let eventsList = resultEvents.map((e) => {
		let motive = 'Sin datos';
		let location = 'Sin datos';
		if (e.motivo) {
			motive = e.motivo;
		}
		if (e.sucursal.trim(' ').length) {
			location = e.sucursal;
		}
		return {
			date: e.fecha.dia.split('-').join('/'),
			time: e.fecha.hora,
			location: location,
			status: e.estado,
			motive: motive,
		};
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let consult2 = await got(`${vars.ANDREANI_API_URL2}${code}`);
	let resultOtherData = JSON.parse(consult2.body);

	let {
		fechaDeAlta,
		remitente,
		servicio,
		sucursal_custodia,
		direccion_sucursal_custodia,
		horario_sucursal_custodia,
		nombreSucursalDistribucion,
	} = resultOtherData;

	let otherData = {
		'Fecha de alta': `${fechaDeAlta.split(' ')[0].split('-').reverse().join('/')} - ${
			fechaDeAlta.split(' ')[1]
		}`,
		Remitente: remitente,
		Servicio: servicio,
		'Sucursal de custodia': sucursal_custodia ?? nombreSucursalDistribucion,
		'Dirección de sucursal': direccion_sucursal_custodia ?? 'Sin datos',
		'Horario de atención': horario_sucursal_custodia ?? 'Sin datos',
	};

	let response = {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};

	return response;
}

function testCode(code) {
	let pass = false;
	if (code.length === 15 && code.slice(2, 5) === '000' && code.slice(-1) === '0') {
		pass = true;
	}
	if (code.length === 9 && !/^\d+$/.test(code.slice(0))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
