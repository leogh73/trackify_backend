import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';
import { load } from 'cheerio';
import { dateAndTime } from '../modules/luxon.js';

async function check(code, lastEvent) {
	let consult = await got(`${vars.OCASA_API_URL}${code}`, {
		https: {
			rejectUnauthorized: false,
		},
	});

	console.log(vars.OCASA_API_URL);

	const $ = load(consult.body);

	let rowEvents = [];
	$('#lineatiempo > p').each(function () {
		rowEvents.push($(this).text().trim());
	});

	if (
		$(
			'body > div > div.row.mb-2 > div.tiempo.col-lg-6.col-sm-12 > div > div.card-body.cardtimeline > h4',
		).text() === 'No hay registros para mostrar.'
	) {
		return { error: 'No data' };
	}

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
		Remitente: otherData1[1],
		Destinatario: utils.capitalizeText(false, otherData1[3]),
		Direccion: utils.capitalizeText(false, otherData2[0]),
	};

	let eventsList = [];
	let chunkSize = 3;
	for (let i = 0; i < rowEvents.length; i += chunkSize) {
		let chunk = rowEvents.slice(i, i + chunkSize);
		let month = utils.convertMonthToNumber('spanish', chunk[1].split(' - ')[0].split('/')[1]);
		let day = chunk[1].split(' - ')[0].split('/')[0];
		let year = dateAndTime().date.split('/')[2];
		let event = {
			date: day + '/' + month + '/' + year,
			time: chunk[1].split(' - ')[1].split(' hs.')[0],
			detail: `${chunk[0]} - ${chunk[2]}`,
		};
		eventsList.push(event);
	}

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: `https://tracking.ocasa.com/TrackingOnline/index?airbillnumber=${code}`,
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 15 && code.slice(0, 4) === 'mlar' && code.slice(-2) === 'ex') {
		pass = true;
	}
	if (code.length === 13 && /^\d+$/.test(code.slice(0, 2)) === false) {
		pass = true;
	}
	if (code.length === 11 && /^\d+$/.test(code.slice(2)) === false) {
		pass = true;
	}
	if (code.length === 11 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
