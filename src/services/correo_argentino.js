import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	// let consult = await got(`${vars.CORREO_ARGENTINO_API_URL}${code}`);

	let consult = await got.post(`http://localhost:5000/api`, {
		json: { service: 'Correo Argentino', code },
	});

	const $ = load(consult.body);

	if ($('body > div.container > div.alert.alert-danger.col-12.text-center').text().length)
		return { error: 'No data' };

	let rowsList = [];
	$('#no-more-tables > table > tbody > tr > td').each(function () {
		rowsList.push($(this).text());
	});

	let eventsList = [];
	let chunkSize = 4;
	for (let i = 0; i < rowsList.length; i += chunkSize) {
		let chunk = rowsList.slice(i, i + chunkSize);
		let date = chunk[0].split(' ')[0].split('-').join('/');
		let time = chunk[0].split(' ')[1];
		let condition = services.capitalizeText(false, chunk[3]);
		if (!condition.length) condition = 'Sin datos';
		let event = {
			date,
			time,
			location: chunk[1],
			description: chunk[2],
			condition,
		};
		eventsList.push(event);
	}

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
