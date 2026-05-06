// server/models/spaceMember.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';

export interface SpaceMember {
    spaceId: number;
    userId: number;
    joinedAt: Date | string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    slug?: string;
    imageUrl?: string;
    customDomain?: string;
    [key: string]: unknown;
}

export const spaceMemberModel = {
    async add(spaceId: number | string, userId: number | string): Promise<SpaceMember | null> {
        const res = await pool.query(
            `INSERT INTO space_members (space_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (space_id, user_id) DO NOTHING
             RETURNING *`,
            [spaceId, userId]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async remove(spaceId: number | string, userId: number | string): Promise<SpaceMember | null> {
        const res = await pool.query(
            'DELETE FROM space_members WHERE space_id = $1 AND user_id = $2 RETURNING *',
            [spaceId, userId]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async isMember(spaceId: number | string, userId: number | string): Promise<boolean> {
        const res = await pool.query(
            'SELECT 1 FROM space_members WHERE space_id = $1 AND user_id = $2',
            [spaceId, userId]
        );
        return res.rowCount !== null && res.rowCount > 0;
    },

    async getMembersBySpace(spaceId: number | string): Promise<SpaceMember[]> {
        const res = await pool.query(
            `SELECT sm.*, u.name, u.email, u.avatar_url
             FROM space_members sm
             JOIN users u ON sm.user_id = u.id
             WHERE sm.space_id = $1
             ORDER BY sm.joined_at DESC`,
            [spaceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async countBySpace(spaceId: number | string): Promise<number> {
        const res = await pool.query(
            'SELECT COUNT(*) FROM space_members WHERE space_id = $1',
            [spaceId]
        );
        return parseInt(res.rows[0].count, 10);
    },

    async getSpacesByUser(userId: number | string): Promise<SpaceMember[]> {
        const res = await pool.query(
            `SELECT sm.*, s.name, s.slug, s.image_url, s.custom_domain
             FROM space_members sm
             JOIN spaces s ON sm.space_id = s.id
             WHERE sm.user_id = $1
             ORDER BY sm.joined_at DESC`,
            [userId]
        );
        return res.rows.map(mapRowToCamelCase);
    }
};
