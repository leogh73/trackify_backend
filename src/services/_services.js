import list from './_list.js';
import db from '../modules/mongodb.js';
import { cache } from '../modules/node-cache.js';

const trackingCheckHandler = async (service, code, lastEvent, token) => {
	const timeout = () =>
		new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({
					statusCode: 504,
					statusMessage: 'Gateway Timeout',
					body: 'Service timeout',
				});
			}, 8500);
		});

	try {
		return await Promise.race([list[service].check(code, lastEvent, service, token), timeout()]);
	} catch (error) {
		return {
			error: errorResponseHandler(error),
			service,
			code,
		};
	}
};

const errorResponseHandler = (error) => {
	let response = {
		statusCode: 500,
		statusMessage: 'Internal Server Error',
		body: error.toString(),
	};
	if (error.response) {
		let { statusCode, statusMessage, body } = error.response;
		let responseBody;
		try {
			responseBody = JSON.parse(body);
		} catch (error) {
			responseBody = body;
		}
		response = { statusCode, statusMessage, body: responseBody };
	}
	if (error.body) response = error;
	return response;
};

const updateResponseHandler = (eventsList, lastEvent) => {
	let eventsText = eventsList.map((e) => Object.values(e).join(' - '));
	let eventIndex = eventsText.indexOf(lastEvent);

	return {
		events: eventIndex ? eventsList.slice(0, eventIndex) : [],
		lastEvent: eventIndex ? eventsText[0] : null,
	};
};

const dateStringHandler = (ts) => {
	let timestamp = new Date(ts);
	let date = `${timestamp.getDate().toString().padStart(2, 0)}/${(timestamp.getMonth() + 1)
		.toString()
		.padStart(2, 0)}/${timestamp.getFullYear()}`;
	let time = `${timestamp.getHours().toString().padStart(2, 0)}:${timestamp
		.getMinutes()
		.toString()
		.padStart(2, 0)}:${timestamp.getSeconds().toString().padStart(2, 0)}`;
	return { date, time };
};

const capitalizeText = (firstWordOnly, text) => {
	return text
		.toLowerCase()
		.split(' ')
		.map((word, index) =>
			firstWordOnly
				? !index
					? word.charAt(0).toUpperCase() + word.slice(1)
					: word
				: word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join(' ');
};

const servicesData = async () => {
	let sData = await db.Service.find({});
	let services = {};
	Object.keys(list).forEach((service) => {
		let index = sData.findIndex((d) => d.name === service);
		if (index === -1) return;
		services[service] = sData[index];
	});
	return services;
};

const servicesCheckHandler = async (servicesCount, servicesVersions) => {
	let sData = cache.get('Service') ?? (await servicesData());
	let dbServicesCount = Object.keys(sData).length;
	let dbServicesVersions = Object.values(sData)
		.map((s) => s.__v)
		.join('');
	let updatedServices =
		parseInt(servicesCount) === dbServicesCount && servicesVersions === dbServicesVersions;
	return updatedServices ? [] : sData;
};

export default {
	trackingCheckHandler,
	errorResponseHandler,
	updateResponseHandler,
	dateStringHandler,
	capitalizeText,
	servicesData,
	servicesCheckHandler,
};
