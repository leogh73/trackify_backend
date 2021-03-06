import admin from 'firebase-admin';
import user from '../controllers/users_controllers.js';
import { readFile } from 'fs/promises';
const serviceAccount = JSON.parse(
	await readFile(new URL('./firebase_serviceAccount.json', import.meta.url)),
);

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

function sendNotification(data) {
	let notificationTitle = 'Actualización de envío';
	let notificationBody = data.results[0].title;
	if (data.results.length > 1) {
		notificationTitle = 'Actualizaciones de envíos';
		notificationBody = data.results.map((r) => r.title).join(' - ');
	}

	const notification = {
		notification: {
			title: notificationTitle,
			body: notificationBody,
		},
		token: data.token,
		data: {
			data: JSON.stringify(data.results),
			click_action: 'FLUTTER_NOTIFICATION_CLICK',
		},
	};

	admin
		.messaging()
		.send(notification)
		.then((response) => {
			console.log({ 'Notification sended': response });
		})
		.catch(async (error) => {
			if (error.errorInfo.code == 'messaging/registration-token-not-registered') {
				return await user.remove(data.token);
			}
		});
}

export default sendNotification;
