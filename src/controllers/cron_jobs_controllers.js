import db from '../modules/mongodb.js';
import luxon from '../modules/luxon.js';
import sendNotification from '../modules/firebase_notification.js';
import notifyAdmin from '../modules/nodemailer.js';
import tracking from './trackings_controllers.js';
import { cache } from '../modules/node-cache.js';

const checkTrackings = async (req, res) => {
	try {
		let trackingsCollection = await db.Tracking.find({ completed: false });
		let trackingsCheckResult = await Promise.all(
			trackingsCollection.map((t) => tracking.checkTracking(t)),
		);
		let succededChecks = trackingsCheckResult.filter((check) => check.result.events?.length);
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
		operationsCollection.push(tracking.updateDatabase(succededChecks));
		let failedChecks = trackingsCheckResult.filter((check) => check.result.error);
		if (failedChecks.length) {
			operationsCollection.push(
				db.saveLog('check cycle', failedChecks, 'failed checks', luxon.getDate(), luxon.getTime()),
			);
		}
		await Promise.all(operationsCollection);
		res.status(200).json({
			message: 'Trackings Check Completed',
			trackings: {
				checked: trackingsCheckResult.length,
				updated: succededChecks.length,
				failed: failedChecks.length,
			},
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Trackings Check Failed', message: error.toString() });
		await db.saveLog(
			'trackings check',
			error,
			'failed tracking checks',
			luxon.getDate(),
			luxon.getTime(),
		);
	}
};

const checkAwake = async (req, res) => {
	try {
		res.status(200).json({ success: 'APIs awaken successfully' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: error.toString() });
	}
};

const checkServices = async (req, res) => {
	try {
		let totalFailedChecks = await db.Log.find({
			actionName: 'check cycle',
			errorMessage: 'failed checks',
		});
		let response = {
			message: 'API Check Completed',
			erroredServices: [],
		};
		let filterResults = [];
		for (let failedCheck of totalFailedChecks) {
			let logResults = [];
			for (let check of failedCheck.actionDetail) {
				let index = logResults.findIndex((log) => log.service === check.service);
				if (index === -1) {
					const { statusCode, statusMessage, body } = check.result.error;
					let serviceResult = {
						service: check.service,
						code: check.code,
						type: statusCode ? `${statusCode} ${statusMessage}` : 'No data',
						body: body ?? 'No data',
					};
					logResults.push(serviceResult);
				}
			}
			filterResults.push(logResults);
		}
		let filteredChecks = [];
		filterResults.flat().forEach((check) => {
			let index = filteredChecks.findIndex((ch) => ch.service === check.service);
			if (index === -1) {
				check.count = 1;
				filteredChecks.push(check);
			} else {
				filteredChecks[index].count = filteredChecks[index].count + 1;
			}
		});
		let failedServices = filteredChecks.filter(
			(service) => service.count > 30 && service.body !== 'No data',
		);
		let message = '';
		if (failedServices.length) {
			response.failedServices = failedServices.map((api) => api.service);
			let serviceMessage = '';
			if (response.failedServices.length === 1) {
				serviceMessage = `el sitio de ${response.failedServices[0]}`;
			}
			if (response.failedServices.length > 1) {
				let servicesList = [...response.failedServices];
				let lastService = ` y ${servicesList.splice(-1)[0]}`;
				let servicesMessageList = servicesList.join(', ') + lastService;
				serviceMessage = `los sitios de ${servicesMessageList}`;
			}
			message = `Habría demoras y/o fallos en ${serviceMessage}. La funcionalidad de la aplicación con ${
				serviceMessage.startsWith('los') ? 'éstos servicios' : 'éste servicio'
			}, podría estar limitada.`;
		}
		await Promise.all([
			failedServices.length ? notifyAdmin(failedServices, 'API Access Failed') : null,
			db.StatusMessage.findOneAndUpdate(
				{ _id: '653d5e9b1f65bb18ab367986' },
				{
					$set: {
						message: message,
					},
				},
			),
		]);
		cache.set('StatusMessage', message);
		res.status(200).json(response);
		let failedChecksIds = totalFailedChecks.map((log) => log.id);
		await db.Log.deleteMany({ _id: { $in: failedChecksIds } });
	} catch (error) {
		console.log(error);
		await db.saveLog('API Check', error, 'api check failed', luxon.getDate(), luxon.getTime());
		res.status(500).json({ error: 'API Check Failed', message: error.toString() });
	}
};

const checkCompletedTrackings = async (req, res) => {
	try {
		let trackingsCollection = await db.Tracking.find({ completed: false });
		let completedCheckIds = [];
		for (let tracking of trackingsCollection) {
			let eventDate = tracking.checkDate.split('/');
			let lastUpdateDate = new Date(eventDate[2], eventDate[1] - 1, eventDate[0]);
			let daysDifference = Math.floor(
				(new Date(Date.now()).getTime() - lastUpdateDate.getTime()) / (1000 * 3600 * 24),
			);
			if (daysDifference > 7) completedCheckIds.push(tracking.id);
		}
		if (completedCheckIds.length)
			await db.Tracking.updateMany(
				{ _id: { $in: completedCheckIds } },
				{ $set: { completed: true } },
			);
		res.status(200).json({
			message: 'Check Completed Successful',
			result: { updated: completedCheckIds.length },
		});
	} catch (error) {
		await db.saveLog(
			'Check Completed Failed',
			error,
			'failed completed check',
			luxon.getDate(),
			luxon.getTime(),
		);
		res.status(500).json({ error: 'Check Completed Failed', message: error.toString() });
	}
};

const cleanUp = async (req, res) => {
	let dateToday = new Date(Date.now()).getTime();
	const calculateDays = (timeStamp) =>
		Math.floor((dateToday - timeStamp.getTime()) / (1000 * 3600 * 24));

	try {
		let dbQueries = await Promise.all([
			db.User.find(),
			db.Tracking.find({ completed: true }),
			db.Log.find(),
		]);
		let userIds = [];
		for (let user of dbQueries[0]) {
			let daysElapsed = calculateDays(user.lastActivity);
			if (daysElapsed > 60) userIds.push(user._id);
		}
		let trackingIds = [];
		for (let tracking of dbQueries[1]) {
			let daysElapsed = calculateDays(tracking.lastCheck);
			if (daysElapsed > 7) trackingIds.push(tracking._id);
		}
		let logIds = [];
		for (let log of dbQueries[2]) {
			let date = log.date.split('/');
			let logDate = new Date(date[2], date[1] - 1, date[0]);
			let daysElapsed = calculateDays(logDate);
			if (daysElapsed > 3) logIds.push(log._id);
		}
		let removeOperations = [];
		if (userIds.length) removeOperations.push(db.User.deleteMany({ _id: { $in: userIds } }));
		if (trackingIds.length)
			removeOperations.push(db.Tracking.deleteMany({ _id: { $in: trackingIds } }));
		if (logIds.length) removeOperations.push(db.Log.deleteMany({ _id: { $in: logIds } }));
		if (removeOperations.length) await Promise.all(removeOperations);
		res.status(200).json({
			message: 'Clean Up Cycle Completed',
			result: {
				users: userIds.length,
				trackings: trackingIds.length,
				logs: logIds.length,
			},
		});
	} catch (error) {
		await db.saveLog('Clean Up Cycle', error, 'failed clean up', luxon.getDate(), luxon.getTime());
		res.status(500).json({ error: 'Clean Up Cycle Failed', message: error.toString() });
	}
};

export default {
	checkTrackings,
	checkAwake,
	checkServices,
	checkCompletedTrackings,
	cleanUp,
};
