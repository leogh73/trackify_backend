import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consult = await got(`${vars.CREDIFIN_LOGISTICA_API_URL}${code}`);
	let result = JSON.parse(consult.body);

	if (!result.data.tracking) {
		return { error: 'No data' };
	}

	let eventsList = result.data.tracking.map((e) => {
		let { date, time } = utils.dateStringHandler(e.fecha);
		return {
			date,
			time,
			location: e.ubicacion.length ? e.ubicacion : 'Sin datos',
			status: e.estado,
			description: e.descripcion,
		};
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let sender = (() => {
		const { odocumento, onombre, ocalle, onumero, olocalidad, ocp } =
			result.data.comprobante.guias;
		return {
			DNI: odocumento,
			'Nombre y apellido': onombre,
			Dirección: `${ocalle} ${onumero}`,
			Localidad: olocalidad,
			'Código postal': ocp,
		};
	})();

	let originBranch = (() => {
		const { franquicia, telefono, mail, calle, altura, localidad, cp, horario } =
			result.data.comprobante.guias.ofranquicia;
		return {
			Nombre: franquicia,
			Teléfono: telefono,
			'Correo electrónico': mail,
			Dirección: `${calle} ${altura}`,
			'Horario de atención': horario,
			Localidad: localidad,
			'Código postal': cp,
		};
	})();

	let receiver = (() => {
		const { documento, nombre, direccion, localidad, cp } = result.data.comprobante;
		const { dtelefono, dmail } = result.data.comprobante.guias;
		return {
			DNI: documento,
			'Nombre y apellido': nombre,
			Dirección: direccion,
			Localidad: localidad,
			'Código postal': cp,
			Teléfono: dtelefono,
			'Correo electrónico': dmail,
		};
	})();

	let destinationBranch = (() => {
		const { franquicia, telefono, mail, calle, altura, localidad, cp, horario } =
			result.data.comprobante.guias.dfranquicia;
		return {
			Nombre: franquicia,
			Teléfono: telefono,
			'Correo electrónico': mail,
			Dirección: `${calle} ${altura}`,
			'Horario de atención': horario,
			Localidad: localidad,
			'Código postal': cp,
		};
	})();

	return {
		events: eventsList,
		moreData: [
			{
				title: 'REMITENTE',
				data: sender,
			},
			{
				title: 'SUCURSAL DE ORIGEN',
				data: originBranch,
			},
			{
				title: 'DESTINATARIO',
				data: receiver,
			},
			{
				title: 'SUCURSAL DE DESTINO',
				data: destinationBranch,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 18 && code.slice(8, 11) === '000' && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
