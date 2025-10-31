import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';

async function check(code, lastEvent) {
	let consult = await got.post(vars.WELIVERY_API_URL, {
		form: { package_id: code },
	});
	let response = JSON.parse(consult.body);

	if (response.msj?.startsWith('Error: no se encuentran registros')) {
		return { error: 'No data' };
	}

	let { seller, date_buy, address, provider, status_history } = response.data;

	let eventsList = status_history.map((e) => {
		let splittedData = e.date_time.split(' ');
		return {
			date: splittedData[0],
			time: splittedData[1],
			status: utils.capitalizeText(true, e.estado),
		};
	});
	eventsList.reverse();

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let splittedDateBuy = date_buy.split(' ');
	let otherData = {
		Vendedor: seller,
		'Fecha de compra': splittedDateBuy[0],
		'Hora de compra': splittedDateBuy[1],
		Dirección: address,
		Repartidor: provider,
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

function testCode(code) {
	let pass = false;
	if (code.length === 8 && /^\d+$/.test(code)) {
		pass = true;
	}
	return pass;
}

export default { check, testCode };
