import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';

async function check(code, lastEvent) {
	let consult;
	try {
		consult = await got(`${vars.PAQUERY_API_URL}${code}`, {
			headers: { Authorization: vars.PAQUERY_API_AUTHORIZATION },
		});
	} catch (error) {
		if (services.errorResponseHandler(error).statusCode === 404) return { error: 'No data' };
	}

	let result = JSON.parse(consult.body).data[0];

	let events = result.logStatusPackages.sort((a, b) => {
		return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
	});

	let eventsList = events.map((e) => {
		let { date, time } = services.dateStringHandler(e.creationDate);
		let status = e.message.split(' a estado ')[1].split(', usuario:')[0];
		let motive = 'usuario' + e.message.split(' a estado ')[1].split(' usuario:')[1];
		if (status.includes('Intento de Entrega ')) {
			let visitNumber = status.split('Intento de Entrega ')[1];
			let visit = result.shippingScheduleDestination.visits.find(
				(v) => v.numberVisit === parseInt(visitNumber),
			);
			motive = visit.reason;
		}
		return { date, time, status, motive };
	});

	let firstElement = (() => {
		let { date, time } = services.dateStringHandler(result.creationDate);
		let message = result.logStatusPackages[0].message.split(' a estado ')[0];
		return {
			date,
			time,
			status: message.split(' estado ')[1],
			motive: 'Sin datos',
		};
	})();
	eventsList.push(firstElement);

	if (lastEvent) return services.updateResponseHandler(eventsList, lastEvent);

	let resultOtherData = result.shippingScheduleDestination;

	let driverData = (() => {
		let { email, mobile, lastName, docNumber, name } = resultOtherData.driver;
		return {
			Nombre: name + ' ' + lastName,
			DNI: docNumber,
			'Correo Electrónico': email,
			Teléfono: mobile,
		};
	})();

	let receiverData = (() => {
		let { name, destinationEmail, phone } = resultOtherData;
		return {
			Nombre: name,
			'Correo electrónico': destinationEmail,
			Teléfono: phone,
			Comentario: resultOtherData.shippingAddress.comment ?? 'Sin datos',
		};
	})();

	let otherData = {
		Producto: result.caption,
		'Dirección de entrega': resultOtherData.shippingAddress.addressDetail ?? 'Sin datos',
		'Dirección de origen': result.shippingScheduleOrigin.shippingAddress.addressDetail,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'CONDUCTOR',
				data: driverData,
			},
			{
				title: 'DESTINATARIO',
				data: receiverData,
			},
			{
				title: 'OTROS DATOS',
				data: otherData,
			},
		],
		lastEvent: Object.values(eventsList[0]).join(' - '),
	};
}

export default { check };
