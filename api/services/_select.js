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

function selectService(service) {
	if (service == 'Andreani') return andreani;
	if (service == 'ClicOh') return clicOh;
	if (service == 'Correo Argentino') return correoArgentino;
	if (service == 'DHL') return dhl;
	if (service == 'EcaPack') return ecaPack;
	if (service == 'FastTrack') return fastTrack;
	if (service == 'OCA') return oca;
	if (service == 'OCASA') return ocasa;
	if (service == 'Renaper') return renaper;
	if (service == 'Urbano') return urbano;
	if (service == 'ViaCargo') return viaCargo;
}

export default selectService;
