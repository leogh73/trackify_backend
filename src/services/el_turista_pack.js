import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got(`${vars.EL_TURISTA_PACK_API_URL}${code}`);

	if (consult.body.trim() === '0') {
		return { error: 'No data' };
	}

	const $ = load(consult.body);

	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	let eventsData = [];
	let chunkSize = 2;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsData.push(rowList.slice(i, i + chunkSize));
	}

	let eventsList = eventsData
		.map((e) => {
			return {
				date: e[0].split(' ')[0].split('-').join('/'),
				time: e[0].split(' ')[1],
				detail: e[1],
			};
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 13 && !/^\d+$/.test(code.slice(0, 1)) && /^\d+$/.test(code.slice(1, 2))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
