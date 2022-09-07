import mongoose from 'mongoose';
import vars from './crypto-js.js';
const Schema = mongoose.Schema;

mongoose
	.connect(
		`mongodb+srv://${vars.MDB_USER}:${vars.MDB_PASSWORD}@cluster0.rkwyv.mongodb.net/Trackify?retryWrites=true&w=majority`,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
	)
	.then(() => console.log('Connected to MongoDB...'))
	.catch((error) => {
		console.error('Could not connect to MongoDB', error);
		// throw new Error(error);
	});

const trackingSchema = new Schema({
	title: { type: String, required: true },
	code: { type: String, required: true },
	service: { type: String, required: true },
	checkDate: { type: String, required: true },
	checkTime: { type: String, required: true },
	token: { type: String, required: true },
	result: {
		type: Object,
		required: true,
	},
});

const userSchema = new Schema({
	lastActivity: { type: Date, required: true },
	tokenFB: { type: String, required: true },
	mercadoLibre: { type: Object },
	googleDrive: { auth: { type: String }, backupId: { type: String } },
	trackings: {
		type: [String],
		required: true,
	},
});

const googleDriveSchema = new Schema({
	auth: { type: Object, required: true },
	email: { type: String, required: true },
	backupIds: [{ type: String, required: true }],
});

const contactSchema = new Schema({
	userId: { type: String, required: true },
	message: { type: String, required: true },
	email: { type: String, required: true },
});

const logSchema = new Schema({
	actionName: { type: String, required: true },
	actionDetail: { type: Object, required: true },
	errorMessage: { type: String, required: true },
	date: { type: String, required: true },
	time: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);
const Tracking = mongoose.model('Tracking', trackingSchema);
const GoogleDrive = mongoose.model('GDriveAuth', googleDriveSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Log = mongoose.model('Log', logSchema);

const storeLog = async (actionName, actionDetail, errorMessage, date, time) =>
	await new Log({ actionName, actionDetail, errorMessage, date, time }).save();

export default { User, Tracking, GoogleDrive, Contact, storeLog };
