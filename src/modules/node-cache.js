import NodeCache from 'node-cache';
import db from '../modules/mongodb.js';
import services from '../services/_services.js';

export const cache = new NodeCache();

const setCache = async () => {
	try {
		let servicesData = await services.servicesData();
		cache.set('Service', servicesData);
	} catch (error) {
		console.log(`Could not set cache: ${error}`);
	}
};

export default { setCache };
