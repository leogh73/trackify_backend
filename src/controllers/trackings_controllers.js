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
			completed: checkCompletedStatus(service, result.lastEvent),
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
	let trackingsDB = await Models.Tracking.find({ _id: { $in: user.trackings }, completed: false });
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

function checkCompletedStatus(service, lastEvent) {
	let status = false;
	if (service === 'Andreani') {
		if (lastEvent.includes('Entregado') || lastEvent.includes('Devuelto')) status = true;
	}
	if (service === 'ClicOh' && lastEvent.includes('Entregado')) status = true;
	if (service === 'Correo Argentino') {
		if (lastEvent.includes('ENTREGADO') || lastEvent.includes('ENTREGA EN')) status = true;
	}
	if (service === 'DHL' && lastEvent.includes('entregado')) status = true;
	if (service === 'EcaPack' && lastEvent.includes('ENTREGADO')) status = true;
	if (service === 'FastTrack' && lastEvent.includes('Entregado')) status = true;
	if (service === 'OCA' && lastEvent.includes('Entregado')) status = true;
	if (service === 'OCASA' && lastEvent.includes('Entregamos')) status = true;
	if (service === 'Renaper' && lastEvent.includes('ENTREGADO')) status = true;
	if (service === 'Urbano' && lastEvent.includes('entregado')) status = true;
	if (service === 'ViaCargo' && lastEvent.includes('ENTREGADA')) status = true;
	return status;
}

async function check(trackingId) {
	let tracking = await Models.Tracking.findById(trackingId);
	let response = await checkTracking(tracking);
	let completedStatus = response.result.lastEvent
		? checkCompletedStatus(response.service, response.result.lastEvent)
		: tracking.completed;
	if (response.result.events.length) await updateDatabase(response, tracking, completedStatus);
	return response;
}

async function updateDatabase(response, tracking, completedStatus) {
	await Models.Tracking.findByIdAndUpdate(
		{ _id: tracking._id },
		{
			$push: {
				'result.events': { $each: response.result.events, $position: 0 },
			},
			$set: {
				'result.lastEvent': response.result.lastEvent,
				completed: completedStatus,
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
				completed: completedStatus,
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
					completed: completedStatus,
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
		for (let userResult of totalUserResults) sendNotification(userResult);
		await Promise.all(
			succededChecks.map((check) => {
				let trackingIndex = trackingsCollection.findIndex(
					(tracking) => tracking.id === check.idMDB,
				);
				return updateDatabase(
					check,
					trackingsCollection[trackingIndex],
					checkCompletedStatus(check.service, check.result.lastEvent),
				);
			}),
		);
		let failedChecks = checkCycleResults.filter((check) => check.result.error);
		if (failedChecks.length)
			await Models.storeLog(
				'check cycle',
				failedChecks,
				'rejected promises',
				luxon.getDate(),
				luxon.getTime(),
			);
	}
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
