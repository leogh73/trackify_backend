import got from 'got';
import vars from '../modules/crypto-js.js';
import luxon from '../modules/luxon.js';
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

	let event = { date: luxon.getDate(), time: luxon.getTime(), status: response.message };

	return {
		events: lastEvent ? (event.status === lastEvent.split(' - ')[2] ? [] : [event]) : [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

export default { check };
