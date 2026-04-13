// server/controllers/payosController.js
import { spaceModel } from '../models/space.model.js';
import { billingModel } from '../models/billing.model.js';
import { createPaymentLink, createPayOSClient } from '../services/payosService.js';
import { pool } from '../db.js';
import { getUsdVndRate } from '../utils/exchangeRate.js';

const BASE_URL = process.env.APP_BASE_URL || 'https://giac.ngo';

export const payosController = {

    /**
     * POST /api/payos/create-payment-link
     * Body: { planId, spaceId }
     * Creates a PayOS checkout link for a subscription plan purchase.
     */
    async createPaymentLink(req, res) {
        try {
            const { planId, spaceId } = req.body;
            const userId = req.user?.id;

            if (!planId || !spaceId || !userId) {
                return res.status(400).json({ message: 'planId, spaceId, and userId are required.' });
            }

            // Load plan info
            const plan = await billingModel.findPlanById(planId);
            if (!plan) return res.status(404).json({ message: 'Plan not found.' });

            // Load space for PayOS credentials
            const space = await spaceModel.findById(parseInt(spaceId, 10));
            if (!space) return res.status(404).json({ message: 'Space not found.' });

            if (!space.payosClientId || !space.payosApiKey || !space.payosChecksumKey) {
                return res.status(400).json({ message: 'PayOS chưa được cấu hình cho space này.' });
            }

            // Build numeric order code (PayOS requires int, max 9007199254740991)
            const orderCode = Date.now() % 9007199254740991;

            // Amount in VND (must be positive integer for PayOS)
            // plan.price: if < 1000 treat as USD, convert to VND with live rate
            const usdVndRate = await getUsdVndRate();
            let amountVnd = 0;
            if (plan.price) {
                const parsed = parseFloat(String(plan.price).replace(/[^0-9.]/g, ''));
                if (!isNaN(parsed) && parsed > 0) {
                    amountVnd = parsed < 1000 ? Math.round(parsed * usdVndRate) : Math.round(parsed);
                }
            }
            if (!amountVnd || amountVnd < 10) {
                amountVnd = Math.max(10000, (plan.meritCost || 1) * usdVndRate);
            }


            // Encode planId & userId in description (max 25 chars, no special chars)
            // Format: short name + P{planId}U{userId}
            const shortName = (plan.planName || 'Goi').substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
            const description = `${shortName}P${planId}U${userId}`.substring(0, 25);

            const returnPath = req.body.returnPath || '/';
            // Ensure returnPath starts with / and doesn't contain full domain to prevent open redirects
            const safePath = returnPath.startsWith('/') ? returnPath : '/';
            const origin = req.headers.origin || BASE_URL;

            const result = await createPaymentLink(
                {
                    clientId: space.payosClientId,
                    apiKey: space.payosApiKey,
                    checksumKey: space.payosChecksumKey,
                },
                {
                    orderCode,
                    amount: amountVnd,
                    description,
                    cancelUrl: `${origin}${safePath}?payment=cancel`,
                    returnUrl: `${origin}${safePath}?payment=success&planId=${planId}&userId=${userId}`,
                    planId,
                    userId,
                }
            );

            // Save pending payment record for webhook matching
            await pool.query(
                `INSERT INTO payos_orders (order_code, user_id, plan_id, space_id, status)
                 VALUES ($1, $2, $3, $4, 'pending')
                 ON CONFLICT (order_code) DO NOTHING`,
                [orderCode, userId, planId, spaceId]
            ).catch(() => {}); // Ignore if table doesn't exist yet – webhook will handle it

            res.json({ checkoutUrl: result.checkoutUrl, orderCode: result.orderCode });
        } catch (error) {
            console.error('PayOS create payment link error:', error);
            res.status(500).json({ message: error.message || 'Không thể tạo link thanh toán.' });
        }
    },

    /**
     * POST /api/payos/create-donation-link
     * Body: { amount, message, spaceId, returnPath }
     * Creates a PayOS checkout link for a generic donation (merits).
     */
    async createDonationLink(req, res) {
        try {
            const { amount, message, spaceId, returnPath } = req.body;
            const userId = req.user?.id;

            if (!amount || amount <= 0 || !spaceId || !userId) {
                return res.status(400).json({ message: 'amount (USD), spaceId, and userId are required.' });
            }

            const space = await spaceModel.findById(parseInt(spaceId, 10));
            if (!space) return res.status(404).json({ message: 'Space not found.' });

            if (!space.payosClientId || !space.payosApiKey || !space.payosChecksumKey) {
                return res.status(400).json({ message: 'PayOS chưa được cấu hình cho space này.' });
            }

            const usdVndRate = await getUsdVndRate();
            const amountVnd = Math.max(10000, Math.round(Number(amount) * usdVndRate));
            
            const orderCode = Date.now() % 9007199254740991;
            const safePath = (returnPath && returnPath.startsWith('/')) ? returnPath : '/';
            const origin = req.headers.origin || BASE_URL;

            // D denotes Donation, S spaceId, U userId
            const description = `D${spaceId}U${userId}`.substring(0, 25);

            const result = await createPaymentLink(
                {
                    clientId: space.payosClientId,
                    apiKey: space.payosApiKey,
                    checksumKey: space.payosChecksumKey,
                },
                {
                    orderCode,
                    amount: amountVnd,
                    description,
                    cancelUrl: `${origin}${safePath}?payment=cancel`,
                    returnUrl: `${origin}${safePath}?payment=success`,
                }
            );

            // Save pending donation record
            await pool.query(
                `INSERT INTO payos_orders (order_code, user_id, space_id, status, amount, message)
                 VALUES ($1, $2, $3, 'pending', $4, $5)
                 ON CONFLICT (order_code) DO NOTHING`,
                [orderCode, userId, spaceId, amount, message || ''] // Store amount in USD to reward merits later
            ).catch(() => {});

            res.json({ checkoutUrl: result.checkoutUrl, orderCode: result.orderCode });
        } catch (error) {
            console.error('PayOS create donation link error:', error);
            res.status(500).json({ message: error.message || 'Không thể tạo link quyên góp.' });
        }
    },

    /**
     * POST /api/payos/webhook
     * Public webhook from PayOS after payment success/cancel
     */
    async handleWebhook(req, res) {
        try {
            const { code, data } = req.body;

            // PayOS sends code='00' for success
            if (code !== '00' || !data) {
                return res.status(200).send('OK'); // Acknowledge but ignore non-success
            }

            const { orderCode, description } = data;

            // Try to find from payos_orders table first
            let planId, userId, spaceId;
            let dbAmount, dbMessage;
            try {
                const orderRes = await pool.query(
                    'SELECT * FROM payos_orders WHERE order_code = $1 LIMIT 1',
                    [orderCode]
                );
                if (orderRes.rows.length > 0) {
                    const order = orderRes.rows[0];
                    planId = order.plan_id;
                    userId = order.user_id;
                    spaceId = order.space_id;
                    dbAmount = order.amount;
                    dbMessage = order.message;
                }
            } catch (e) {
                console.warn('payos_orders table not found or error, parsing from description');
            }

            // Fallback: parse from description
            if (!userId && description) {
                const match = description.match(/U(\d+)$/);
                if (match) userId = parseInt(match[1], 10);
            }

            if (!userId) {
                console.error('PayOS webhook: cannot identify user from orderCode', orderCode);
                return res.status(200).send('OK');
            }

            if (planId || (description && description.includes('P'))) {
                // Subscription flow
                try {
                    // Activate user subscription
                    console.log(`PayOS webhook: User ${userId} successfully purchased plan ${planId}`);
                    await billingModel.purchaseSubscription(userId, planId);
                } catch (err) {
                    console.error('PayOS webhook: Failed to activate subscription', err);
                }
            } else if (description && description.startsWith('D')) {
                // Donation flow
                try {
                    const usdAmountStr = dbAmount || '1';
                    const message = dbMessage || 'Cúng dường PayOS';
                    const meritsToAdd = Math.round(Number(usdAmountStr)); // e.g. 1 USD = 1 merit
                    
                    console.log(`PayOS webhook: User ${userId} successfully donated ${usdAmountStr} USD`);
                    await billingModel.addMerits(userId, meritsToAdd, null, 'payos', String(orderCode), message, spaceId);
                } catch (err) {
                    console.error('PayOS webhook: Failed to add donation merits', err);
                }
            }

            // Mark order as paid
            await pool.query(
                'UPDATE payos_orders SET status = $1 WHERE order_code = $2',
                ['paid', orderCode]
            ).catch(() => {});

            res.status(200).send('OK');
        } catch (error) {
            console.error('PayOS webhook error:', error);
            res.status(200).send('OK'); // Always return 200 to PayOS
        }
    },

    /**
     * GET /api/payos/verify-order?orderCode=123
     * Verifies a PayOS order and activates subscription/merits if paid.
     */
    async verifyPayment(req, res) {
        try {
            const { orderCode } = req.query;
            if (!orderCode) return res.status(400).json({ message: 'orderCode is required' });

            const orderRes = await pool.query('SELECT * FROM payos_orders WHERE order_code = $1 LIMIT 1', [orderCode]);
            if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Order not found' });
            const order = orderRes.rows[0];

            if (order.status === 'paid') {
                return res.json({ status: 'PAID', message: 'Order already verified.' });
            }

            const space = await spaceModel.findById(order.space_id);
            if (!space || !space.payosClientId) return res.status(400).json({ message: 'Space PayOS not configured' });

            const payosClient = createPayOSClient({
                clientId: space.payosClientId,
                apiKey: space.payosApiKey,
                checksumKey: space.payosChecksumKey,
            });

            let linkInfo;
            try {
                if (payosClient.getPaymentLinkInformation) {
                    linkInfo = await payosClient.getPaymentLinkInformation(orderCode);
                } else {
                    linkInfo = await payosClient.paymentRequests.getPayment(orderCode);
                }
            } catch (err) {
                console.error('Error calling PayOS API:', err);
                return res.status(500).json({ message: 'Could not contact PayOS API.' });
            }

            if (linkInfo && linkInfo.status === 'PAID') {
                const userId = order.user_id;
                const planId = order.plan_id;
                
                if (planId) {
                    await billingModel.purchaseSubscription(userId, planId);
                } else {
                    const usdAmountStr = order.amount || '1';
                    const message = order.message || 'Cúng dường PayOS';
                    const meritsToAdd = Math.round(Number(usdAmountStr));
                    await billingModel.addMerits(userId, meritsToAdd, null, 'payos', String(orderCode), message, order.space_id);
                }

                await pool.query('UPDATE payos_orders SET status = $1 WHERE order_code = $2', ['paid', orderCode]);
                return res.json({ status: 'PAID', message: 'Order verified and benefits applied.' });
            }

            return res.json({ status: linkInfo ? linkInfo.status : 'UNKNOWN', message: 'Order not paid yet.' });
        } catch (error) {
            console.error('PayOS verify order error:', error);
            res.status(500).json({ message: error.message || 'Error verifying order.' });
        }
    }
};
