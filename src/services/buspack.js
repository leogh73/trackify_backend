import { load } from 'cheerio';
import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let splittedCode = code.split('-');
	let longCode = splittedCode.length > 2;
	if (longCode) splittedCode[2] = parseInt(splittedCode[2]);
	let checkCode = splittedCode.join('-');

	let consult = await got(`${vars.BUSPACK_API_URL.replace('code', checkCode)}`);
	let result = JSON.parse(consult.body);

	if (result.mensaje.startsWith('No se encontro la operacion con numero:'))
		return { error: 'No data' };

	const $ = load(result.template.template);

	let data1 = [];
	$('div').each(function () {
		data1.push($(this).text());
	});

	let rowList = [];
	$('div > table > tbody > tr> td').each(function () {
		rowList.push($(this).text());
	});

	let eventsData = [];
	let chunkSize = 2;
	for (let i = 0; i < rowList.length; i += chunkSize) {
		eventsData.push(rowList.slice(i, i + chunkSize));
	}

	let eventsList = eventsData
		.map((e) => {
			return {
				date: e[0].split(' ')[0],
				time: e[0].split(' ')[1],
				detail: e[1],
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let data2 = longCode ? data1.slice(0, 10) : data1.slice(0, 7);
	let otherData = longCode
		? {
				'Número de factura': data2[2].split(': ')[1],
				'Cantidad de piezas': data2[3].split(': ')[1],
				'Números de piezas': data2[4].split(':')[1],
				Peso: data2[5].split(':')[1].trim().length
					? data2[5].split(': ')[1].trim() + ' kg.'
					: 'Sin datos',
				'Entrega a domicilio': data2[6].split(': ')[1].trim(),
				Destinatario: data2[7].split(':')[1].trim().length
					? data2[7].split(': ')[1].trim()
					: 'Sin datos',
				'DNI del destinatario': data2[7].split(': ')[1].trim().length
					? data2[7].split(': ')[1].trim('-')
					: 'Sin datos',
				'Sucursal de destino': data2[9].replaceAll('-', '').length ? data2[9] : 'Sin datos',
		  }
		: {
				'Número de factura': data2[3].split(': ')[1],
				'Cantidad de piezas': data2[4].split(': ')[1],
				'Números de piezas': data2[5].split(':')[1],
				Peso: data2[6].split(': ')[1].length
					? data2[6].split(': ')[1].length + ' kg.'
					: 'Sin datos',
				'Entrega a domicilio': 'Sin datos',
				Destinatario: 'Sin datos',
				'DNI del destinatario': 'Sin datos',
				'Sucursal de destino': 'Sin datos',
		  };

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
