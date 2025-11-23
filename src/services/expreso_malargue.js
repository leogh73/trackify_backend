import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('').slice(-13);
	let consult = await got.post(vars.EXPRESO_MALARGUE_API_URL, {
		json: { documento: parseInt(cleanCode.slice(0, 12)), origen: cleanCode.slice(-1) },
	});

	let result = JSON.parse(consult.body);

	if (!result.data.length) {
		return { error: 'No data' };
	}

	let eventsList = result.data
		.map((event) => {
			return {
				date: event.fecha.split(' ')[0].split('-').reverse().join('/'),
				time: event.fecha.split(' ')[1],
				location: utils.capitalizeText(true, event.dondeEsta),
				detail: event.des.replace(/\n/g, '').replace(/\r/g, ''),
			};
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 17 && !/^\d+$/.test(code.slice(-1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
