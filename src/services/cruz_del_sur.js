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
		baseTexts.push(
			$(this)
				.text()
				.trim()
				.replace(/<(?:.|\n)*?>/gm, '\n')
				.replace(/\n/g, '')
				.replace(/\t/g, ''),
		);
	});

	if (baseTexts.length === 6) return { error: 'No data' };

	let baseInputsTexts = [];
	$(
		'body > div.content_wrap > div.row.row_full.row_space_mobile > div > div.text_box.light_bg.full_mobile.pl-90.pr-90.plm-20.prm-20.pt-40.pb-30.mb-10 > form > div > div>input',
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

	let chunkSize = 2;
	let eventsData2 = [];
	for (let i = 3; i < eventsInputTexts.length; i += chunkSize) {
		eventsData2.push(eventsInputTexts.slice(i, i + chunkSize));
	}
	let eventsData1 = [];
	for (let i = 6; i < baseTexts.length; i += chunkSize) {
		if (eventsData1.length < eventsData2.length)
			eventsData1.push(baseTexts.slice(i, i + chunkSize));
	}

	let eventsList = eventsData1
		.map((event, index) => {
			return {
				date: eventsData2[index][0].split('-').join('/'),
				time: eventsData2[index][1].split(' hs')[0],
				branch: event[1].split(':')[1].split(' *')[0],
				detail: event[0].split('- ')[1],
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
