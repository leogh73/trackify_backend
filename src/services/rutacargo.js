import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(`${vars.RUTACARGO_API_URL}`, {
		form: {
			tipoguia: splittedCode[0],
			nrosuc: splittedCode[1],
			nroguia: splittedCode[2],
		},
	});
	const $ = load(consult.body.trim());

	let rowList = [];
	$('body > table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	if (!rowList.length) return { error: 'No data' };

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
				detail: e[2],
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
