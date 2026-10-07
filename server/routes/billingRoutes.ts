import { Request, Response, NextFunction } from 'express';
// server/routes/billingRoutes.js
import { Router } from 'express';
import { billingController } from '../controllers/billingController.js';
import { isAuthenticated, requireGlobalAdmin } from './../middleware/authMiddleware.js';

const router = Router();

// Pricing Plans (Admin)
router.get('/pricing-plans', billingController.getPricingPlans);
router.post('/pricing-plans', isAuthenticated, billingController.createPricingPlan);
router.put('/pricing-plans/:id', isAuthenticated, billingController.updatePricingPlan);
router.delete('/pricing-plans/:id', isAuthenticated, billingController.deletePricingPlan);

// Transactions
router.get('/transactions', isAuthenticated, billingController.getAllTransactions); // Phân quyền trong controller
router.get('/transactions/user/:userId', isAuthenticated, billingController.getTransactionsByUserId);
router.get('/spaces/:spaceId/transactions', billingController.getSpaceTransactions); // Public access for donation list
router.post('/transactions/manual', requireGlobalAdmin, billingController.addMeritsManually);

// Subscriptions
router.post('/subscriptions/purchase', isAuthenticated, billingController.purchaseSubscription);

// Crypto Payments - REMOVED (Unused)
// router.post('/crypto/initiate-merit-purchase', isAuthenticated, billingController.initiateMeritPurchase);
// router.post('/crypto/confirm', isAuthenticated, billingController.confirmCryptoPayment);

// Stripe Payments
router.get('/stripe/config', billingController.getStripeConfig); // Provide publishable key
router.get('/stripe/payment-methods', isAuthenticated, billingController.getEnabledPaymentMethods); // Get enabled payment methods
// Legacy Stripe Intents - REMOVED (Unused)
// router.post('/stripe/create-payment-intent', isAuthenticated, billingController.createStripePaymentIntent);
// router.post('/stripe/confirm-payment', isAuthenticated, billingController.confirmStripePayment);

// New Stripe Checkout Routes
router.post('/stripe/create-checkout-session', isAuthenticated, billingController.createCheckoutSession);
router.post('/stripe/verify-checkout-session', isAuthenticated, billingController.verifyCheckoutSession);

// AI Daily Limit Boost with Merits
router.post('/ai-limit/purchase-with-merits', isAuthenticated, billingController.purchaseAiLimitWithMerits);


// Stripe Connect Express Routes
router.post('/stripe/connect/account', isAuthenticated, billingController.createConnectAccount);
router.post('/stripe/connect/account-link', isAuthenticated, billingController.createAccountLink);
router.post('/stripe/connect/login-link', isAuthenticated, billingController.createLoginLink);
router.post('/stripe/connect/disconnect', isAuthenticated, billingController.disconnectConnectAccount);
router.get('/stripe/connect/space/:spaceId/status', isAuthenticated, billingController.getConnectAccountStatus);

// Withdrawal Requests
router.get('/admin/withdrawals', requireGlobalAdmin, billingController.getWithdrawalRequests);
router.put('/admin/withdrawals/:id/process', requireGlobalAdmin, billingController.processWithdrawalRequest);

router.post('/withdrawals', isAuthenticated, (req: Request, res: Response) => billingController.createWithdrawalRequest(req, res));

// Export
router.get('/export/transactions', requireGlobalAdmin, billingController.exportTransactions);

// Stats
router.get('/stats/space-earnings', isAuthenticated, billingController.getSpaceEarningsStats);

export default router;
