import services from './_services.js';
import mercadoLibre from '../controllers/mercadoLibre_controllers.js';

async function check(code, lastEvent, service, token) {
	let consult = await mercadoLibre.fetchTrackingData(code, token);

	console.log(consult);

	let result1 = JSON.parse(consult[0].body);

	let eventsList = result1
		.map((e) => {
			let timeStamp = new Date(e.date);
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
	};
}

export default { check };

function eventTranslate(text) {
	switch (text) {
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
		case 'in_hub':
			return 'Ingresó al centro de distribución.';
		case 'picked up':
			return 'Recolectado';
		case 'in_packing_list':
			return 'En lista de recolección';
		case 'shipped':
			return 'Salió del centro de distribución y sigue en viaje.';
		case 'delivered':
			return 'Entregamos tu paquete.';
		case 'first_visit':
			return 'Primera visita';
		default:
			return 'Sin datos';
	}
}
