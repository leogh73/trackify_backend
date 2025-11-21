import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let url = vars.SENDBOX_API_URL1.replace('dividedCode0', cleanCode.slice(0, 4))
		.replace('dividedCode1', cleanCode[(4, 12)])
		.replace('dividedCode2', cleanCode[12]);

	let consult = await got(url);

	let response = JSON.parse(consult.body);

	if (response.error === '2' || response.msj === 'No se encontró información.') {
		return { error: 'No data' };
	}

	let { guia_estado, guia_nombre, guia_obs, guia_tracking } = response;

	let eventsList = guia_tracking.Movimiento.map((e) => {
		let { date, time } = utils.dateStringHandler(e.Fecha);
		return {
			date,
			time,
			status: e.Movimiento,
			detail: e.Estado,
		};
	});

	eventsList.push({
		date: eventsList[eventsList.length - 1].date,
		time: '00:00',
		status: guia_obs,
		detail: guia_estado,
	});

	eventsList.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let customer = {
		Nombre: guia_nombre,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'CLIENTE',
				data: customer,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 18 && /^\d+$/.test(code)) {
		pass = true;
	}
	if (code.length === 11 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
