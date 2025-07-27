import express from 'express';
export const router = express.Router();
import cronJobs from '../controllers/cron_jobs_controllers.js';

router.use((req, res, next) => {
	let authCode = req.headers.authorization?.split('Key ')[1];
	if (!authCode || authCode !== process.env.SERVICE_ENCRYPTION_KEY) {
		return res.status(401).json({ error: 'not authorized' });
	}
	next();
});

router.get('/checkTrackings', cronJobs.checkTrackings);
router.get('/checkAwake', cronJobs.checkAwake);
router.get('/checkServices', cronJobs.checkServices);
router.get('/checkPayments', cronJobs.checkPayments);
router.get('/checkCompleted', cronJobs.checkCompletedTrackings);
router.get('/cleanUp', cronJobs.cleanUp);
