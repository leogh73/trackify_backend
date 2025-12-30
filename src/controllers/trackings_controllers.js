import db from '../modules/mongodb.js';
import { dateAndTime } from '../modules/luxon.js';
import services from '../services/_services.js';

async function add(user, title, service, code, language, driveData) {
	let result = driveData
		? {
				events: driveData.events,
				moreData: driveData.moreData,
				lastEvent: Object.values(driveData.events[0]).join(' - '),
		  }
		: await services.trackingCheckHandler(service, code, null, { service, user, language });
	if (result.error) {
		return result;
	}
	let { date, time } = dateAndTime();
	let { active, status } = checkActiveStatus(result.lastEvent);
	const newTracking = await new db.Tracking({
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck: new Date(Date.now()),
		token: user.tokenFB,
		result,
		active,
		status,
	}).save();
	result.checkDate = date;
	result.checkTime = time;
	result.active = active;
	result.status = status;
	result.trackingId = newTracking.id;
	await db.User.updateOne({ _id: user.id }, { $push: { trackings: newTracking.id } });
	await db.Service.updateOne({ name: service }, { $set: { exampleCode: code } });
	delete result.extraData;
	return result;
}

async function rename(trackingId, newTitle) {
	let allTrackings = await findDuplicateds(trackingId);
	if (allTrackings.error) {
		return;
	}
	let ids = allTrackings.map((t) => t.id);
	await db.Tracking.updateMany({ _id: { $in: ids } }, { $set: { title: newTitle } });
}

async function remove(userId, ids) {
	let trackingIds = JSON.parse(ids);
	let fullTrackingsIds = [];
	for (let tId of trackingIds) {
		let allTrackings = await findDuplicateds(tId);
		if (allTrackings.error) {
			return;
		}
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

async function syncronize(events) {
	if (!events) {
		return [];
	}
	let trackingsData = JSON.parse(events);
	if (!trackingsData.length) {
		return [];
	}
	let trackingsDb = await db.Tracking.find({ _id: { $in: trackingsData.map((e) => e.idMDB) } });
	let responseData = [];
	for (let tracking of trackingsDb) {
		let dbTrackingEvents = tracking.result.events;
		let userTracking = trackingsData.find((e) => e.idMDB === tracking.id);
		let userTrackingStatus = userTracking.status;
		let userTrackingEvents = userTracking.eventsList;
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
		const { id, service, checkDate, checkTime, result, active, status } = tracking;
		let trackingData = {
			id,
			service,
			checkDate,
			checkTime,
			active,
		};
		if (missingEvents.length || status !== userTrackingStatus) {
			trackingData.result = {
				...result,
				events: missingEvents,
			};
			trackingData.status = status;
			responseData.push(trackingData);
		}
	}
	return responseData;
}

async function check(userId, trackingData) {
	let tracking = await db.Tracking.findById(trackingData.idMDB);
	if (!tracking) {
		return await addMissingTracking(userId, trackingData);
	}
	let response = await checkTracking(tracking);
	if (response.result.events?.length) {
		await updateDatabase([response]);
	}
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
	let { active, status } = checkActiveStatus(apiChecks[0].lastEvent);
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
		active,
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
		result: apiChecks[1],
		lastCheck,
		active,
		status,
	};
}

async function checkTracking(tracking) {
	const { id, title, code, service, token, result, active, status } = tracking;
	let checkResult = await services.trackingCheckHandler(
		service,
		code,
		result.lastEvent,
		result.extraData,
	);
	let { date, time } = dateAndTime();
	let updatedactive = active;
	let updatedStatus = status;
	if (checkResult.lastEvent) {
		let { active, status } = checkActiveStatus(checkResult.lastEvent);
		updatedactive = active;
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
		active: updatedactive,
		status: updatedStatus,
	};
}

function checkActiveStatus(lastEvent) {
	let active = true;
	let status = 'in transit';
	let deliveredWords = [
		'entregado',
		'entregada',
		'entregamos',
		'entrega en sucursal',
		'entrega en',
		'delivered',
	];
	let notDeliveredWords = [
		'no entregada',
		'no entregado',
		'no fue entregado',
		'no fue entregada',
		'devuelto',
		'devolución',
		'devuelto',
		'rehusado',
		'decomisado',
		'descomisado',
		'retenido',
		'incautado',
		'no pudo ser retirado',
		'returned',
		'refused',
		'seized',
		'retained',
		'could not be picked up',
	];
	let lCLastEvent = lastEvent.toLowerCase().split(' - ').slice(-3).join(' ');
	for (let word of deliveredWords) {
		if (lCLastEvent.includes(word)) {
			active = false;
			status = 'delivered';
		}
	}
	for (let word of notDeliveredWords) {
		if (active && lCLastEvent.includes(word)) {
			active = false;
			status = 'not delivered';
		}
	}
	return { active, status };
}

async function updateDatabase(trackingsData) {
	let databaseUpdates = [];
	for (let tracking of trackingsData) {
		let { idMDB, checkDate, checkTime, lastCheck, result, active, status } = tracking;
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
						active,
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
	checkActiveStatus,
	updateDatabase,
};
