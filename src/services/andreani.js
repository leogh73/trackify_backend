import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consults = [];
	try {
		consults = await Promise.all([
			got(`${vars.ANDREANI_API_URL1.replace('code', code)}`),
			got(`${vars.ANDREANI_API_URL2}${code}`),
			got(`${vars.ANDREANI_API_URL3.replace('code', code)}`),
		]);
	} catch (error) {
		let response = services.errorResponseHandler(error.response);
		if (JSON.parse(response.body).message === 'Envío no encontrado') return { error: 'No data' };
	}

	let resultEvents = JSON.parse(consults[0].body);
	let resultOtherData = JSON.parse(consults[1].body);

	let eventsList = resultEvents.map((e) => {
		let motive = 'Sin datos';
		let location = 'Sin datos';
		if (e.motivo) motive = e.motivo;
		if (e.sucursal.trim(' ').length) location = e.sucursal;
		return {
			date: e.fecha.dia.split('-').join('/'),
			time: e.fecha.hora,
			location: location,
			condition: e.estado,
			motive: motive,
		};
	});

	let oldData = oldOtherData(JSON.parse(consults[2].body));

	if (lastEvent) {
		let response = services.updateResponseHandler(eventsList, lastEvent);
		if (response.lastEvent) response.visits = oldData.newVisitList;
		return response;
	}

	let otherData = (() => {
		const {
			fechaDeAlta,
			remitente,
			servicio,
			sucursal_custodia,
			direccion_sucursal_custodia,
			horario_sucursal_custodia,
		} = resultOtherData;
		return {
			'Fecha de alta': `${fechaDeAlta.split(' ')[0].split('-').reverse().join('/')} - ${
				fechaDeAlta.split(' ')[1]
			}`,
			Remitente: remitente,
			Servicio: servicio,
			'Sucursal de custodia': sucursal_custodia ?? 'Sin datos',
			'Dirección de sucursal': direccion_sucursal_custodia ?? 'Sin datos',
			'Horario de atención': horario_sucursal_custodia ?? 'Sin datos',
		};
	})();

	let response = {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};

	response = { ...response, ...oldData };

	return response;
}

export default { check };

function oldOtherData(resultVisits) {
	let visitsList = resultVisits.visitas.map((v) => {
		return {
			date: v.fecha,
			time: v.hora,
			motive: v.motivo,
		};
	});
	if (!visitsList.length)
		visitsList.push({
			date: 'Sin datos',
			time: 'Sin datos',
			motive: 'Sin datos',
		});

	let pendingVisits =
		typeof resultVisits.visitasPendientes === 'number'
			? resultVisits.visitasPendientes
			: 'Sin datos';

	let newVisitList = {
		visits: visitsList,
		pendingVisits,
	};

	return { newVisitList };
}
