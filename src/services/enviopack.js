import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(`${vars.ENVIOPACK_API_URL}${code}`, {
			headers: {
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br, zstd',
				'Accept-Language': 'es-419,es;q=0.9',
			},
		});
	} catch (error) {
		if (error.response.statusCode === 404) {
			return { error: 'No data' };
		}
	}

	let result = JSON.parse(consult.body);

	const { tracking, correo, localidad, provincia, fecha_estimada_de_entrega } = result[0];

	let eventsList = tracking.map((e) => {
		let time = e.fecha.substr(e.fecha.length - 5);
		let year = fecha_estimada_de_entrega.split('/')[2];
		let splittedDate = e.fecha.split(time)[0].trim().split(' de ');
		let month = utils.getMonthNumber['spanish'][splittedDate[1]];
		return {
			date: `${splittedDate[0]}/${month}/${year}`,
			time,
			detail: e.mensaje,
		};
	});
	eventsList.reverse();

	let otherData = {
		Servicio: correo?.nombre ?? 'Sin datos',
		Teléfono: correo?.telefono ?? 'Sin datos',
		Localidad: localidad,
		Provincia: provincia,
		'Fecha estimada de entrega': fecha_estimada_de_entrega,
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

function testCode(code) {
	let pass = false;
	if (code.length === 12 && !/^\d+$/.test(code.slice(0, 2)) && !/^\d+$/.test(code.slice(-1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
