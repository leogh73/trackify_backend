import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;

	try {
		consult = await got.post(vars.CLICPAQ_API_URL, {
			json: {
				operationName: 'seguimiento',
				variables: { id: parseInt(code) },
				query:
					'query seguimiento($id: Int!) {\n  trazabilidadPublica(id: $id) {\n    infoGuia {\n      guia\n      fecha\n      oblea\n      remitente {\n        localidad {\n          nombre\n          __typename\n        }\n        __typename\n      }\n      destinatario {\n        localidad {\n          nombre\n          __typename\n        }\n        __typename\n      }\n      adicionales {\n        ultimoEstado {\n          posicion\n          observacion\n          __typename\n        }\n        __typename\n      }\n      transporte {\n        nombre\n        seguimiento\n        __typename\n      }\n      __typename\n    }\n    trazabilidad {\n      fecha\n      descripcion\n      observacion\n      __typename\n    }\n    __typename\n  }\n}\n',
			},
		});
	} catch (error) {
		let result = services.errorResponseHandler(error);
		if (result.body.errors[0].message.includes('must not be null.')) {
			return { error: 'No data' };
		}
		return result;
	}

	let result = JSON.parse(consult.body);
	const { trazabilidad, infoGuia } = result.data.trazabilidadPublica;
	if (!trazabilidad && !infoGuia) {
		return { error: 'No data' };
	}

	let eventsList = trazabilidad.map((e) => {
		let { date, time } = Handler(parseInt(e.fecha));
		return {
			date,
			time,
			location: e.observacion.length ? e.observacion : 'Sin datos',
			status: e.descripcion,
		};
	});

	let otherData = {
		Origen: infoGuia.remitente.localidad.nombre,
		Destino: infoGuia.destinatario.localidad.nombre,
		'Nombre del transporte': infoGuia.transporte.nombre
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' '),
	};

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: `https://www.clicpaq.com/seguimiento/${code}`,
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 7 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
