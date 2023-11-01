import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let url;
	let containsDash = code.includes('-');
	if (containsDash) {
		let dividedCode = code.split('-');
		url = vars.SENDBOX_API_URL1.replace('dividedCode0', dividedCode[0])
			.replace('dividedCode1', dividedCode[1])
			.replace('dividedCode2', dividedCode[2]);
	} else {
		url = `${vars.SENDBOX_API_URL2}${code}`;
	}
	let consult = await got(url);
	let response = JSON.parse(consult.body);

	if (response.msj === 'No se encontró información.') return { error: 'No data' };

	let eventsList = (response.eventsList = containsDash
		? response.tracking
				.map((e) => {
					return {
						date: e.fecha,
						time: 'Sin datos',
						status: services.capitalizeText(true, e.estado),
					};
				})
				.reverse()
		: data
				.map((event) => {
					let timeStamp = new Date(event.createdDate);
					let date = `${timeStamp.getDate().toString().padStart(2, 0)}/${(timeStamp.getMonth() + 1)
						.toString()
						.padStart(2, 0)}/${timeStamp.getFullYear()}`;
					let time = `${timeStamp.getHours().toString().padStart(2, 0)}:${timeStamp
						.getMinutes()
						.toString()
						.padStart(2, 0)}`;
					return {
						date,
						time,
						location: event.frontData.fullAdress ?? 'Sin datos',
						description: event.description?.length ? event.description : 'Sin datos',
					};
				})
				.reverse());

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let customer = (() => {
		const { nombre, tel, domicilio, localidad } = response.customer[0];
		return {
			Nombre: services.capitalizeText(false, nombre) ?? 'Sin datos',
			Teléfono: tel.length ? tel : 'Sin datos' ?? 'Sin datos',
			Dirección: domicilio ?? 'Sin datos',
			Localidad: localidad ?? 'Sin datos',
		};
	})();

	let sell = (() => {
		const { numero, remito, estado, fecha, lastMov, fechaEntrega, bultos, peso } =
			response.details[0];
		return {
			Número: numero ?? 'Sin datos',
			Factura: remito.length ? remito : 'Sin datos' ?? 'Sin datos',
			Estado: estado ?? 'Sin datos',
			'Fecha de inicio': fecha ?? 'Sin datos',
			'Último movimiento': lastMov ?? 'Sin datos',
			'Fecha de entrega': fechaEntrega ?? 'Sin datos',
			Bultos: bultos ?? 'Sin datos',
			Peso: peso ?? 'Sin datos',
		};
	})();

	return {
		events: eventsList,
		moreData: [
			{
				title: 'CLIENTE',
				data: customer,
			},
			{
				title: 'VENTA',
				data: sell,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
