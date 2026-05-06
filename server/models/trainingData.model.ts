// server/models/trainingData.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface TrainingData {
    id: number;
    aiConfigId: number;
    type: string;
    question?: string;
    answer?: string;
    thought?: string;
    fileUrl?: string;
    fileName?: string;
    summary?: string;
    indexedProviders?: string[];
    createdAt?: Date | string;
    lastExportedAt?: Date | string;
    documentId?: number;
    documentName?: string;
    aiName?: string;
    [key: string]: unknown;
}

export const trainingDataModel = {
    async findByAiId(aiId: number | string): Promise<TrainingData[]> {
        const res = await pool.query(`
            SELECT 
                id, ai_config_id, type, question, answer, thought, file_url, file_name, summary, 
                COALESCE(indexed_providers, '{}') as indexed_providers, 
                created_at, last_exported_at,
                NULL AS document_id, NULL AS document_name
            FROM training_data_sources 
            WHERE ai_config_id = $1
            
            UNION ALL
            
            SELECT 
                -acd.document_id AS id,
                acd.ai_config_id,
                'document' AS type,
                NULL AS question, NULL AS answer, NULL as thought, NULL as file_url, NULL as file_name,
                d.summary,
                ARRAY['gpt', 'gemini'] AS indexed_providers, -- Assuming documents are conceptually indexed for all for UI simplicity, or handle separately
                d.created_at,
                NULL as last_exported_at,
                d.id AS document_id,
                d.title AS document_name
            FROM ai_config_documents acd
            JOIN documents d ON acd.document_id = d.id
            WHERE acd.ai_config_id = $1
            
            ORDER BY created_at DESC
        `, [aiId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async findByAiIdForChat(aiId: number | string): Promise<TrainingData[]> {
        const res = await pool.query(`
            SELECT type, question, answer, file_name, file_url, summary
            FROM training_data_sources
            WHERE ai_config_id = $1
            
            UNION ALL
            
            SELECT 
                'document' AS type,
                NULL AS question,
                d.content AS answer,
                d.title AS file_name,
                NULL as file_url,
                d.summary
            FROM ai_config_documents acd
            JOIN documents d ON acd.document_id = d.id
            WHERE acd.ai_config_id = $1
        `, [aiId]);
        return res.rows.map(mapRowToCamelCase);
    },

    async create(data: Record<string, unknown>): Promise<TrainingData> {
        const fields: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let index = 1;

        const allowedFields: Record<string, string> = {
            aiConfigId: 'ai_config_id',
            type: 'type',
            question: 'question',
            answer: 'answer',
            thought: 'thought',
            fileName: 'file_name',
            fileUrl: 'file_url',
            summary: 'summary',
            indexedProviders: 'indexed_providers'
        };

        for (const [key, value] of Object.entries(data)) {
            const dbKey = allowedFields[key];
            if (dbKey) {
                fields.push(dbKey);
                values.push(value);
                placeholders.push(`$${index++}`);
            }
        }

        if (fields.length === 0) {
            throw new Error("No data provided for training data source creation.");
        }

        // Initialize indexed_providers as empty array if not provided
        if (!data.indexedProviders) {
            fields.push('indexed_providers');
            values.push([]);
            placeholders.push(`$${index++}`);
        }

        const query = `INSERT INTO training_data_sources (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const res = await pool.query(query, values);
        return mapRowToCamelCase(res.rows[0]);
    },

    async updateSummary(id: number | string, summary: string): Promise<TrainingData | null> {
        const res = await pool.query(
            'UPDATE training_data_sources SET summary = $1 WHERE id = $2 RETURNING *',
            [summary, id]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async addIndexedProvider(sourceId: number | string, provider: string): Promise<void> {
        // Appends provider to the array if it's not already there. 
        // COALESCE(indexed_providers, '{}') ensures we append to an empty array instead of NULL.
        await pool.query(`
            UPDATE training_data_sources 
            SET indexed_providers = array_append(COALESCE(indexed_providers, '{}'), $1)
            WHERE id = $2 AND NOT ($1 = ANY(COALESCE(indexed_providers, '{}')))
        `, [provider, sourceId]);
    },

    async delete(id: number | string): Promise<TrainingData | null> {
        const res = await pool.query('DELETE FROM training_data_sources WHERE id = $1 RETURNING *', [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async deleteByContent(aiConfigId: number | string, question: string, answer: string): Promise<TrainingData | null> {
        const res = await pool.query(
            'DELETE FROM training_data_sources WHERE ai_config_id = $1 AND question = $2 AND answer = $3 RETURNING *',
            [aiConfigId, question, answer]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findAllQaData(userId: number | string | null = null): Promise<TrainingData[]> {
        let query = `
            SELECT 
                tds.*, 
                ac.name as ai_name 
            FROM training_data_sources tds
            JOIN ai_configs ac ON tds.ai_config_id = ac.id
            LEFT JOIN spaces s ON ac.space_id = s.id
            WHERE tds.type = 'qa'
        `;

        const params: unknown[] = [];

        // Filter by owner if userId is provided
        if (userId) {
            query += ` AND s.user_id = $1`;
            params.push(userId);
        }

        query += ` ORDER BY ac.name, tds.created_at`;

        const res = await pool.query(query, params);
        return res.rows.map(mapRowToCamelCase);
    },

    async markAsExported(sourceIds: (number | string)[]): Promise<any[] | void> {
        if (!sourceIds || sourceIds.length === 0) return;
        const res = await pool.query(
            'UPDATE training_data_sources SET last_exported_at = NOW() WHERE id = ANY($1::int[]) RETURNING id',
            [sourceIds]
        );
        return res.rows;
    },
};
