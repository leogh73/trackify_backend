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

const generateHtmlTable = (data, contact) => {
	let rowsArray = [];

	for (let e of data) {
		contact
			? rowsArray.push(`<tr>
	<td>${e.userId}</td>
	<td>${e.email}</td>
	<td>${e.message}</td>
	</tr>`)
			: rowsArray.push(`<tr>
		<td>${e.service}</td>
		<td>${e.code}</td>
		<td>${e.type}</td>
		<td>${e.body}</td>
	</tr>`);
	}
	let rowsList = rowsArray.join('');

	return `<html>
	<head>
	<style>
	table {
		font-family: arial, sans-serif;
		border-collapse: collapse;
		width: 100%;
	}
	
	td, th {
		border: 1px solid #dddddd;
		text-align: left;
		padding: 8px;
	}
	
	tr:nth-child(even) {
		background-color: #dddddd;
	}
	</style>
	</head>
	<body>

	<h2>${contact ? 'User Contact' : 'Errors'}</h2>
	
	<table>
		<tr>
			${
				contact
					? '<th>UserId</th><th>Email</th><th>Message</th>'
					: '<th>Service</th><th>Code</th><th>Type</th><th>Body</th>'
			}
		</tr>
	${rowsList}
	</table>
	
	</body>
	</html>`;
};

const sendMail = async (html, subject) => {
	const mailDetails = {
		from: `TrackeAR: Seguimientos Argentina<${vars.EMAIL_USER}>`,
		to: `${vars.EMAIL_ADMIN}`,
		subject,
		html,
	};
	await transporter.sendMail(mailDetails);
};

const notifyAdmin = async (data, subject) => {
	try {
		let html = data;
		if (subject === 'User Contact' || subject === 'API Access Failed') {
			let contact = subject === 'User Contact';
			html = generateHtmlTable(data, contact);
		}
		await sendMail(html, subject);
	} catch (error) {
		await db.saveLog('Send emails', data, error);
	}
};

export default notifyAdmin;
