import got from 'got';
import vars from '../modules/crypto-js.js';
import luxon from '../modules/luxon.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let dividedCode = code.split('-');
	let consult = await got.post(`${vars.MD_CARGAS_API_URL}`, {
		form: {
			letra: dividedCode[0],
			pv: dividedCode[1],
			nro: dividedCode[2],
		},
	});
	const $ = load(consult.body);
	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	if (rowList[1].length === 1) return { error: 'No data' };

	let event = { date: luxon.getDate(), time: luxon.getTime(), status: rowList[1].trim() };

	if (lastEvent) {
		return { events: event.status === lastEvent.split(' - ')[2] ? [] : [event] };
	}

	return {
		events: [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

export default { check };
