import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { load } from 'cheerio';
import utils from './_utils.js';

async function check(code, lastEvent, extraData) {
	const fetchData = async (form) => {
		try {
			let response = await got.post(vars.CORREO_ARGENTINO_API_URL, {
				form,
			});
			return { body: response.body, type: form.action };
		} catch (error) {
			return { error: error.toString() };
		}
	};

	const firstCheck = async (letters, code, service) => {
		let response;
		if (letters) {
			response = await fetchData({
				action: service,
				id: code,
				producto: letters,
				pais: 'AR',
			});
		} else {
			let notFound;
			let consult = (
				await Promise.allSettled([
					fetchData({ action: 'oidn', id: code }),
					fetchData({ action: 'ondng', id: code }),
					fetchData({ action: 'onpa', id: code }),
					fetchData({ action: 'mercadolibre', id: code }),
					fetchData({ action: 'ecommerce', id: code }),
				])
			)
				.filter((r) => r.status === 'fulfilled')
				.map((c) => {
					const $ = load(c.value.body);
					if ($('div > strong').text() === 'No se encontraron resultados') {
						notFound = c.value;
						return null;
					}
					if ($('p').text().includes('Resultados de la consulta')) {
						return c.value;
					}
				})
				.filter((r) => !!r);
			response = !consult.length ? notFound : consult[0];
		}
		return response;
	};

	let serviceType = extraData.serviceType;
	let cleanCode = code.toUpperCase().split('-').join('').split(' ').join('');
	let checkData = { letters: null, code: cleanCode };
	if (cleanCode.slice(-2) === 'AR') {
		let minCode = cleanCode.split('AR')[0];
		checkData = {
			letters: minCode.slice(0, 2),
			code: minCode.slice(2),
			service: selectService[minCode.slice(0, 2)],
		};
	}

	let consult;
	if (serviceType) {
		let form = { action: serviceType, id: cleanCode };
		if (serviceType === 'ondnp' || serviceType === 'ondnc' || serviceType === 'ondi') {
			let { letters, code, service } = checkData;
			form = {
				action: service,
				id: code,
				producto: letters,
				pais: 'AR',
			};
		}
		consult = await fetchData(form);
	} else {
		let { letters, code, service } = checkData;
		consult = await firstCheck(letters, code, service);
	}

	if (consult.error) {
		return { error: consult.error };
	}

	const $ = load(consult.body);

	if ($('div > strong').text() === 'No se encontraron resultados') {
		return { error: 'No data' };
	}

	let rowsList = [];
	$('#no-more-tables > table > tbody > tr> td').each(function () {
		if ($(this).text().length) rowsList.push($(this).text());
	});

	let eventsData = [];

	let indexList = rowsList
		.map((r, i) => (isNaN(parseFloat(r.split('-')[0])) ? null : i))
		.filter((r) => !!r);
	indexList.unshift(0);

	for (let i = 0; i < indexList.length; i++) {
		eventsData.push(rowsList.slice(indexList[i], indexList[i + 1]));
	}

	let startEventsList = [];
	for (let i = 0; i < eventsData.length; i++) {
		let eventData = eventsData[i];
		let date = eventData[0].split(' ')[0].split('-').join('/');
		let splittedDate = date.split('/');
		if (splittedDate[0].length === 4) {
			date = splittedDate.reverse().join('/');
		}
		let time = eventData[0].split(' ')[1];
		let splittedTime = time.split(':');
		let condition = utils.capitalizeText(false, eventData[3] ?? 'Sin datos');
		if (!condition.length) {
			condition = 'Sin datos';
		}
		let event = {
			dateObject: Date(
				splittedDate[2],
				splittedDate[1] - 1,
				splittedDate[0],
				splittedTime[0],
				splittedTime[1],
			),
			date,
			time,
			location: eventData[1],
			description: eventData[2],
			condition,
		};
		startEventsList.push(event);
	}
	if (consult.type === 'oidn') {
		startEventsList.reverse();
	}

	startEventsList.sort((e1, e2) => e2.dateObject - e1.dateObject);

	let eventsList = startEventsList.map((e) => {
		delete e.dateObject;
		return e;
	});

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
		extraData: { ...extraData, serviceType: consult.type },
	};
}

let selectService = {
	CU: 'ondnp',
	SU: 'ondnp',
	EU: 'ondnp',
	PU: 'ondnp',
	XU: 'ondnp',
	CU: 'ondnp',
	CC: 'ondnc',
	CD: 'ondnc',
	CL: 'ondnc',
	CM: 'ondnc',
	CO: 'ondnc',
	CP: 'ondnc',
	DE: 'ondnc',
	DI: 'ondnc',
	EC: 'ondnc',
	EE: 'ondnc',
	EO: 'ondnc',
	EP: 'ondnc',
	GC: 'ondnc',
	GD: 'ondnc',
	GE: 'ondnc',
	GF: 'ondnc',
	GO: 'ondnc',
	GR: 'ondnc',
	GS: 'ondnc',
	HC: 'ondnc',
	HD: 'ondnc',
	HE: 'ondnc',
	HU: 'ondnc',
	IN: 'ondnc',
	IS: 'ondnc',
	JP: 'ondnc',
	LC: 'ondnc',
	LS: 'ondnc',
	ND: 'ondnc',
	MD: 'ondnc',
	ME: 'ondnc',
	MC: 'ondnc',
	MS: 'ondnc',
	MU: 'ondnc',
	MX: 'ondnc',
	OL: 'ondnc',
	PC: 'ondnc',
	PP: 'ondnc',
	RD: 'ondnc',
	RE: 'ondnc',
	RP: 'ondnc',
	RR: 'ondnc',
	SD: 'ondnc',
	SL: 'ondnc',
	SP: 'ondnc',
	SR: 'ondnc',
	ST: 'ondnc',
	TC: 'ondnc',
	TD: 'ondnc',
	TL: 'ondnc',
	UP: 'ondnc',
	EE: 'ondi',
	CX: 'ondi',
	RR: 'ondi',
	XP: 'ondi',
	XX: 'ondi',
	XR: 'ondi',
	RP: 'ondi',
};

function testCode(c) {
	let code = c.split('-').join('');
	let pass = false;
	if (code.length === 13 && /^\d+$/.test(code.slice(11, 13)) === false) {
		pass = true;
	}
	if (
		(code.length === 23 && code.slice(0, 3) === '000') ||
		(code.length === 18 && code.slice(-2) === '01')
	) {
		pass = true;
	}
	if (code.length === 11 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
