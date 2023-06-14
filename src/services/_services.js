import andreani from './andreani.js';
import clicOh from './clicoh.js';
import correoArgentino from './correoargentino.js';
import dhl from './dhl.js';
import ecaPack from './ecapack.js';
import fastTrack from './fasttrack.js';
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
	FastTrack: fastTrack,
	OCA: oca,
	OCASA: ocasa,
	Renaper: renaper,
	Urbano: urbano,
	ViaCargo: viaCargo,
};

const checkHandler = async (service, code, lastEvent) => {
	try {
		return await list[service].check(code, lastEvent);
	} catch (error) {
		return {
			error: 'Ha ocurrido un error. Reintente más tarde',
			lastEvent: error.response?.statusCode === 404 ? 'No hay datos' : lastEvent,
			service,
			code,
			detail: error,
		};
	}
};

export default { list, checkHandler };
