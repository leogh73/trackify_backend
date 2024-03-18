import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got.post(`${vars.PLAYWRIGHT_API_URL}/api`, {
		json: { service: 'Enviopack', code },
	});
	let result = JSON.parse(consult.body);

	if (result.message === 'No existe un envío con el nº de tracking informado')
		return { error: 'No data' };

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
		Servicio: correo.nombre ?? 'Sin datos',
		Teléfono: correo.telefono ?? 'Sin datos',
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
