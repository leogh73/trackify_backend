import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got.post(`${vars.PLAYWRIGHT_API_URL}/api`, {
		json: { service: 'pickit', code },
	});
	let result = JSON.parse(consult.body);

	if (
		result.context === 'Código de seguimiento no encontrado' ||
		result.context === 'No encontramos tu paquete'
	)
		return { error: 'No data' };

	let eventsList = result.tracking
		.map((e) => {
			let date = e.date.split(' ');
			return {
				date: date[0],
				time: date[1],
				title: services.capitalizeText(true, e.title.length ? e.title : 'Sin datos'),
				description: e.description,
			};
		})
		.reverse();

	let otherData = {
		Mensaje: result.title ?? 'Sin datos',
		Vendedor: result.retailerName ?? 'Sin datos',
	};

	if (lastEvent) {
		let response = services.updateResponseHandler(eventsList, lastEvent);
		if (response.lastEvent)
			response.moreData = [
				{
					title: 'OTROS DATOS',
					data: otherData,
				},
			];
		return response;
	}

	const { origin, destination } = result.transaction;

	let originData = {
		Nombre: origin.point.name ?? 'Sin datos',
		Dirección: origin.address.street,
		'Código postal': origin.address.postalCode,
	};

	let destinationData = {
		Nombre: destination.point.name ?? 'Sin datos',
		Dirección: destination.address.street,
		'Código postal': destination.address.postalCode,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'ORIGEN',
				data: originData,
			},
			{
				title: 'DESTINO',
				data: destinationData,
			},
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
