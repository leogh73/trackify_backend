import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult = await got(`${vars.CAINIAO_API_URL}${code}`);
	let result = JSON.parse(consult.body).module[0];

	if (!result.detailList.length) return { error: 'No data' };

	let eventsList = result.detailList.map((e) => {
		let { date, time } = services.dateStringHandler(e.timeStr);
		return {
			date,
			time,
			status: e.desc,
		};
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let { originCountry, destCountry, mailType, mailTypeDesc, daysNumber, destCpInfo } = result;

	let otherData = {
		'País origen': originCountry,
		'Paìs destino': destCountry,
		'Tipo de envío': mailType,
		'Descripción de envio': mailTypeDesc,
		'Días en camino': daysNumber.split('\tday(s)')[0],
	};

	let destinationService = destCpInfo
		? {
				Nombre: destCpInfo.cpName,
				Teléfono: destCpInfo.phone,
				Url: destCpInfo.url,
				Código: destCpInfo.code,
		  }
		: { 'Sin datos': 'Sin datos' };

	return {
		events: eventsList,
		moreData: [
			{
				title: 'SERVICIO DE DESTINO',
				data: destinationService,
			},
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
