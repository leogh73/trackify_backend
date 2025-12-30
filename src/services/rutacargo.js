import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let consult = await got.post(vars.RUTACARGO_API_URL, {
		form: {
			tipoguia: cleanCode.slice(0, 1),
			nrosuc: cleanCode.slice(1, 5),
			nroguia: cleanCode.slice(5),
		},
	});
	const $ = load(consult.body.trim());

	let rowDateTime = [];
	$(
		'body > div > div > div.col-xs-10.col-xs-offset-1.col-sm-8.col-sm-offset-2 > ul > li > div.timeline-info > span',
	).each(function () {
		rowDateTime.push($(this).text());
	});

	let rowDetail = [];
	$(
		'body > div > div > div.col-xs-10.col-xs-offset-1.col-sm-8.col-sm-offset-2 > ul > li > div.timeline-content > p',
	).each(function () {
		rowDetail.push($(this).text().split('\n')[1].trim());
	});

	if (
		$('body > div > div > div.col-xs-10.col-xs-offset-1.col-sm-8.col-sm-offset-2 > h3').text() ===
		'No se registran movimientos para el comprobante enviado'
	) {
		return { error: 'No data' };
	}

	let eventsList = rowDateTime
		.map((e, i) => {
			let date = e.split(' , ')[0];
			let time = e.split(' , ')[1];
			return { date, time, detail: rowDetail[i] };
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://www.rutacargo.com.ar/#seguimiento',
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (
		code.length === 13 &&
		code.slice(5, 8) === '000' &&
		/^\d+$/.test(code.slice(0, 1)) === false &&
		/^\d+$/.test(code.slice(1, 2))
	) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
