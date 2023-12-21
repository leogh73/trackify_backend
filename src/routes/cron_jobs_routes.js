import express from 'express';
export const router = express.Router();
import cronJobs from '../controllers/cron_jobs_controllers.js';

router.get('/checkTrackings', cronJobs.checkTrackings);
router.get('/awake', cronJobs.awakeAPIs);
router.get('/addMissingTrackings', cronJobs.addMissingTrackings);
router.get('/apiCheck', cronJobs.apiCheck);
router.get('/checkCompleted', cronJobs.checkCompleted);
router.get('/cleanUp', cronJobs.cleanUp);
