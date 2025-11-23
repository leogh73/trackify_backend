import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let consult = await got.post(
		vars.ECAPACK_API_URL.replace('dividedCode0', cleanCode.slice(0, 2))
			.replace('dividedCode1', cleanCode.slice(2, 5))
			.replace('dividedCode2', cleanCode.slice(6)),
	);

	const $ = load(consult.body);

	if ($('div:nth-child(3) > p:nth-child(1) > strong').text() === 'Busqueda sin Resultado') {
		return { error: 'No data' };
	}

	let rowList = [];
	$('body > div > table > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	let eventsList = [];
	let chunkSize = 4;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		let chunk = rowList.slice(i, i + chunkSize);
		let date = chunk[0].split('Fecha: : ')[1].split(' ')[0].split('-').join('/');
		let time = chunk[0].split('Fecha: : ')[1].split(' ')[1];
		let location = chunk[1].split('- ')[0].split('Lugar: ')[1].split('-').join(' - ');
		let sign = chunk[3].split(':').join(': ');
		if (!chunk[3].length) sign = 'Sin datos';
		let event = {
			date,
			time,
			location,
			sign,
		};
		eventsList.push(event);
	}
	eventsList.reverse();

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
	if (code.length === 10 && !/^\d+$/.test(code.slice(0, 2))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
