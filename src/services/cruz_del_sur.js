import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got(`${vars.CRUZ_DEL_SUR_API_URL}${code}`);
	const $ = load(consult.body);

	let baseTexts = [];
	$(
		'body > div.content_wrap > div.row.row_full.row_space_mobile > div > div> form > div > div > label',
	).each(function () {
		baseTexts.push($(this).text());
	});

	if (baseTexts.length === 6) return { error: 'No data' };

	let baseInputsTexts = [];
	$(
		'body > div.content_wrap > div.row.row_full.row_space_mobile > div > div > form > div > div> input',
	).each(function () {
		baseInputsTexts.push($(this).val());
	});

	let eventsInputTexts = [];
	$(
		'body > div.content_wrap > div.row.row_full.row_space_mobile > div > div > form > div > div > div > input',
	).each(function () {
		eventsInputTexts.push($(this).val());
	});

	let otherData = {
		'Fecha de carga': `${eventsInputTexts[0]}/${eventsInputTexts[1]}/${eventsInputTexts[2]}`,
		Destinatario: baseInputsTexts[0],
		'Sucursal de destino': baseInputsTexts[2].split(' *')[0],
		Remitente: baseInputsTexts[1].trim(),
		'Sucursal de origen': baseInputsTexts[3],
		Destino: baseInputsTexts[4],
	};

	let eventsData2 = [];
	for (let i = 3; i < eventsInputTexts.length; i += 2) {
		eventsData2.push(eventsInputTexts.slice(i, i + 2));
	}

	baseTexts.splice(0, 6);
	let indexesList = [];
	baseTexts.forEach((event, index) => {
		if (event.includes('-')) indexesList.push(index);
	});
	let eventsData1 = [];
	indexesList.forEach((i, index) => {
		eventsData1.push(baseTexts.slice(i, indexesList[index + 1]));
	});

	let eventsList = eventsData1
		.map((event, i) => {
			let extraDetail;
			if (event[2]) extraDetail = event[2].split(':')[1].trim();
			return {
				date: eventsData2[i][0].split('-').join('/'),
				time: eventsData2[i][1] ? eventsData2[i][1].split(' hs')[0] : 'Sin datos',
				branch: event[1].split(':')[1].split(' *')[0].trim(),
				detail: extraDetail
					? event[0].split('- ')[1] + ' - ' + extraDetail
					: event[0].split('- ')[1],
			};
		})
		.reverse();

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
