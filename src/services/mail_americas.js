import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';
import { load } from 'cheerio';

async function check(code, lastEvent) {
	let consult = await got(`${vars.MAILAMERICAS_API_URL}${code}`);

	const $ = load(consult.body);

	if (
		$('body > div > div.main > div > div > div.col > div > div').text().trim() ===
		'No se ha encontrado un paquete con ese numero de tracking.'
	) {
		return { error: 'No data' };
	}

	let eventsData = [];

	$(
		'body > div > div.main > div > div > div.col > div > div > div > div.mx-auto > div > div.process-step-content.w-100 > div.form-row.my-3.align-items-center',
	).each(function () {
		eventsData.push(
			$(this)
				.text()
				.replace(/\n+/g, '')
				.split('              ')
				.map((d) => d.trim())
				.filter((d) => d.length),
		);
	});

	let eventsList = eventsData.map((event) => {
		let dateAndTime = event.slice(-1)[0].split('        ');
		let date = dateAndTime[0].split(', ').slice(1).join(', ');
		let time = utils.convert12to24Hour(dateAndTime[1].split(' (')[0]);
		let status = event[0];
		let detail = event[1] === event.slice(-1)[0] ? 'Sin datos' : event[1].split(' -')[0];
		return { date, time, status, detail };
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		url: `https://mailamericas.com/tracking?tracking=${code}`,
	};
}

function testCode(code) {
	let pass = false;
	if (code.length === 15 && code.slice(0, 4) === 'mlar' && code.slice(-2) === 'ex') {
		pass = true;
	}
	if (code.length === 13 && /^\d+$/.test(code.slice(2, 11))) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
