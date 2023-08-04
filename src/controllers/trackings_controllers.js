import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import services from '../services/_services.js';

async function add(userId, title, service, code, fromDrive, driveData) {
	let result = fromDrive
		? services.list[service].convertFromDrive(driveData)
		: await services.checkHandler(service, code, null);

	if (result.error) return result;

	let checkDate = luxon.getDate();
	let checkTime = luxon.getTime();

	let user = await db.User.findById(userId);

	const { id } = await new db.Tracking({
		title,
		service,
		code,
		checkDate,
		checkTime,
		lastCheck: new Date(Date.now()),
		token: user.tokenFB,
		result,
		completed: checkCompletedStatus(result.lastEvent),
	}).save();

	user.trackings.push(id);
	result.trackingId = id;

	await Promise.all([
		user.save(),
		db.TestCode.findOneAndUpdate({ service: service }, { $set: { code: code } }),
	]);

	if (service === 'ViaCargo') result.destiny = result.destination;

	result.checkDate = checkDate;
	result.checkTime = checkTime;

	return result;
}

async function remove(userId, trackingIds) {
	await db.Tracking.deleteMany({ _id: { $in: trackingIds } });
	let user = await db.User.findById(userId);
	for (let tracking of trackingIds) {
		user.trackings.splice(user.trackings.indexOf(tracking), 1);
	}
	await user.save();
}

async function syncronize(user, lastEventsUser) {
	let trackingsDB = await db.Tracking.find({ _id: { $in: user.trackings } });
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

async function check(trackingId) {
	let tracking = await db.Tracking.findById(trackingId);
	let response = await checkTracking(tracking);
	if (response.result.events?.length)
		await updateDatabase(response, tracking, checkCompletedStatus(response.result.lastEvent));
	return response;
}

async function checkTracking(tracking) {
	const { id, token, title, service, code, result } = tracking;

	let checkResult = await services.checkHandler(service, code, result.lastEvent, id);

	return {
		idMDB: id,
		token,
		title,
		service,
		checkDate: luxon.getDate(),
		checkTime: luxon.getTime(),
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
		'rehusado',
		'recibido en destino',
		'no pudo ser retirado',
		'entrega en sucursal',
	];
	for (let word of includedWords) {
		if (!status && lastEvent.toLowerCase().includes(word)) status = true;
	}
	return status;
}

async function updateDatabase(response, tracking, completedStatus) {
	let databaseUpdates = [];
	databaseUpdates.push(
		db.Tracking.findOneAndUpdate(
			{ _id: tracking._id },
			{
				$push: {
					'result.events': { $each: response.result.events, $position: 0 },
				},
				$set: {
					'result.lastEvent': response.result.lastEvent,
					checkDate: response.checkDate,
					checkTime: response.checkTime,
					lastCheck: response.lastCheck,
					completed: completedStatus,
				},
			},
		),
	);
	if (tracking.service === 'DHL') {
		let status = response.result.shipping.status;
		databaseUpdates.push(
			db.Tracking.findOneAndUpdate(
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
			db.Tracking.findOneAndUpdate(
				{ _id: tracking._id },
				{
					$set: {
						'result.destination.dateDelivered': response.result.destination.dateDelivered,
						'result.destination.timeDelivered': response.result.destination.timeDelivered,
					},
				},
			),
		);
	}
	await Promise.all(databaseUpdates);
}

export default {
	add,
	remove,
	syncronize,
	check,
	checkTracking,
	checkCompletedStatus,
	updateDatabase,
};
