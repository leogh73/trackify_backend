import mongoose from 'mongoose';
const Schema = mongoose.Schema;

mongoose
	.connect(
		`mongodb+srv://${process.env.MDB_USER}:${process.env.MDB_PASSWORD}@cluster0.rkwyv.mongodb.net/Trackify?retryWrites=true&w=majority`,
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

const serviceRequestSchema = new Schema({
	userId: { type: String, required: true },
	service: { type: String, required: true },
	code: { type: String, required: true },
	email: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);
const Tracking = mongoose.model('Tracking', trackingSchema);
const GoogleDrive = mongoose.model('GDriveAuth', googleDriveSchema);
const ServiceRequest = mongoose.model('Service request', serviceRequestSchema);

export default { User, Tracking, GoogleDrive, ServiceRequest };
