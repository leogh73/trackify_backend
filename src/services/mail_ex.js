import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got(`${vars.MAIL_EX_API_URL}${code}`);

	const $ = load(consult.body);

	let rowStatus = [];
	$(
		'table > tbody > tr > td.col-md-8 > div.d-flex.mb-2.justify-content-start.align-items-center > div',
	).each(function () {
		rowStatus.push($(this).text());
	});

	if (!rowStatus.length) return { error: 'No data' };

	let rowDate = [];
	$('table > tbody > tr > td > div.mx-tracker__date').each(function () {
		rowDate.push($(this).text());
	});

	let rowTime = [];
	$('table > tbody > tr > td > div.mx-tracker__time').each(function () {
		rowTime.push($(this).text());
	});

	let rowDetail = [];
	$('table > tbody > tr > td > div.mx-tracker__leyend').each(function () {
		rowDetail.push($(this).text());
	});

	let eventsList = rowStatus.map((status, i) => {
		return {
			date: rowDate[i].split('-').reverse().join('/'),
			time: rowTime[i],
			status: services.capitalizeText(false, status),
			detail: rowDetail[i].length ? rowDetail[i] : 'Sin datos',
		};
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
