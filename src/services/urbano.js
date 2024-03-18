import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let url;
	if (code.toString().length > 16) {
		code = code.toString().split('00000000')[1];
		url = vars.URBANO_API_URL1.replace('shicode', '002273').replace(
			'clicode',
			`${'00000000' + code}`,
		);
	} else {
		url = vars.URBANO_API_URL1.replace('shicode', code.substring(0, 4).padStart(5, 0)).replace(
			'clicode',
			code.substring(4),
		);
	}

	let response1 = await got(url);

	const $1 = load(response1.body);
	let data1 = $1('body > div > div:nth-child(4) > table > tbody').html();
	let param1 =
		data1
			.split('<tr data="')[1]
			.split('}')[0]
			.replace(/&quot;/g, '"') + '}';
	let client = {
		Código: $1(
			'body > div > div.col-xs-12.col-sm-12.col-md-12.col-lg-12 > div > div.panel-body > div.col-md-6.col-lg-4.col-sm-12.col-xs-12',
		)
			.text()
			.trim()
			.split('/n')[0],
		Nombre: $1(
			'body > div > div.col-xs-12.col-sm-12.col-md-12.col-lg-12 > div > div.panel-body > div.col-md-3.col-lg-5.col-sm-12.col-xs-12 > span',
		)
			.text()
			.trim(),
	};

	let serviceData = [];
	$1('body > div > div:nth-child(4) > table > tbody > tr > td').each(function () {
		serviceData.push($1(this).text());
	});

	let service = {
		Linea: serviceData[1],
		Producto: serviceData[2],
		Servicio: serviceData[3].length ? serviceData[3] : 'Sin datos',
	};

	if (!JSON.parse(param1).producto) return { error: 'No data' };

	let response2 = await got.post(`${vars.URBANO_API_URL2}`, {
		form: { accion: 'getDetalle', param1 },
	});
	const $2 = load(response2.body);

	let data2 = $2('table > tbody > tr').text();
	client['Localidad'] = $2('div > div.panel-body > div:nth-child(12)').text().split('\n')[0];

	let events = data2
		.split('999')
		.map((e) => {
			let event = e
				.replace(/\n+/g, '')
				.split('              ')
				.map((d) => d.trim());
			return event.filter((ef1) => ef1.length);
		})
		.filter((e) => e.length);

	let eventsList = events.map((e) => {
		let finalLocation;
		let location = e[4].split('-');
		if (location.length == 1) finalLocation = location[0];
		if (location.length > 1) {
			location.shift();
			finalLocation = location.join('-');
		}
		return {
			date: e[2].split('-').join('/'),
			time: e[3],
			location: finalLocation.trim(),
			status: e[1].split('- ')[1],
		};
	});
	eventsList.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		moreData: [
			{
				title: 'CLIENTE',
				data: client,
			},
			{
				title: 'SERVICIO',
				data: service,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
