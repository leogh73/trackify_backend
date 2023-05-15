import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import sendNotification from '../modules/firebase_notification.js';

import user from './users_controllers.js';
import selectService from '../services/_select.js';

async function add(userId, title, service, code, checkDate, checkTime, fromDrive, driveData) {
	let result = fromDrive
		? selectService(service).convertFromDrive(driveData)
		: await selectService(service).checkStart(code);
	let user = await Models.User.findById(userId);

	let newTracking;
	if (!result.error) {
		newTracking = new Models.Tracking({
			title,
			service,
			code,
			checkDate,
			checkTime,
			token: user.tokenFB,
			result,
		});
	}

	if (result.lastEvent != 'No hay datos') {
		result.trackingId = await saveNewTracking(newTracking, user);
	}

	result.checkDate = checkDate;
	result.checkTime = checkTime;

	return result;
}

async function saveNewTracking(newTracking, user) {
	const addedTracking = await newTracking.save();
	user.trackings.push(addedTracking.id);
	await user.save();
	return addedTracking.id;
}

async function remove(userId, trackingIds) {
	await Models.Tracking.deleteMany({ _id: { $in: trackingIds } });
	let user = await Models.User.findById(userId);
	for (let tracking of trackingIds) {
		user.trackings.splice(user.trackings.indexOf(tracking), 1);
	}
	await user.save();
}

async function sincronize(user, lastEventsUser) {
	let trackingsDB = await Models.Tracking.find({ _id: { $in: user.trackings } });
	let responseTrackings = (
		await Promise.all(
			trackingsDB.map((tracking) => findUpdatedTrackings(tracking, lastEventsUser)),
		)
	).filter((result) => !!result);
	return responseTrackings;
}

async function findUpdatedTrackings(tracking, lastEventsUser) {
	let trackingIndex = lastEventsUser.findIndex((t) => t.idMDB === tracking.id);
	if (trackingIndex == -1) {
		await remove(user.id, [tracking.id]);
	} else if (lastEventsUser[trackingIndex].eventDescription !== tracking.result.lastEvent) {
		return tracking;
	}
	return null;
}

async function check(trackingId) {
	let tracking = await Models.Tracking.findById(trackingId);
	let response = await checkTracking(tracking);
	if (response.result.events.length) await updateDatabase(response, tracking);
	return response;
}

async function updateDatabase(response, tracking) {
	await Models.Tracking.findByIdAndUpdate(
		{ _id: tracking.id },
		{
			$push: {
				'result.events': { $each: response.result.events, $position: 0 },
			},
			$set: {
				'result.lastEvent': response.result.lastEvent,
			},
		},
		{ upsert: true, new: true, useFindAndModify: false },
	);
	if (tracking.service === 'DHL') {
		let status = response.result.shipping.status;
		await Models.Tracking.findByIdAndUpdate(
			{ _id: tracking._id },
			{
				$set: {
					'result.shipping.status.date': status.date,
					'result.shipping.status.time': status.time,
					'result.shipping.status.location': status.location,
					'result.shipping.status.statusCode': status.statusCode,
					'result.shipping.status.status': status.status,
					'result.shipping.status.description': status.description,
				},
			},
			{ upsert: true, new: true, useFindAndModify: false },
		);
	}
	if (tracking.service === 'ViaCargo') {
		await Models.Tracking.findByIdAndUpdate(
			{ _id: tracking._id },
			{
				$set: {
					'result.destiny.dateDelivered': response.result.destiny.dateDelivered,
					'result.destiny.timeDelivered': response.result.destiny.timeDelivered,
				},
			},
			{ upsert: true, new: true, useFindAndModify: false },
		);
	}

	tracking.checkDate = response.checkDate;
	tracking.checkTime = response.checkTime;
	await tracking.save();
}

async function checkCycle() {
	let tokenCollection = await user.checkCycle();
	if (!tokenCollection.length) return;
	let rejectedChecks = (await Promise.all(tokenCollection.map((token) => userCheck(token))))
		.map((result) => (result.rejected.length ? result.rejected : null))
		.filter((value) => !!value);
	if (rejectedChecks.length) {
		await Models.storeLog(
			'check cycle',
			rejectedChecks,
			'rejected promises',
			luxon.getDate(),
			luxon.getTime(),
		);
	}
}

async function userCheck(token) {
	let userTrackings = await Models.Tracking.find({ token: token });
	let userData = { token: token, results: [] };
	let userResults = await Promise.allSettled(
		userTrackings.map((tracking) => checkTracking(tracking)),
	);
	userData.results = userResults
		.filter((result) => result.status == 'fulfilled' && result.value.result.events?.length)
		.map((result) => result.value);

	if (userData.results.length) {
		await Promise.allSettled(
			userData.results.map((result) => {
				let index = userTrackings.findIndex((tracking) => tracking.id === result.idMDB);
				return updateDatabase(result, userTrackings[index]);
			}),
		);
		sendNotification(userData);
	}
	let failedChecks = userResults
		.filter((result) => result.status == 'rejected')
		.map((result) => result.value);
	return { fulfilled: userData.results, rejected: failedChecks };
}

async function checkTracking(tracking) {
	let result = await selectService(tracking.service).checkUpdate(
		tracking.code,
		tracking.result.lastEvent,
	);

	return {
		idMDB: tracking.id,
		title: tracking.title,
		service: tracking.service,
		checkDate: luxon.getDate(),
		checkTime: luxon.getTime(),
		result: result,
	};
}

export default { add, remove, sincronize, check, checkCycle, checkTracking };
