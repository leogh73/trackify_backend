import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import _services from './_services.js';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let consult = await got.post(vars.EXPRESO_MALARGUE_API_URL, {
		json: { documento: parseInt(splittedCode[1]), origen: splittedCode[2] },
	});

	let result = JSON.parse(consult.body);

	if (!result.data.length) return { error: 'No data' };

	let eventsList = result.data
		.map((event) => {
			return {
				date: event.fecha.split(' ')[0].split('-').reverse().join('/'),
				time: event.fecha.split(' ')[1],
				location: _services.capitalizeText(true, event.dondeEsta),
				detail: event.des.replace(/\n/g, '').replace(/\r/g, ''),
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
