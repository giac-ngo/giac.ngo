// server/models/cmsArticle.model.ts
import { pool, mapRowToCamelCase } from '../db.js';

// ═══════════════════════════════════════════════════════════
// Social Connections
// ═══════════════════════════════════════════════════════════

export const cmsSocialConnectionModel = {
    async findBySpaceId(spaceId: number | string): Promise<any[]> {
        const res = await pool.query(
            `SELECT * FROM cms_social_connections WHERE space_id = $1 ORDER BY platform ASC`,
            [spaceId]
        );
        return res.rows.map(mapRowToCamelCase);
    },

    async findById(id: number | string): Promise<any | null> {
        const res = await pool.query(`SELECT * FROM cms_social_connections WHERE id = $1`, [id]);
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async upsert(data: {
        spaceId: number | string;
        platform: string;
        pageName?: string;
        accessToken: string;
        connectedBy?: number;
    }): Promise<any> {
        const res = await pool.query(
            `INSERT INTO cms_social_connections (space_id, platform, page_name, access_token, connected_by, connected_at, is_active)
             VALUES ($1, $2, $3, $4, $5, NOW(), true)
             ON CONFLICT (space_id, platform)
             DO UPDATE SET access_token = EXCLUDED.access_token,
                           page_name = EXCLUDED.page_name,
                           connected_by = EXCLUDED.connected_by,
                           connected_at = NOW(),
                           is_active = true
             RETURNING *`,
            [data.spaceId, data.platform, data.pageName || null, data.accessToken, data.connectedBy || null]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async delete(id: number | string): Promise<void> {
        await pool.query(`DELETE FROM cms_social_connections WHERE id = $1`, [id]);
    },

    async deactivate(id: number | string): Promise<void> {
        await pool.query(`UPDATE cms_social_connections SET is_active = false WHERE id = $1`, [id]);
    }
};

// ═══════════════════════════════════════════════════════════
// Articles
// ═══════════════════════════════════════════════════════════

export interface ArticleFilterOptions {
    status?: string;
    search?: string;
    platform?: string;
    platformStatus?: string;
    page?: number;
    limit?: number;
}

export const cmsArticleModel = {
    async findBySpaceId(spaceId: number | string, filters: ArticleFilterOptions = {}): Promise<{ data: any[]; total: number }> {
        const { status, search, platform, platformStatus, page = 1, limit = 20 } = filters;
        const params: unknown[] = [spaceId];
        const whereClauses: string[] = ['a.space_id = $1'];
        let paramIndex = 2;

        if (status) {
            if (status === 'pending') {
                whereClauses.push(`a.status IN ('publishing', 'scheduled')`);
            } else {
                whereClauses.push(`a.status = $${paramIndex++}`);
                params.push(status);
            }
        } else {
            whereClauses.push(`a.status != 'deleted'`);
        }
        if (platform) {
            whereClauses.push(`a.target_platforms::text LIKE $${paramIndex++}`);
            params.push(`%"${platform}"%`);
            if (platformStatus && platformStatus !== 'all') {
                whereClauses.push(`(SELECT status FROM cms_publish_logs l WHERE l.article_id = a.id AND l.platform = $${paramIndex++} ORDER BY l.created_at DESC LIMIT 1) = $${paramIndex++}`);
                params.push(platform);
                params.push(platformStatus);
            }
        }
        if (search) {
            whereClauses.push(`(a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereClauses.join(' AND ');

        const countRes = await pool.query(
            `SELECT COUNT(*) FROM cms_articles a WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countRes.rows[0].count, 10);

        const dataParams = [...params, limit, (page - 1) * limit];
        const dataRes = await pool.query(
            `SELECT a.*, u.name as user_name, u.avatar_url as user_avatar_url,
                    d.title as source_document_title
             FROM cms_articles a
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN documents d ON a.source_document_id = d.id
             WHERE ${whereClause}
             ORDER BY a.updated_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            dataParams
        );

        const data = dataRes.rows.map(mapRowToCamelCase);
        
        if (data.length > 0) {
            const articleIds = data.map((a: any) => a.id);
            const logsRes = await pool.query(
                `SELECT * FROM cms_publish_logs WHERE article_id = ANY($1) ORDER BY created_at DESC`,
                [articleIds]
            );
            const logs = logsRes.rows.map(mapRowToCamelCase);
            for (const article of data) {
                article.publishLogs = logs.filter((l: any) => l.articleId === article.id);
            }
        }

        return {
            data,
            total
        };
    },

    async getCountsByStatus(spaceId: number | string): Promise<Record<string, number>> {
        const res = await pool.query(
            `SELECT status, COUNT(*) as count FROM cms_articles WHERE space_id = $1 GROUP BY status`,
            [spaceId]
        );
        const counts: Record<string, number> = {};
        for (const row of res.rows) {
            counts[row.status] = parseInt(row.count, 10);
        }
        return counts;
    },

    async findById(id: number | string): Promise<any | null> {
        const res = await pool.query(
            `SELECT a.*, u.name as user_name, u.avatar_url as user_avatar_url,
                    d.title as source_document_title
             FROM cms_articles a
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN documents d ON a.source_document_id = d.id
             WHERE a.id = $1`,
            [id]
        );
        if (!res.rows[0]) return null;

        const article = mapRowToCamelCase(res.rows[0]);

        // Fetch publish logs
        const logsRes = await pool.query(
            `SELECT * FROM cms_publish_logs WHERE article_id = $1 ORDER BY created_at DESC`,
            [id]
        );
        article.publishLogs = logsRes.rows.map(mapRowToCamelCase);

        return article;
    },

    async create(data: {
        spaceId: number | string;
        userId?: number;
        title: string;
        content?: string;
        imageUrls?: string[];
        status?: string;
        scheduledAt?: string;
        targetPlatforms?: string[];
        sourceDocumentId?: number;
        tags?: string[];
        author?: string;
        fbAlbumId?: string;
    }): Promise<any> {
        const res = await pool.query(
            `INSERT INTO cms_articles (space_id, user_id, title, content, image_urls, status, scheduled_at, target_platforms, source_document_id, tags, author, fb_album_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                data.spaceId,
                data.userId || null,
                data.title,
                data.content || '',
                JSON.stringify(data.imageUrls || []),
                data.status || 'draft',
                data.scheduledAt || null,
                JSON.stringify(data.targetPlatforms || []),
                data.sourceDocumentId || null,
                JSON.stringify(data.tags || []),
                data.author || null,
                data.fbAlbumId || null
            ]
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async update(id: number | string, data: Record<string, unknown>): Promise<any> {
        const allowedFields: Record<string, string> = {
            title: 'title',
            content: 'content',
            imageUrls: 'image_urls',
            status: 'status',
            scheduledAt: 'scheduled_at',
            targetPlatforms: 'target_platforms',
            sourceDocumentId: 'source_document_id',
            tags: 'tags',
            author: 'author',
            fbAlbumId: 'fb_album_id'
        };

        const setClauses: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            const dbField = allowedFields[key];
            if (dbField) {
                setClauses.push(`${dbField} = $${paramIndex++}`);
                // Serialize arrays/objects to JSON
                if (['image_urls', 'target_platforms', 'tags'].includes(dbField)) {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
            }
        }

        if (setClauses.length === 0) {
            return this.findById(id);
        }

        setClauses.push(`updated_at = NOW()`);
        values.push(id);

        const res = await pool.query(
            `UPDATE cms_articles SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async delete(id: number | string): Promise<void> {
        await pool.query(`UPDATE cms_articles SET status = 'deleted' WHERE id = $1`, [id]);
    },

    async updateStatus(id: number | string, status: string): Promise<void> {
        await pool.query(
            `UPDATE cms_articles SET status = $1, updated_at = NOW() WHERE id = $2`,
            [status, id]
        );
    },

    async permanentDelete(id: number | string): Promise<void> {
        await pool.query(`DELETE FROM cms_publish_logs WHERE article_id = $1`, [id]);
        await pool.query(`DELETE FROM cms_articles WHERE id = $1`, [id]);
    }
};

// ═══════════════════════════════════════════════════════════
// Publish Logs
// ═══════════════════════════════════════════════════════════

export const cmsPublishLogModel = {
    async create(data: {
        articleId: number | string;
        platform: string;
        status?: string;
    }): Promise<any> {
        const res = await pool.query(
            `INSERT INTO cms_publish_logs (article_id, platform, status)
             VALUES ($1, $2, $3) RETURNING *`,
            [data.articleId, data.platform, data.status || 'pending']
        );
        return mapRowToCamelCase(res.rows[0]);
    },

    async updateByArticleAndPlatform(
        articleId: number | string,
        platform: string,
        data: {
            status: string;
            externalPostId?: string;
            externalUrl?: string;
            errorMessage?: string;
            publishedAt?: string;
            n8nExecutionId?: string;
        }
    ): Promise<any | null> {
        const res = await pool.query(
            `UPDATE cms_publish_logs
             SET status = $1, external_post_id = $2, external_url = $3,
                 error_message = $4, published_at = $5, n8n_execution_id = $6
             WHERE article_id = $7 AND platform = $8
             RETURNING *`,
            [
                data.status,
                data.externalPostId || null,
                data.externalUrl || null,
                data.errorMessage || null,
                data.publishedAt || (data.status === 'success' ? new Date().toISOString() : null),
                data.n8nExecutionId || null,
                articleId,
                platform
            ]
        );
        return res.rows[0] ? mapRowToCamelCase(res.rows[0]) : null;
    },

    async findByArticleId(articleId: number | string): Promise<any[]> {
        const res = await pool.query(
            `SELECT * FROM cms_publish_logs WHERE article_id = $1 ORDER BY created_at DESC`,
            [articleId]
        );
        return res.rows.map(mapRowToCamelCase);
    }
};
