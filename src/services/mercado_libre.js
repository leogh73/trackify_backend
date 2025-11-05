import services from './_services.js';
import utils from './_utils.js';
import mercadoLibre from '../controllers/mercado_libre_controllers.js';

async function check(code, lastEvent, extraData) {
	let consult = await mercadoLibre.fetchTrackingData(
		code,
		extraData.user.mercadoLibre,
		extraData.user.id,
	);

	let result1 = JSON.parse(consult[0].body);

	let eventsList = result1
		.map((e) => {
			let { date, time } = utils.dateStringHandler(e.date);
			return {
				date,
				time,
				status: eventTranslate(e.substatus),
				description: eventTranslate(e.status),
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let result2 = JSON.parse(consult[1].body);

	let otherData = {
		Origen: `${result2.origin.shipping_address.city.name} - ${result2.origin.shipping_address.state.name}`,
		Destino: `${result2.destination.shipping_address.address_line} - ${result2.destination.shipping_address.city.name} - ${result2.destination.shipping_address.state.name}`,
	};

	let shipping = {
		Tipo: result2.lead_time.shipping_method.name,
		Costo: '$' + result2.lead_time.cost,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
			{
				title: 'ENVIO',
				data: shipping,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		extraData,
	};
}

function eventTranslate(text) {
	switch (text) {
		case 'claimed_me':
			return 'Envío demorado, reclamado por el comprador.';
		case 'handling':
			return 'Preparando';
		case 'ready_to_ship':
			return 'Preparando paquete para envío.';
		case 'ready_to_print':
			return 'Etiqueta lista';
		case 'printed':
			return 'Etiqueta impresa';
		case 'dropped_off':
			return 'El vendedor despachó tu paquete.';
		case 'handling':
			return 'Preparando';
		case 'in_hub':
			return 'Ingresó al centro de distribución.';
		case 'picked up':
			return 'Recolectado';
		case 'in_packing_list':
			return 'En lista de recolección';
		case 'not_delivered':
			return 'No pudimos entregar tu paquete.';
		case 'pending':
			return 'Pendiente';
		case 'returning_to_hub':
			return 'Devuelto al centro de distribución.';
		case 'shipped':
			return 'Salió del centro de distribución y sigue en viaje.';
		case 'shipment_paid':
			return 'Envío pagado.';
		case 'delivered':
			return 'Entregamos tu paquete.';
		case 'first_visit':
			return 'Primera visita';
		default:
			return 'Sin datos';
	}
}

function testCode(code) {
	let pass = false;
	if (code.length === 11 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
