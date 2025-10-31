import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consult1;
	try {
		consult1 = await got.post(vars.ANDESMAR_CARGAS_API_URL1, {
			json: {
				cb: '',
				nroGuia: '',
				nroRemito: '',
				nroOrdenRetiro: '',
				nroCliente: 'undefined',
				usuarioWebId: '',
				nroSeguimiento: code,
				codCliente: '',
			},
		});
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		if (JSON.parse(response.body).Message?.startsWith('System.Web.Services.Protocols')) {
			return { error: 'No data' };
		}
	}

	let resultOtherData = JSON.parse(JSON.parse(consult1.body).d).Table[0];

	let trackingNumber = resultOtherData.NroGuia.split('-');

	let consult2 = await got.post(`${vars.ANDESMAR_CARGAS_API_URL2}`, {
		json: {
			TipoGuia: trackingNumber[2],
			NroGuia: trackingNumber[1],
			NroSucursal: trackingNumber[0],
		},
	});
	let result2 = JSON.parse(JSON.parse(consult2.body).d).Table;

	let eventsList = result2.map((event) => {
		let { date, time } = services.dateStringHandler(event.FechaHis);
		let location = `${event.Calle} ${event.CalleNro} - ${utils.capitalizeText(
			false,
			event.LocalidadDescrip,
		)} - ${utils.capitalizeText(false, event.Provincia)} - Tel: ${event.Telefono}`;
		return {
			date,
			time,
			location,
			description: event.Estado.split(' <strong>')[0],
		};
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let otherData = {
		Origen: utils.capitalizeText(false, resultOtherData.Origen),
		Destino: utils.capitalizeText(false, resultOtherData.Destino),
		Destinatario: utils.capitalizeText(false, resultOtherData.Destinatario),
		'Modalidad de entrega': resultOtherData.ModalidadEntregaDescrip,
		'Tipo de venta': resultOtherData.UnidadVentaDescrip,
	};

	return {
		events: eventsList,
		moreData: [{ title: 'OTROS DATOS', data: otherData }],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 6 && /^\d+$/.test(code)) {
		pass = true;
	}
	if (code.slice(0, 2) === 'as' && /^\d+$/.test(code.slice(2))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
