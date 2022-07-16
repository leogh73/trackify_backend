import express from 'express';
export const router = express.Router();
import google from '../controllers/google_controllers.js';

router.post('/initialize', google.initialize);
router.post('/consult', google.consult);
router.post('/createUpdate', google.createUpdate);
router.post('/restore', google.restore);
router.post('/remove', google.remove);
