import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got.post(vars.EXPRESO_LANCIONI_API_URL, {
		form: { txt_trackid: code },
	});
	const $ = load(consult.body);

	if ($('#quienes').text() === 'No encontramos su número de seguimiento.Intente más tarde.')
		return { error: 'No data' };

	let textContent1 = [];
	$('#contenedor > section > article > div:nth-child(2) > div.tc1 > div').each(function () {
		textContent1.push($(this).text());
	});

	let service = {
		'Tipo de servicio': textContent1[4].split('. ')[1],
		Piezas: textContent1[5].split('. ')[1],
		Remito: textContent1[6].split('. Remito ')[1],
	};

	let textContent2 = [];
	$('#contenedor > section > article > div:nth-child(2) > div.tc2 > div').each(function () {
		textContent2.push($(this).text());
	});

	let origin = {
		Sucursal: services.capitalizeText(false, textContent2[4].split('Sucursal ')[1]),
		Remitente: textContent2[5],
	};

	let destination = {
		Localidad: textContent2[8],
		Destinatario: textContent2[9],
		'Fecha estimada de entrega': textContent2[1],
	};

	let rowsTexts = [];
	$(
		'#contenedor > section > article > div:nth-child(2) > div.tc4 > div:nth-child(2) > table > tbody > tr > td',
	).each(function () {
		rowsTexts.push($(this).text());
	});

	let rowsData = [];
	let chunkSize = 3;
	for (let i = 0; i < rowsTexts.length; i += chunkSize) {
		rowsData.push(rowsTexts.slice(i, i + chunkSize));
	}

	let currenYear = new Date(Date.now()).getFullYear();
	let eventsList = rowsData
		.map((event) => {
			return {
				date: event[0] + '/' + currenYear,
				time: event[1],
				detail: services.capitalizeText(true, event[2]),
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{
				title: 'SERVICIO',
				data: service,
			},
			{
				title: 'ORIGEN',
				data: origin,
			},
			{
				title: 'DESTINO',
				data: destination,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
