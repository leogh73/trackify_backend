import vars from '../modules/crypto-js.js';
import luxon from '../modules/luxon.js';
import got from 'got';
import db from '../modules/mongodb.js';

async function check(code, lastEvent, trackingId) {
	let dividedCode = code.split('-');
	let consult = await got(
		`${vars.MDCARGAS_API_URL.replace('type', dividedCode[0])
			.replace('branch', dividedCode[1])
			.replace('number', dividedCode[2])}`,
	);
	let data = JSON.parse(consult.body);

	let statusDetail = data.estado.toString().split(dividedCode[2])[1].trim();
	let status = statusDetail.charAt(0).toUpperCase() + statusDetail.toString().slice(1);

	let event = { date: luxon.getDate(), time: luxon.getTime(), status };

	let response;
	if (!lastEvent) {
		response = startResponse(event);
	} else {
		let tracking = await db.Tracking.findById(trackingId);
		if (!tracking) return tracking;
		response = updateResponse(tracking.result.events, event);
	}

	return response;
}

function startResponse(event) {
	let response = {
		events: [event],
		lastEvent: `${event.date} - ${event.time} - ${event.status}`,
	};

	return response;
}

function updateResponse(eventsList, lastEvent) {
	let eventsText = eventsList.map((e) => e.status);
	let eventIndex = eventsText.indexOf(lastEvent.status);
	let eventsResponse = [];
	if (eventIndex === -1) eventsResponse.push(lastEvent);

	let response = { events: eventsResponse };
	if (eventsResponse.length)
		response.lastEvent = `${lastEvent.date} - ${lastEvent.time} - ${lastEvent.status}`;

	return response;
}

function convertFromDrive(driveData) {
	const { events } = driveData;
	return {
		events,
		lastEvent: `${events[0].date} - ${events[0].time} - ${events[0].status}`,
	};
}

export default {
	check,
	convertFromDrive,
};
