import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(`${vars.ENCOTRANS_API_URL}`, {
		form: {
			tipo: splittedCode[0],
			sucursal: splittedCode[1],
			numero: splittedCode[2],
		},
	});

	if (consult.body === '3') return { error: 'No data' };

	const $ = load(consult.body.trim());

	let rowList = [];
	$('#classTable > tbody > tr > td').each(function () {
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
				date: e[1].split(' ')[0],
				time: e[1].split(' ')[1],
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
