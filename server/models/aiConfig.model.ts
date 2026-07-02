// server/models/aiConfig.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';
import { User, AIConfig } from '../types/index.js';

const AI_CONFIG_DETAILS_QUERY = `
    SELECT ac.id, ac.space_id, ac.name, ac.name_en, ac.description, ac.description_en, 
           ac.avatar_url, ac.model_type, ac.model_name, ac.training_content, 
           ac.suggested_questions, ac.suggested_questions_en, ac.tags, ac.is_public, 
           ac.is_trial_allowed, ac.requires_subscription, ac.is_contact_for_access,
           ac.max_output_tokens, ac.thinking_budget, ac.purchase_cost, ac.old_purchase_cost,
           ac.is_on_sale, ac.requests_granted_on_purchase, ac.views, ac.likes, ac.rating,
           ac.tts_provider, ac.tts_model, ac.tts_voice, ac.tts_style, ac.tts_temperature,
           ac.embedding_provider, ac.embedding_model,
           ac.created_at, ac.updated_at,
           s.user_id as owner_id,
           ac.base_daily_limit
    FROM ai_configs ac
    LEFT JOIN spaces s ON ac.space_id = s.id
`;

export const aiConfigModel = {
    async findVisibleForUser(user?: User | null, spaceId?: number | string | null): Promise<AIConfig[]> {
        let query = AI_CONFIG_DETAILS_QUERY;
        const params = [];
        let whereClauses = [];

        if (user && user.id) {
            // A logged-in user can see public AIs, their own AIs, and AIs they've purchased.
            const spaceRes = await pool.query('SELECT id FROM spaces WHERE user_id = $1', [user.id]);
            const userSpaceIds = spaceRes.rows.map((r: Record<string, unknown>) => r.id);

            let userClause = 'ac.is_public = true';
            if (userSpaceIds.length > 0) {
                const spacePlaceholders = userSpaceIds.map((_, i) => `$${params.length + i + 1}`).join(',');
                userClause += ` OR ac.space_id IN (${spacePlaceholders})`;
                params.push(...userSpaceIds);
            }
            whereClauses.push(`(${userClause})`);

        } else {
            // Guests only see public AIs. The card on the frontend will show the price.
            whereClauses.push("ac.is_public = true");
        }

        if (spaceId !== undefined && spaceId !== null) {
            whereClauses.push(`ac.space_id = $${params.length + 1}`);
            params.push(spaceId);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ' ORDER BY ac.name ASC';
        const res = await pool.query(query, params);
        return res.rows.map(mapRowToCamelCase);
    },

    async findManageableForUser(user: User): Promise<AIConfig[]> {
        if (!user.permissions) return [];

        if (user.permissions.includes('roles')) { // Super admin can manage all AIs
            const res = await pool.query(`${AI_CONFIG_DETAILS_QUERY} ORDER BY ac.name ASC`);
            return res.rows.map(mapRowToCamelCase);
        }
        if (user.permissions.includes('ai')) { // Content Manager can manage AIs in their own space(s)
            const spaceRes = await pool.query(
                `SELECT DISTINCT id FROM (
                    SELECT id FROM spaces WHERE user_id = $1
                    UNION
                    SELECT space_id AS id FROM space_members WHERE user_id = $1
                ) AS combined`, 
                [user.id]
            );
            if (spaceRes.rows.length === 0) {
                return []; // This user manages no spaces, so no AIs.
            }
            const spaceIds = spaceRes.rows.map((r: Record<string, unknown>) => r.id);
            const res = await pool.query(`${AI_CONFIG_DETAILS_QUERY} WHERE ac.space_id = ANY($1::int[]) ORDER BY ac.name ASC`, [spaceIds]);
            return res.rows.map(mapRowToCamelCase);
        }
        return [];
    },

    async findById(id: number | string): Promise<AIConfig | null> {
        const res = await pool.query(`${AI_CONFIG_DETAILS_QUERY} WHERE ac.id = $1`, [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findBySpaceId(spaceId: number | string): Promise<AIConfig[]> {
        const res = await pool.query(`${AI_CONFIG_DETAILS_QUERY} WHERE ac.space_id = $1 AND ac.is_public = true ORDER BY ac.name ASC`, [spaceId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async create(configData: Record<string, unknown>): Promise<AIConfig> {
        const { spaceId, name, nameEn, description, descriptionEn, avatarUrl, modelType, modelName, embeddingProvider, embeddingModel, trainingContent, suggestedQuestions, suggestedQuestionsEn, tags, isPublic, isTrialAllowed, requiresSubscription, isContactForAccess, maxOutputTokens, thinkingBudget, views, likes, rating, purchaseCost, oldPurchaseCost, isOnSale, requestsGrantedOnPurchase, ttsProvider, ttsModel, ttsVoice, ttsStyle, ttsTemperature } = configData;
        const query = `INSERT INTO ai_configs (space_id, name, name_en, description, description_en, avatar_url, model_type, model_name, embedding_provider, embedding_model, training_content, suggested_questions, suggested_questions_en, tags, is_public, is_trial_allowed, requires_subscription, is_contact_for_access, max_output_tokens, thinking_budget, views, likes, rating, purchase_cost, old_purchase_cost, is_on_sale, requests_granted_on_purchase, tts_provider, tts_model, tts_voice, tts_style, tts_temperature) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32) RETURNING *`;
        const values = [spaceId, name, nameEn, description, descriptionEn, avatarUrl, modelType, modelName, embeddingProvider ?? null, embeddingModel ?? null, trainingContent, suggestedQuestions, suggestedQuestionsEn, tags, isPublic, isTrialAllowed, requiresSubscription, isContactForAccess, maxOutputTokens, thinkingBudget, views, likes, rating, purchaseCost, oldPurchaseCost, isOnSale, requestsGrantedOnPurchase, ttsProvider, ttsModel, ttsVoice, ttsStyle, ttsTemperature];

        const res = await pool.query(query, values);
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, configData: Record<string, unknown>): Promise<AIConfig | null> {
        const { ownerId, id: configId, createdAt, updatedAt, ...dataToUpdate } = configData;

        const allowedFields: Record<string, string> = {
            spaceId: 'space_id',
            name: 'name',
            nameEn: 'name_en',
            description: 'description',
            descriptionEn: 'description_en',
            avatarUrl: 'avatar_url',
            modelType: 'model_type',
            modelName: 'model_name',
            embeddingProvider: 'embedding_provider',
            embeddingModel: 'embedding_model',
            trainingContent: 'training_content',
            suggestedQuestions: 'suggested_questions',
            suggestedQuestionsEn: 'suggested_questions_en',
            tags: 'tags',
            isPublic: 'is_public',
            isTrialAllowed: 'is_trial_allowed',
            requiresSubscription: 'requires_subscription',
            isContactForAccess: 'is_contact_for_access',
            maxOutputTokens: 'max_output_tokens',
            thinkingBudget: 'thinking_budget',
            purchaseCost: 'purchase_cost',
            oldPurchaseCost: 'old_purchase_cost',
            isOnSale: 'is_on_sale',
            requestsGrantedOnPurchase: 'requests_granted_on_purchase',
            baseDailyLimit: 'base_daily_limit',
            views: 'views',
            likes: 'likes',
            rating: 'rating',
            ttsProvider: 'tts_provider',
            ttsModel: 'tts_model',
            ttsVoice: 'tts_voice',
            ttsStyle: 'tts_style',
            ttsTemperature: 'tts_temperature'
        };

        const fieldsToUpdate = Object.keys(dataToUpdate).filter(key => allowedFields[key] !== undefined);

        if (fieldsToUpdate.length === 0) {
            return this.findById(id); // Nothing to update
        }

        const updateClauses = fieldsToUpdate.map((key, i) => {
            const dbKey = allowedFields[key];
            return `"${dbKey}" = $${i + 1}`;
        });
        const values = fieldsToUpdate.map(key => dataToUpdate[key]);

        const setClauses = updateClauses.join(', ');

        const query = `UPDATE ai_configs SET ${setClauses}, updated_at = NOW() WHERE id = $${fieldsToUpdate.length + 1} RETURNING *`;
        const finalValues = [...values, id];

        const res = await pool.query(query, finalValues);

        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async delete(id: number | string): Promise<void> {
        await pool.query('DELETE FROM ai_configs WHERE id = $1', [id]);
    },

    async getAccessList(aiConfigId: number | string): Promise<any[]> {
        const res = await pool.query(`
            SELECT u.id, u.name, u.email, u.avatar_url 
            FROM ai_user_access aua
            JOIN users u ON aua.user_id = u.id
            WHERE aua.ai_config_id = $1
            ORDER BY u.name
        `, [aiConfigId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async setAccessList(aiConfigId: number | string, userIds: (number | string)[]): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM ai_user_access WHERE ai_config_id = $1', [aiConfigId]);
            if (userIds && userIds.length > 0) {
                const values = userIds.map(userId => `(${aiConfigId}, ${userId})`).join(',');
                await client.query(`INSERT INTO ai_user_access (ai_config_id, user_id) VALUES ${values}`);
            }
            await client.query('COMMIT');
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async checkUserAccess(aiConfigId: number | string, userId: number | string): Promise<boolean> {
        const res = await pool.query('SELECT 1 FROM ai_user_access WHERE ai_config_id = $1 AND user_id = $2', [aiConfigId, userId]);
        return res.rows.length > 0;
    },

    async getUserRequestCount(userId: number | string, aiConfigId: number | string): Promise<number | null> {
        const res = await pool.query(
            'SELECT requests_remaining FROM user_owned_ais WHERE user_id = $1 AND ai_config_id = $2',
            [userId, aiConfigId]
        );
        return res.rows[0] ? res.rows[0].requests_remaining : null;
    },

    async decrementUserRequestCount(userId: number | string, aiConfigId: number | string): Promise<number> {
        const res = await pool.query(
            `UPDATE user_owned_ais 
             SET requests_remaining = requests_remaining - 1 
             WHERE user_id = $1 AND ai_config_id = $2 AND requests_remaining > 0
             RETURNING requests_remaining`,
            [userId, aiConfigId]
        );
        return res.rows.length > 0 ? res.rows[0].requests_remaining : 0;
    }
};
