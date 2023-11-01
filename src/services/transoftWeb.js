import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	// let consult = await got.post(`${vars.PLAYWRIGHT_API_URL}/api`, {
	// 	json: { service: 'Transoft Web', code },
	// });
	let consult = await got.post(`http://localhost:5000/api`, {
		json: { service: 'Transoft Web', code },
	});

	const $ = load(JSON.parse(consult.body));

	if ($('#lblMensajesGenericos').text() === 'No se encontraron resultados para tu búsqueda.')
		return { error: 'No data' };

	let rowList = [];
	$('#gvHistorialDeEstados_DXMainTable > tbody > tr > td').each(function () {
		rowList.push($(this).text());
	});

	let eventsDataTotal = [];
	let chunkSize = 3;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsDataTotal.push(rowList.slice(i, i + chunkSize));
	}
	let eventsData = eventsDataTotal.slice(2, eventsDataTotal.length - 1);
	let eventsList = eventsData.map((e) => {
		return {
			date: e[1].split(' ')[0],
			time: e[1].split(' ')[1],
			detail: e[0],
		};
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}
export default { check };
