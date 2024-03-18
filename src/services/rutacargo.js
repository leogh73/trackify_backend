import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(`${vars.RUTACARGO_API_URL}`, {
		form: {
			tipoguia: splittedCode[0],
			nrosuc: splittedCode[1],
			nroguia: splittedCode[2],
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
	)
		return { error: 'No data' };

	let eventsList = rowDateTime
		.map((e, i) => {
			let date = e.split(' , ')[0];
			let time = e.split(' , ')[1];
			return { date, time, detail: rowDetail[i] };
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
