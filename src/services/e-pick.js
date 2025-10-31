import got from 'got';
import vars from '../modules/crypto-js.js';
import { dateAndTime } from '../modules/luxon.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(`${vars.E_PICK_API_URL.replace('code', code)}`);
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		return {
			error:
				error.response.body === "Cannot read properties of null (reading 'service')"
					? 'No data'
					: response,
		};
	}
	let response = JSON.parse(consult.body);

	if (response.message.startsWith('PAQUETE INEXISTENTE')) {
		return { error: 'No data' };
	}

	let { date, time } = dateAndTime();

	let event = { date, time, status: response.message };

	return {
		events: lastEvent ? (event.status === lastEvent.split(' - ')[2] ? [] : [event]) : [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

function testCode(code) {
	let pass = false;
	if ((code.length === 11 || code.length === 12) && !/^\d+$/.test(code.slice(0, 5))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
