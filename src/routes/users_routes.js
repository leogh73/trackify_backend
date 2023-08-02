import express from 'express';
export const router = express.Router();
import user from '../controllers/users_controllers.js';
import services from '../services/_services.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/syncronize', user.syncronize);
router.post('/check', user.check);
router.post('/servicesCheck', services.statusCheck);
router.post('/contact', user.contactForm);
