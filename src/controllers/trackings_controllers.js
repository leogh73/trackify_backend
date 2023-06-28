import Models from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import sendNotification from '../modules/firebase_notification.js';

import user from './users_controllers.js';
import services from '../services/_services.js';

async function add(userId, title, service, code, checkDate, checkTime, fromDrive, driveData) {
	let result = fromDrive
		? services.list[service].convertFromDrive(driveData)
		: await services.checkHandler(service, code, null);
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
			completed: checkCompletedStatus(result.lastEvent),
		});
	}

	if (result.lastEvent != 'No hay datos') {
		const addedTracking = await newTracking.save();
		user.trackings.push(addedTracking.id);
		await user.save();
		result.trackingId = addedTracking.id;
	}

	result.checkDate = checkDate;
	result.checkTime = checkTime;

	return result;
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
	let responseTrackings = trackingsDB
		.map((tracking) => findUpdatedTrackings(tracking, lastEventsUser))
		.filter((result) => !!result);
	return responseTrackings;
}

function findUpdatedTrackings(tracking, lastEventsUser) {
	let trackingIndex = lastEventsUser.findIndex((t) => t.idMDB === tracking.id);
	if (
		trackingIndex !== -1 &&
		lastEventsUser[trackingIndex].eventDescription !== tracking.result.lastEvent
	) {
		// let lastEventData = lastEventsUser[trackingIndex].eventDescription.split(' - ');
		// let endIndex = tracking.result.events.findIndex(
		// 	(e) => e.date === lastEventData[0] && e.time === lastEventData[1],
		// );
		// const { id, service, checkDate, checkTime, result } = tracking;
		// return {
		// 	id,
		// 	service,
		// 	checkDate,
		// 	checkTime,
		// 	result: {
		// 		...result,
		// 		events: result.events.slice(0, endIndex),
		// 	},
		// };
		return tracking;
	}
	return null;
}

function checkCompletedStatus(lastEvent) {
	let status = false;
	let includedWords = ['entregado', 'entregamos', 'devuelto', 'entrega en', 'devolución'];
	for (let word of includedWords) {
		if (!status && lastEvent.toLowerCase().includes(word)) status = true;
	}
	return status;
}

async function check(trackingId) {
	let tracking = await Models.Tracking.findById(trackingId);
	let response = await checkTracking(tracking);
	if (response.result.events?.length)
		await updateDatabase(response, tracking, checkCompletedStatus(response.result.lastEvent));
	return response;
}

async function updateDatabase(response, tracking, completedStatus) {
	let databaseUpdates = [];
	databaseUpdates.push(
		Models.Tracking.findOneAndUpdate(
			{ _id: tracking._id },
			{
				$push: {
					'result.events': { $each: response.result.events, $position: 0 },
				},
				$set: {
					'result.lastEvent': response.result.lastEvent,
					checkDate: response.checkDate,
					checkTime: response.checkTime,
					completed: completedStatus,
				},
			},
		),
	);
	if (tracking.service === 'DHL') {
		let status = response.result.shipping.status;
		databaseUpdates.push(
			Models.Tracking.findOneAndUpdate(
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
			),
		);
	}
	if (tracking.service === 'ViaCargo') {
		databaseUpdates.push(
			Models.Tracking.findOneAndUpdate(
				{ _id: tracking._id },
				{
					$set: {
						'result.destiny.dateDelivered': response.result.destiny.dateDelivered,
						'result.destiny.timeDelivered': response.result.destiny.timeDelivered,
					},
				},
			),
		);
	}
	await Promise.all(databaseUpdates);
}

async function checkCycle() {
	let trackingsCollection = await Models.Tracking.find({ completed: false });
	let checkCycleResults = await Promise.all(
		trackingsCollection.map((tracking) => checkTracking(tracking)),
	);
	let succededChecks = checkCycleResults.filter((check) => check.result.events?.length);
	if (!succededChecks.length) return;
	let totalUserResults = [];
	for (let checkResult of succededChecks) {
		let userResult = { token: checkResult.token };
		let resultIndex = totalUserResults.findIndex((r) => r.token === checkResult.token);
		if (resultIndex == -1) {
			userResult.results = [checkResult];
			totalUserResults.push(userResult);
		} else {
			totalUserResults[resultIndex].results.push(checkResult);
		}
	}
	for (let userResult of totalUserResults) sendNotification(userResult);
	let databaseUpdates = succededChecks.map((check) => {
		let trackingIndex = trackingsCollection.findIndex((tracking) => tracking.id === check.idMDB);
		return updateDatabase(
			check,
			trackingsCollection[trackingIndex],
			checkCompletedStatus(check.result.lastEvent),
		);
	});
	let failedChecks = checkCycleResults.filter((check) => check.result.error);
	if (failedChecks.length) {
		databaseUpdates.push(
			Models.storeLog(
				'check cycle',
				failedChecks,
				'failed checks',
				luxon.getDate(),
				luxon.getTime(),
			),
		);
	}
	await Promise.all(databaseUpdates);
}

async function checkTracking(tracking) {
	let result = await services.checkHandler(
		tracking.service,
		tracking.code,
		tracking.result.lastEvent,
	);

	return {
		idMDB: tracking.id,
		token: tracking.token,
		title: tracking.title,
		service: tracking.service,
		checkDate: luxon.getDate(),
		checkTime: luxon.getTime(),
		result: result,
	};
}

export default { add, remove, sincronize, check, checkCycle, checkTracking };
