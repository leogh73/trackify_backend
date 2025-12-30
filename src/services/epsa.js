import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let response1 = await got(vars.EPSA_API_URL1);
	const $ = load(response1.body);
	let token = $('head > meta[name="csrf-token"]').attr('content');

	let response2 = await got(vars.EPSA_API_URL2.replace('code', code).replace('TOKEN', token));
	let result = JSON.parse(response2.body);

	if (result.mensaje === 'Tracker no encontrado.') {
		return { error: 'No data' };
	}

	let eventsList = result.guia.fechas.map((f) => {
		return {
			date: f.fecha,
			time: f.hora,
			status: utils.capitalizeText(false, f.estado),
		};
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://epresis.epsared.com.ar/seguimiento',
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 7 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
