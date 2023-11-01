import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got.post(`${vars.SOUTH_POST_API_URL}`, {
			json: { nro_guia: code },
		});
	} catch (error) {
		return {
			error:
				JSON.parse(error.response.body).mensaje === 'Tracker no encontrado.'
					? 'No data'
					: error.toString(),
		};
	}
	let result = JSON.parse(consult.body);

	let eventsList = result.data.guia.fechas.map((e) => {
		return {
			date: e.fecha,
			time: e.hora,
			status:
				e.codigo_estado === 152
					? 'Visitas reiteradas. Tu pedido fue devuelto a nuestro depósito. Para más información comunicate con el equipo de atención al cliente.'
					: e.estado
							.toLowerCase()
							.split(' ')
							.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
							.join(' '),
		};
	});

	let receiver = result.data.guia.fechas[0].receptor
		? result.data.guia.fechas[0].receptor
				.toLowerCase()
				.split(' ')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ')
		: 'Sin datos';

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{
				title: 'RECEPTOR',
				data: { Fecha: receiver },
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
