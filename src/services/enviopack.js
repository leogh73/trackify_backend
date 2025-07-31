import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

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
		if (error.response.statusCode === 404) return { error: 'No data' };
	}

	let result = JSON.parse(consult.body);

	const { tracking, correo, localidad, provincia } = result[0];

	let eventsList = tracking.map((e) => {
		let time = e.fecha.substr(e.fecha.length - 5);
		return {
			date: e.fecha.split(time)[0].trim(),
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
	};

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

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

export default { check };
