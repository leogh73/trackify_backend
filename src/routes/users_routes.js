import express from 'express';
export const router = express.Router();
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
// router.post('/syncronize', user.syncronize);
router.post('/sincronize', user.syncronize);
router.post('/check', user.check);
router.post('/contact', user.contactForm);

router.get('/trackingsCycle', user.trackingsCycle);
router.get('/cleanUpCycle', user.cleanUpCycle);
