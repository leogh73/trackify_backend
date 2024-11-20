import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got.post(vars.FLASH_LOGISTICA_POSTAL_API_URL, {
		form: { identificador: code },
	});

	const $ = load(consult.body);

	if (
		$('body > main > article > div > div > p').text().trim() ===
		`No se encontro la pieza ${code} en nuestra base de datos`
	) {
		return { error: 'No data' };
	}

	let textContent = [];
	$(
		'#tracking-principal > article.detalle-tracking.grid-container.mt-4 > div.info.destinatario > p',
	).each(function () {
		textContent.push($(this).text());
	});

	let destination = {
		Nombre: textContent[0].split(': ')[1],
		Dirección: textContent[1].split(': ')[1],
		'C.P.': textContent[2].split(': ')[1],
		Localidad: textContent[3].split(': ')[1],
	};

	let rowData = [];
	$(
		'#tracking-principal > article.detalle-tracking.grid-container.mt-4 > div.info.trackeo > p > span',
	).each(function () {
		rowData.push($(this).text());
	});

	let eventsList = [];
	let chunkSize = 3;
	for (let i = 0; i < rowData.length; i += chunkSize) {
		let chunk = rowData.slice(i, i + chunkSize);
		let date = chunk[2];
		let time = 'Sin datos';
		let status = chunk[1];
		eventsList.push({ date, time, status });
	}
	eventsList.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [{ title: 'DESTINATARIO', data: destination }],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
