import NodeCache from 'node-cache';
import db from '../modules/mongodb.js';
import _services from '../services/_services.js';

export const cache = new NodeCache();

try {
	let services = await _services.servicesData();
	cache.set('Service', services);
	let statusMessage = (await db.StatusMessage.find())[0].message;
	cache.set('StatusMessage', statusMessage);
} catch (error) {
	console.log(`Could not set cache: ${error}`);
}
