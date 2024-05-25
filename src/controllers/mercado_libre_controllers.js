import got from 'got';
import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import vars from '../modules/crypto-js.js';
import notifyAdmin from '../modules/nodemailer.js';

const initialize = async (req, res) => {
	const { userId, code } = req.body;

	try {
		let consult = await got.post(
			'https://api.mercadolibre.com/oauth/token',
			{
				form: {
					grant_type: 'authorization_code',
					client_id: `${vars.ML_CLIENT_ID}`,
					client_secret: `${vars.ML_CLIENT_SECRET}`,
					redirect_uri: 'https://trackear.vercel.app',
					code: code,
				},
			},
			{
				headers: { accept: 'application/json', content_type: 'application/x-www-form-urlencoded' },
			},
		);
		let response = JSON.parse(consult.body);
		let meLiResponse = {
			token: response.access_token,
			userId: response.user_id,
			refresh_token: response.refresh_token,
		};
		let user = await db.User.findById(userId);
		user.mercadoLibre = meLiResponse;
		await user.save();
		res.status(200).json(meLiResponse);
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'MercadoLibre initialize',
			{ userId, code },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const consult = async (req, res) => {
	const { userId, consultType } = req.body;

	try {
		let shippingOrders = await checkShippingOrders(userId, consultType);
		let shippingResults = await checkShippings(
			shippingOrders.shippingIds.consult,
			shippingOrders.httpHeaders,
		);
		let response = {
			shippingsData: shippingResults,
			shippingsTotal: shippingOrders.shippingIds.total,
			httpHeaders: shippingOrders.httpHeaders,
		};
		res.status(200).json(response);
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'MercadoLibre consult',
			{ userId, consultType },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const loadMore = async (req, res) => {
	const { shippingIds, httpHeaders } = req.body;

	try {
		let results = await checkShippings(JSON.parse(shippingIds), JSON.parse(httpHeaders));
		res.status(200).json(results);
	} catch (error) {
		let message = luxon.errorMessage(error);
		await db.saveLog(
			'MercadoLibre load more',
			{ shippingIds, httpHeaders },
			error,
			message.date,
			message.time,
		);
		res.status(500).json(message);
	}
};

const notification = async (req, res) => {
	const saveNotification = async (error) =>
		await db.saveLog(
			'ML Notification',
			{ body: JSON.stringify(req.body) },
			error,
			luxon.getDate(),
			luxon.getTime(),
		);

	try {
		await saveNotification('meli notification');
		res.status(200).json({ message: 'Notification received' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: error.toString() });
		await saveNotification(error);
	}
};

const checkUser = async (userId) => {
	let user = await db.User.findById(userId);
	return {
		model: user,
		id: user.mercadoLibre.userId,
		refresh_token: user.mercadoLibre.refresh_token,
		httpHeaders: {
			Authorization: `Bearer ${user.mercadoLibre.token}`,
			'x-format-new': true,
		},
	};
};

async function checkShippingOrders(userId, consultType) {
	let userData = await checkUser(userId);
	let response = [];
	try {
		const consult = await got(
			`https://api.mercadolibre.com/orders/search?${consultType}=${userData.id}&sort=date_desc`,
			{ headers: userData.httpHeaders },
		);
		response = JSON.parse(consult.body);
	} catch (error) {
		if (error.response.statusCode === 401) {
			await renewTokenML(userData.model);
			return await checkShippingOrders(userId, consultType);
		} else {
			return await db.saveLog(
				'MercadoLibre check shipping orders',
				{ userId, consultType },
				error,
				luxon.getDate(),
				luxon.getTime(),
			);
		}
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
		httpHeaders: userData.httpHeaders,
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

async function fetchTrackingData(shippingId, token) {
	let user = await db.User.findOne({ tokenFB: token });
	let userData = await checkUser(user.id);
	try {
		return await Promise.all([
			got(`https://api.mercadolibre.com/shipments/${shippingId}/history`, {
				headers: userData.httpHeaders,
			}),
			got(`https://api.mercadolibre.com/shipments/${shippingId}`, {
				headers: userData.httpHeaders,
			}),
		]);
	} catch (error) {
		if (error.response.statusCode === 401) {
			await renewTokenML(userData.model);
			return await fetchTrackingData(shippingId, token);
		} else {
			return await db.saveLog(
				'ML Fetch Tracking Data',
				{ userId: user.id, shippingId },
				error,
				luxon.getDate(),
				luxon.getTime(),
			);
		}
	}
}

async function renewTokenML(user) {
	let consult = await got.post(
		'https://api.mercadolibre.com/oauth/token',
		{
			form: {
				grant_type: 'refresh_token',
				client_id: `${vars.ML_CLIENT_ID}`,
				client_secret: `${vars.ML_CLIENT_SECRET}`,
				refresh_token: user.mercadoLibre.refresh_token,
			},
		},
		{ headers: { accept: 'application/json', content_type: 'application/x-www-form-urlencoded' } },
	);
	let response = JSON.parse(consult.body);
	let newMeLiData = {
		token: response.access_token,
		userId: response.user_id,
		refresh_token: response.refresh_token,
	};
	user.mercadoLibre = newMeLiData;
	await user.save();
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
