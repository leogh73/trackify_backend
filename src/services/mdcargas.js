import got from 'got';
import vars from '../modules/crypto-js.js';
import luxon from '../modules/luxon.js';

async function check(code, lastEvent) {
	let dividedCode = code.split('-');
	let consult = await got(
		`${vars.MDCARGAS_API_URL.replace('type', dividedCode[0])
			.replace('branch', dividedCode[1])
			.replace('number', dividedCode[2])}`,
	);
	console.log(consult.body);
	let result = JSON.parse(consult.body);

	if (result.estado === 'Numero de Guia Incorrecto') return { error: 'No data' };

	let statusDetail = result.estado.toString().split(dividedCode[2])[1].trim();
	let status = statusDetail.charAt(0).toUpperCase() + statusDetail.toString().slice(1);

	let event = { date: luxon.getDate(), time: luxon.getTime(), status };

	if (lastEvent) {
		return { events: event.status === lastEvent.split(' - ')[2] ? [] : [event] };
	}

	return {
		events: [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

export default { check };
