import vars from '../modules/crypto-js.js';

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
			service: 'ClicOh',
			code,
			lastEvent,
			detail: error,
			error: 'Ha ocurrido un error. Reintente más tarde',
		};
	}
}

async function startCheck(code, lastEvent) {
	let data = await got.post(`${vars.PLAYWRIGHT_API_CLICOH_URL}`, {
		json: { code },
	});

	let events = data.packagestatehistory_set.map((e) => {
		return {
			date: convertDate(e.since.split('T')[0]),
			time: e.since.split('T')[1].split('.')[0].split('-')[0],
			description: e.state.description,
		};
	});
	events.reverse();

	let response;
	if (!lastEvent) {
		response = startResponse(events, data);
	} else {
		response = updateResponse(events, lastEvent);
	}

	return response;
}

function startResponse(events, data) {
	let origin = (() => {
		const { address, country } = data.origin;
		return {
			address,
			country,
		};
	})();

	let destiny = (() => {
		const { address, locality, country, administrative_area_level_1, postal_code } = data.to;
		return {
			address,
			locality,
			country,
			administrative_area_level_1,
			postal_code,
		};
	})();

	const { dni, first_name, last_name, email, phone, address } = data.receiver;
	let receiver = {
		dni,
		first_name,
		last_name,
		email: verifyData(email),
		phone: verifyData(phone),
		address: verifyData(address),
	};

	let otherData = {
		clientName: data.client,
	};

	let response = {
		events,
		origin,
		destiny,
		receiver,
		otherData,
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].description}`,
	};

	return response;
}

function updateResponse(events, lastEvent) {
	let eventsText = events.map((e) => `${e.description}`);
	let eventIndex = eventsText.indexOf(lastEvent.split(' - ')[2]);

	let eventsResponse = [];
	if (eventIndex) eventsResponse = events.slice(0, eventIndex);

	let response = { events: eventsResponse };
	if (eventsResponse.length)
		response.lastEvent = `${events[0].date} - ${events[0].time} - ${events[0].description}`;

	return response;
}

function convertDate(date) {
	let dateToday = new Date(date);
	let newDate =
		dateToday.getDate() + '/' + (dateToday.getMonth() + 1) + '/' + dateToday.getFullYear();
	return newDate;
}

function verifyData(data) {
	let newData;
	if (data == null) {
		newData = 'Sin datos';
	} else if (data == false) {
		newData = 'No';
	} else if (data == true) {
		newData = 'Si';
	} else {
		return data;
	}
	return newData;
}

function convertFromDrive(driveData) {
	const { events, otherData } = driveData;
	return {
		events,
		origin: {
			address: otherData[0][0],
			locality: otherData[0][1],
			country: otherData[0][2],
			street_number: otherData[0][3],
			administrative_area_level_1: otherData[0][4],
			postal_code: otherData[0][5],
		},
		destiny: {
			address: otherData[1][0],
			locality: otherData[1][1],
			country: otherData[1][2],
			street_number: otherData[1][3],
			administrative_area_level_1: otherData[1][4],
			postal_code: otherData[1][5],
		},
		receiver: {
			dni: otherData[2][0],
			first_name: otherData[2][1],
			last_name: otherData[2][2],
			email: otherData[2][3],
			phone: otherData[2][4],
			address: otherData[2][5],
		},
		otherData: {
			pickupPoint: otherData[3][0],
			clientName: otherData[3][1],
			serviceType: otherData[3][2],
			secretCodeConfirmed: otherData[3][3],
		},
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].description}`,
	};
}

export default {
	checkStart,
	checkUpdate,
	convertFromDrive,
};
