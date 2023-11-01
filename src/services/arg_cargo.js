import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let dividedCode = code.split('-');
	let consult = await got(
		`${vars.ARG_CARGO_API_URL.replace('code1', dividedCode[0])
			.replace('code2', dividedCode[1])
			.replace('code3', dividedCode[2])}`,
	);
	let result = JSON.parse(consult.body);

	if (!result.estado) return { error: 'No data' };

	let { direccion, fecha, estado } = result;
	let event = {
		date: fecha.split(' ')[0].split('-').reverse().join('/'),
		time: fecha.split(' ')[1],
		location: services.capitalizeText(false, direccion),
		status: estado,
	};

	if (lastEvent) {
		return { events: event.status === lastEvent.split(' - ')[3] ? [] : [event] };
	}

	return {
		events: [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

export default { check };
