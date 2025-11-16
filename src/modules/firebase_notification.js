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
	} catch (error) {
		console.log(error);
		if (error.errorInfo.code == 'messaging/registration-token-not-registered') {
			await user.remove(token);
		}
		await db.saveLog('send notification error', { title, body, token, data }, error);
	}
};

export default sendNotification;
