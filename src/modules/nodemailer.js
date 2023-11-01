import nodemailer from 'nodemailer';
import vars from './crypto-js.js';
import luxon from '../modules/luxon.js';
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

const generateHtmlTable = (data) => {
	let rowsArray = [];
	for (let e of data) {
		rowsArray.push(`<tr>
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

	<h2>Errors</h2>
	
	<table>
		<tr>
			<th>Service</th>
			<th>Code</th>
			<th>Type</th>
			<th>Body</th>
		</tr>
	${rowsList}
	</table>
	
	</body>
	</html>`;
};

const sendMail = async (html) => {
	const mailDetails = {
		from: `TrackeAR: Seguimientos Argentina<${vars.EMAIL_USER}>`,
		to: `${vars.EMAIL_ADMIN}`,
		subject: 'API Access Failed',
		html,
	};
	await transporter.sendMail(mailDetails);
};

const notifyAdmin = async (data) => {
	try {
		await sendMail(generateHtmlTable(data));
	} catch (error) {
		console.log(error);
		await db.storeLog('Send emails', data, error, luxon.getDate(), luxon.getTime());
	}
};

export default notifyAdmin;
