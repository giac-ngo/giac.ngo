// server/models/billing.model.js
import { pool, mapRowToCamelCase } from '../db.js';
import { userModel, enrichUserWithPermissions } from './user.model.js';

export const billingModel = {
    // Pricing Plans
    async findAllPlans(spaceId = null) {
        let query = 'SELECT * FROM pricing_plans';
        const params = [];
        if (spaceId) {
            // Show plans specific to this space OR global plans (space_id IS NULL)
            query += ' WHERE (space_id = $1 OR space_id IS NULL)';
            params.push(spaceId);
        }
        query += ' ORDER BY merit_cost ASC';
        const res = await pool.query(query, params);
        return res.rows.map(mapRowToCamelCase);
    },

    async findPlanById(id) {
        const res = await pool.query('SELECT * FROM pricing_plans WHERE id = $1', [id]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async createPlan(planData) {
        const { planName, planNameEn, price, priceEn, meritCost, requestLimit, aiConfigIds, features, featuresEn, isActive, dailyMsgLimit, dailyLimitBonus, durationDays, imageUrl, spaceId } = planData;
        const res = await pool.query(
            `INSERT INTO pricing_plans (plan_name, plan_name_en, price, price_en, merit_cost, request_limit, ai_config_ids, features, features_en, is_active, daily_msg_limit, daily_limit_bonus, duration_days, image_url, space_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [planName, planNameEn ?? null, price, priceEn ?? null, meritCost, requestLimit, aiConfigIds ?? [], features ?? [], featuresEn ?? null, isActive ?? true, dailyMsgLimit ?? 0, dailyLimitBonus ?? 0, durationDays ?? 30, imageUrl ?? null, spaceId ?? null]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async updatePlan(id, planData) {
        const { planName, planNameEn, price, priceEn, meritCost, requestLimit, aiConfigIds, features, featuresEn, isActive, dailyMsgLimit, dailyLimitBonus, durationDays, imageUrl, spaceId } = planData;
        const res = await pool.query(
            `UPDATE pricing_plans SET
                plan_name = $1, plan_name_en = $2, price = $3, price_en = $4, merit_cost = $5, request_limit = $6,
                ai_config_ids = $7, features = $8, features_en = $9, is_active = $10,
                daily_msg_limit = $11, daily_limit_bonus = $12, duration_days = $13, image_url = $14, space_id = $15
             WHERE id = $16 RETURNING *`,
            [planName, planNameEn ?? null, price, priceEn ?? null, meritCost, requestLimit, aiConfigIds ?? [], features ?? [], featuresEn ?? null, isActive ?? true,
             dailyMsgLimit ?? 0, dailyLimitBonus ?? 0, durationDays ?? 30, imageUrl ?? null, spaceId ?? null, id]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async deletePlan(id) {
        await pool.query('DELETE FROM pricing_plans WHERE id = $1', [id]);
    },

    // Get or create a user_subscriptions record
    async getUserSubscription(userId) {
        const res = await pool.query(
            `INSERT INTO user_subscriptions (id, user_id)
             VALUES (
               COALESCE((SELECT MAX(id) FROM user_subscriptions), 0) + 1,
               $1
             )
             ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
             RETURNING *`,
            [userId]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    // Increment daily usage, auto-reset if new day
    async incrementDailyUsage(userId) {
        const res = await pool.query(
            `INSERT INTO user_subscriptions (id, user_id, daily_msg_used, daily_reset_date)
             VALUES (
               COALESCE((SELECT MAX(id) FROM user_subscriptions), 0) + 1,
               $1, 1, CURRENT_DATE
             )
             ON CONFLICT (user_id) DO UPDATE SET
               daily_msg_used = CASE
                 WHEN user_subscriptions.daily_reset_date < CURRENT_DATE THEN 1
                 ELSE user_subscriptions.daily_msg_used + 1
               END,
               daily_reset_date = CURRENT_DATE
             RETURNING *`,
            [userId]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    // Apply donate bonus to user subscription
    async addDonateBonus(userId, bonus, days) {
        const res = await pool.query(
            `INSERT INTO user_subscriptions (id, user_id, daily_limit_bonus, expires_at)
             VALUES (
               COALESCE((SELECT MAX(id) FROM user_subscriptions), 0) + 1,
               $1, $2, NOW() + ($3 || ' days')::INTERVAL
             )
             ON CONFLICT (user_id) DO UPDATE SET
               daily_limit_bonus = $2,
               expires_at = NOW() + ($3 || ' days')::INTERVAL`,
            [userId, bonus, days]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    // Find base plan for an AI (plan with daily_msg_limit > 0 and ai_config_ids contains aiId)
    async findBasePlanByAiId(aiId) {
        const res = await pool.query(
            `SELECT * FROM pricing_plans
             WHERE daily_msg_limit > 0
               AND ai_config_ids @> ARRAY[$1::bigint]
               AND is_active = true
             LIMIT 1`,
            [aiId]
        );
        return mapRowToCamelCase(res.rows[0]) || null;
    },

    // Transactions
    async findAllTransactions() {
        const res = await pool.query(`
            SELECT t.*, u.name as user_name, a.name as admin_name, s.name as space_name
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN users a ON t.admin_id = a.id
            LEFT JOIN spaces s ON t.destination_space_id = s.id
            ORDER BY t.timestamp DESC
        `);
        return res.rows.map(mapRowToCamelCase);
    },

    async findTransactionsByUserId(userId) {
        const res = await pool.query(`
            SELECT t.*, a.name as admin_name, s.name as space_name
            FROM transactions t
            LEFT JOIN users a ON t.admin_id = a.id
            LEFT JOIN spaces s ON t.destination_space_id = s.id
            WHERE t.user_id = $1
            ORDER BY t.timestamp DESC
        `, [userId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async findTransactionsBySpaceId(spaceId, { page = 1, limit = 10, fromDate, toDate } = {}) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT t.*, u.name as user_name
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.destination_space_id = $1
        `;
        const params = [spaceId];
        let paramIndex = 2;

        if (fromDate) {
            query += ` AND t.timestamp >= $${paramIndex}`;
            params.push(fromDate);
            paramIndex++;
        }
        if (toDate) {
            query += ` AND t.timestamp <= $${paramIndex}`;
            params.push(toDate);
            paramIndex++;
        }

        query += ` ORDER BY t.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const res = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) FROM transactions t WHERE t.destination_space_id = $1`;
        const countParams = [spaceId];
        let countParamIndex = 2;
        if (fromDate) {
            countQuery += ` AND t.timestamp >= $${countParamIndex}`;
            countParams.push(fromDate);
            countParamIndex++;
        }
        if (toDate) {
            countQuery += ` AND t.timestamp <= $${countParamIndex}`;
            countParams.push(toDate);
            countParamIndex++;
        }
        const countRes = await pool.query(countQuery, countParams);

        return {
            data: res.rows.map(mapRowToCamelCase),
            total: parseInt(countRes.rows[0].count, 10),
            page,
            limit
        };
    },

    async getRecentSpaceEarnings(spaceId, days) {
        // Calculate the timestamp for X days ago
        // SQL interval can handle this, or we compute in JS.
        // Let's use SQL for precision.
        const res = await pool.query(`
            SELECT COALESCE(SUM(merits), 0) as recent_earnings
            FROM transactions
            WHERE destination_space_id = $1
              AND merits > 0 -- Only count earnings (positive merits)
              AND timestamp >= NOW() - ($2 || ' days')::INTERVAL
        `, [spaceId, days]);

        return parseFloat(res.rows[0].recent_earnings);
    },

    async getPendingSpaceWithdrawalTotal(spaceId) {
        const res = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_pending
            FROM withdrawal_requests
            WHERE space_id = $1 AND status = 'pending'
        `, [spaceId]);
        return parseFloat(res.rows[0].total_pending);
    },

    async getSpaceEarningsStats(spaceId, days = 30) {
        const res = await pool.query(`
            SELECT 
                DATE(timestamp) as date,
                SUM(merits) as earnings
            FROM transactions
            WHERE 
                (destination_space_id = $1 OR (details->>'spaceId')::int = $1)
                AND type IN ('offering', 'stripe', 'crypto') -- Count only income
                AND merits > 0
                AND timestamp >= NOW() - ($2 || ' days')::INTERVAL
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp) ASC
        `, [spaceId, days]);
        return res.rows.map(row => ({
            date: row.date.toISOString().split('T')[0],
            earnings: parseFloat(row.earnings)
        }));
    },

    async addMerits(userId, merits, adminId, type = 'manual', stripeChargeId = null, details = null, spaceId = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query(
                'UPDATE users SET merits = COALESCE(merits, 0) + $1 WHERE id = $2 RETURNING *',
                [merits, userId]
            );
            if (spaceId) {
                await client.query(
                    'UPDATE spaces SET merits = COALESCE(merits, 0) + $1, merits_sold = COALESCE(merits_sold, 0) + $1 WHERE id = $2',
                    [merits, spaceId]
                );
            }
            await client.query(
                'INSERT INTO transactions (user_id, merits, admin_id, type, stripe_charge_id, details, destination_space_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, merits, adminId, type, stripeChargeId, details, spaceId]
            );
            await client.query('COMMIT');
            return enrichUserWithPermissions(mapRowToCamelCase(res.rows[0]));
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async purchaseSubscription(userId, planId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const plan = await this.findPlanById(planId);
            if (!plan) throw new Error('Plan not found.');

            const user = await userModel.findById(userId);
            if (!user) throw new Error('User not found.');

            if (user.merits !== null && user.merits < plan.meritCost) {
                throw new Error('Not enough merits for this plan.');
            }

            if (user.merits !== null) {
                await client.query('UPDATE users SET merits = merits - $1 WHERE id = $2', [plan.meritCost, userId]);
                await client.query('INSERT INTO transactions (user_id, merits, type) VALUES ($1, $2, $3)', [userId, -plan.meritCost, 'subscription']);
            }

            const finalUserRes = await client.query(
                'UPDATE users SET subscription_plan_id = $1, requests_remaining = $2 WHERE id = $3 RETURNING *',
                [planId, plan.requestLimit, userId]
            );

            // ── Set expiry in user_subscriptions ──────────────────────────
            const durationDays = plan.durationDays || 30;
            const bonus = plan.dailyLimitBonus || 0;
            await client.query(
                `INSERT INTO user_subscriptions (id, user_id, daily_limit_bonus, expires_at)
                 VALUES (
                   COALESCE((SELECT MAX(id) FROM user_subscriptions), 0) + 1,
                   $1, $2, NOW() + ($3 || ' days')::INTERVAL
                 )
                 ON CONFLICT (user_id) DO UPDATE SET
                   daily_limit_bonus = $2,
                   expires_at = NOW() + ($3 || ' days')::INTERVAL`,
                [userId, bonus, durationDays]
            );

            await client.query('COMMIT');
            return enrichUserWithPermissions(mapRowToCamelCase(finalUserRes.rows[0]));
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async purchaseAi(userId, aiId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const aiRes = await client.query('SELECT purchase_cost, space_id, requests_granted_on_purchase FROM ai_configs WHERE id = $1', [aiId]);
            if (aiRes.rows.length === 0) throw new Error('AI not found.');
            const { purchase_cost: cost, space_id: spaceId, requests_granted_on_purchase: requestsGranted } = aiRes.rows[0];

            // Allow free AIs (cost = 0), but reject if cost is null/undefined or negative
            if (cost === null || cost === undefined || cost < 0) {
                throw new Error('This AI is not for sale.');
            }
            if (!spaceId) throw new Error('This AI is not associated with a space and cannot be purchased.');

            const ownedRes = await client.query('SELECT 1 FROM user_owned_ais WHERE user_id = $1 AND ai_config_id = $2', [userId, aiId]);
            if (ownedRes.rows.length > 0) throw new Error('You already own this AI.');

            const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
            const user = mapRowToCamelCase(userRes.rows[0]);
            if (!user) throw new Error('User not found.');

            let updatedUserRes;

            if (cost > 0) {
                // Paid AI - check merits and deduct
                if (user.merits !== null && user.merits < cost) throw new Error('Insufficient merits.');
                if (user.merits !== null) {
                    updatedUserRes = await client.query('UPDATE users SET merits = merits - $1 WHERE id = $2 RETURNING *', [cost, userId]);
                } else {
                    updatedUserRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
                }
            } else {
                // Free AI - no merit deduction needed
                updatedUserRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            }

            // Only update space merits and create transaction for paid AIs
            if (cost > 0) {
                await client.query('UPDATE spaces SET merits = merits + $1, merits_sold = merits_sold + $1 WHERE id = $2', [cost, spaceId]);
                await client.query(
                    'INSERT INTO transactions (user_id, merits, type, destination_space_id, details) VALUES ($1, $2, $3, $4, $5)',
                    [userId, -cost, 'ai_purchase', spaceId, JSON.stringify({ aiConfigId: aiId })]
                );
            }

            await client.query('INSERT INTO user_owned_ais (user_id, ai_config_id, requests_remaining) VALUES ($1, $2, $3)', [userId, aiId, requestsGranted]);

            await client.query('COMMIT');

            const updatedUser = await enrichUserWithPermissions(mapRowToCamelCase(updatedUserRes.rows[0]));
            return { updatedUser };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async claimFreeAi(userId, aiId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const aiRes = await client.query('SELECT purchase_cost, requests_granted_on_purchase FROM ai_configs WHERE id = $1', [aiId]);
            if (aiRes.rows.length === 0) throw new Error('AI not found.');
            const { purchase_cost: cost, requests_granted_on_purchase: requestsGranted } = aiRes.rows[0];

            if (cost > 0) throw new Error('This AI is not free.');

            const ownedRes = await client.query('SELECT 1 FROM user_owned_ais WHERE user_id = $1 AND ai_config_id = $2', [userId, aiId]);
            if (ownedRes.rows.length > 0) {
                // User already owns it, this is not an error, just do nothing.
                await client.query('COMMIT');
                const user = await userModel.findById(userId);
                return { updatedUser: user };
            }

            await client.query('INSERT INTO user_owned_ais (user_id, ai_config_id, requests_remaining) VALUES ($1, $2, $3)', [userId, aiId, requestsGranted || 0]);

            await client.query('COMMIT');
            const updatedUser = await userModel.findById(userId);
            return { updatedUser };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async findWithdrawalRequests() {
        const res = await pool.query(`
            SELECT wr.*, u.name as user_name, s.name as space_name, s.merits as current_space_merits, s.stripe_account_id
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            LEFT JOIN spaces s ON wr.space_id = s.id
            WHERE wr.status = 'pending'
            ORDER BY wr.created_at ASC
        `);
        return res.rows.map(mapRowToCamelCase);
    },

    async processWithdrawalRequest(requestId, action) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query(
                'UPDATE withdrawal_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND status = \'pending\' RETURNING *',
                [action, requestId]
            );
            const request = mapRowToCamelCase(res.rows[0]);
            if (!request) {
                throw new Error('Request not found or already processed.');
            }

            if (action === 'approved') {
                if (request.spaceId) {
                    // Deduct from space wallet
                    await client.query(
                        'UPDATE spaces SET merits = COALESCE(merits, 0) - $1 WHERE id = $2',
                        [request.amount, request.spaceId]
                    );
                    // Create transaction for space
                    await client.query(
                        'INSERT INTO transactions (user_id, merits, type, destination_space_id, details) VALUES ($1, $2, $3, $4, $5)',
                        [request.userId, -request.amount, 'withdrawal', request.spaceId, JSON.stringify({ note: 'Space withdrawal approved' })]
                    );
                } else {
                    // Legacy user-based withdrawal
                    await client.query(
                        'UPDATE users SET merits = COALESCE(merits, 0) - $1 WHERE id = $2',
                        [request.amount, request.userId]
                    );
                    await client.query(
                        'INSERT INTO transactions (user_id, merits, type) VALUES ($1, $2, $3)',
                        [request.userId, -request.amount, 'withdrawal']
                    );
                }
            }

            await client.query('COMMIT');
            return request;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async createWithdrawalRequest(userId, amount, spaceId = null) {
        const res = await pool.query(
            'INSERT INTO withdrawal_requests (user_id, amount, space_id) VALUES ($1, $2, $3) RETURNING *',
            [userId, amount, spaceId]
        );
        const newRequest = mapRowToCamelCase(res.rows[0]);
        // Also get user name for consistency
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
        newRequest.userName = userRes.rows[0]?.name;
        return newRequest;
    },
};