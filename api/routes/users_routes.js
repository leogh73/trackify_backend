import express from 'express';
export const router = express.Router();
import user from '../controllers/users_controllers.js';

router.post('/initialize', user.initialize);
router.post('/:userId/:action', user.trackingAction);
router.post('/sincronize', user.sincronize);
router.post('/check', user.check);
router.post('/request', user.serviceRequest);

router.get('/test', async (req, res) => {
	try {
		res.json({
			status: 200,
			message: 'Get data has successfully',
		});
	} catch (error) {
		console.error(error);
		return res.status(500).send('Server error');
	}
});
