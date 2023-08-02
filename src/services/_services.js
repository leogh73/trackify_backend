import andreani from './andreani.js';
import clicOh from './clicoh.js';
import correoArgentino from './correoargentino.js';
import dhl from './dhl.js';
import ecaPack from './ecapack.js';
import envioPack from './enviopack.js';
import fastTrack from './fasttrack.js';
import mdCargas from './mdcargas.js';
import ocasa from './ocasa.js';
import oca from './oca.js';
import renaper from './renaper.js';
import urbano from './urbano.js';
import viaCargo from './viacargo.js';

const list = {
	Andreani: andreani,
	ClicOh: clicOh,
	'Correo Argentino': correoArgentino,
	DHL: dhl,
	EcaPack: ecaPack,
	Enviopack: envioPack,
	FastTrack: fastTrack,
	MDCargas: mdCargas,
	OCA: oca,
	OCASA: ocasa,
	Renaper: renaper,
	Urbano: urbano,
	ViaCargo: viaCargo,
};

const checkHandler = async (service, code, lastEvent, trackingId) => {
	try {
		const timeout = () =>
			new Promise((resolve, reject) => {
				setTimeout(() => {
					reject('FUNCTION TIMEOUT');
				}, 8000);
			});
		return await Promise.race([list[service].check(code, lastEvent, trackingId), timeout()]);
	} catch (error) {
		return {
			error: 'Ha ocurrido un error. Reintente más tarde',
			lastEvent: error.response?.statusCode === 404 ? 'No hay datos' : lastEvent,
			service,
			code,
			detail: error.toString(),
		};
	}
};

import db from '../modules/mongodb.js';

const checkService = async (service, code) => {
	let status = 'failed';
	let check = await checkHandler(service, code);
	if (check.events) status = 'ok';
	if (check.detail === 'FUNCTION TIMEOUT') status = 'delayed';
	return {
		service,
		status,
	};
};

const statusCheck = async (req, res) => {
	let user = await db.User.findById(req.body.userId);
	if (!user) return res.status(401).json({ error: 'Not authorized' });
	let testCodes = await db.TestCode.find({});
	let checkResults = await Promise.all(
		testCodes.map((data) => checkService(data.service, data.code)),
	);
	res.status(200).json({ checkResults });
};

export default { list, checkHandler, statusCheck };
