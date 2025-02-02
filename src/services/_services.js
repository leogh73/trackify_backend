import andesmarCargas from './andesmar_cargas.js';
import andreani from './andreani.js';
import argCargo from './arg_cargo.js';
import buspack from './buspack.js';
import centralDeCargasTerrestres from './central_de_cargas_terrestres.js';
import clicOh from './clic_oh.js';
import clicpaq from './clicpaq.js';
import correoArgentino from './correo_argentino.js';
import credifinLogistica from './credifin_logistica.js';
import cristalWeb from './cristal_web.js';
import cruceroExpress from './crucero_express.js';
import cruzDelSur from './cruz_del_sur.js';
import dhl from './dhl.js';
import ecaPack from './eca_pack.js';
import elTuristaPack from './el_turista_pack.js';
import enviopack from './enviopack.js';
import encotransExpress from './encotrans_express.js';
import ePick from './e-pick.js';
import epsa from './epsa.js';
import expresoLancioni from './expreso_lancioni.js';
import expresoMalargue from './expreso_malargue.js';
import flashLogisticaYPostal from './flash_logistica_y_postal.js';
import fonoPack from './fono_pack.js';
import hop from './hop.js';
import integralPack from './integral_pack.js';
import mailEx from './mail_ex.js';
import mercadoLibre from './mercado_libre.js';
import mdCargas from './md_cargas.js';
import ocasa from './ocasa.js';
import oca from './oca.js';
import plusmar from './plusmar.js';
import presis from './presis.js';
import pulquiPack from './pulqui_pack.js';
import rutacargo from './rutacargo.js';
import sendBox from './send_box.js';
import sisorgPxpOnline from './sisorg_pxp_online.js';
import sisorgPxpRest from './sisorg_pxp_rest.js';
import skynde from './skynde.js';
import southPost from './south_post.js';
import urbano from './urbano.js';
import viaCargo from './via_cargo.js';
import welivery from './welivery.js';

const list = {
	'Andesmar Cargas': andesmarCargas,
	Andreani: andreani,
	'Arg Cargo': argCargo,
	'Balut Express': sisorgPxpRest,
	Buspack: buspack,
	'Cata Cargo': sisorgPxpOnline,
	'Central de Cargas Terrestres': centralDeCargasTerrestres,
	ClicOh: clicOh,
	Clicpaq: clicpaq,
	'Condor Estrella': plusmar,
	'Cooperativa Sportman': sisorgPxpRest,
	'Correo Argentino': correoArgentino,
	'Correo e-Flet': presis,
	'Credifin Logística': credifinLogistica,
	'Crucero Express': cruceroExpress,
	'Cruz del Sur': cruzDelSur,
	DHL: dhl,
	EcaPack: ecaPack,
	'El Práctico Pack': sisorgPxpOnline,
	'El Turista Pack': elTuristaPack,
	'Encotrans Express': encotransExpress,
	Enviopack: enviopack,
	'Envíos Hijos de Gutiérrez': presis,
	'E-Pick': ePick,
	Epsa: epsa,
	'Expreso Lancioni': expresoLancioni,
	'Expreso Malargüe': expresoMalargue,
	FastTrack: presis,
	'Fixy Logística': presis,
	'Flash Logística y Postal': flashLogisticaYPostal,
	'Fono Pack': fonoPack,
	HOP: hop,
	'Integral Pack': integralPack,
	Jetmar: plusmar,
	Lodi: presis,
	'Mercado Libre': mercadoLibre,
	MailEx: mailEx,
	'Mis Entregas': presis,
	'MD Cargas': mdCargas,
	'MG Logística': presis,
	ÑanduPack: sisorgPxpOnline,
	OCA: oca,
	OCASA: ocasa,
	Plusmar: plusmar,
	ProMail: presis,
	'Pulqui Pack': pulquiPack,
	Rabbione: cristalWeb,
	'Real Express': presis,
	'Rodríguez Hermanos Transportes': cristalWeb,
	Rutacargo: rutacargo,
	SendBox: sendBox,
	Servijur: presis,
	Skynde: skynde,
	SmartPost: presis,
	'South Post': southPost,
	'Trans Dan Express': cristalWeb,
	Urbano: urbano,
	'Via Cargo': viaCargo,
	Welivery: welivery,
};

const checkHandler = async (service, code, lastEvent, token) => {
	const timeout = () =>
		new Promise((resolve, reject) => {
			setTimeout(() => {
				reject({
					statusCode: 504,
					statusMessage: 'Gateway Timeout',
					body: 'Service timeout',
				});
			}, 9000);
		});

	try {
		return await Promise.race([list[service].check(code, lastEvent, service, token), timeout()]);
	} catch (error) {
		return {
			error: errorResponseHandler(error),
			service,
			code,
		};
	}
};

const errorResponseHandler = (error) => {
	let response = {
		statusCode: 500,
		statusMessage: 'Internal Server Error',
		body: error.toString(),
	};
	if (error.response) {
		let { statusCode, statusMessage, body } = error.response;
		let responseBody;
		try {
			responseBody = JSON.parse(body);
		} catch (error) {
			responseBody = body;
		}
		response = { statusCode, statusMessage, body: responseBody };
	}
	if (error.body) response = error;
	return response;
};

const updateResponseHandler = (eventsList, lastEvent) => {
	let eventsText = eventsList.map((e) => Object.values(e).join(' - '));
	let eventIndex = eventsText.indexOf(lastEvent);

	return {
		events: eventIndex ? eventsList.slice(0, eventIndex) : [],
		lastEvent: eventIndex ? eventsText[0] : null,
	};
};

const capitalizeText = (firstWordOnly, text) => {
	return text
		.toLowerCase()
		.split(' ')
		.map((word, index) =>
			firstWordOnly
				? !index
					? word.charAt(0).toUpperCase() + word.slice(1)
					: word
				: word.charAt(0).toUpperCase() + word.slice(1),
		)
		.join(' ');
};

import db from '../modules/mongodb.js';

const servicesData = async () => {
	let sData = await db.Service.find({});
	let services = {};
	Object.keys(list).forEach((service) => {
		let index = sData.findIndex((d) => d.name === service);
		if (index === -1) return;
		services[service] = sData[index];
	});
	return services;
};

const check = async (servicesData, servicesCount, servicesVersions) => {
	let sData = servicesData ?? (await servicesData());
	let dbServicesCount = Object.keys(sData).length;
	let dbServicesVersions = Object.values(sData)
		.map((s) => s.__v)
		.join('');
	let updatedServices =
		parseInt(servicesCount) === dbServicesCount && servicesVersions === dbServicesVersions;
	return updatedServices ? [] : sData;
};

export default {
	checkHandler,
	errorResponseHandler,
	updateResponseHandler,
	capitalizeText,
	list,
	check,
	servicesData,
};
