import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(vars.FONO_PACK_API_URL, {
		form: {
			comp: splittedCode[0],
			suc: splittedCode[1],
			nro: splittedCode[2],
		},
	});
	const $ = load(consult.body.trim());

	let rowList = [];
	$('div > div > div > div > table > tbody > tr > td').each(function () {
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
				time: e[1].split(' hs.')[0],
				detail: e[2],
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

function testCode(code) {
	let pass = false;
	if (code.length === 8 && !/^\d+$/.test(code.slice(0, 1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
