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

	let rowEvents = [];
	$('#lineatiempo > p').each(function () {
		rowEvents.push($(this).text().trim());
	});

	if (
		$(
			'body > div > div.row.mb-2 > div.tiempo.col-lg-6.col-sm-12 > div > div.card-body.cardtimeline > h4',
		).text() === 'No hay registros para mostrar.'
	)
		return { error: 'No data' };

	let selector =
		'body > div > div.row.mb-2 > div.detalle.col-lg-6.col-sm-12 > div > div > div.col-md-7 > div > ';
	let otherData1 = [];
	$(`${selector}div.mb-1`).each(function () {
		otherData1.push($(this).text().trim());
	});
	let otherData2 = [];
	$(`${selector}p`).each(function () {
		otherData2.push($(this).text().trim());
	});

	let otherData = {
		Origen: services.capitalizeText(false, otherData1[1]),
		Destino: services.capitalizeText(false, otherData1[3]),
		Direccion: services.capitalizeText(false, otherData2[0]),
	};

	let eventsList = [];
	let chunkSize = 3;
	for (let i = 0; i < rowEvents.length; i += chunkSize) {
		let chunk = rowEvents.slice(i, i + chunkSize);
		let event = {
			date: chunk[1].split(' - ')[0],
			time: chunk[1].split(' - ')[1].split(' hs.')[0],
			detail: `${chunk[0]} - ${chunk[2]}`,
		};
		eventsList.push(event);
	}

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
