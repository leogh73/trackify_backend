import db from '../modules/mongodb.js';
import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import { cache } from '../modules/node-cache.js';

const fetchData = async (code, accessToken) => {
	let consult;
	try {
		consult = await got.post(vars.FEDEX_API_URL, {
			json: {
				includeDetailedScans: true,
				trackingInfo: [{ trackingNumberInfo: { trackingNumber: code } }],
			},
			headers: {
				authorization: `Bearer ${accessToken}`,
			},
		});
		return JSON.parse(consult.body).output.completeTrackResults[0].trackResults[0];
	} catch (error) {
		if (error.response.statusCode === 401) {
			let newAccessToken = await fetchAccessToken();
			return await fetchData(code, newAccessToken);
		}
	}
};

async function check(code, lastEvent) {
	let accessToken = cache.get('FedEx_token') ?? (await fetchAccessToken());

	let responseData = await fetchData(code, accessToken);

	if (responseData.error?.code === 'TRACKING.TRACKINGNUMBER.NOTFOUND') return { error: 'No data' };

	let eventsList = responseData.scanEvents.map((e) => {
		let { date, time } = services.dateStringHandler(e.date);
		let location = e.scanLocation.city
			? e.scanLocation.city + ', ' + e.scanLocation.postalCode + ', ' + e.scanLocation.countryName
			: 'Sin datos';
		return {
			date,
			time,
			location,
			status: e.derivedStatus ?? 'Sin datos',
			description: e.eventDescription.includes('exception')
				? e.exceptionDescription
				: e.eventDescription ?? 'Sin datos',
		};
	});

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let { shipperInformation, recipientInformation, packageDetails, serviceDetail } = responseData;

	let otherData = {
		'Ciudad de origen':
			shipperInformation.address.city + ', ' + shipperInformation.address.countryName,
		'Ciudad de destino':
			recipientInformation.address.city + ', ' + recipientInformation.address.countryName,
		Peso: packageDetails.weightAndDimensions.weight
			.map((w) => {
				return `${w.value} ${w.unit}`;
			})
			.join(' / '),
		Dimensiones: packageDetails.weightAndDimensions.dimensions
			.map((w) => {
				return `${w.length}x${w.width}x${w.height} ${w.units}`;
			})
			.join(' / '),
		Servicio: serviceDetail.description,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

const fetchAccessToken = async () => {
	try {
		let tokenConsult = await got.post('https://apis.fedex.com/oauth/token', {
			form: {
				grant_type: 'client_credentials',
				client_id: vars.FEDEX_CLIENT_ID,
				client_secret: vars.FEDEX_CLIENT_SECRET,
			},
			headers: { accept: 'application/json' },
		});
		let { access_token } = JSON.parse(tokenConsult.body);
		cache.set('FedEx_token', access_token);
		return access_token;
	} catch (error) {
		await db.saveLog('get fedex token', { error: 'fedex' }, error);
	}
};

export default { check };
