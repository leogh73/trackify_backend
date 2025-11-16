import db from '../modules/mongodb.js';
import { dateAndTime } from '../modules/luxon.js';
import services from '../services/_services.js';

async function add(user, title, service, code, driveData) {
	let result = driveData
		? {
				events: driveData.events,
				moreData: driveData.moreData,
				lastEvent: Object.values(driveData.events[0]).join(' - '),
		  }
		: await services.trackingCheckHandler(service, code, null, { service, user });

	if (result.error) {
		return result;
	}

	let { date, time } = dateAndTime();
	let { finished, status } = checkFinishedStatus(result.lastEvent);

	const newTracking = await new db.Tracking({
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck: new Date(Date.now()),
		token: user.tokenFB,
		result,
		finished,
		status,
	}).save();

	result.trackingId = newTracking.id;

	await db.User.updateOne({ _id: user.id }, { $push: { trackings: newTracking.id } });
	await db.Service.updateOne({ name: service }, { $set: { exampleCode: code } });

	result.checkDate = date;
	result.checkTime = time;

	delete result.extraData;

	return result;
}

async function rename(trackingId, newTitle) {
	let allTrackings = await findDuplicateds(trackingId);
	if (allTrackings.error) return;
	let ids = allTrackings.map((t) => t.id);
	await db.Tracking.updateMany({ _id: { $in: ids } }, { $set: { title: newTitle } });
}

async function remove(userId, ids) {
	let trackingIds = JSON.parse(ids);
	let fullTrackingsIds = [];
	for (let tId of trackingIds) {
		let allTrackings = await findDuplicateds(tId);
		if (allTrackings.error) return;
		allTrackings.map((t) => fullTrackingsIds.push(t.id));
	}
	await db.Tracking.deleteMany({ _id: { $in: fullTrackingsIds } });
	await db.User.updateOne({ _id: userId }, { $pull: { trackings: { $in: trackingIds } } });
}

async function findDuplicateds(id) {
	let tracking = await db.Tracking.findById(id);
	if (!tracking) {
		return { error: 'tracking not found' };
	}
	let { title, code, service, token } = tracking;
	return await db.Tracking.find({ title, code, service, token });
}

async function syncronize(trackingEvents) {
	let trackingsDb = await db.Tracking.find({ _id: { $in: trackingEvents.map((e) => e.idMDB) } });
	let missingData = [];
	for (let tracking of trackingsDb) {
		let dbTrackingEvents = tracking.result.events;
		let userTrackingEvents = trackingEvents.find((e) => e.idMDB === tracking.id).eventsList;
		let userTrackingEventsString = userTrackingEvents.map((t) => {
			return Object.values(t).join(' - ');
		});
		let missingEvents = [];
		for (let dbEvent of dbTrackingEvents) {
			let index = userTrackingEventsString.findIndex(
				(e) => e === Object.values(dbEvent).join(' - '),
			);
			if (index === -1) {
				missingEvents.push(dbEvent);
			}
		}
		if (missingEvents.length) {
			const { id, service, checkDate, checkTime, result, finished, status } = tracking;
			missingData.push({
				id,
				service,
				checkDate,
				checkTime,
				finished,
				status,
				result: {
					...result,
					events: missingEvents,
				},
			});
		}
	}
	return missingData;
}

async function check(userId, trackingData) {
	let tracking = await db.Tracking.findById(trackingData.idMDB);
	if (!tracking) return await addMissingTracking(userId, trackingData);
	let response = await checkTracking(tracking);
	if (response.result.events?.length) await updateDatabase([response]);
	return response;
}

async function addMissingTracking(userId, trackingData) {
	let user = await db.User.findById(userId);
	let { idMDB, title, service, code, lastEvent } = trackingData;
	let apiChecks = await Promise.all([
		services.trackingCheckHandler(service, code, null, user.tokenFB),
		services.trackingCheckHandler(service, code, lastEvent, user.tokenFB),
	]);
	let { date, time } = dateAndTime();
	let { finished, status } = checkFinishedStatus(apiChecks[0].lastEvent);
	let lastCheck = new Date(Date.now());
	await new db.Tracking({
		_id: idMDB,
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck,
		token: user.tokenFB,
		result: apiChecks[0],
		finished,
		status,
	}).save();
	return {
		idMDB,
		token: user.tokenFB,
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck,
		result: apiChecks[1],
	};
}

async function checkTracking(tracking) {
	const { id, title, code, service, token, result, finished, status } = tracking;
	let checkResult = await services.trackingCheckHandler(
		service,
		code,
		result.lastEvent,
		result.extraData,
	);
	let { date, time } = dateAndTime();
	let updatedFinished = finished;
	let updatedStatus = status;
	if (checkResult.lastEvent !== null) {
		let { finished, status } = checkFinishedStatus(checkResult.lastEvent);
		updatedFinished = finished;
		updatedStatus = status;
	}
	return {
		idMDB: id,
		token,
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck: new Date(Date.now()),
		result: checkResult,
		finished: updatedFinished,
		status: updatedStatus,
	};
}

function checkFinishedStatus(lastEvent) {
	let finished = false;
	let status = 'in transit';
	let includedWords = [
		'entregado',
		'entregada',
		'entregamos',
		'devuelto',
		'entrega en',
		'devolución',
		'devuelto',
		'rehusado',
		'decomisado',
		'descomisado',
		'retenido',
		'incautado',
		'no pudo ser retirado',
		'entrega en sucursal',
		'delivered',
		'returned',
		'refused',
		'seized',
		'retained',
		'could not be picked up',
	];
	let notIncludedWords = ['no entregada', 'no entregado', 'no fue entregado', 'no fue entregada'];
	let lCLastEvent = lastEvent.toLowerCase().split(' - ').slice(-1)[0];
	for (let word of includedWords) {
		if (lCLastEvent.includes(word)) {
			finished = true;
			status = word;
		}
	}
	for (let word of notIncludedWords) {
		if (finished && lCLastEvent.includes(word)) {
			finished = false;
			status = 'not delivered';
		}
	}
	return { finished, status };
}

async function updateDatabase(trackingsData) {
	let databaseUpdates = [];
	for (let tracking of trackingsData) {
		let { idMDB, checkDate, checkTime, lastCheck, result, finished, status } = tracking;
		databaseUpdates.push({
			updateOne: {
				filter: { _id: idMDB },
				update: {
					$push: {
						'result.events': { $each: result.events, $position: 0 },
					},
					$set: {
						'result.lastEvent': result.lastEvent,
						checkDate,
						checkTime,
						lastCheck,
						finished,
						status,
					},
				},
			},
		});
		if (result.moreData) {
			for (let element of result.moreData) {
				databaseUpdates.push({
					updateOne: {
						filter: { _id: idMDB },
						update: {
							$set: {
								'result.moreData.$[e].data': element.data,
							},
						},
						arrayFilters: [{ 'e.title': element.title }],
					},
				});
			}
		}
	}
	await db.Tracking.bulkWrite(databaseUpdates);
}

export default {
	add,
	rename,
	remove,
	syncronize,
	check,
	checkTracking,
	checkFinishedStatus,
	updateDatabase,
};
