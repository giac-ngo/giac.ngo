// server/models/user.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';
import crypto from 'crypto';
import { cryptoService } from '../services/cryptoService.js';
import { User } from '../types/index.js';

// Helper function to enrich user with roles and permissions
export const enrichUserWithPermissions = async (user: Partial<User> & Record<string, unknown>): Promise<User | null> => {
    if (!user) return null;

    // apiKeys logic removed

    const [rolesRes, ownedAisRes, grantedAisRes, subRes, adminSpacesRes] = await Promise.all([
        pool.query(`
            SELECT r.* FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
        `, [user.id]),
        pool.query('SELECT ai_config_id, requests_remaining FROM user_owned_ais WHERE user_id = $1', [user.id]),
        pool.query('SELECT ai_config_id FROM ai_user_access WHERE user_id = $1', [user.id]),
        pool.query('SELECT daily_msg_used, daily_reset_date, daily_limit_bonus, expires_at FROM user_subscriptions WHERE user_id = $1', [user.id]),
        pool.query(`
            SELECT id FROM spaces WHERE user_id = $1
            UNION
            SELECT space_id AS id FROM space_admins WHERE user_id = $1
        `, [user.id]).catch(() => ({ rows: [] }))
    ]);

    const roles = rolesRes.rows.map(mapRowToCamelCase);
    const roleIds = roles.map((r: Record<string, unknown>) => r.id);
    const permissions = new Set(roles.flatMap((r: Record<string, unknown>) => r.permissions || []));
    const adminSpaceIds = adminSpacesRes.rows.map((r: Record<string, unknown>) => Number(r.id));
    const ownedAis = ownedAisRes.rows.map((r: Record<string, unknown>) => ({
        aiConfigId: r.ai_config_id,
        // @ts-ignore
        requestsRemaining: parseInt(r.requests_remaining, 10) || 0
    }));
    const grantedAiConfigIds = grantedAisRes.rows.map((r: Record<string, unknown>) => r.ai_config_id);

    const sub = subRes.rows[0];
    const resetDateObj = sub?.daily_reset_date ? new Date(sub.daily_reset_date) : null;
    const isToday = resetDateObj && resetDateObj.toDateString() === new Date().toDateString();
    const dailyMsgUsed = isToday ? (sub?.daily_msg_used || 0) : 0;
    
    const bonusActive = sub?.expires_at && new Date(sub.expires_at) > new Date();
    const dailyLimitBonus = bonusActive ? (sub?.daily_limit_bonus || 0) : 0;

    // @ts-ignore
    return { ...user, roleIds, permissions: Array.from(permissions), adminSpaceIds, ownedAis, grantedAiConfigIds, dailyMsgUsed, dailyLimitBonus } as User;
}

interface CachedUser {
    user: User;
    expiresAt: number;
}
const userCache = new Map<number, CachedUser>();

const updateRolesForUser = async (userId: number | string, roleIds: number[], client: { query: Function } = pool) => {
    const numericUserId = parseInt(String(userId), 10);
    if (isNaN(numericUserId)) return;
    userCache.delete(numericUserId);

    await client.query('DELETE FROM user_roles WHERE user_id = $1', [numericUserId]);
    if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        const validRoleIds = roleIds
            .map(id => typeof id === 'number' ? id : parseInt(String(id), 10))
            .filter(id => Number.isInteger(id) && id > 0);

        if (validRoleIds.length > 0) {
            const placeholders = validRoleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
            await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ${placeholders}`, [numericUserId, ...validRoleIds]);
        }
    }
};

export const userModel = {
    invalidateCache(userId?: number | string) {
        if (userId) {
            userCache.delete(Number(userId));
        } else {
            userCache.clear();
        }
    },

    async findByEmail(email: string): Promise<User | null> {
        const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        const user = res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
        if (!user) return null;
        return enrichUserWithPermissions(user);
    },

    async findById(id: number | string, forceFresh = false): Promise<User | null> {
        const numId = Number(id);
        if (!forceFresh && numId) {
            const cached = userCache.get(numId);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.user;
            }
        }
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const user = res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
        if (!user) {
            if (numId) userCache.delete(numId);
            return null;
        }
        const enriched = await enrichUserWithPermissions(user);
        if (enriched && numId) {
            userCache.set(numId, { user: enriched, expiresAt: Date.now() + 45000 });
        }
        return enriched;
    },

    async findByApiToken(token: string): Promise<User | null> {
        const res = await pool.query('SELECT * FROM users WHERE api_token = $1', [token]);
        const user = res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
        if (!user || !user.isActive) return null;
        return enrichUserWithPermissions(user);
    },

    async findByResetToken(token: string): Promise<User | null> {
        const res = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()', [token]);
        const user = res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
        if (!user) return null;
        return enrichUserWithPermissions(user);
    },

    async findUserIdsByEmails(emails: string[]): Promise<number[]> {
        if (!emails || emails.length === 0) return [];
        const res = await pool.query('SELECT id FROM users WHERE email = ANY($1::text[])', [emails]);
        // @ts-ignore
        return res.rows.map((r: Record<string, unknown>) => r.id);
    },

    async findAll(filters: { limit?: number, page?: number, search?: string } = {}): Promise<User[]> {
        const { limit = 15, page = 1, search = '' } = filters;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM users';
        const params = [];
        let paramIndex = 1;

        if (search) {
            query += ` WHERE name ILIKE $${paramIndex++} OR email ILIKE $${paramIndex++}`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY id ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const res = await pool.query(query, params);
        const users = res.rows.map(mapRowToCamelCase);
        const enrichedUsers = await Promise.all(users.map(enrichUserWithPermissions));
        return enrichedUsers.filter((u): u is User => u !== null);
    },

    async findSpaceOwners(): Promise<User[]> {
        const res = await pool.query(`
            SELECT DISTINCT u.* 
            FROM users u
            JOIN spaces s ON u.id = s.user_id
            ORDER BY u.name ASC
        `);
        const users = res.rows.map(mapRowToCamelCase);
        const enrichedUsers = await Promise.all(users.map(enrichUserWithPermissions));
        return enrichedUsers.filter((u): u is User => u !== null);
    },

    async create(userData: Partial<User> & Record<string, unknown>, spaceId?: number | string | null): Promise<User | null> {
        let { email, password, name, avatarUrl, roleIds, template } = userData as Record<string, unknown> & { email?: string, password?: string, name?: string, avatarUrl?: string, roleIds?: number[], template?: string };
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            if (!email || !password || !name) {
                throw new Error('Email, password, and name are required.');
            }
            const lowerEmail = email.toLowerCase();

            const N = 8192, r = 8, p = 1, keylen = 64;
            const salt = crypto.randomBytes(8).toString('hex');
            const derivedKey = await new Promise<Buffer>((resolve, reject) => {
                crypto.scrypt(password, salt, keylen, { N, r, p }, (err, derivedKey) => {
                    if (err) reject(err);
                    resolve(derivedKey as Buffer);
                });
            });
            const hashedPassword = `scrypt:${N}:${r}:${p}$${salt}$${derivedKey.toString('hex')}`;
            const apiToken = crypto.randomBytes(24).toString('hex');

            // apiKeys encryption removed

            const res = await client.query(
                'INSERT INTO users (email, password, name, avatar_url, merits, is_active, template, api_token) VALUES ($1, $2, $3, $4, 0, true, $5, $6) RETURNING *',
                [lowerEmail, hashedPassword, name, avatarUrl || `https://i.pravatar.cc/150?u=${lowerEmail}`, template, apiToken]
            );
            const newUser = mapRowToCamelCase(res.rows[0]);

            if (roleIds && roleIds.length > 0) {
                await updateRolesForUser(newUser.id, roleIds, client);
            }

            // Gán Space nguyên tử trong cùng transaction (nếu có chỉ định spaceId)
            if (spaceId !== undefined && spaceId !== null) {
                const numericSpaceId = Number(spaceId);
                if (!Number.isInteger(numericSpaceId) || numericSpaceId <= 0) {
                    throw new Error('Invalid spaceId for new user membership.');
                }
                const spaceCheck = await client.query('SELECT 1 FROM spaces WHERE id = $1 LIMIT 1', [numericSpaceId]);
                if ((spaceCheck.rowCount ?? 0) === 0) {
                    throw new Error(`Space with id ${numericSpaceId} does not exist.`);
                }
                await client.query(
                    `INSERT INTO space_members (space_id, user_id)
                     VALUES ($1, $2)
                     ON CONFLICT (space_id, user_id) DO NOTHING`,
                    [numericSpaceId, newUser.id]
                );
            }

            await client.query('COMMIT');
            return enrichUserWithPermissions(newUser);
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async update(id: number | string, userData: Partial<User> & Record<string, unknown>): Promise<User | null> {
        const { roleIds, password, ...fieldsToUpdate } = userData as Record<string, unknown> & { roleIds?: number[], password?: string, [key: string]: unknown };
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            if (fieldsToUpdate.subscriptionPlanId !== undefined) {
                const currentUserRes = await client.query('SELECT subscription_plan_id FROM users WHERE id = $1', [id]);
                const currentPlanId = currentUserRes.rows[0]?.subscription_plan_id;
                if (fieldsToUpdate.subscriptionPlanId != currentPlanId) {
                    if (fieldsToUpdate.subscriptionPlanId == null) {
                        fieldsToUpdate.requestsRemaining = 0;
                    } else {
                        const planRes = await client.query('SELECT request_limit FROM pricing_plans WHERE id = $1', [fieldsToUpdate.subscriptionPlanId]);
                        if (planRes.rows[0]) {
                            fieldsToUpdate.requestsRemaining = planRes.rows[0].request_limit;
                        } else {
                            throw new Error(`Pricing plan with ID ${fieldsToUpdate.subscriptionPlanId} not found.`);
                        }
                    }
                }
            }

            if (password) {
                const N = 8192, r = 8, p = 1, keylen = 64;
                const salt = crypto.randomBytes(8).toString('hex');
                const derivedKey = await new Promise<Buffer>((resolve, reject) => {
                    crypto.scrypt(password, salt, keylen, { N, r, p }, (err, key) => {
                        if (err) reject(err);
                        resolve(key as Buffer);
                    });
                });
                fieldsToUpdate.password = `scrypt:${N}:${r}:${p}$${salt}$${derivedKey.toString('hex')}`;
            }

            // apiKeys encryption removed

            // Whitelist: chỉ cho phép các field an toàn thực sự tồn tại trong bảng users
            const ALLOWED_FIELDS = new Set([
                'email', 'name', 'avatarUrl', 'bio', 'isActive', 'merits',
                'subscriptionPlanId', 'template', 'requestsRemaining',
                'stripeCustomerId', 'stripeAccountId',
                'weaviateId', 'isAdmin', 'isGlobalAdmin', 'password'
            ]);
            const filtered: Record<string, unknown> = {};
            for (const key of Object.keys(fieldsToUpdate)) {
                if (ALLOWED_FIELDS.has(key)) {
                    filtered[key] = fieldsToUpdate[key];
                }
            }

            if (Object.keys(filtered).length > 0) {
                const setClauses = Object.keys(filtered).map((key, i) => {
                    const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    return `${dbKey} = $${i + 1}`;
                }).join(', ');
                const values = Object.values(filtered);
                await client.query(`UPDATE users SET ${setClauses} WHERE id = $${values.length + 1}`, [...values, id]);
            }

            if (roleIds !== undefined) {
                await updateRolesForUser(id, roleIds, client);
            }

            const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            await client.query('COMMIT');

            if (res.rows.length === 0) throw new Error('User not found after update.');
            userCache.delete(Number(id));
            const updatedUser = mapRowToCamelCase(res.rows[0]);
            return enrichUserWithPermissions(updatedUser);

        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async delete(id: number | string): Promise<void> {
        userCache.delete(Number(id));
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
    },

    async regenerateApiToken(userId: number | string): Promise<User | null> {
        userCache.delete(Number(userId));
        const apiToken = crypto.randomBytes(24).toString('hex');
        const res = await pool.query('UPDATE users SET api_token = $1 WHERE id = $2 RETURNING *', [apiToken, userId]);
        if (res.rows.length === 0) throw new Error('User not found.');
        return enrichUserWithPermissions(mapRowToCamelCase(res.rows[0]));
    },

    async saveResetToken(userId: number | string, token: string): Promise<void> {
        userCache.delete(Number(userId));
        const expires = new Date(Date.now() + 3600000); // 1 hour expiry
        await pool.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, userId]);
    },

    async deductRequest(userId: number | string): Promise<User | null> {
        userCache.delete(Number(userId));
        const res = await pool.query(
            'UPDATE users SET requests_remaining = requests_remaining - 1 WHERE id = $1 AND requests_remaining > 0 RETURNING *',
            [userId]
        );

        if (res.rows.length > 0) {
            return enrichUserWithPermissions(mapRowToCamelCase(res.rows[0]));
        } else {
            return this.findById(userId);
        }
    },
};
