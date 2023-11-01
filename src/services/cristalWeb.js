import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent, service) {
	let serviceCode;
	if (service === 'Expreso Fueguino') serviceCode = 49;
	if (service === 'Rabbione') serviceCode = 17;
	if (service === 'Rodríguez Hermanos Transportes') serviceCode = 21;
	if (service === 'Transdan Express') serviceCode = 65;

	let splittedCode = code.split('-');
	let consult = await got.post(`${vars.CRISTAL_WEB_API_URL}${serviceCode}`, {
		form: { id: parseFloat(splittedCode[1]), o: splittedCode[2] },
	});
	let result = JSON.parse(consult.body);

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
