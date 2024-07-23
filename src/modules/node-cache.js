import NodeCache from 'node-cache';
import db from '../modules/mongodb.js';
import _services from '../services/_services.js';

const collections = {
	Service: db.Service,
	StatusMessage: db.StatusMessage,
};

const cache = new NodeCache();

(async () => {
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
})();

const getData = (type) => cache.get(type);

const setStatusMessage = (message) => cache.set('StatusMessage', message);

export default { getData, setStatusMessage };
