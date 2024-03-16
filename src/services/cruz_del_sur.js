import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got.post(`${vars.CRUZ_DEL_SUR_API_URL}`, {
		form: { nic: code, f: 'check_nip' },
	});
	let result = JSON.parse(consult.body);

	const getTimestampData = (ts) => {
		let timestamp = new Date(ts);
		let date = `${timestamp.getDate().toString().padStart(2, 0)}/${(timestamp.getMonth() + 1)
			.toString()
			.padStart(2, 0)}/${timestamp.getFullYear()}`;

		let time = `${timestamp.getHours().toString().padStart(2, 0)}:${timestamp
			.getMinutes()
			.toString()
			.padStart(2, 0)}`;
		return { date, time };
	};

	let eventsList = result.Cuerpo.map((event) => {
		return {
			date: getTimestampData(event.Fecha).date,
			time: getTimestampData(event.Fecha).time,
			branch: event.NombreDeSucursal.trim(),
			detail: event.Titulo,
		};
	}).reverse();

	let {
		Fecha,
		DestinoNombre,
		DestinoSucursal,
		DestinoLocalidad,
		RemitenteNombre,
		RemitenteSucursal,
	} = result.Cabecera;
	let otherData = {
		'Fecha de carga': getTimestampData(Fecha).date,
		Destinatario: DestinoNombre.trim(),
		'Sucursal de destino': DestinoSucursal.trim(),
		Remitente: RemitenteNombre.trim(),
		'Sucursal de origen': RemitenteSucursal.trim(),
		Destino: DestinoLocalidad.trim(),
	};

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
