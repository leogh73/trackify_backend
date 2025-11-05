import list from './_list.js';
import db from '../modules/mongodb.js';
import { cache } from '../modules/node-cache.js';

const trackingCheckHandler = async (service, code, lastEvent, extraData) => {
	const timeout = () =>
		new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({
					statusCode: 504,
					statusMessage: 'Gateway Timeout',
					body: 'Service timeout',
				});
			}, 12000);
		});

	try {
		return await Promise.race([list[service].check(code, lastEvent, extraData), timeout()]);
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
		body: error.toString() ?? null,
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
	if (error.body) {
		response = error;
	}
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

const servicesData = async () => {
	let sData = await db.Service.find({});
	let services = {};
	Object.keys(list).forEach((service) => {
		let index = sData.findIndex((d) => d.name === service);
		if (index === -1) {
			return;
		}
		let serviceData = sData[index].toObject();
		delete serviceData.contact;
		services[service] = serviceData;
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

const autodetect = (code) => {
	return Object.keys(list)
		.map((s) => {
			return {
				service: s,
				pass: list[s].testCode(code),
			};
		})
		.filter((r) => r.pass)
		.map((r) => r.service);
};

export default {
	trackingCheckHandler,
	errorResponseHandler,
	updateResponseHandler,
	servicesData,
	servicesCheckHandler,
	autodetect,
};
