import express from 'express';
export const router = express.Router();
import cronJobs from '../controllers/cron_jobs_controllers.js';

router.get('/checkTrackings', cronJobs.checkTrackings);
router.get('/checkAwake', cronJobs.checkAwake);
router.get('/servicesCheck', cronJobs.checkServices);
router.get('/checkCompleted', cronJobs.checkCompletedTrackings);
router.get('/cleanUp', cronJobs.cleanUp);
