import express from 'express';
export const router = express.Router();
import cronJobs from '../controllers/cron_jobs_controllers.js';

router.get('/checkTrackings', cronJobs.checkTrackings);
router.get('/cleanUp', cronJobs.cleanUp);
