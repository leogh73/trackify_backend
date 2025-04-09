import db from '../modules/mongodb.js';
import sendNotification from '../modules/firebase_notification.js';
import { dateAndTime } from '../modules/luxon.js';
import { cache } from '../modules/node-cache.js';
import notifyAdmin from '../modules/nodemailer.js';
import mercadoPago from './mercado_pago_controllers.js';
import tracking from './trackings_controllers.js';

const checkTrackings = async (req, res) => {
	try {
		let trackingsCollection = await db.Tracking.find({ completed: false });
		let uniqueTrackings = [];
		for (let tracking of trackingsCollection) {
			let trackingResult = { tracking, duplicated: [] };
			let trackingIndex = uniqueTrackings.findIndex(
				(t) => t.tracking.service === tracking.service && t.tracking.code === tracking.code,
			);
			if (trackingIndex == -1) {
				uniqueTrackings.push(trackingResult);
			} else {
				uniqueTrackings[trackingIndex].duplicated.push(tracking);
			}
		}
		let trackingsCheckResult = await Promise.all(
			uniqueTrackings.map(async (t) => {
				let check = await tracking.checkTracking(t.tracking);
				return {
					response: check,
					duplicated: t.duplicated.map((t) => {
						const { id, token, title, service, code } = t;
						const { date, time } = dateAndTime();
						return {
							idMDB: id,
							token,
							title,
							service,
							code,
							checkDate: date,
							checkTime: time,
							lastCheck: new Date(Date.now()),
							result: check.result,
						};
					}),
				};
			}),
		);
		let trackingsCheckTotal = [];
		let updatedChecks = [];
		let failedChecks = [];
		for (let tracking of trackingsCheckResult) {
			let { response, duplicated } = tracking;
			if (response.result.events?.length) updatedChecks.push(response);
			if (response.result.error) failedChecks.push(response);
			trackingsCheckTotal.push(response);
			for (let dup of duplicated) {
				trackingsCheckTotal.push(dup);
			}
		}
		let updatedChecksTotal = trackingsCheckTotal.filter((check) => check.result.events?.length);
		let totalUserResults = [];
		for (let checkResult of updatedChecksTotal) {
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
		operationsCollection.push(tracking.updateDatabase(updatedChecksTotal));
		if (failedChecks.length) {
			operationsCollection.push(db.saveLog('check cycle', failedChecks, 'failed checks'));
		}
		await Promise.all(operationsCollection);
		res.status(200).json({
			message: 'Trackings Check Completed',
			trackings: {
				checked: trackingsCheckResult.length,
				updated: updatedChecks.length,
				failed: failedChecks.length,
			},
		});
	} catch (error) {
		res.status(500).json({ error: 'Trackings Check Failed', message: error.toString() });
		await db.saveLog('trackings check', 'failed tracking checks', error);
	}
};

const checkAwake = async (req, res) => {
	try {
		res.status(200).json({ success: 'API awaken successfully' });
	} catch (error) {
		res.status(500).json({ error: error.toString() });
	}
};

const checkPayments = async (req, res) => {
	try {
		let users = await Promise.all([
			db.User.find({ 'mercadoPago.isValid': true }),
			db.User.find({ 'mercadoPago.status': 'could not be checked' }),
		]);
		let checkResults = await Promise.all(
			users.flat().map((user) => mercadoPago.checkPayment(user, true)),
		);
		let failedChecks = checkResults.filter(
			(r) => r.error && r.error !== 'HTTPError: Response code 404 (Not Found)',
		);
		if (failedChecks.length) await db.saveLog('payments check', failedChecks, 'failed checks');
		await mercadoPago.updateUsers(checkResults);
		res.status(200).json({
			success: 'Payments Check Completed',
			simplesChecked: checkResults.filter((r) => r.paymentType === 'simple').length,
			subscriptionsChecked: checkResults.filter((r) => r.paymentType === 'subscription').length,
		});
	} catch (error) {
		res.status(500).json({ error: 'Payments check Failed', message: error.toString() });
		await db.saveLog('payments check', error, 'failed payment checks');
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
			failedServices.length ? notifyAdmin(failedServices, 'Services Access Failed') : null,
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
		await db.saveLog('API Check', 'api check failed', error);
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
		if (completedCheckIds.length) {
			await db.Tracking.updateMany(
				{ _id: { $in: completedCheckIds } },
				{ $set: { completed: true } },
			);
		}
		res.status(200).json({
			message: 'Check Completed Successful',
			result: { updated: completedCheckIds.length },
		});
	} catch (error) {
		await db.saveLog('Check Completed Failed', 'failed completed check', error);
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
		await db.saveLog('Clean Up Cycle', 'failed clean up', error);
		res.status(500).json({ error: 'Clean Up Cycle Failed', message: error.toString() });
	}
};

export default {
	checkTrackings,
	checkAwake,
	checkPayments,
	checkServices,
	checkCompletedTrackings,
	cleanUp,
};
