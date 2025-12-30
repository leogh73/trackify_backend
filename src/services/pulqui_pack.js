import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let consult = await got(
		vars.PULQUI_PACK_API_URL.replace('dividedCode0', cleanCode.slice(0, 4))
			.replace('dividedCode1', cleanCode.slice(4, 5))
			.replace('dividedCode2', cleanCode.slice(5)),
	);
	const $ = load(consult.body);

	let rowList = [];
	$('table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	if (!rowList.length) {
		return { error: 'No data' };
	}

	let eventsChunks = [];
	let chunkSize = 2;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsChunks.push(rowList.slice(i, i + chunkSize));
	}

	let eventsList = eventsChunks.map((event) => {
		return {
			date: event[0],
			time: 'Sin datos',
			description: event[1]
				.toLowerCase()
				.split(' ')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
		};
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://www.pulquipacksrl.com.ar/rastreo-de-envios/',
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 13 && /^\d+$/.test(code.slice(0, 4))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
