import express from 'express';
export const router = express.Router();
import googleDrive from '../controllers/google_drive_controllers.js';

router.post('/initialize', googleDrive.initialize);
router.post('/consult', googleDrive.consult);
router.post('/createUpdate', googleDrive.createUpdate);
router.post('/restore', googleDrive.restore);
router.post('/remove', googleDrive.remove);
