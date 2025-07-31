import got from 'got';
import { load } from 'cheerio';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let longCode = splittedCode.length > 2;
	if (longCode) splittedCode[2] = parseInt(splittedCode[2]);
	let checkCode = splittedCode.join('-');

	let consult = await got(`${vars.BUSPACK_API_URL.replace('code', checkCode)}`);
	let result = JSON.parse(consult.body);

	if (result.mensaje.startsWith('No se encontro la operacion con numero:'))
		return { error: 'No data' };

	const $ = load(result.template.template);

	let data1 = [];
	$('div').each(function () {
		data1.push($(this).text());
	});

	let rList = [];
	$('div > table > tbody > tr> td').each(function () {
		rList.push($(this).text());
	});

	let indexSlice = 0;
	rList.forEach((value, index) => {
		if (rList[0] === value) indexSlice = index;
	});

	let rowList = rList;
	if (indexSlice) rowList = rList.slice(0, indexSlice);

	let eventsData = [];
	let chunkSize = 2;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsData.push(rowList.slice(i, i + chunkSize));
	}

	let events = eventsData.map((e) => {
		return {
			date: e[0].split(' ')[0],
			time: e[0].split(' ')[1],
			detail: e[1],
		};
	});
	let eventsList = longCode ? events.reverse() : events;

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let otherData = {};
	data1.slice(3, 8).forEach((t) => {
		let data = t.split(':');
		if (data.length < 2) return;
		otherData[data[0].trim()] = data[1].trim().length ? data[1].trim() : 'Sin datos';
	});

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
