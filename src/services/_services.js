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
import epsa from './epsa.js';
import expresoLancioni from './expreso_lancioni.js';
import expresoMalargue from './expreso_malargue.js';
import fastTrack from './fast_track.js';
import fonoPack from './fono_pack.js';
import integralPack from './integral_pack.js';
import mdCargas from './md_cargas.js';
import ocasa from './ocasa.js';
import oca from './oca.js';
import pickit from './pickit.js';
import plusmar from './plusmar.js';
import pulquiPack from './pulqui_pack.js';
import renaper from './renaper.js';
import rutacargo from './rutacargo.js';
import sendBox from './send_box.js';
import sisorgPxpOnline from './sisorg_pxp_online.js';
import sisorgPxpRest from './sisorg_pxp_rest.js';
import southPost from './south_post.js';
import urbano from './urbano.js';
import viaCargo from './via_cargo.js';
import mercadoLibre from './mercado_libre.js';

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
	'Credifin Logística': credifinLogistica,
	'Crucero Express': cruceroExpress,
	'Cruz del Sur': cruzDelSur,
	DHL: dhl,
	EcaPack: ecaPack,
	'El Práctico Pack': sisorgPxpOnline,
	'El Turista Pack': elTuristaPack,
	'Encotrans Express': encotransExpress,
	Enviopack: enviopack,
	Epsa: epsa,
	// 'Expreso Fueguino': cristalWeb,
	'Expreso Lancioni': expresoLancioni,
	'Expreso Malargüe': expresoMalargue,
	FastTrack: fastTrack,
	'Fono Pack': fonoPack,
	'Integral Pack': integralPack,
	Jetmar: plusmar,
	'Mercado Libre': mercadoLibre,
	'MD Cargas': mdCargas,
	ÑanduPack: sisorgPxpOnline,
	OCA: oca,
	OCASA: ocasa,
	pickit: pickit,
	Plusmar: plusmar,
	'Pulqui Pack': pulquiPack,
	Rabbione: cristalWeb,
	Renaper: renaper,
	'Rodríguez Hermanos Transportes': cristalWeb,
	Rutacargo: rutacargo,
	SendBox: sendBox,
	'South Post': southPost,
	'Trans Dan Express': cristalWeb,
	Urbano: urbano,
	'Via Cargo': viaCargo,

	MDCargas: mdCargas,
	ViaCargo: viaCargo,
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
			}, 7500);
		});

	try {
		return await Promise.race([list[service].check(code, lastEvent, service, token), timeout()]);
	} catch (error) {
		console.log(error);
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

export default {
	checkHandler,
	errorResponseHandler,
	updateResponseHandler,
	capitalizeText,
};

// import transoftWeb from './transoftWeb.js';
// import hdp from './hdp.js';

// 'Distribución y Logística': transoftWeb,
// 'Expreso Bibiloni': transoftWeb,
// 'Expreso Bisonte': transoftWeb,
// 'Expreso Interprovincial': transoftWeb,
// 'Expreso Lo Bruno': transoftWeb,
// 'Expreso Maipú': transoftWeb,
// 'Expreso Nuevo Valle': transoftWeb,
// 'Expreso Oro Negro': transoftWeb,
// 'Expreso Rocinante': transoftWeb,
// 'Ferrocargas del Sur': transoftWeb,
// 'Logística Salta': transoftWeb,
// SerPaq: transoftWeb,
// 'Transporte Pico': transoftWeb,
// 'Transportes Ñandubay': transoftWeb,
// 'Transportes Tomassini': transoftWeb,
// 'Trenque Lauquen Expreso': transoftWeb,
