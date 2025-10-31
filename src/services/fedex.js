import db from '../modules/mongodb.js';
import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import utils from './_utils.js';
import { cache } from '../modules/node-cache.js';

async function check(code, lastEvent) {
	let accessToken = cache.get('FedEx_token') ?? (await fetchAccessToken());

	let responseData = await fetchData(code, accessToken);

	console.log(responseData);

	if (
		responseData.error?.code === 'TRACKING.TRACKINGNUMBER.NOTFOUND' ||
		responseData.error?.code === 'TRACKING.TRACKINGNUMBER.INVALID'
	) {
		return { error: 'No data' };
	}

	let eventsList = responseData.scanEvents.map((e) => {
		let { date, time } = utils.dateStringHandler(e.date);
		let countryName =
			responseData.scanEvents.length === 1
				? responseData.recipientInformation.address.countryName
				: e.scanLocation.countryName;
		let location = e.scanLocation.city
			? e.scanLocation.city + ', ' + e.scanLocation.postalCode + ', ' + countryName
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

	if (lastEvent) {
		return services.updateResponseHandler(eventsList, lastEvent);
	}

	let otherData;
	if (responseData.shipmentDetails.possessionStatus === false) {
		let { shipperInformation, recipientInformation, packageDetails, serviceDetail } = responseData;
		otherData = {
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
	} else {
		let { originLocation, destinationLocation, serviceDetail } = responseData;
		otherData = {
			'Ciudad de origen':
				originLocation.locationContactAndAddress.address.city +
				', ' +
				originLocation.locationContactAndAddress.address.countryCode,
			'Ciudad de destino':
				destinationLocation.locationContactAndAddress.address.city +
				', ' +
				destinationLocation.locationContactAndAddress.address.countryCode,
			Servicio: serviceDetail.description,
		};
	}

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

const fetchData = async (code, accessToken) => {
	let consult;
	try {
		consult = await got.post(vars.FEDEX_API_URL, {
			json: {
				includeDetailedScans: true,
				trackingInfo: [{ trackingNumberInfo: { trackingNumber: code } }],
			},
			headers: {
				'x-locale': 'es_MX',
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

const patterns = [
	new RegExp(/^\d{12}$/), // FedEx Express (12 digits)
	new RegExp(/^\d{15}$/), // FedEx Ground (15 digits)
	new RegExp(/^\d{20}$/), // SmartPost
	new RegExp(/^96\d{20}$/), // FedEx SmartPost
	new RegExp(/^96\d{32}$/), // FedEx SmartPost extended
	new RegExp(/^100\d{31}$/), // FedEx additional format
	new RegExp(/^\d{18}$/), // Alternative format
	new RegExp(/^(DT\d{12})$/i), // Door Tag
	// Legacy patterns for backward compatibility
	new RegExp(/^(((96\d\d|6\d)\d{3} ?\d{4}|96\d{2}|\d{4}) ?\d{4} ?\d{4}( ?\d{3}|\d{15})?)$/i),
];

function testCode(code) {
	let pass = false;
	for (let pattern of patterns) {
		if (pattern.test(code) && code.slice(0, 4) !== '9990') {
			pass = true;
		}
	}
	if (code.length === 15 && /^\d+$/.test(code) && code.slice(2, 5) === '000') {
		pass = false;
	}
	return pass;
}

export default { check, testCode };
