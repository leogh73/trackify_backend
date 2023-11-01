import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consultEvents = await got.post(`${vars.OCA_TRACKING_API_URL}`, {
		json: { numberOfSend: code },
	});
	let resultEvents = JSON.parse(consultEvents.body).d;

	if (!resultEvents.length) return { error: 'No data' };

	let eventsList = resultEvents.map((e) => {
		return {
			date: e.DateShow.split(' ')[0],
			time: e.DateShow.split(' ')[1],
			status: e.State.trim(),
			motive: e.Razon,
			location: e.Sucursal.trim(),
		};
	});
	eventsList.reverse();

	let productNumber = resultEvents[0].NroProducto;

	let originData;
	if (!lastEvent) {
		let consultOrigin = await got.post(`${vars.OCA_ORIGIN_API_URL}`, {
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

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let response = {
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
	};

	response = {
		...response,
		otherData: {
			name: originData.Nombre,
			address: originData.Dirección,
			zipCode: originData['Código postal'],
			locality: originData.Localidad,
			state: originData.Provincia,
			email: originData['Correo electrónico'],
			phone: originData.Teléfono,
		},
		productNumber,
	};

	return response;
}

export default { check };
