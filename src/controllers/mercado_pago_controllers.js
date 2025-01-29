import got from 'got';
import db from '../modules/mongodb.js';
import vars from '../modules/crypto-js.js';

const notification_url = vars.MP_NOTIFICATION_URL;
const checkoutAccessToken = vars.MP_CHECKOUT_ACCESS_TOKEN;
const subscriptionAccessToken = vars.MP_SUBSCRIPTION_ACCESS_TOKEN;

const paymentRequest = async (req, res) => {
	const { paymentType, deviceData } = req.body;

	try {
		let paymentRequest = await got.post(
			`https://api.mercadopago.com/${
				paymentType === 'simple' ? 'checkout/preferences' : 'preapproval_plan'
			}`,
			{
				json:
					paymentType === 'simple'
						? {
								items: [
									{
										title: 'TrackeAR Premium por 30 días',
										description: 'TrackeAR Premium por 30 días',
										quantity: 1,
										unit_price: 2000,
										currency_id: 'ARS',
										id: deviceData,
									},
								],
								notification_url: `${notification_url}newPayment`,
						  }
						: {
								reason: 'TrackeAR Premium Suscripción',
								external_reference: deviceData,
								auto_recurring: {
									frequency: 1,
									frequency_type: 'months',
									billing_day: (() => {
										let nextDay = new Date(Date.now()).getDate() + 1;
										return nextDay > 28 ? 1 : nextDay;
									})(),
									transaction_amount: 2000,
									currency_id: 'ARS',
									billing_day_proportional: false,
								},
								back_url: `${notification_url}newSubscription`,
						  },
				headers: {
					content_type: 'application/json',
					authorization: `Bearer ${
						paymentType === 'simple' ? checkoutAccessToken : subscriptionAccessToken
					}`,
				},
			},
		);
		let newPayment = JSON.parse(paymentRequest.body);
		res.status(200).json({ url: newPayment.init_point });
	} catch (error) {
		await db.saveLog('mercado pago initialization', { paymentType, deviceData }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const newPayment = async (req, res) => {
	if (!req.body.data) return res.status(204);
	const { data, action } = req.body;

	try {
		let paymentDetail = await getPaymentDetail(data.id, 'simple', false);
		if (paymentDetail.error) return res.status(503).json({ error: 'mercado pago error' });
		await storeUpdatePayment(paymentDetail, action === 'payment.created');
		res.status(200).json('notification received');
	} catch (error) {
		await db.saveLog('mercado pago webhook', { body: req.body }, error);
		res.status(500).json('an error has occurred');
	}
};

const newSubscription = async (req, res) => {
	try {
		let paymentDetail = await getPaymentDetail(req.query.preapproval_id, 'subscription', false);
		if (paymentDetail.error) return res.status(503).json({ error: 'mercado pago error' });
		await storeUpdateSubscription(paymentDetail);
		res.status(200).json({ success: 'subscription stored correctly' });
	} catch (error) {
		await db.saveLog('new subscription error', { body: req.body }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const cancelSubscription = async (req, res) => {
	const cancelRequest = async (id) => {
		let response;
		try {
			let consult = await got.put(`https://api.mercadopago.com/preapproval/${id}`, {
				json: { status: 'cancelled' },
				headers: {
					content_type: 'application/json',
					authorization: `Bearer ${subscriptionAccessToken}`,
				},
			});
			response = JSON.parse(consult.body);
		} catch (error) {
			await db.saveLog('cancel subscription request error', { body: req.body }, error);
			response = { error: error.toString() };
		}
		return response;
	};

	try {
		let user = await db.User.findById(req.body.userId);
		if (!user) return res.status(400).send({ error: 'user not found' });
		let updatedData = await cancelRequest(user.mercadoPago.id);
		if (updatedData.error) return res.status(500).send({ error: 'mercado pago error' });
		let paymentData = await storeUpdateSubscription(updatedData, user.mercadoPago.device);
		res.status(200).json({ paymentData: userPaymentData(paymentData) });
	} catch (error) {
		await db.saveLog('cancel subscription error', { body: req.body }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const checkDeviceId = async (req, res) => {
	try {
		let device = JSON.parse(req.body.deviceData);
		let users = await db.User.find({ 'mercadoPago.device.uuid': device.uuid });
		if (!users.length) return res.status(200).json({ result: 'payment not found' });
		let user = users[0];
		if (users.length > 1) {
			let validPayments = users.filter((user) => user.mercadoPago.isValid);
			if (validPayments.length === 1) {
				user = validPayments[0];
			} else {
				let usersFilter = validPayments.length > 1 ? validPayments : users;
				let usersDates = usersFilter.map((u) => {
					return { id: u.id, date: new Date(u.mercadoPago.dateCreated).getTime() };
				});
				let recentDate = usersDates.find(
					(u) => u.date === Math.max(...usersDates.map((u) => u.date)),
				);
				user = users.find((u) => u.id === recentDate.id);
			}
		}
		if (device.userId !== user.id) {
			await db.User.updateOne({ _id: device.userId }, { $set: { mercadoPago: user.mercadoPago } });
			await db.User.updateOne({ _id: user.id }, { $unset: { mercadoPago: 1 } });
		}
		res.status(200).json({ result: userPaymentData(user.mercadoPago) });
	} catch (error) {
		await db.saveLog('mercado pago payment check', { device }, error);
		res.status(500).json({ error: error.toString() });
	}
};

const checkPaymentId = async (req, res) => {
	const { userId, uuid, transactionId } = req.body;

	let paymentDetail = await getPaymentDetail(transactionId, 'simple', false);
	if (paymentDetail.error) {
		return res.status(200).json({ result: 'payment not found' });
	}

	let mercadoPago;
	let existingId;

	if (paymentDetail.description === 'TrackeAR Premium Suscripción') {
		let subscriptionData = await getPaymentDetail(
			paymentDetail.point_of_interaction.transaction_data.subscription_id,
			'subscription',
			false,
		);
		if (subscriptionData.error) {
			return res.status(200).json({ result: 'subscription information not found' });
		}
		mercadoPago = await storeUpdateSubscription(subscriptionData, { userId, uuid });
		existingId = JSON.parse(subscriptionData.external_reference).userId;
	} else {
		mercadoPago = await storeUpdatePayment(paymentDetail, false, { userId, uuid });
		existingId = JSON.parse(paymentDetail.additional_info.items[0].id).userId;
	}

	if (mercadoPago.error) {
		return res.status(500).json({ error: mercadoPago.error });
	}

	if (existingId !== userId) {
		await db.User.updateOne({ _id: existingId }, { $unset: { mercadoPago: 1 } });
	}

	let paymentData = userPaymentData(mercadoPago);
	return res.status(200).json({ result: paymentData });
};

const getPaymentDetail = async (id, paymentType, cronJob) => {
	try {
		let result = await got(
			`https://api.mercadopago.com/${
				paymentType === 'simple' ? 'v1/payments/' : 'preapproval/'
			}${id}`,
			{
				headers: {
					content_type: 'application/json',
					authorization: `Bearer ${
						paymentType === 'simple' ? checkoutAccessToken : subscriptionAccessToken
					}`,
				},
			},
		);
		return JSON.parse(result.body);
	} catch (error) {
		if (!cronJob)
			await db.saveLog('MercadoPago payment consult', { paymentId: id, paymentType }, error);
		return { error: error.toString() };
	}
};

const storeUpdatePayment = async (paymentDetail, created, device) => {
	const { id, additional_info, date_created, date_last_updated, payer, status, status_detail } =
		paymentDetail;
	let deviceData = device ?? JSON.parse(additional_info.items[0].id);
	const user = await db.User.findById(deviceData.userId);
	if (user.mercadoPago && created) return;
	const dateCheck = created
		? { isValid: true, daysRemaining: 30 }
		: checkPaymentStatus(date_last_updated, status);
	const mercadoPago = {
		id,
		device: deviceData,
		dateCreated: date_created,
		dateUpdated: date_last_updated,
		payer,
		status,
		statusDetail: status_detail,
		paymentType: 'simple',
		daysRemaining: dateCheck.daysRemaining,
		isValid: dateCheck.isValid,
	};
	let update = await updateDatabase(deviceData.userId, mercadoPago);
	return update.error ? update : mercadoPago;
};

const storeUpdateSubscription = async (paymentDetail, device) => {
	const {
		id,
		payer_id,
		payer_email,
		external_reference,
		date_created,
		status,
		preapproval_plan_id,
		auto_recurring,
	} = paymentDetail;
	let deviceData = device ?? JSON.parse(external_reference);
	const mercadoPago = {
		id,
		planId: preapproval_plan_id,
		device: deviceData,
		dateCreated: date_created,
		payer: { payer_id, payer_email },
		status,
		paymentType: 'subscription',
		billingDay: auto_recurring.billing_day,
		isValid: status === 'authorized',
	};
	let update = await updateDatabase(deviceData.userId, mercadoPago);
	return update.error ? update : mercadoPago;
};

const updateDatabase = async (userId, mercadoPago) => {
	try {
		return await db.User.updateOne({ _id: userId }, { $set: { mercadoPago } });
	} catch (error) {
		await db.saveLog('mercadoPago payment save', { userId, mercadoPago }, error);
		return { error: error.toString() };
	}
};

const checkPaymentStatus = (date, newStatus) => {
	if (newStatus !== 'approved') return { newStatus, isValid: false, daysRemaining: 0 };
	let isValid = true;
	let daysDifference = Math.floor(
		(new Date(Date.now()).getTime() - new Date(date).getTime()) / (1000 * 3600 * 24),
	);
	if (daysDifference > 30) isValid = false;
	let daysRemaining = 30 - daysDifference;
	return { newStatus, isValid, daysRemaining: isValid ? daysRemaining : '-' };
};

const userPaymentData = (mercadoPago) => {
	const { id, dateCreated, paymentType, daysRemaining, billingDay, status, isValid } = mercadoPago;
	const timeStamp = new Date(dateCreated);
	const date = `${timeStamp.getDate().toString().padStart(2, 0)}/${(timeStamp.getMonth() + 1)
		.toString()
		.padStart(2, 0)}/${timeStamp.getFullYear()}`;
	return {
		operationId: id,
		dateCreated: date,
		paymentType,
		daysRemaining,
		billingDay,
		status,
		isValid,
	};
};

const checkPayment = async (user, cronJob) => {
	let { id, paymentType, dateUpdated } = user.mercadoPago;

	let checkResult;
	if (paymentType === 'simple') {
		let paymentDetail = await getPaymentDetail(id, 'simple', cronJob);
		if (paymentDetail.error) {
			checkResult = paymentDetail;
		} else {
			let { newStatus, isValid, daysRemaining } = checkPaymentStatus(
				dateUpdated,
				paymentDetail.status,
			);
			checkResult = { newStatus, isValid, daysRemaining };
		}
	}
	if (paymentType === 'subscription') {
		let paymentDetail = await getPaymentDetail(id, 'subscription', cronJob);
		if (paymentDetail.error) {
			checkResult = paymentDetail;
		} else {
			let newStatus = paymentDetail.status;
			checkResult = { newStatus, isValid: newStatus === 'authorized', daysRemaining: '-' };
		}
	}

	if (checkResult.error) {
		return {
			userId: user.id,
			paymentId: id,
			paymentType,
			error: checkResult.error,
			newStatus: 'could not be checked',
			daysRemaining: '-',
			isValid: false,
		};
	}

	let { newStatus, isValid, daysRemaining } = checkResult;

	return {
		paymentType,
		userId: user.id,
		newStatus,
		daysRemaining,
		isValid,
	};
};

const updateUsers = async (usersData) => {
	let databaseUpdates = [];
	for (let check of usersData) {
		let { userId, newStatus, daysRemaining, isValid } = check;
		databaseUpdates.push({
			updateOne: {
				filter: { _id: userId },
				update: {
					$set: {
						'mercadoPago.status': newStatus,
						'mercadoPago.daysRemaining': daysRemaining,
						'mercadoPago.isValid': isValid,
					},
				},
			},
		});
	}
	await db.User.bulkWrite(databaseUpdates);
};

export default {
	paymentRequest,
	newPayment,
	newSubscription,
	cancelSubscription,
	checkDeviceId,
	checkPaymentId,
	userPaymentData,
	checkPayment,
	updateUsers,
};
