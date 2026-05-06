// server/models/meditation.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface MeditationSession {
    id: number;
    spaceId: number;
    title: string;
    description?: string;
    audioUrl?: string;
    duration?: number;
    spaceName?: string;
    [key: string]: unknown;
}

export const meditationModel = {
    async create(data: Record<string, unknown>): Promise<MeditationSession> {
        const fields: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let index = 1;

        const allowedFields: Record<string, string> = {
            spaceId: 'space_id',
            title: 'title',
            titleEn: 'title_en',
            description: 'description',
            descriptionEn: 'description_en',
            audioUrl: 'audio_url',
            audioUrlEn: 'audio_url_en',
            endAudioUrl: 'end_audio_url',
            endAudioUrlEn: 'end_audio_url_en',
            duration: 'duration'
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
            throw new Error("No data provided for meditation session creation.");
        }

        const query = `INSERT INTO meditation_sessions (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const res = await pool.query(query, values);
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, data: Record<string, unknown>): Promise<MeditationSession | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let index = 1;

        const allowedFields: Record<string, string> = {
            spaceId: 'space_id',
            title: 'title',
            titleEn: 'title_en',
            description: 'description',
            descriptionEn: 'description_en',
            audioUrl: 'audio_url',
            audioUrlEn: 'audio_url_en',
            endAudioUrl: 'end_audio_url',
            endAudioUrlEn: 'end_audio_url_en',
            duration: 'duration'
        };

        for (const [key, value] of Object.entries(data)) {
            const dbKey = allowedFields[key];
            if (dbKey && value !== undefined) {
                fields.push(`${dbKey} = $${index++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return this.findBySpaceId(id); // Or findById if id is meditation ID

        values.push(id);
        const query = `UPDATE meditation_sessions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${index} RETURNING *`;

        const res = await pool.query(query, values);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async delete(id: number | string): Promise<MeditationSession | null> {
        const res = await pool.query('DELETE FROM meditation_sessions WHERE id = $1 RETURNING *', [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findBySpaceId(spaceId: number | string): Promise<MeditationSession | null> {
        const res = await pool.query('SELECT * FROM meditation_sessions WHERE space_id = $1', [spaceId]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findAll(spaceIds: (number | string)[] = []): Promise<MeditationSession[]> {
        let query = `
            SELECT m.*, s.name as space_name 
            FROM meditation_sessions m 
            LEFT JOIN spaces s ON m.space_id = s.id 
        `;
        const values: unknown[] = [];

        if (spaceIds && spaceIds.length > 0) {
            query += ' WHERE m.space_id = ANY($1)';
            values.push(spaceIds);
        }

        query += ' ORDER BY m.created_at DESC';

        const res = await pool.query(query, values);
        return res.rows.map(mapRowToCamelCase);
    }
};
