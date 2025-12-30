import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consultEvents = await got.post(vars.OCA_API_URL1, {
		json: { numberOfSend: code },
	});
	let resultEvents = JSON.parse(consultEvents.body).d;

	if (!resultEvents.length) {
		return { error: 'No data' };
	}

	let startEventsList = resultEvents.map((e) => {
		let date = e.DateShow.split(' ')[0];
		let time = e.DateShow.split(' ')[1];
		return {
			date,
			time,
			status: e.State.trim(),
			motive: e.Razon,
			location: e.Sucursal.trim(),
		};
	});
	startEventsList.reverse();

	let eventsList = utils.sortEventsByDate(startEventsList);

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let productNumber = resultEvents[0].NroProducto;

	let originData;
	if (!lastEvent) {
		let consultOrigin = await got.post(vars.OCA_API_URL2, {
			json: { idOrdenRetiro: resultEvents[0].IdOrdenRetiro },
		});
		let resultOrigin = JSON.parse(consultOrigin.body).d;

		originData = {
			Nombre: resultOrigin.LastName,
			Dirección: `${resultOrigin.Street} ${resultOrigin.Number}`,
			'Código postal': resultOrigin.ZipCode.trim(),
			Localidad: resultOrigin.Locality.trim(),
			Estado: resultOrigin.State.trim(),
			'Correo electrónico': resultOrigin.Email,
			Teléfono: resultOrigin.Conctact,
		};
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'ORIGEN',
				data: originData,
			},
			{
				title: 'PRODUCTO',
				data: { Número: productNumber },
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://www.oca.com.ar/Busquedas/Envios',
	};
}

function testCode(code) {
	let pass = false;
	if (
		(code.length === 19 || code.length === 20) &&
		code.slice(6, 10) === '0000' &&
		/^\d+$/.test(code)
	) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
