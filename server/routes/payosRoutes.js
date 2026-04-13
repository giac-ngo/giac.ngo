// server/routes/payosRoutes.js
import { Router } from 'express';
import { payosController } from '../controllers/payosController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// Create a PayOS payment link (user must be logged in)
router.post('/create-payment-link', isAuthenticated, payosController.createPaymentLink);

// Create a PayOS donation link (user must be logged in)
router.post('/create-donation-link', isAuthenticated, payosController.createDonationLink);

// Webhook from PayOS - must be public (no auth)
router.post('/webhook', payosController.handleWebhook);

// Verify order manually from frontend returnUrl
router.get('/verify-order', isAuthenticated, payosController.verifyPayment);

export default router;
