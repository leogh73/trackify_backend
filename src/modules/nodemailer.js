import nodemailer from 'nodemailer';
import vars from './crypto-js.js';
import db from '../modules/mongodb.js';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	auth: {
		user: vars.EMAIL_USER,
		pass: vars.EMAIL_PASSWORD,
	},
});

const notifyAdmin = async (data, subject) => {
	let paragraphData = data.map((d, i) => {
		let subValues = Object.keys(d).map((k) => {
			return `<p><b>${k}</b>: ${d[k]}</p>`;
		});
		return `${subValues.join('')}${data.length === i + 1 ? '' : '<hr>'}`;
	});

	let html = `<html>
	<style>
	body {
		font-family: arial, sans-serif;
		border-collapse: collapse;
		width: 100%;
	}
	</style>
	 <body>
	${paragraphData.join('')}
	</body>
	</html>`;

	try {
		let result = await transporter.sendMail({
			from: `TrackeAR: Seguimientos Argentina<${vars.EMAIL_USER}>`,
			to: `${vars.EMAIL_ADMIN}`,
			subject,
			html,
		});
		if (result.rejected.length) {
			await db.saveLog('Send emails', data, result);
		}
	} catch (error) {
		await db.saveLog('Send emails', data, error);
	}
};

export default notifyAdmin;
