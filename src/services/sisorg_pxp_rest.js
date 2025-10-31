import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent, service) {
	let serviceCode;
	let serviceLicenseKeyNumber;
	if (service === 'Balut Express') {
		serviceCode = 'blut';
		serviceLicenseKeyNumber = 'AABMXRAAABAADYCSE';
	}
	if (service === 'Cooperativa Sportman') {
		serviceCode = 'sptm';
		serviceLicenseKeyNumber = 'AABPPAAAABAAABCVE';
	}

	let baseUrl = vars.SISORG_PXP_REST_API_URL.replace('serviceCode', serviceCode);

	let consult1 = await got.post(`${baseUrl}Credential?withToken=true`, {
		json: { method: 'Generate', jsonparams: { LicenseKeyNumber: serviceLicenseKeyNumber } },
	});
	let result1 = JSON.parse(consult1.body);

	let consult2 = await got.post(`${baseUrl}Guia?withToken=true`, {
		headers: {
			Authorization: `Bearer ${result1.Token}`,
		},
		json: {
			method: 'GetByCustom',
			jsonparams: { WithPiezas: true, Numero: `**${code}`, DocumentoTipoIDs: [3, 7] },
		},
	});

	let result2 = JSON.parse(consult2.body);

	if (!result2.length) {
		return { error: 'No data' };
	}

	let {
		RemitenteCliente,
		DestinatarioCliente,
		LocalidadOrigenNombre,
		LocalidadDestinoNombre,
		GuiasPiezas,
	} = result2[0];

	let otherData = {
		Remitente: utils.capitalizeText(false, RemitenteCliente.RazonSocial ?? 'Sin datos'),
		Destinatario: utils.capitalizeText(false, DestinatarioCliente.RazonSocial ?? 'Sin datos'),
		Origen: utils.capitalizeText(false, LocalidadOrigenNombre ?? 'Sin datos'),
		Destino: utils.capitalizeText(false, LocalidadDestinoNombre ?? 'Sin datos'),
	};

	let detail = {
		Tipo: GuiasPiezas[0].PiezaTipoNombre ?? 'Sin datos',
		'Importe de flete': '$' + GuiasPiezas[0].FleteImporte ?? 'Sin datos',
		'Importe de seguro': '$' + GuiasPiezas[0].SeguroImporte ?? 'Sin datos',
		Bultos: GuiasPiezas[0].Bultos ?? 'Sin datos',
		Peso: GuiasPiezas[0].Peso + ' kg.' ?? 'Sin datos',
		'Valor declarado': '$' + GuiasPiezas[0].ValorDeclarado ?? 'Sin datos',
	};

	let consult3 = await got.post(`${baseUrl}GuiaLog?withToken=true`, {
		headers: {
			Authorization: `Bearer ${result1.Token}`,
		},
		json: {
			method: 'GetByCustom',
			jsonparams: { GuiaIDs: [result2[0].Id] },
		},
	});

	let result3 = JSON.parse(consult3.body);

	let eventsList = result3
		.map((event) => {
			let { date, time } = utils.dateStringHandler(event.FechaOperacion);
			if (event.Evento === 19) return null;
			return {
				date,
				time,
				description: eventDecode(event.Evento, event.PrestadorNombre),
			};
		})
		.filter((e) => !!e)
		.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		moreData: [
			{ title: 'OTROS DATOS', data: otherData },
			{ title: 'DETALLE DEL ENVIO', data: detail },
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function eventDecode(code, location) {
	switch (code) {
		case 1:
			return 'Estamos preparando tu envío';
		case 3:
			return `Tu envío esta en camino (${location})`;
		case 4:
		case 5:
			return `Tu envío ha llegado a su destino (${location})`;
		case 6:
		case 7:
			return `Tu envío esta en tránsito (${location})`;
		case 12:
			return 'Tu envío esta en reparto a domicilio';
		case 13:
			return 'Hemos entregado tu envío. ¡Gracias!';
		case 19:
			return 'Liquidación de agencia';
		case 19:
			return 'Liquidación de cliente';
		case 21:
			return 'En pre-despacho';
		case 24:
			return 'Anulación de cobro';
		case 28:
			return 'Salida redespacho';
		case 29:
			return 'Redespachado';
		case 14:
		case 2:
		case 8:
		case 9:
		case 10:
		case 11:
		case 15:
		case 17:
		case 18:
		case 25:
		case 26:
		case 27:
			return 'Tuvimos un inconveniente, conectate con nuestras oficinas';
		default:
			return 'Evento sin descripción';
	}
}

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (
		code.length === 13 &&
		code.slice(5, 8) === '000' &&
		/^\d+$/.test(code.slice(0, 1)) === false
	) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
