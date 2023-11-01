import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got.post(`${vars.PLAYWRIGHT_API_URL}/api`, {
		json: { service: 'ClicOh', code },
	});
	let result = JSON.parse(consult.body);

	if (
		!result.packagestatehistory_set &&
		result?.package_code[0] === 'No se puede encontrar un paquete con el código solicitado'
	)
		return { error: 'No data' };

	let eventsList = result.packagestatehistory_set
		.map((e) => {
			return {
				date: convertDate(e.since.split('T')[0]),
				time: e.since.split('T')[1].split('.')[0].split('-')[0],
				description: e.state.description,
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let origin = (() => {
		const { address, country } = result.origin;
		return {
			Dirección: address,
			País: country,
		};
	})();

	let destination = (() => {
		const { address, locality, country, administrative_area_level_1, postal_code } = result.to;
		return {
			Dirección: address,
			Localidad: locality,
			País: country,
			Provincia: administrative_area_level_1,
			'Código postal': postal_code,
		};
	})();

	const { dni, first_name, last_name, email, phone, address } = result.receiver;
	let receiver = {
		DNI: dni,
		Nombre: first_name,
		Apellido: last_name,
		'Correo electrónico': verifyData(email),
		Teléfono: verifyData(phone),
		Dirección: verifyData(address),
	};

	let client = {
		Nombre: result.client,
	};

	let response = {
		events: eventsList,
		moreData: [
			{
				title: 'ORIGEN',
				data: origin,
			},
			{
				title: 'DESTINO',
				data: destination,
			},
			{
				title: 'DESTINATARIO',
				data: receiver,
			},
			{
				title: 'CLIENTE',
				data: client,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};

	response = { ...response, ...oldOtherData(result) };

	return response;
}

function convertDate(date) {
	let dateToday = new Date(date);
	let newDate =
		dateToday.getDate() + '/' + (dateToday.getMonth() + 1) + '/' + dateToday.getFullYear();
	return newDate;
}

function verifyData(data) {
	let newData;
	if (data == null) {
		newData = 'Sin datos';
	} else if (data == false) {
		newData = 'No';
	} else if (data == true) {
		newData = 'Si';
	} else {
		return data;
	}
	return newData;
}

export default { check };

function oldOtherData(result) {
	let origin = (() => {
		const { address, country } = result.origin;
		return {
			address,
			country,
		};
	})();

	let destination = (() => {
		const { address, locality, country, administrative_area_level_1, postal_code } = result.to;
		return {
			address,
			locality,
			country,
			administrative_area_level_1,
			postal_code,
		};
	})();

	const { dni, first_name, last_name, email, phone, address } = result.receiver;
	let receiver = {
		dni,
		first_name,
		last_name,
		email: verifyData(email),
		phone: verifyData(phone),
		Dirección: verifyData(address),
	};

	let otherData = {
		clientName: result.client,
	};

	return { origin, destination, receiver, otherData };
}
