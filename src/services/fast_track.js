import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let response1 = await got(`${vars.FASTTRACK_API_URL1}`);
	const $ = load(response1.body);
	let token = $('head > meta[name="csrf-token"]').attr('content');

	let response2 = await got(
		`${vars.FASTTRACK_API_URL2.replace('code', code).replace('TOKEN', token)}`,
	);
	let result = JSON.parse(response2.body);

	if (result.mensaje === 'Tracker no encontrado.') return { error: 'No data' };

	let eventsList = result.guia.fechas.map((f) => {
		return {
			date: f.fecha,
			time: f.hora,
			status: f.estado,
		};
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
