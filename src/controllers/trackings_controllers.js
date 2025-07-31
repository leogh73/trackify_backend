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
		: await services.trackingCheckHandler(service, code, null, user.tokenFB);

	if (result.error) return result;

	let { date, time } = dateAndTime();

	const newTracking = await new db.Tracking({
		title,
		service,
		code,
		checkDate: date,
		checkTime: time,
		lastCheck: new Date(Date.now()),
		token: user.tokenFB,
		result,
		completed: checkCompletedStatus(result.lastEvent),
	}).save();

	result.trackingId = newTracking.id;

	await db.User.updateOne({ _id: user.id }, { $push: { trackings: newTracking.id } });
	await db.Service.updateOne({ name: service }, { $set: { exampleCode: code } });

	result.checkDate = date;
	result.checkTime = time;

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
	if (!tracking) return { error: 'tracking not found' };
	let { title, code, service, token } = tracking;
	return await db.Tracking.find({ title, code, service, token });
}

async function syncronize(lastEventsUser) {
	let trackingsDB = await db.Tracking.find({ _id: { $in: lastEventsUser.map((e) => e.idMDB) } });
	return trackingsDB
		.map((tracking) => findUpdatedTrackings(tracking, lastEventsUser))
		.filter((result) => !!result);
}

function findUpdatedTrackings(tracking, lastEventsUser) {
	let trackingIndex = lastEventsUser.findIndex((t) => t.idMDB === tracking.id);
	if (
		trackingIndex !== -1 &&
		lastEventsUser[trackingIndex].eventDescription !== tracking.result.lastEvent
	) {
		let lastEventData = lastEventsUser[trackingIndex].eventDescription.split(' - ');
		let endIndex = tracking.result.events.findIndex(
			(e) => e.date === lastEventData[0] && e.time === lastEventData[1],
		);
		const { id, service, checkDate, checkTime, result } = tracking;
		return {
			id,
			service,
			checkDate,
			checkTime,
			result: {
				...result,
				events: result.events.slice(0, endIndex),
			},
		};
	} else return null;
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
		completed: checkCompletedStatus(apiChecks[0].lastEvent),
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
	const { id, token, title, service, result } = tracking;

	let code = tracking.code;
	if (service === 'Correo Argentino') code = result.extCode;

	let checkResult = await services.trackingCheckHandler(service, code, result.lastEvent, token);

	let { date, time } = dateAndTime();

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
	};
}

function checkCompletedStatus(lastEvent) {
	let status = false;
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
	];
	let notIncludedWords = ['no entregada', 'no entregado', 'no fue entregado', 'no fue entregada'];
	let lCLastEvent = lastEvent.toLowerCase();
	for (let word of includedWords) {
		if (lCLastEvent.includes(word)) {
			status = true;
		}
	}
	for (let word of notIncludedWords) {
		if (status && lCLastEvent.includes(word)) {
			status = false;
		}
	}
	return status;
}

async function updateDatabase(trackingsData) {
	let databaseUpdates = [];
	for (let tracking of trackingsData) {
		let { idMDB, checkDate, checkTime, lastCheck, result } = tracking;
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
						completed: checkCompletedStatus(result.lastEvent),
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
	checkCompletedStatus,
	updateDatabase,
};
