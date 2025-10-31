import got from 'got';
import vars from '../modules/crypto-js.js';
import { dateAndTime } from '../modules/luxon.js';

async function check(code, lastEvent, service) {
	let dividedCode = code.split('-');
	let companyName = 'PLU';
	if (service === 'Jetmar') companyName = 'MAR';
	if (service === 'Condor Estrella') companyName = 'CON';

	let consult = await got.post(vars.PLUSMAR_JETMAR_CONDOR_API_URL, {
		form: {
			empresa: companyName,
			tipoguia: dividedCode[0],
			ptoVenta: dividedCode[1].padStart(4, 0),
			numGuia: dividedCode[2].padStart(4, 0),
		},
		https: {
			rejectUnauthorized: false,
		},
	});

	if (consult.body === 'Sin resultados. Revise el numero de guia') {
		return { error: 'No data' };
	}

	let { date, time } = dateAndTime();

	let event = { date, time, status: consult.body };

	if (lastEvent) {
		return { events: event.status === lastEvent.split(' - ')[2] ? [] : [event] };
	}

	return {
		events: [event],
		lastEvent: Object.values(event).join(' - '),
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 9 && !/^\d+$/.test(code.slice(0, 1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
