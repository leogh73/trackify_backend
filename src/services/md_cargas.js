import got from 'got';
import vars from '../modules/crypto-js.js';
import { dateAndTime } from '../modules/luxon.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let consult = await got.post(vars.MD_CARGAS_API_URL, {
		form: {
			letra: cleanCode.slice(0, 1),
			pv: cleanCode.slice(1, 5),
			nro: cleanCode.slice(5),
		},
	});
	const $ = load(consult.body);
	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	if (rowList[1].length === 1) {
		return { error: 'No data' };
	}

	let { date, time } = dateAndTime();

	let event = { date, time, status: rowList[1].trim() };

	return {
		events: lastEvent ? (event.status === lastEvent.split(' - ')[2] ? [] : [event]) : [event],
		lastEvent: Object.values(event).join(' - '),
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
