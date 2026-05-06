// server/models/koii.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface KoiiTask {
    id: number;
    aiConfigId: number;
    status: string;
    errorMessage?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    [key: string]: unknown;
}

export const koiiModel = {
    async findLatest(aiConfigId: number | string): Promise<KoiiTask | null> {
        const res = await pool.query('SELECT * FROM koii_tasks WHERE ai_config_id = $1 ORDER BY created_at DESC LIMIT 1', [aiConfigId]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async create(aiConfigId: number | string): Promise<KoiiTask> {
        const res = await pool.query('INSERT INTO koii_tasks (ai_config_id, status) VALUES ($1, $2) RETURNING *', [aiConfigId, 'pending']);
        return mapRowToCamelCase(res.rows[0]);
    },
    
    async updateStatusByAiId(aiConfigId: number | string, status: string, errorMessage: string | null = null): Promise<KoiiTask | null> {
        const res = await pool.query(
            'UPDATE koii_tasks SET status = $1, error_message = $2, updated_at = NOW() WHERE id = (SELECT id FROM koii_tasks WHERE ai_config_id = $3 ORDER BY created_at DESC LIMIT 1) RETURNING *',
            [status, errorMessage, aiConfigId]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },
};