import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	console.log(cleanCode.slice(0, 1));
	console.log(cleanCode.slice(1, 5));
	console.log(cleanCode.slice(5));
	let consult = await got.post(vars.ENCOTRANS_API_URL, {
		form: {
			tipo: cleanCode.slice(0, 1),
			sucursal: cleanCode.slice(1, 5),
			numero: cleanCode.slice(5),
		},
	});

	if (consult.body === '3') {
		return { error: 'No data' };
	}

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
