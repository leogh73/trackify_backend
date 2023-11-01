import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got(`${vars.OCASA_API_URL}${code}`, {
		https: {
			rejectUnauthorized: false,
		},
	});
	const $ = load(consult.body);

	let rowList = [];
	$('#griddetalle > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});
	let trackingNumber = $('label#lblseguimiento.text-gris').text();

	if (rowList[0] === 'No hay registros para mostrar') return { error: 'No data' };

	let eventsList = [];
	let chunkSize = 3;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		let chunk = rowList.slice(i, i + chunkSize);
		let newChunk = [];
		chunk.forEach((c) => newChunk.push(c.trim()));
		newChunk = newChunk.slice(0, 2);
		let event = {
			date: newChunk[0].split(' ')[0],
			time: newChunk[0].split(' ')[1],
			detail: newChunk[1],
		};
		eventsList.push(event);
	}

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let response = {
		events: eventsList,
		moreData: [
			{
				title: 'ENVIO',
				data: { Número: trackingNumber },
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};

	response = { ...response, trackingNumber: trackingNumber };

	return response;
}

export default { check };
