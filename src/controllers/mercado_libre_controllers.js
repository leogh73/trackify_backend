import got from 'got';
import db from '../modules/mongodb.js';
import vars from '../modules/crypto-js.js';
import services from '../services/_services.js';

const initialize = async (req, res) => {
	const { userId, code } = req.body;

	try {
		let consult = await got.post(
			'https://api.mercadolibre.com/oauth/token',
			{
				form: {
					grant_type: 'authorization_code',
					client_id: vars.ML_CLIENT_ID,
					client_secret: vars.ML_CLIENT_SECRET,
					redirect_uri: 'https://trackear.vercel.app',
					code,
				},
			},
			{
				headers: { accept: 'application/json', content_type: 'application/x-www-form-urlencoded' },
			},
		);
		let { access_token, user_id, refresh_token } = JSON.parse(consult.body);
		let meLiResponse = { access_token, user_id, refresh_token };
		await db.User.updateOne({ _id: userId }, { $set: { mercadoLibre: meLiResponse } });
		res.status(200).json(meLiResponse);
	} catch (error) {
		await db.saveLog('MercadoLibre initialize', { ...req.body }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const consult = async (req, res) => {
	const { userId, consultType } = req.body;

	try {
		let { id, mercadoLibre } = await db.User.findById(userId);
		let { shippingIds, httpHeaders } = await checkShippingOrders(id, mercadoLibre, consultType);
		let shippingResults = await checkShippings(shippingIds.consult, httpHeaders);
		let response = {
			shippingsData: shippingResults,
			shippingsTotal: shippingIds.total,
			httpHeaders,
		};
		res.status(200).json(response);
	} catch (error) {
		console.log(error);
		await db.saveLog('MercadoLibre consult', { ...req.body }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const loadMore = async (req, res) => {
	const { shippingIds, httpHeaders } = req.body;

	try {
		let results = await checkShippings(JSON.parse(shippingIds), JSON.parse(httpHeaders));
		res.status(200).json({ items: results });
	} catch (error) {
		await db.saveLog('MercadoLibre load more', { ...req.body }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const notification = async (req, res) => {
	const saveNotification = async (error) =>
		await db.saveLog('ML Notification', { body: JSON.stringify(req.body) }, error);

	try {
		await saveNotification('meli notification');
		res.status(200).json({ message: 'Notification received' });
	} catch (error) {
		res.status(500).json({ error: error.toString() });
		await saveNotification(error);
	}
};

async function checkShippingOrders(userId, mercadoLibre, consultType) {
	let { user_id, access_token, refresh_token } = mercadoLibre;
	let httpHeaders = {
		Authorization: `Bearer ${access_token}`,
		'x-format-new': true,
	};
	let response = [];
	try {
		const consult = await got(
			`https://api.mercadolibre.com/orders/search?${consultType}=${user_id}&sort=date_desc`,
			{ headers: httpHeaders },
		);
		response = JSON.parse(consult.body);
	} catch (error) {
		if (error.response.statusCode === 401) {
			let newMeLiData = await renewTokenML(refresh_token, userId);
			return await checkShippingOrders(userId, newMeLiData, consultType);
		}
		await db.saveLog('MercadoLibre check shipping orders', { userId, consultType }, error);
	}

	let shippingOrders = response.results
		.map((i) => {
			return {
				shippingId: i.shipping.id,
				items: i.order_items.map((i) => i.item.title),
			};
		})
		.filter((order) => !!order);

	let consultPart = [];
	if (shippingOrders.length > 10) {
		for (let i = 0; i < 10; i++) {
			consultPart.push(shippingOrders[i]);
		}
	} else {
		consultPart = shippingOrders;
	}

	return {
		shippingIds: {
			consult: consultPart,
			total: shippingOrders,
		},
		httpHeaders: httpHeaders,
	};
}

async function checkShippings(shippingOrders, httpHeaders) {
	let meLiResults = await Promise.allSettled(
		shippingOrders.map((order) => checkShipping(order, httpHeaders)),
	);
	let results = meLiResults
		.filter((result) => result.status == 'fulfilled')
		.map((result) => result.value);
	return results;
}

async function checkShipping(shippingOrder, httpHeaders) {
	let consult = await got(`https://api.mercadolibre.com/shipments/${shippingOrder.shippingId}`, {
		headers: httpHeaders,
	});

	let response = JSON.parse(consult.body);

	return {
		shippingId: shippingOrder.shippingId.toString(),
		title: shippingOrder.items[0],
		code: response.tracking_number,
		items: shippingOrder.items,
		creationDate: convertDate(response.date_created),
		lastUpdate: convertDate(response.last_updated),
		origin: `${response.origin.shipping_address.address_line} - ${response.origin.shipping_address.city.name} - ${response.origin.shipping_address.state.name}`,
		destination: {
			address: `${response.destination.shipping_address.address_line} - ${response.destination.shipping_address.city.name} - ${response.destination.shipping_address.state.name}`,
			name: `${response.destination.receiver_name}`,
		},
	};
}

async function fetchTrackingData(shippingId, mercadoLibre, userId) {
	let { access_token, refresh_token } = mercadoLibre;
	let httpHeaders = {
		Authorization: `Bearer ${access_token}`,
		'x-format-new': true,
	};
	try {
		return await Promise.all([
			got(`https://api.mercadolibre.com/shipments/${shippingId}/history`, {
				headers: httpHeaders,
			}),
			got(`https://api.mercadolibre.com/shipments/${shippingId}`, {
				headers: httpHeaders,
			}),
		]);
	} catch (error) {
		if (error.response.statusCode === 401) {
			let newMeLiData = await renewTokenML(refresh_token, userId);
			return await fetchTrackingData(shippingId, newMeLiData, userId);
		}
		await db.saveLog(
			'ML Fetch Tracking Data',
			{ userId, shippingId: shippingId ?? 'Sin datos' },
			error,
		);
	}
}

async function renewTokenML(refreshToken, userId) {
	try {
		let consult = await got.post(
			'https://api.mercadolibre.com/oauth/token',
			{
				form: {
					grant_type: 'refresh_token',
					client_id: `${vars.ML_CLIENT_ID}`,
					client_secret: `${vars.ML_CLIENT_SECRET}`,
					refresh_token: refreshToken,
				},
			},
			{
				headers: { accept: 'application/json', content_type: 'application/x-www-form-urlencoded' },
			},
		);
		let { access_token, user_id, refresh_token } = JSON.parse(consult.body);
		let newMeLiData = { access_token, user_id, refresh_token };
		await db.User.updateOne({ _id: userId }, { $set: { mercadoLibre: newMeLiData } });
		return newMeLiData;
	} catch (error) {
		await db.saveLog('ML token renew failed', { refreshToken, userId }, error);
	}
}

function convertDate(date) {
	let todayDate = new Date(date);
	let day = todayDate.getDate() + '/' + (todayDate.getMonth() + 1) + '/' + todayDate.getFullYear();
	let minutes = todayDate.getMinutes();
	if (minutes.toString().length == 1) {
		minutes = `0${minutes}`;
	}
	let hour = `${todayDate.getHours()}:${minutes}`;
	return `${day} - ${hour}`;
}

export default { initialize, consult, loadMore, notification, fetchTrackingData };
