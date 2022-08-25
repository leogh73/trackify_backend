import got from 'got';
import { load } from 'cheerio';

async function checkStart(code) {
	try {
		return await startCheck(code, null);
	} catch (error) {
		return {
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function checkUpdate(code, lastEvent) {
	try {
		return await startCheck(code, lastEvent);
	} catch (error) {
		return {
			service: 'Urbano',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let response1 = await got(
		`${process.env.URBANO_API_URL1.replace('shicode', code.substring(0, 4).padStart(5, 0)).replace(
			'clicode',
			code.substring(4),
		)}`,
	);
	// let response1 = await got(
	// 	`https://apis.urbano.com.ar/cespecifica/?shi_codigo=${code
	// 		.substring(0, 4)
	// 		.padStart(5, 0)}&cli_codigo=${code.substring(4)}`,
	// );
	const $1 = load(response1.body);
	let data1 = $1('body > div > div:nth-child(4) > table > tbody').html();
	let param1 =
		data1
			.split('<tr data="')[1]
			.split('}')[0]
			.replace(/&quot;/g, '"') + '}';
	let client = {
		code: $1(
			'body > div > div.col-xs-12.col-sm-12.col-md-12.col-lg-12 > div > div.panel-body > div.col-md-6.col-lg-4.col-sm-12.col-xs-12',
		)
			.text()
			.trim()
			.split('/n')[0],
		name: $1(
			'body > div > div.col-xs-12.col-sm-12.col-md-12.col-lg-12 > div > div.panel-body > div.col-md-3.col-lg-5.col-sm-12.col-xs-12 > span',
		)
			.text()
			.trim(),
	};
	let service = {
		line: $1('body > div > div:nth-child(4) > table > tbody > tr > td:nth-child(2)').text(),
		product: $1('body > div > div:nth-child(4) > table > tbody > tr > td:nth-child(3)').text(),
		service: $1('body > div > div:nth-child(4) > table > tbody > tr > td:nth-child(4)').text(),
	};

	let response2 = await got.post(`${process.env.URBANO_API_URL2}`, {
		form: { accion: 'getDetalle', param1: param1 },
	});
	const $2 = load(response2.body);
	let data2 = $2('table > tbody > tr').text();
	client['locality'] = $2('div > div.panel-body > div:nth-child(12)').text().split('\n')[0];

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
			location: finalLocation,
			status: e[1].split('- ')[1],
		};
	});
	eventsList.reverse();

	let response;
	if (!lastEvent) {
		response = startResponse(eventsList, client, service);
	} else {
		response = updateResponse(eventsList, lastEvent);
	}

	return response;
}

function startResponse(eventsList, client, service) {
	let response = {
		events: eventsList,
		client: client,
		service: service,
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].status} - ${eventsList[0].location}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => `${e.date} - ${e.time} - ${e.status} - ${e.location}`);
	let eventIndex = eventsText.indexOf(lastEvent);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = eventsList.slice(0, eventIndex);

	let response = { events: eventsResponse };
	if (eventsResponse.length) response.lastEvent = eventsText[0];

	return response;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		client: {
			code: otherData[0][0],
			name: otherData[0][1],
		},
		service: {
			line: otherData[1][0],
			product: otherData[1][1],
			service: otherData[1][1],
		},
		lastEvent: `${eventsList[0].date} - ${eventsList[0].time} - ${eventsList[0].status} - ${eventsList[0].location}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
