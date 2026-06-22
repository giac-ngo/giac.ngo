// server/models/dharmaTalk.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';
import { DharmaTalk } from '../types/index.js';

export const dharmaTalkModel = {
    async create(data: Record<string, unknown>): Promise<DharmaTalk> {
        const fields: string[] = [];
        const values: unknown[] = [];
        const placeholders: string[] = [];
        let index = 1;

        const allowedFields: Record<string, string> = {
            spaceId: 'space_id',
            title: 'title',
            titleEn: 'title_en',
            subtitle: 'subtitle',
            subtitleEn: 'subtitle_en',
            speaker: 'speaker',
            speakerAvatarUrl: 'speaker_avatar_url',
            url: 'url',
            urlEn: 'url_en',
            duration: 'duration',
            date: 'date',
            tags: 'tags',
            tagsEn: 'tags_en',
            status: 'status',
            statusEn: 'status_en',
            notifications: 'notifications',
            views: 'views',
            likes: 'likes',
            rating: 'rating',
            category: 'category',
            thumbnailUrl: 'thumbnail_url',
            episodeNumber: 'episode_number'
        };

        for (const [key, value] of Object.entries(data)) {
            const dbKey = allowedFields[key];
            if (dbKey) {
                fields.push(`"${dbKey}"`);
                values.push(value);
                placeholders.push(`$${index++}`);
            }
        }

        if (fields.length === 0) {
            throw new Error("No data provided for dharma talk creation.");
        }

        const query = `INSERT INTO dharma_talks (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const res = await pool.query(query, values);
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, data: Record<string, unknown>): Promise<DharmaTalk> {
        const { id: talkId, createdAt, updatedAt, spaceName, ...dataToUpdate } = data;

        const allowedFields: Record<string, string> = {
            spaceId: 'space_id',
            title: 'title',
            titleEn: 'title_en',
            subtitle: 'subtitle',
            subtitleEn: 'subtitle_en',
            speaker: 'speaker',
            speakerAvatarUrl: 'speaker_avatar_url',
            url: 'url',
            urlEn: 'url_en',
            duration: 'duration',
            date: 'date',
            tags: 'tags',
            tagsEn: 'tags_en',
            status: 'status',
            statusEn: 'status_en',
            notifications: 'notifications',
            views: 'views',
            likes: 'likes',
            rating: 'rating',
            category: 'category',
            thumbnailUrl: 'thumbnail_url',
            episodeNumber: 'episode_number'
        };

        const fieldsToUpdate = Object.keys(dataToUpdate).filter(key => allowedFields[key] !== undefined && dataToUpdate[key] !== undefined);

        if (fieldsToUpdate.length === 0) {
            const res = await pool.query('SELECT * FROM dharma_talks WHERE id = $1', [id]);
            return mapRowToCamelCase(res.rows[0]); // Nothing to update, return current state
        }

        const updateClauses = fieldsToUpdate.map((key, i) => {
            const dbKey = allowedFields[key];
            return `"${dbKey}" = $${i + 1}`;
        });
        const values = fieldsToUpdate.map(key => dataToUpdate[key]);

        const setClauses = updateClauses.join(', ');
        const query = `UPDATE dharma_talks SET ${setClauses}, updated_at = NOW() WHERE id = $${fieldsToUpdate.length + 1} RETURNING *`;
        const finalValues = [...values, id];

        const res = await pool.query(query, finalValues);
        return mapRowToCamelCase(res.rows[0]);
    },

    async delete(id: number | string): Promise<DharmaTalk> {
        const res = await pool.query('DELETE FROM dharma_talks WHERE id = $1 RETURNING *', [id]);
        return mapRowToCamelCase(res.rows[0]);
    },

    async incrementLikes(id: number | string): Promise<{ likes: number }> {
        const res = await pool.query('UPDATE dharma_talks SET likes = COALESCE(likes, 0) + 1 WHERE id = $1 RETURNING likes', [id]);
        return res.rows[0];
    },

    async incrementViews(id: number | string): Promise<{ views: number }> {
        const res = await pool.query('UPDATE dharma_talks SET views = COALESCE(views, 0) + 1 WHERE id = $1 RETURNING views', [id]);
        return res.rows[0];
    },
};