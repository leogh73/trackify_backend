import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	if (/[a-zA-Z]/g.test(code)) {
		return { error: 'No data' };
	}

	let consult = await got.post(vars.SKYNDE_API_URL, {
		form: { remito: '', nro_guia: code },
	});

	const $ = load(consult.body);

	if (
		$(
			'body > section > div > div > div > div.col-lg-6.col-xl-6 > div > div.card-body > div > h2',
		).text() === 'NO HAY NÚMERO DE SEGUIMIENTO'
	) {
		return { error: 'No data' };
	}

	let textContent = [];
	$(
		'body > section > div > div > div > div:nth-child(3) > div > div.card-body > div > div > div > p',
	).each(function () {
		textContent.push($(this).text());
	});

	let destination = {
		Destinatario: textContent[4],
		Domicilio: textContent[5],
		Localidad: textContent[6],
		Provincia: textContent[7],
		'C. P. Destinatario': textContent[12],
		Email: textContent[14],
		Teléfono: textContent[13],
		Celular: textContent[15],
	};

	let otherData = {
		'Fecha de alta': textContent[0],
		Remitente: textContent[1],
		'Nro. de operación': textContent[2],
		Servicio: textContent[3],
		Peso: textContent[8],
		Bultos: textContent[9],
		'Lote/s': textContent[10],
		'Lote 2': textContent[16],
	};

	let statusTexts = [];
	$(
		'body > section > div > div > div > div:nth-child(2) > div > div.card-body > div > div > div > h6',
	).each(function () {
		statusTexts.push($(this).text());
	});

	let eventsTexts = [];
	$(
		'body > section > div > div > div > div:nth-child(2) > div > div.card-body > div > div > div > p',
	).each(function () {
		eventsTexts.push($(this).text());
	});

	let rowsData = [];
	let chunkSize = 2;
	for (let i = 0; i < eventsTexts.length; i += chunkSize) {
		rowsData.push(eventsTexts.slice(i, i + chunkSize));
	}

	let eventsData = rowsData.map((r, i) => {
		r.unshift(statusTexts[i]);
		return r;
	});

	let eventsList = eventsData
		.map((event) => {
			return {
				date: event[2].split(' - ')[1],
				time: event[2].split(' - ')[0],
				status: event[0],
				detail: event[1],
			};
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'DESTINATARIO',
				data: destination,
			},
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://www.skynde.com/segui-tu-envio',
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 5 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
