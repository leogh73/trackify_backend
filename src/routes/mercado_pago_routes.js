import express from 'express';
export const router = express.Router();
import mercadoPago from '../controllers/mercado_pago_controllers.js';

router.post('/paymentRequest', mercadoPago.paymentRequest);
router.post('/newPayment', mercadoPago.newPayment);
router.get('/newSubscription', mercadoPago.newSubscription);
router.post('/cancelSubscription', mercadoPago.cancelSubscription);
router.post('/checkDeviceId', mercadoPago.checkDeviceId);
router.post('/checkPaymentId', mercadoPago.checkPaymentId);
