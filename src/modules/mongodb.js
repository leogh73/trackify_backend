import mongoose from 'mongoose';
import { dateAndTime } from '../modules/luxon.js';
import vars from './crypto-js.js';
import nodeCache from './node-cache.js';

mongoose.set('strictQuery', false);
mongoose
	.connect(
		`mongodb+srv://${vars.MDB_USER}:${vars.MDB_PASSWORD}@cluster0.rkwyv.mongodb.net/Trackify`,
	)
	.then(async () => {
		await nodeCache.setCache();
		console.log('Connected to MongoDB...');
	})
	.catch((error) => console.error('Could not connect to MongoDB', error));

const trackingSchema = new mongoose.Schema({
	title: { type: String, required: true },
	code: { type: String, required: true },
	service: { type: String, required: true },
	checkDate: { type: String, required: true },
	checkTime: { type: String, required: true },
	lastCheck: { type: Date, required: true },
	token: { type: String, required: true },
	result: {
		type: Object,
		required: true,
	},
	active: { type: Boolean, required: true },
	status: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
	lastActivity: { type: Date, required: true },
	tokenFB: { type: String, required: true },
	mercadoLibre: { type: Object },
	mercadoPago: { type: Object },
	googleDrive: { auth: { type: String }, backupId: { type: String } },
	trackings: {
		type: [String],
		required: true,
	},
});

const googleDriveSchema = new mongoose.Schema({
	auth: { type: Object, required: true },
	email: { type: String, required: true },
	backupIds: [{ type: String, required: true }],
});

const contactSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	deviceId: { type: String, required: true },
	message: { type: String, required: true },
	email: { type: String, required: true },
	date: { type: String, required: true },
	time: { type: String, required: true },
});

const logSchema = new mongoose.Schema({
	actionName: { type: String, required: true },
	actionDetail: { type: Object, required: true },
	errorMessage: { type: String, required: true },
	date: { type: String, required: true },
	time: { type: String, required: true },
});

const serviceSchema = new mongoose.Schema({
	name: { type: String, required: true },
	exampleCode: { type: String, required: true },
	logoUrl: { type: String, required: true },
	event: { type: Array, required: true },
	contact: { type: Object, required: true },
});

const User = mongoose.model('User', userSchema);
const Tracking = mongoose.model('Tracking', trackingSchema);
const GoogleDrive = mongoose.model('GDriveAuth', googleDriveSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Log = mongoose.model('Log', logSchema);
const Service = mongoose.model('Service', serviceSchema);

const saveLog = async (actionName, actionDetail, errorMessage) => {
	let { date, time } = dateAndTime();
	try {
		await new Log({ actionName, actionDetail, errorMessage, date, time }).save();
	} catch (error) {
		console.log('Could not save log', error);
	}
};

export default {
	User,
	Tracking,
	GoogleDrive,
	Contact,
	Log,
	Service,
	saveLog,
};
