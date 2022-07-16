import express from 'express';
export const router = express.Router();
import meLi from '../controllers/mercadolibre_controllers.js';

router.post('/initialize', meLi.initialize);
router.post('/consult', meLi.consult);
router.post('/loadmore', meLi.loadMore);
