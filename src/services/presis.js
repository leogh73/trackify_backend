import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';
import { load } from 'cheerio';

async function check(code, lastEvent, extraData) {
	let servicesCode = {
		'Correo e-Flet': 'correoflet',
		'Envíos Hijos de Gutiérrez': 'gutierrez',
		FastTrack: 'fasttracklv',
		'Fixy Logística': 'fixy',
		Lodi: 'lodi',
		'Mis Entregas': 'misentregas',
		'MG Logística': 'mglogistica',
		ProMail: 'promaillv',
		'Real Express': 'realexpresslv',
		Servijur: 'servijur',
		SmartPost: 'smartpost',
	};

	let url1 = vars.PRESIS_API_URL1.replace('service', servicesCode[extraData.service]);
	let response1 = await got(url1);
	const $ = load(response1.body);
	let token = $('head > meta[name="csrf-token"]').attr('content');

	let url2 = vars.PRESIS_API_URL2.replace('code', code).replace('TOKEN', token);
	let response2 = await got(`${url1}${url2}`);
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
		extraData,
	};
}

function testCode(code) {
	let pass = false;
	if (
		(code.length === 5 && /^\d+$/.test(code)) ||
		(code.length === 8 && /^\d+$/.test(code)) ||
		code.length === 9
	) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
