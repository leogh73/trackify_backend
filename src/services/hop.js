import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let html = await got(`${vars.HOP_API_URL1}`);
	let buildId = html.body.split(`buildId":"`)[1].slice(0, 21);

	let consult = await got(`${vars.HOP_API_URL2.replace('buildId', buildId)}${code}`);
	let result = JSON.parse(consult.body).pageProps.trackingData;

	if (!result) return { error: 'No data' };

	const dateFormat = (data) => {
		let date = data.split(' ')[0].split('-').reverse().join('/');
		let time = data.split(' ')[1];
		return { date, time };
	};

	let {
		client_name,
		client_email,
		client_telephone,
		client_id_type,
		client_id_number,
		seller_code,
		storage_code,
		estimated_dropoff_date,
		reference_id,
		trackings,
		pickup_point,
	} = result;

	let eventsList = trackings.map((t) => {
		let { date, time } = dateFormat(t.status_datetime);
		return { date, time, description: t.description };
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let client = {
		Nombre: client_name,
		Email: client_email,
		Teléfono: client_telephone,
		[`${client_id_type}`]: client_id_number,
	};

	let otherData = {
		Transportista: seller_code,
		'Código de seguimiento': reference_id,
		Almacenamiento: storage_code,
		'Fecha de llegada estimada': dateFormat(estimated_dropoff_date).date,
	};

	let { name, reference_name, cuit, full_address, zip_code, city, state, region, schedules } =
		pickup_point;

	let pickupPoint = {
		Comercio: reference_name,
		Titular: name,
		CUIT: cuit,
		Dirección: full_address,
		Ciudad: city,
		'Código Postal': zip_code,
		Provincia: state,
		Región: region,
	};

	let pickupPointSchedule = {};
	schedules.forEach((d) => {
		pickupPointSchedule[d.day_description] = `${d.hour_from} a ${d.hour_to}`;
	});

	return {
		events: eventsList,
		moreData: [
			{
				title: 'CLIENTE',
				data: client,
			},
			{
				title: 'PUNTO HOP',
				data: pickupPoint,
			},
			{
				title: 'HORARIOS DE PUNTO HOP',
				data: pickupPointSchedule,
			},
			{ title: 'OTROS DATOS', data: otherData },
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
