import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent, service) {
	let consult = await got(`http://sigtra.hachadepiedra.com/Client/view/despacho/nd/5976${code}`);
	console.log(consult.body);
	let result = JSON.parse(consult.body);
	return result;

	let eventsList = result.data
		.map((event) => {
			return {
				date: event.fecha.split(' ')[0].split('-').reverse().join('/'),
				time: event.fecha.split(' ')[1],
				location: event.dondeEsta,
				detail: event.des.replace(/\n/g, '').replace(/\r/g, ''),
			};
		})
		.reverse();

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	return {
		events: eventsList,
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
