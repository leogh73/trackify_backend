import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult1 = await got.post(vars.CLICOH_API_URL1, {
		json: { codeService: code },
		headers: { 'private-key': vars.CLICOH_PRIVATE_KEY },
	});
	let result1 = JSON.parse(consult1.body);

	if (result1.message.startsWith('Servicio no encontrado por codigo')) {
		return { error: 'No data' };
	}

	let { destino, entrgTraces } = result1.delivery;

	let eventsList = entrgTraces
		.map((e) => {
			let date = e.createdAt.split(' ')[0].split('-').reverse().join('/');
			let time = e.createdAt.split(' ')[1];
			return {
				date,
				time: time.split('.000000')[0],
				status: e.estado.homologacion,
				description: e.estado.descripcion,
			};
		})
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let consult2 = await got.post(vars.CLICOH_API_URL2, {
		json: { codeService: code },
	});
	let result2 = JSON.parse(consult2.body);

	let {
		origen,
		bodega,
		usuario,
		centro,
		tamanioPaquete,
		rastreo,
		destinatarioNombre,
		destinatarioTelef,
		destinatarioEmail,
	} = result2.delivery[0];

	let receiver = {
		Nombre: destinatarioNombre,
		Dirección: destino.direccionNmz,
		Teléfono: destinatarioTelef,
		'Correo electrónico': destinatarioEmail,
		Servicio: destino.instrucciones ?? 'Sin datos',
	};

	let origin = (() => {
		const { codigoPostal, direccionNmz, instrucciones } = origen;
		return {
			Dirección: direccionNmz,
			'Código Postal': codigoPostal,
			Teléfono: centro.telefono,
			Servicio: instrucciones ?? 'Sin datos',
		};
	})();

	let storage = {
		Tienda: bodega.shop,
		Telefono: bodega.telefono,
		'Tipo de Recolección': bodega.tipoRecoleccion,
	};

	let sender = (() => {
		const { correo, nombre, celular, notificarEmails } = usuario;
		return {
			Nombre: nombre,
			Celular: celular,
			'Correo electrónico': correo,
			'Correo personal': notificarEmails,
		};
	})();

	let packageData = (() => {
		let { alto, ancho, largo, nombre } = tamanioPaquete;
		return { ancho, largo, alto, tipo: nombre };
	})();

	let transport = { 'Número de seguimiento': rastreo.guia, Nombre: rastreo.transportista };

	return {
		events: eventsList,
		moreData: [
			{
				title: 'ORIGEN',
				data: origin,
			},
			{
				title: 'REMITENTE',
				data: sender,
			},
			{
				title: 'DESTINATARIO',
				data: receiver,
			},
			{
				title: 'ALMACENAMIENTO',
				data: storage,
			},
			{
				title: 'PAQUETE',
				data: packageData,
			},
			{
				title: 'TRASPORTISTA',
				data: transport,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: 'https://console.clicoh.com.co/monitor',
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 12 && /^\d+$/.test(code) && code.slice(0, 4) !== '9990') {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
