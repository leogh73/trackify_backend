import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent, extraData) {
	let splittedCode = [];
	let cleanCode = code.split('-').join('').slice(-7);
	splittedCode.push(cleanCode.slice(0, 6));
	splittedCode.push(cleanCode.slice(-1));

	let serviceCode = {
		'Expreso Fueguino': 49,
		Rabbione: 17,
		'Rodríguez Hermanos Transportes': 21,
		'Trans Dan Express': 65,
	};

	let consult = await got.post(`${vars.CRISTAL_WEB_API_URL}${serviceCode[extraData.service]}`, {
		form: { id: parseFloat(splittedCode[0]), o: splittedCode[1] },
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
				location: event.dondeEsta,
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
		extraData,
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if ((code.length === 9 || code.length === 7) && !/^\d+$/.test(code.slice(-1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
