import admin from 'firebase-admin';
import vars from './crypto-js.js';
import user from '../controllers/users_controllers.js';
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
		await admin.messaging().send(notification);
		console.log({ 'Notification sended': response });
	} catch (error) {
		if (error.errorInfo.code == 'messaging/registration-token-not-registered') {
			await user.remove(token);
		}
		console.log(error);
	}
};

export default sendNotification;
