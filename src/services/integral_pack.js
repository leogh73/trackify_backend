import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let cleanCode = code.split('-').join('');
	let consult;
	try {
		consult = await got.post(vars.INTEGRAL_PACK_API_URL, {
			form: {
				agecod: cleanCode.slice(0, 4),
				tipfor: cleanCode.slice(4, 5),
				guinro: cleanCode.slice(5),
			},
		});
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		return {
			error: JSON.parse(response.body).message.startsWith('No hemos encontrado resultados')
				? 'No data'
				: response,
		};
	}

	let result = JSON.parse(consult.body);

	let eventsKeys = Object.keys(result.movimientos);
	let eventsList = eventsKeys
		.map((k) => {
			return {
				date: result.movimientos[k].Fecha,
				time: result.movimientos[k].Hora,
				location: utils.capitalizeText(false, result.movimientos[k].Localidad),
				branch: utils.capitalizeText(false, result.movimientos[k].Sucursal),
				description: utils.capitalizeText(false, result.movimientos[k].Evento),
			};
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://www.integralpack.com.ar/seguimiento/',
	};
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 11 && !/^\d+$/.test(code.slice(4, 1))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
