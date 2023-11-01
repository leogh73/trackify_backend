import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import services from '../services/_services.js';

async function add(user, title, service, code, driveData) {
	let result = driveData
		? {
				events: driveData.events,
				moreData: driveData.moreData,
				lastEvent: Object.values(driveData.events[0]).join(' - '),
		  }
		: await services.checkHandler(service, code, null, user.tokenFB);

	if (result.error) return result;

	let checkDate = luxon.getDate();
	let checkTime = luxon.getTime();

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
	if (response.result.events?.length) {
		await updateDatabase(response, tracking, checkCompletedStatus(response.result.lastEvent));
	}
	return response;
}

async function checkTracking(tracking) {
	const { id, token, title, service, code, result } = tracking;

	let checkResult = await services.checkHandler(service, code, result.lastEvent, token);

	return {
		idMDB: id,
		token,
		title,
		service,
		code,
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
	if (tracking.result.moreData) {
		for (let element of response.result.moreData) {
			databaseUpdates.push(
				db.Tracking.findOneAndUpdate(
					{ _id: tracking._id },
					{
						$set: {
							'result.moreData.$[e].data': element.data,
						},
					},
					{ arrayFilters: [{ 'e.title': element.title }] },
				),
			);
		}
	}
	if (tracking.service === 'DHL' && tracking.result.shipping) {
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
