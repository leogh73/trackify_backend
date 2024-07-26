import NodeCache from 'node-cache';
import db from '../modules/mongodb.js';
import _services from '../services/_services.js';

const collections = {
	Service: db.Service,
	StatusMessage: db.StatusMessage,
};

export const cache = new NodeCache();

Object.keys(collections).forEach(async (type) => {
	let dbData = await collections[type].find();
	let collection = {};
	if (type === 'Service') {
		Object.keys(_services.list).forEach((service) => {
			collection[service] = dbData.find((d) => d.name === service);
		});
	}
	if (type === 'StatusMessage') {
		collection = dbData[0].message;
	}
	cache.set(type, collection);
});
