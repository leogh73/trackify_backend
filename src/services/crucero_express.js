import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(`${vars.CRUCERO_EXPRESS_API_URL}`, {
		form: {
			tipoguia: splittedCode[0],
			nrosuc: splittedCode[1],
			nroguia: splittedCode[2],
		},
	});
	const $ = load(consult);

	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	if (!rowList.length) return { error: 'No data' };

	let eventsData = [];
	let chunkSize = 2;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsData.push(rowList.slice(i, i + chunkSize));
	}

	let eventsList = eventsData
		.map((e) => {
			return {
				date: e[0].split(' ')[0].split('-').reverse().join('/'),
				time: e[0].split(' ')[1],
				detail: e[1],
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
