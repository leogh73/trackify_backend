import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent, service) {
	let serviceCode;
	if (service === 'Cata Cargo') serviceCode = 'mend';
	if (service === 'ÑanduPack') serviceCode = 'nand';
	if (service === 'El Práctico Pack') serviceCode = 'prac';

	let consult = await got.post(
		`${vars.SISORG_PXP_ONLINE_API_URL.replace('serviceCode', serviceCode)}`,
		{
			json: { method: 'SearchByNumero', numero: code },
		},
	);
	let result = JSON.parse(consult.body);

	if (result.message === 'Numero de Guia inexistente.') return { error: 'No data' };

	let {
		Piezas,
		RemitenteRazonSocial,
		DestinatarioRazonSocial,
		LocalidadOrigen,
		LocalidadDestino,
	} = result;

	let otherData = {
		Remitente: services.capitalizeText(false, RemitenteRazonSocial ?? 'Sin datos'),
		Destinatario: services.capitalizeText(false, DestinatarioRazonSocial ?? 'Sin datos'),
		Origen: services.capitalizeText(false, LocalidadOrigen ?? 'Sin datos'),
		Destino: services.capitalizeText(false, LocalidadDestino ?? 'Sin datos'),
	};

	let detail = {
		Tipo: services.capitalizeText(true, Piezas[0].Nombre ?? 'Sin datos'),
		'Importe de flete': '$' + Piezas[0].Flete ?? 'Sin datos',
		'Importe de seguro': '$' + Piezas[0].Seguro ?? 'Sin datos',
		Bultos: Piezas[0].Cantidad ?? 'Sin datos',
		Peso: Piezas[0].Peso + ' kg.' ?? 'Sin datos',
		'Valor declarado': '$' + Piezas[0].ValorDeclarado ?? 'Sin datos',
		'Contenido declarado': Piezas[0].Declaracion ?? 'Sin datos',
	};

	let eventsList = result.Eventos.map((e) => {
		let timeStamp = new Date(e.FechaEvento);
		let date = `${timeStamp.getDate().toString().padStart(2, 0)}/${(timeStamp.getMonth() + 1)
			.toString()
			.padStart(2, 0)}/${timeStamp.getFullYear()}`;
		let time = `${timeStamp.getHours().toString().padStart(2, 0)}:${timeStamp
			.getMinutes()
			.toString()
			.padStart(2, 0)}:${timeStamp.getSeconds().toString().padStart(2, 0)}`;
		return {
			date,
			time,
			description: eventDecode(e.EventoID),
		};
	}).reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{ title: 'OTROS DATOS', data: otherData },
			{ title: 'DETALLE DEL ENVIO', data: detail },
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };

function eventDecode(code) {
	switch (code) {
		case 1:
			return 'Emisión de guía';
		case 2:
			return 'Guía cancelada';
		case 3:
			return 'En ruta';
		case 4:
			return 'En destino';
		case 5:
			return 'En destino observada';
		case 6:
			return 'En tránsito';
		case 7:
			return 'En tránsito observada';
		case 8:
			return 'Extraviada';
		case 9:
			return 'Encontrada - En origen';
		case 10:
			return 'Encontrada - En destino';
		case 11:
			return 'Encontrada - En tránsito';
		case 12:
			return 'En reparto a domicilio';
		case 13:
			return 'Guía entregada';
		case 14:
			return 'Rendida';
		case 15:
			return 'Devuelta a origen';
		case 16:
			return 'Pago de giro';
		case 17:
			return 'Devuelta a origen observada';
		case 18:
			return 'Marcada como no entregada en reparto.';
		case 21:
			return 'En pre despacho';
		case 22:
			return 'Se realizó la operación de tomar carga en el depósito del usuario.';
		case 23:
			return 'Se modificó el destinatario de la guía y se alteró la condición de venta.';
		case 24:
			return 'Se reversó el cobro del Remito y se habilitó la entrega nuevamente.';
		default:
			return 'Evento sin descripción';
	}
}
