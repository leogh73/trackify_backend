import admin from 'firebase-admin';
import vars from './crypto-js.js';
import user from '../controllers/users_controllers.js';
import db from '../modules/mongodb.js';

const serviceAccount = vars.GOOGLE_SERVICE_ACCOUNT;

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const sendNotification = async (title, body, token, data) => {
	const notification = {
		notification: {
			title,
			body,
		},
		token,
		data: {
			data,
			click_action: 'FLUTTER_NOTIFICATION_CLICK',
		},
	};

	try {
		let response = await admin.messaging().send(notification);
		console.log({ 'Notification sended': response });
		return response;
	} catch (error) {
		console.log(error);
		if (error.errorInfo.message === 'Requested entity was not found.') {
			await user.remove(token);
		}
		if (error.errorInfo.message === 'Android message is too big') {
			return await sendNotification(title, body, token, '');
		}
		await db.saveLog('send notification error', { title, body, token, data }, error);
	}
};

export default sendNotification;
