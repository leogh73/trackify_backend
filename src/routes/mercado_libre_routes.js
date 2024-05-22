import express from 'express';
export const router = express.Router();
import mercadoLibre from '../controllers/mercado_libre_controllers.js';

router.post('/initialize', mercadoLibre.initialize);
router.post('/consult', mercadoLibre.consult);
router.post('/loadmore', mercadoLibre.loadMore);
router.post('/notification', mercadoLibre.notification);
