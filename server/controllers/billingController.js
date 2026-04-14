// server/controllers/billingController.js
import { billingModel } from '../models/billing.model.js';
import { userModel } from '../models/user.model.js';
import { pool } from '../db.js';
import Stripe from 'stripe';

const mapAndSanitizeUser = (user) => {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};

const getStripeClient = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key is not configured on the server.');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const MERIT_PRICE_VND = 1000;

export const billingController = {
    // Pricing Plans
    async getPricingPlans(req, res) {
        try {
            const spaceId = req.query.spaceId ? parseInt(req.query.spaceId, 10) : null;
            res.json(await billingModel.findAllPlans(spaceId));
        } catch (error) {
            res.status(500).json({ message: 'Không thể tải danh sách gói giá.' });
        }
    },
    async createPricingPlan(req, res) {
        try {
            res.status(201).json(await billingModel.createPlan(req.body));
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi tạo gói giá mới.' });
        }
    },
    async updatePricingPlan(req, res) {
        try {
            res.json(await billingModel.updatePlan(req.params.id, req.body));
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi cập nhật gói giá.' });
        }
    },
    async deletePricingPlan(req, res) {
        try {
            await billingModel.deletePlan(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi xóa gói giá.' });
        }
    },

    // Transactions
    async getAllTransactions(req, res) {
        try {
            res.json(await billingModel.findAllTransactions());
        } catch (error) {
            res.status(500).json({ message: 'Không thể tải lịch sử giao dịch.' });
        }
    },
    async getTransactionsByUserId(req, res) {
        try {
            res.json(await billingModel.findTransactionsByUserId(parseInt(req.params.userId, 10)));
        } catch (error) {
            res.status(500).json({ message: 'Không thể tải lịch sử giao dịch của người dùng.' });
        }
    },
    async getSpaceTransactions(req, res) {
        try {
            const spaceId = parseInt(req.params.spaceId, 10);
            const { page, limit, fromDate, toDate } = req.query;
            const result = await billingModel.findTransactionsBySpaceId(spaceId, {
                page: page ? parseInt(page, 10) : 1,
                limit: limit ? parseInt(limit, 10) : 10,
                fromDate,
                toDate
            });
            res.json(result);
        } catch (error) {
            console.error("Error fetching space transactions:", error);
            res.status(500).json({ message: 'Không thể tải danh sách cúng dường của không gian.' });
        }
    },
    async addMeritsManually(req, res) {
        const { userId, merits } = req.body;
        const adminId = req.user.id;
        try {
            const updatedUser = await billingModel.addMerits(userId, merits, adminId);
            res.json(mapAndSanitizeUser(updatedUser));
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi nạp merit.' });
        }
    },

    // Subscriptions
    async purchaseSubscription(req, res) {
        const { userId, planId } = req.body;
        try {
            const updatedUser = await billingModel.purchaseSubscription(userId, planId);
            res.json(mapAndSanitizeUser(updatedUser));
        } catch (error) {
            res.status(400).json({ message: error.message || 'Lỗi khi mua gói.' });
        }
    },

    // Crypto (Mocked)
    // Crypto (Mocked) - REMOVED
    // async initiateMeritPurchase(req, res) {
    //     res.status(501).json({ message: 'Crypto payments not implemented yet.' });
    // },

    // async confirmCryptoPayment(req, res) {
    //     res.status(501).json({ message: 'Crypto payments not implemented yet.' });
    // },

    // Stripe
    getStripeConfig(req, res) {
        if (!process.env.STRIPE_PUBLISHABLE_KEY) {
            return res.status(500).json({ message: 'Stripe publishable key is not configured.' });
        }
        res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
    },

    async getEnabledPaymentMethods(req, res) {
        try {
            const stripe = getStripeClient();
            // Fetch all payment method configurations from Stripe.
            const paymentMethodConfigurations = await stripe.paymentMethodConfigurations.list();

            // Filter for active configurations and then extract the payment method types.
            const enabledMethods = paymentMethodConfigurations.data
                .filter(config => config.active)
                .flatMap(config =>
                    Object.keys(config).filter(key => {
                        const value = config[key];
                        return typeof value === 'object' && value !== null && 'display_preference' in value;
                    })
                );

            res.json(enabledMethods);
        } catch (error) {
            console.error("Error fetching Stripe payment methods:", error);
            res.status(500).json({ message: `Could not fetch payment methods: ${error.message}` });
        }
    },

    // async createStripePaymentIntent(req, res) {
    //     try {
    //         const stripe = getStripeClient();
    //         const { userId, merits } = req.body;
    //         if (!userId || !merits || merits <= 0) {
    //             return res.status(400).json({ message: 'User ID and a valid merit amount are required.' });
    //         }

    //         const amount = merits * MERIT_PRICE_VND;
    //         const paymentIntent = await stripe.paymentIntents.create({
    //             amount,
    //             currency: 'vnd',
    //             metadata: { userId, merits },
    //             automatic_payment_methods: {
    //                 enabled: true,
    //             },
    //         });
    //         res.send({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    //     } catch (error) {
    //         res.status(500).json({ message: `Failed to create payment intent: ${error.message}` });
    //     }
    // },

    // async confirmStripePayment(req, res) {
    //     const { paymentIntentId } = req.body;
    //     if (!paymentIntentId) {
    //         return res.status(400).json({ message: 'Payment Intent ID is required.' });
    //     }
    //     try {
    //         const stripe = getStripeClient();
    //         const existingTx = await pool.query('SELECT id FROM transactions WHERE stripe_charge_id = $1', [paymentIntentId]);
    //         if (existingTx.rows.length > 0) {
    //             const user = await userModel.findById(req.user.id);
    //             return res.json(mapAndSanitizeUser(user));
    //         }

    //         const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    //         if (paymentIntent.status !== 'succeeded') {
    //             return res.status(400).json({ message: 'Payment not successful or still processing.' });
    //         }

    //         const { userId, merits } = paymentIntent.metadata;
    //         if (!userId || !merits) {
    //             return res.status(400).json({ message: 'Payment metadata is missing.' });
    //         }

    //         const userIdNum = parseInt(userId, 10);
    //         const meritsNum = parseFloat(merits);

    //         const updatedUser = await billingModel.addMerits(userIdNum, meritsNum, null, 'stripe', paymentIntentId);
    //         res.json(mapAndSanitizeUser(updatedUser));
    //     } catch (error) {
    //         console.error("Stripe confirmation error:", error);
    //         res.status(500).json({ message: `Failed to confirm payment and add merits: ${error.message}` });
    //     }
    // },

    // NEW: Create Stripe Checkout Session
    async createCheckoutSession(req, res) {
        let { amount, userId, message, spaceId, planId, type, returnPath, returnUrl } = req.body; // Amount in USD
        userId = userId || (req.user ? req.user.id : null);
        returnPath = returnPath || returnUrl;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'User ID and valid amount are required.' });
        }

        try {
            const stripe = getStripeClient();

            const origin = req.headers.origin || 'http://localhost:3000';
            const truncatedMessage = message ? message.substring(0, 500) : '';

            // Support returning to a specific path after payment (e.g. /giac-ngo)
            const safePath = (returnPath && returnPath.startsWith('/')) ? returnPath : '/donation';
            const successUrl = `${origin}${safePath}?payment=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${origin}${safePath}?payment=cancel`;

            // If this is an AI limit donate, fetch plan details
            let dailyLimitBonus = 0;
            let durationDays = 30;
            let productName = "Cúng Dường Tuỳ Tâm - Giac Ngo";

            const donationType = type || 'offering';
            if (donationType === 'ai_limit_donate' && planId) {
                const plan = await billingModel.findPlanById(planId);
                if (plan) {
                    dailyLimitBonus = plan.dailyLimitBonus || 0;
                    durationDays = plan.durationDays || 30;
                    productName = plan.planName || productName;
                }
            }

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: productName,
                                description: donationType === 'ai_limit_donate'
                                    ? `+${dailyLimitBonus} tin nhắn/ngày trong ${durationDays} ngày`
                                    : `Offering of ${amount} USD for Merits`,
                            },
                            unit_amount: Math.round(amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    userId: userId,
                    merits: amount,
                    type: donationType,
                    message: truncatedMessage,
                    spaceId: spaceId || '',
                    planId: planId ? String(planId) : '',
                    dailyLimitBonus: String(dailyLimitBonus),
                    durationDays: String(durationDays),
                },
                payment_intent_data: {
                    metadata: {
                        userId: userId,
                        merits: amount,
                        type: donationType,
                        message: truncatedMessage,
                        spaceId: spaceId || ''
                    }
                },
                phone_number_collection: { enabled: true },
                success_url: successUrl,
                cancel_url: cancelUrl,
            });

            res.json({ url: session.url });
        } catch (error) {
            console.error("Error creating checkout session:", error);
            res.status(500).json({ message: `Failed to create checkout session: ${error.message}` });
        }
    },

    // NEW: Verify Checkout Session and Add Merits
    async verifyCheckoutSession(req, res) {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        try {
            const stripe = getStripeClient();
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status !== 'paid') {
                return res.status(400).json({ message: 'Payment not successful.' });
            }

            const paymentIntentId = session.payment_intent;

            const existingTx = await pool.query('SELECT id FROM transactions WHERE stripe_charge_id = $1', [paymentIntentId]);
            if (existingTx.rows.length > 0) {
                const userId = session.metadata.userId;
                const user = await userModel.findById(parseInt(userId, 10));
                return res.json(mapAndSanitizeUser(user));
            }

            const { userId, merits, message, spaceId, dailyLimitBonus, durationDays } = session.metadata;
            const donationType = session.metadata.type || 'stripe';

            if (!userId || !merits) {
                return res.status(400).json({ message: 'Invalid session metadata.' });
            }

            const userIdNum = parseInt(userId, 10);
            const meritsNum = parseFloat(merits);
            const details = message ? { message } : null;
            const spaceIdInt = spaceId ? parseInt(spaceId, 10) : null;

            const updatedUser = await billingModel.addMerits(userIdNum, meritsNum, null, donationType, paymentIntentId, details, spaceIdInt);

            // If AI limit donate → apply daily bonus
            if (donationType === 'ai_limit_donate' && dailyLimitBonus) {
                const bonus = parseInt(dailyLimitBonus, 10);
                const days = parseInt(durationDays || '30', 10);
                await billingModel.addDonateBonus(userIdNum, bonus, days);
            }

            // Send Email Notification for Offering
            if (donationType === 'offering' && spaceIdInt) {
                try {
                    const spaceRes = await pool.query('SELECT name, user_id FROM spaces WHERE id = $1', [spaceIdInt]);
                    const space = spaceRes.rows[0];
                    if (space) {
                        const { mailService } = await import('../services/mailService.js');
                        const userRes = await userModel.findById(userIdNum);
                        if (userRes) {
                            await mailService.sendDonationSuccessEmail(userRes.email, userRes.name, meritsNum, space.name, paymentIntentId);
                        }
                        const ownerRes = await userModel.findById(space.user_id);
                        if (ownerRes) {
                            await mailService.sendDonationReceivedEmail(ownerRes.email, ownerRes.name, meritsNum, (await userModel.findById(userIdNum))?.name || 'Ẩn danh', space.name, message);
                        }
                    }
                } catch (emailErr) {
                    console.error('Failed to send donation emails:', emailErr);
                }
            }

            res.json(mapAndSanitizeUser(updatedUser));

        } catch (error) {
            console.error("Error verifying checkout session:", error);
            res.status(500).json({ message: `Verification failed: ${error.message}` });
        }
    },

    // NEW: Purchase AI daily limit boost with Merits
    async purchaseAiLimitWithMerits(req, res) {
        const userId = req.user.id;
        const { planId } = req.body;
        if (!planId) return res.status(400).json({ message: 'planId is required.' });
        try {
            const plan = await billingModel.findPlanById(planId);
            if (!plan) return res.status(404).json({ message: 'Plan not found.' });
            if (!plan.meritCost || plan.meritCost <= 0) return res.status(400).json({ message: 'This plan cannot be purchased with merits.' });

            const user = await userModel.findById(userId);
            if ((user.merits || 0) < plan.meritCost) {
                return res.status(400).json({ message: 'Không đủ Merits.' });
            }

            // Deduct merits and add daily bonus
            await billingModel.addMerits(userId, -plan.meritCost, null, 'ai_limit_donate');
            await billingModel.addDonateBonus(userId, plan.dailyLimitBonus, plan.durationDays || 30);

            const updatedUser = await userModel.findById(userId);
            res.json(mapAndSanitizeUser(updatedUser));
        } catch (error) {
            res.status(500).json({ message: `Lỗi: ${error.message}` });
        }
    },

    // Withdrawals
    async getWithdrawalRequests(req, res) {
        try {
            const requests = await billingModel.findWithdrawalRequests();
            res.json(requests);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch withdrawal requests.' });
        }
    },

    async processWithdrawalRequest(req, res) {
        const { id } = req.params;
        const { action } = req.body;
        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action.' });
        }

        try {
            // If approving, execute Stripe Transfer first
            if (action === 'approved') {
                const stripe = getStripeClient();
                const client = await pool.connect();
                try {
                    // Check Request Details
                    const requestRes = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1', [id]);
                    const request = requestRes.rows[0];

                    if (!request) throw new Error('Request not found.');
                    if (request.status !== 'pending') throw new Error('Request already processed.');

                    let destinationAccountId;
                    if (request.space_id) {
                        const spaceRes = await client.query('SELECT stripe_account_id FROM spaces WHERE id = $1', [request.space_id]);
                        destinationAccountId = spaceRes.rows[0]?.stripe_account_id;
                    } else {
                        // Legacy user withdrawal
                        // You would need to fetch user's stripeAccountId here if supported
                        // For now we focused on Space logic
                        throw new Error('Personal withdrawals not fully supported yet.');
                    }

                    if (!destinationAccountId) throw new Error('No linked Stripe account found for destination.');

                    // Calculate Platform Fee
                    const { systemModel } = await import('../models/system.model.js');
                    const config = await systemModel.getConfig();
                    const feePercent = parseFloat(config.platformFeePercent || 0);
                    const feeAmount = request.amount * (feePercent / 100);
                    const netAmount = request.amount - feeAmount;

                    // Execute Transfer
                    // Amount is stored as number (Merits). Assuming 1 Merit = 1 USD for Transfer.
                    // Stripe expects amount in cents.
                    const amountInCents = Math.round(netAmount * 100);

                    const transfer = await stripe.transfers.create({
                        amount: amountInCents,
                        currency: 'usd',
                        destination: destinationAccountId,
                        transfer_group: `withdrawal_${id}`,
                        metadata: {
                            originalAmount: request.amount,
                            feePercent: feePercent,
                            feeAmount: feeAmount
                        }
                    });

                    console.log(`Transfer successful: ${transfer.id}. Fee deducted: $${feeAmount} (${feePercent}%)`);

                } catch (err) {
                    console.error('Stripe Transfer failed:', err);
                    client.release();
                    return res.status(500).json({ message: `Stripe Transfer failed: ${err.message}` });
                }
                client.release();
            }

            const updatedRequest = await billingModel.processWithdrawalRequest(id, action);

            // Send Email Notification
            try {
                // Fetch owner email
                const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [updatedRequest.userId]);
                const owner = userRes.rows[0];
                if (owner) {
                    const { mailService } = await import('../services/mailService.js');
                    await mailService.sendWithdrawalStatusEmail(
                        owner.email,
                        owner.name,
                        updatedRequest.amount,
                        action,
                        action === 'rejected' ? 'Yêu cầu không hợp lệ hoặc số dư không đủ.' : ''
                    );
                }
            } catch (emailErr) {
                console.error('Failed to send withdrawal email:', emailErr);
            }

            res.json(updatedRequest);
        } catch (error) {
            res.status(500).json({ message: `Failed to process withdrawal request: ${error.message}` });
        }
    },

    async createWithdrawalRequest(req, res) {
        const { amount, spaceId } = req.body;
        const userId = req.user.id;

        // Fetch System Config for dynamic rules
        const { systemModel } = await import('../models/system.model.js');
        const config = await systemModel.getConfig();
        const settings = config.withdrawalSettings || { minWithdrawal: 50, holdDays: 5 };
        const minAmount = settings.minWithdrawal || 50;
        const holdDays = settings.holdDays || 5;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Số lượng không hợp lệ.' });
        }
        if (amount < minAmount) {
            return res.status(400).json({ message: `Số tiền rút tối thiểu là ${minAmount} Merits ($${minAmount}).` });
        }

        try {
            if (spaceId) {
                // Space-based withdrawal
                const space = await pool.query('SELECT * FROM spaces WHERE id = $1', [spaceId]);
                const spaceData = space.rows[0];
                if (!spaceData) return res.status(404).json({ message: 'Không tìm thấy không gian.' });

                // Enforce ownership
                if (spaceData.user_id !== userId) {
                    return res.status(403).json({ message: 'Bạn không có quyền yêu cầu rút tiền cho không gian này.' });
                }

                if (!spaceData.stripe_account_id) {
                    return res.status(400).json({ message: 'Không gian này chưa cài đặt tài khoản Stripe để nhận tiền.' });
                }

                const currentBalance = parseFloat(spaceData.merits) || 0;
                if (currentBalance < amount) {
                    return res.status(400).json({ message: 'Số dư không đủ để rút.' });
                }

                // Check Hold Time Logic & Pending Requests
                // Available Balance = Total Balance - Pending Withdrawals - Earnings from last X days (Held)
                const pendingAmount = await billingModel.getPendingSpaceWithdrawalTotal(spaceId);
                const recentEarnings = await billingModel.getRecentSpaceEarnings(spaceId, holdDays);

                const realBalance = currentBalance - pendingAmount;
                if (realBalance < amount) {
                    return res.status(400).json({
                        message: `Số dư không đủ (Bạn đang có ${pendingAmount} Merits trong các yêu cầu chờ duyệt).`
                    });
                }

                const availableBalance = realBalance - recentEarnings;

                if (amount > availableBalance) {
                    return res.status(400).json({
                        message: `Số dư khả dụng để rút thấp hơn yêu cầu (Hold time: ${holdDays} ngày).`,
                        details: `Số dư: ${currentBalance}. Chờ duyệt: ${pendingAmount}. Đang bị giữ (Hold): ${recentEarnings}. Khả dụng: ${availableBalance}.`
                    });
                }

                const newRequest = await billingModel.createWithdrawalRequest(userId, amount, spaceId);
                res.status(201).json(newRequest);
            } else {
                // Legacy user-based withdrawal
                const user = await userModel.findById(userId);
                if (!user.stripeAccountId) {
                    return res.status(400).json({ message: 'Tài khoản của bạn chưa cài đặt Stripe để nhận tiền.' });
                }
                if ((user.merits || 0) < amount) {
                    return res.status(400).json({ message: 'Số dư không đủ để rút.' });
                }
                const newRequest = await billingModel.createWithdrawalRequest(userId, amount);
                res.status(201).json(newRequest);
            }
        } catch (error) {
            res.status(500).json({ message: `Lỗi khi tạo yêu cầu rút tiền: ${error.message}` });
        }
    },

    // STRIPE CONNECT EXPRESS

    async createConnectAccount(req, res) {
        try {
            const stripe = getStripeClient();
            const { email } = req.user; // Use logged-in user's email or from request body

            // Create an Express account
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'US', // Default to US, change based on platform requirements
                email: email,
                capabilities: {
                    transfers: { requested: true },
                },
            });

            // Update space with stripe_account_id if spaceId is provided
            const { spaceId } = req.body;
            if (spaceId) {
                await pool.query('UPDATE spaces SET stripe_account_id = $1 WHERE id = $2', [account.id, spaceId]);
            }

            res.json({ accountId: account.id });
        } catch (error) {
            console.error('Error creating Connect account:', error);
            res.status(500).json({ message: `Failed to create Stripe Connect account: ${error.message}` });
        }
    },

    async createAccountLink(req, res) {
        try {
            const stripe = getStripeClient();
            const { accountId } = req.body;
            const origin = req.headers.origin || 'http://localhost:3000';

            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${origin}/admin/billing?status=refresh&spaceId=${req.body.spaceId || ''}`,
                return_url: `${origin}/admin/billing?status=return&spaceId=${req.body.spaceId || ''}`,
                type: 'account_onboarding',
            });

            res.json({ url: accountLink.url });
        } catch (error) {
            console.error('Error creating account link:', error);
            res.status(500).json({ message: 'Failed to create onboarding link.' });
        }
    },

    async createLoginLink(req, res) {
        try {
            const stripe = getStripeClient();
            const { accountId } = req.body;

            const loginLink = await stripe.accounts.createLoginLink(accountId);
            res.json({ url: loginLink.url });
        } catch (error) {
            console.error('Error creating login link:', error);
            res.status(500).json({ message: `Failed to create dashboard link: ${error.message}` });
        }
    },

    async disconnectConnectAccount(req, res) {
        try {
            const { spaceId } = req.body;
            const userId = req.user.id; // Verify ownership

            // Check if user owns the space
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            if (spaceRes.rows.length === 0) {
                return res.status(404).json({ message: 'Space not found' });
            }

            if (spaceRes.rows[0].user_id !== userId) {
                return res.status(403).json({ message: 'Unauthorized, you do not own this space.' });
            }

            // Remove stripe_account_id
            await pool.query('UPDATE spaces SET stripe_account_id = NULL WHERE id = $1', [spaceId]);

            res.json({ message: 'Disconnected Stripe account successfully.' });
        } catch (error) {
            console.error('Error disconnecting Stripe account:', error);
            res.status(500).json({ message: 'Failed to disconnect Stripe account.' });
        }
    },

    async getConnectAccountStatus(req, res) {
        try {
            const stripe = getStripeClient();
            const { accountId } = req.params;

            const account = await stripe.accounts.retrieve(accountId);
            res.json({
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
            });
        } catch (error) {
            console.error('Error fetching account status:', error);
            res.status(500).json({ message: 'Failed to fetch account status.' });
        }
    },

    async exportTransactions(req, res) {
        try {
            const { spaceId } = req.query;
            const { xlsx } = await import('xlsx');

            let data = [];

            if (spaceId) {
                // Ensure user owns the space or is admin
                const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
                if (spaceRes.rows.length === 0) return res.status(404).json({ message: 'Space not found' });

                // Allow admin to export any space, or owner to export own space
                // Assuming 'req.user' is populated by middleware
                // Does req.user.permissions include 'manual-billing' or 'view-all-transactions'?
                // For now, strict check:
                const isOwner = spaceRes.rows[0].user_id === req.user.id;
                const isAdmin = req.user.permissions && (req.user.permissions.includes('manual-billing') || req.user.permissions.includes('settings'));

                if (!isOwner && !isAdmin) {
                    return res.status(403).json({ message: 'Unauthorized_export' });
                }

                // Fetch transactions
                const result = await billingModel.findTransactionsBySpaceId(spaceId, { limit: 10000 }); // High limit for export
                data = result.data;
            } else {
                // Export all? Only for Admin
                if (!req.user.permissions || !req.user.permissions.includes('manual-billing')) {
                    return res.status(403).json({ message: 'Unauthorized_export_all' });
                }
                data = await billingModel.findAllTransactions();
            }

            // Format data for Excel
            const worksheetData = data.map(t => ({
                Date: new Date(t.timestamp).toLocaleString('vi-VN'),
                Type: t.type,
                Amount: t.merits,
                User: t.userName || 'Anonymous',
                Space: t.spaceName || 'N/A',
                Details: t.details ? JSON.stringify(t.details) : '',
                StripeID: t.stripeChargeId || ''
            }));

            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(worksheetData);
            xlsx.utils.book_append_sheet(wb, ws, "Transactions");

            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', `attachment; filename="transactions_${spaceId || 'all'}_${Date.now()}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);

        } catch (error) {
            console.error('Export failed:', error);
            res.status(500).json({ message: 'Export failed: ' + error.message });
        }
    },

    async getSpaceEarningsStats(req, res) {
        try {
            const { spaceId, days } = req.query;
            if (!spaceId) return res.status(400).json({ message: 'Space ID is required' });

            // Auth check: Owner or Admin
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            if (spaceRes.rows.length === 0) return res.status(404).json({ message: 'Space not found' });

            const isOwner = spaceRes.rows[0].user_id === req.user.id;
            const isAdmin = req.user.roles && (req.user.permissions.includes('manual-billing') || req.user.permissions.includes('settings'));

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const stats = await billingModel.getSpaceEarningsStats(spaceId, days || 30);
            res.json(stats);
        } catch (error) {
            console.error('Stats fetch failed:', error);
            res.status(500).json({ message: 'Failed to fetch stats.' });
        }
    }
};