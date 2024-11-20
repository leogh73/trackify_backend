import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let dividedCode = code.split('-');
	let consult = await got.post(vars.CENTRAL_DE_CARGAS_TERRESTRES_API_URL, {
		form: {
			tipo: dividedCode[0],
			suc: dividedCode[1],
			guia: dividedCode[2],
		},
	});

	if (consult.body.startsWith('No se ha encontrado ningun registro!')) {
		return { error: 'No data' };
	}

	const $ = load(consult.body);

	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	let eventsData = [];
	let chunkSize = 3;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsData.push(rowList.slice(i, i + chunkSize));
	}

	let eventsList = eventsData
		.map((e) => {
			return {
				date: e[0],
				time: e[1],
				detail: e[2].includes('�') ? e[2].replace('�', 'ó') : e[2],
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
