import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import tracking from './trackings_controllers.js';
import sendNotification from '../modules/firebase_notification.js';

const checkTrackings = async (req, res) => {
	try {
		let trackingsCollection = await db.Tracking.find({ completed: false });
		let checkCycleResults = await Promise.all(
			trackingsCollection.map((t) => tracking.checkTracking(t)),
		);
		let succededChecks = checkCycleResults.filter((check) => check.result.events?.length);
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
		let operationsCollection = [];
		for (let userResult of totalUserResults) {
			let title = 'Actualización de envío';
			let body = userResult.results[0].title;
			if (userResult.results.length > 1) {
				title = 'Actualizaciones de envíos';
				body = userResult.results.map((r) => r.title).join(' - ');
			}
			operationsCollection.push(
				sendNotification(title, body, userResult.token, JSON.stringify(userResult.results)),
			);
		}
		for (let check of succededChecks) {
			operationsCollection.push(
				tracking.updateDatabase(
					check,
					trackingsCollection[
						trackingsCollection.findIndex((tracking) => tracking.id === check.idMDB)
					],
					tracking.checkCompletedStatus(check.result.lastEvent),
				),
			);
		}
		let failedChecks = checkCycleResults.filter((check) => check.result.error);
		if (failedChecks.length) {
			operationsCollection.push(
				db.storeLog(
					'check cycle',
					failedChecks,
					'failed checks',
					luxon.getDate(),
					luxon.getTime(),
				),
			);
		}
		await Promise.all(operationsCollection);
		res.status(200).json({
			message: 'Trackings Check Completed',
			result: {
				checked: checkCycleResults.length,
				updated: succededChecks.length,
				failed: failedChecks.length,
			},
		});
	} catch (error) {
		res.status(500).json({ error: 'Trackings Check Failed', message: error.toString() });
		await db.storeLog(
			'trackings check',
			error,
			'failed tracking checks',
			luxon.getDate(),
			luxon.getTime(),
		);
	}
};

const cleanUp = async (req, res) => {
	let dateToday = new Date(Date.now());
	const calculateDays = (timeStamp) =>
		Math.floor((dateToday.getTime() - timeStamp.getTime()) / (1000 * 3600 * 24));

	try {
		let dbQueries = await Promise.all([db.User.find({}), db.Tracking.find({ completed: true })]);
		let userIds = [];
		for (let user of dbQueries[0]) {
			let daysElapsed = calculateDays(user.lastActivity);
			if (daysElapsed > 31) userIds.push(user._id);
		}
		let trackingIds = [];
		for (let tracking of dbQueries[1]) {
			let daysElapsed = calculateDays(tracking.lastCheck);
			if (daysElapsed > 14) trackingIds.push(tracking._id);
		}
		let removeOperations = [];
		if (userIds.length) removeOperations.push(db.User.deleteMany({ _id: { $in: userIds } }));
		if (trackingIds.length)
			removeOperations.push(db.Tracking.deleteMany({ _id: { $in: trackingIds } }));
		if (removeOperations.length) await Promise.all(removeOperations);
		res.status(200).json({
			message: 'Clean Up Cycle Completed',
			result: {
				users: userIds.length,
				trackings: trackingIds.length,
			},
		});
	} catch (error) {
		await db.storeLog(
			'Clean Up Cycle',
			error,
			'failed clean up',
			luxon.getDate(),
			luxon.getTime(),
		);
		res.status(500).json({ error: 'CLEAN UP CYCLE FAILED', message: error.toString() });
	}
};

const newInstalls = async (req, res) => {
	let dateToday = luxon.getDate();
	try {
		let usersCollection = await db.User.find({});
		let result = usersCollection.filter((user) => {
			let date = `${user.lastActivity.getDate().toString().padStart(2, 0)}/${(
				user.lastActivity.getMonth() + 1
			)
				.toString()
				.padStart(2, 0)}/${user.lastActivity.getFullYear()}`;
			if (date === dateToday) return user;
		});
		return res.status(200).json({ newInstalls: result.length });
	} catch (error) {
		res.status(500).json({ error: error.toString() });
	}
};

export default { checkTrackings, cleanUp, newInstalls };
