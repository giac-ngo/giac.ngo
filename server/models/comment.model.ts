// server/models/comment.model.ts
import { Request, Response, NextFunction } from 'express';
import { pool, mapRowToCamelCase } from '../db.js';
import { Comment } from '../types/index.js';

export const commentModel = {
    async findApproved(commentType: string, sourceId: number | string): Promise<Comment[]> {
        const res = await pool.query(
            `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar_url 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.comment_type = $1 AND c.source_id = $2 AND c.status = 'approved' AND c.parent_id IS NULL
             ORDER BY c.created_at ASC`,
            [commentType, sourceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async create(userId: number | string, commentType: string, sourceId: number | string, sourceTitle: string, content: string, parentId: number | string | null = null): Promise<Comment> {
        const res = await pool.query(
            'INSERT INTO comments (user_id, comment_type, source_id, source_title, content, parent_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [userId, commentType, sourceId, sourceTitle, content, parentId, 'pending']
        );
        const newComment = mapRowToCamelCase(res.rows[0]);
        const userRes = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [userId]);
        return {
            ...newComment,
            userName: userRes.rows[0]?.name,
            userAvatarUrl: userRes.rows[0]?.avatar_url
        };
    },
    
    async findAll(filters: { status?: string, type?: string, spaceId?: number | string, spaceIds?: number[] } = {}): Promise<Comment[]> {
        const { status, type, spaceId, spaceIds } = filters;
        let query = `
            SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
        `;
        const params: any[] = [];
        const whereClauses: string[] = [];
        let paramIndex = 1;

        if (spaceId) {
            query += ` LEFT JOIN documents d ON c.comment_type = 'document' AND CAST(c.source_id AS integer) = d.id`;
            whereClauses.push(`(c.comment_type = 'document' AND d.space_id = $${paramIndex++})`);
            params.push(Number(spaceId));
        } else if (spaceIds && spaceIds.length > 0) {
            query += ` LEFT JOIN documents d ON c.comment_type = 'document' AND CAST(c.source_id AS integer) = d.id`;
            whereClauses.push(`(c.comment_type = 'document' AND d.space_id = ANY($${paramIndex++}::int[]))`);
            params.push(spaceIds);
        }

        if (status) {
            whereClauses.push(`c.status = $${paramIndex++}`);
            params.push(status);
        }
        if (type) {
            whereClauses.push(`c.comment_type = $${paramIndex++}`);
            params.push(type);
        }
        
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        query += ' ORDER BY c.created_at DESC LIMIT 100';

        const res = await pool.query(query, params);
        return res.rows.map(mapRowToCamelCase);
    },

    async getCommentSpaceId(commentId: number | string): Promise<number | null> {
        const res = await pool.query(
            `SELECT d.space_id
             FROM comments c
             LEFT JOIN documents d ON c.comment_type = 'document' AND CAST(c.source_id AS integer) = d.id
             WHERE c.id = $1`,
            [commentId]
        );
        return res.rows[0]?.space_id != null ? Number(res.rows[0].space_id) : null;
    },

    async updateStatus(commentId: number | string, status: string): Promise<Comment> {
        const res = await pool.query(
            'UPDATE comments SET status = $1 WHERE id = $2 RETURNING *',
            [status, commentId]
        );
        const updatedComment = mapRowToCamelCase(res.rows[0]);
        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [updatedComment.userId]);
        return { ...updatedComment, userName: userRes.rows[0]?.name };
    },

    async delete(commentId: number | string): Promise<void> {
        await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    },
};