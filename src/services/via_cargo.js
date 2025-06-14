import got from 'got';
import vars from '../modules/crypto-js.js';
import services from './_services.js';
import CryptoJS from 'crypto-js';

async function check(code, lastEvent) {
	let token = {
		value:
			'03AFcWeA7JWAXZHsawqQHuouqAQEwbmB1tqGAvkGyr4PaFABC-7c7I9wqbTEa5xlX-QxFGETu_zCte13-95TTZayrKuqzlvL2sti-OGFTMi0dQacsXQQQocNMQSa0nWBDnUgLnDxdSxIGneOOkEwV00wKfhZr3Fc1YWdAwDpd6I9-4Q-L9cXCQyoS8bvcx1q3OjmOuGMN5emffhEXXGMdZ1SvIfZHqHiz5wRDTARM62M23Dz19utqjEQwRMAshHIzgmW8KSVUkPhDcecbM-JS6s-d1Lptrpq2tAh-yrB417HClBr6VquUX1IhKT9wxS4V8ybOjzzgvClQ9HGTdXQOE76-1gPKiV0DgtE6d3NV7Vxo6m453_iZRkEvM-sjRqKXZBelxPrjGWNCmKxy_AoJJfaN2DymUT_rmpidSOYw1s3HOFypWg0BaLEVPc24MDuQpbsj8UcgIixxcZgMzpK8dvR-uTxDfwAntIxgo2M_j9HspMqRgfUG4TDmIgZW5glGSsvBbfT4FVe9GfQRO5LUtTF8r7Jk-Ds8w6J75Ugoh2vLM4bPtRNbyo-aS_7JlcJ5xDmzJcI4LCHXf5T_eqhQB_FBTJEA7WO69Uwu16dnboHC4zT07jKks9P3YB4lTP-qTmBI9gZsNgiaC2YFCjxHmYzOO_LCJZGzPw_bk1165VrdpDti-mPdT8ILtEI13QULdkG1j1o-q4yrTx652BzWefbgOfhQckEjALr3mRGVYM5eJJxGqIuE_Qs8eWNbpTSp1_5Ap6euZsmAwuvQ4d-E05O8bQjwDg10_kWbih1uIVqsF7iHFMQnV78tSQ5FGghupE4bFEELgEYIaoB3l5fd9Sx-adRpfxfBX-vLJBjivi_9vRHdTaBq0NIqtiUfIRokfcwNKojYwu0uSPy7IuzPG-M4R1WAvJLBqEEYoKblLNkui2UUqrI9EzFKw-2rwhVxqvIMLWW4u7H_iUEVJ5Xtp-RF6rFXJd7HAgj97CvmxZAReMFEwH5eiv8gEqs1TY3_zb_pdbXIJwz2QxNRG2FGEBFHMrCKDZ_GTyHFLW5fgB5VVC5PZaz70qt6bY7hSFrVs09oLCculDyy1b_i48SSP37LlrnacrfMkdk0kkkR1ZEZCn36ubF99pPRLWEeveayzBfLi3rNO_dovT7deVFxdcqUGEFwNs71ZXp5JZMw2lDRMObBZMZ0Ndld_lvU0BZXbNFJYkqmb2vNntwzcddZsP4YLHRh_ZeVc68KEOpjFGK92uQNgGLih4WteCJ37E4jzXWzTQy_xttzKQ_buY6OVuoiLWMfKfpZ6j3A6lG89ihScEpCEQloucTi9Vo29WFJO1OfcAoTzxK7uo-ku_bY2c9btQbz6y44yrsA0wQyb_dd8JLZ8IZvDIndql3KiTpvS61-BQZcpH73YStN7GK8tJ4KSOc3QMgcsC7VG0_GBCoozNc84wWAp9GocU4yGVZQDWyNxqZwky520gtIuNPWBfj894BhIOcydeiD-rRMMAd7wqX9t6R0KP1uZsf1bjw1Aqt2hKyOZBA6w5r4gnZpgdEDoHjDkePDwpN7NsjXGR6L64P6DyGcypkOA4JXd0eIPKp25BZJpXJxgTRjw5EX6g9rJhpkv0btjr38m_Xg86cfiXzQ-gYdEyphe-GkQjG3IcP3Fn44Y1nEndPRsoSs5E9Pvu5VmLqCt7NPs5U3u8xq4nf-r1n7wCRoxMt81rocAkkHJq-ezCyPC5Z5_3v4FvogI36hZQMWjR1wcwES24PCDUuSXHy8BPhckj7Up4isbYqXa5FjEdW6gWQBqP50j-wk8LjFhAxa464-Q7L9OSoKDWn6YAz33_ax-FyXTQQAl4c8TxhLSHpiLn7BVt_y046BJgYfzCjZGNRQnNfjHKEK-jvWCcPBsuPkpkId46GzcUNxTSdt8iJ92syQVQPQRsVCnQr4aXCv10raZsShP3UNdWr5yW_rQuX9GaczDHFlAMzyk_g79AJYf9Tgtt5KZhjMgtEnrK6oEeQYWUTAMM3TkOfjnSy0a2SyfGSiLj40Lz2vs_tpVr-dM',
	};
	let newToken = CryptoJS.AES.encrypt(JSON.stringify(token), code).toString();

	let consult;
	try {
		consult = await got(`${vars.VIACARGO_API_URL}${code}?tokenRecaptcha=${newToken}`);
	} catch (error) {
		return {
			error: services.errorResponseHandler(error),
			service: 'Via Cargo',
			code,
		};
	}

	let result = JSON.parse(consult.body);
	if (result.ok.length) return { error: 'No data' };

	let data = result.ok[0].objeto;

	let eventsList = data.listaEventos.map((e) => {
		return {
			date: e.fechaEvento.split(' ')[0],
			time: e.fechaEvento.split(' ')[1],
			location: e.deleNombre,
			status: e.descripcion,
		};
	});

	let destination = {
		'Nombre del destinatario': services.capitalizeText(false, data.nombreDestinatario),
		'DNI del destinatario': data.nitDestinatario,
		Dirección: services.capitalizeText(false, data.direccionDestinatario),
		'Código postal': data.codigoPostalDestinatario,
		Localidad: data.poblacionDestinatario,
		Provincia: data.nombreProvinciaDestinatario,
		Teléfono: data.telefonoDestinatario,
		'Fecha de entrega': `${
			data.fechaHoraEntrega?.split(' ')[0] ? data.fechaHoraEntrega.split(' ')[0] : 'Sin datos'
		}`,
		'Hora de entrega': `${
			data.fechaHoraEntrega?.split(' ')[1] ? data.fechaHoraEntrega.split(' ')[1] : 'Sin datos'
		}`,
	};

	if (lastEvent) {
		let response = services.updateResponseHandler(eventsList, lastEvent);
		if (response.lastEvent) {
			response.destination = {
				dateDelivered: destination['Fecha de entrega'],
				timeDelivered: destination['Hora de entrega'],
			};
			response.moreData = [
				{
					title: 'DESTINO',
					data: destination,
				},
			];
		}
		return response;
	}

	let origin = {
		Nombre: services.capitalizeText(false, data.nombreRemitente),
		DNI: data.nitRemitente,
		Dirección: services.capitalizeText(false, data.direccionRemitente),
		'Código postal': data.codigoPostalRemitente,
		Localidad: data.poblacionRemitente,
		Fecha: data.fechaHoraAdmision.split(' ')[0],
		Hora: data.fechaHoraAdmision.split(' ')[1],
	};

	let otherData = {
		'Peso declarado': `${data.kilos + ' kg.'}`,
		'Número de piezas': data.numeroTotalPiezas,
		Servicio: services.capitalizeText(false, data.descripcionServicio),
		Firma: `${data.nifQuienRecibe ? data.nifQuienRecibe : '-'}`,
	};

	return {
		events: eventsList,
		moreData: [
			{
				title: 'DESTINO',
				data: destination,
			},
			{
				title: 'ORIGEN',
				data: origin,
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
