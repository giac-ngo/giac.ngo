import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { pool, mapRowToCamelCase } from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isAdmin } from '../middleware/authMiddleware.js';
import { User } from '../types/index.js';

// Extend Request to include user property
interface AuthenticatedRequest extends Request {
    user?: User | null;
    files?: Express.Multer.File[];
}

// --- Multer config: lưu ảnh theo uploads/space-{spaceId}/user-{userId}/ ---
const storage = multer.diskStorage({
    destination: (req: AuthenticatedRequest, file, cb) => {
        const spaceId = req.params.id;
        const userId = req.user?.id || 'guest';
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        // User personal folder — flat within space
        const dir = path.join(process.cwd(), 'uploads', `space-${safeSpaceId}`, `user-${userId}`);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e5)}${ext}`);
    }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh.'));
    }
};

export const postImageUpload = multer({ storage, fileFilter, limits: { files: 4, fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social
// ─────────────────────────────────────────────
export const getSocialPosts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(20, parseInt(req.query.limit as string) || 10);
        const offset = (page - 1) * limit;
        const userId = req.user?.id || null;

        const { rows } = await pool.query(`
            SELECT
                p.*,
                -- Always use live user data (not the snapshot stored at post time)
                COALESCE(u.name, p.user_name)           AS user_name,
                COALESCE(u.avatar_url, p.user_avatar_url) AS user_avatar_url,
                CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END AS is_liked_by_me,
                CASE WHEN sfo.id IS NOT NULL THEN true ELSE false END AS is_followed_by_me,
                CASE WHEN bm.id IS NOT NULL THEN true ELSE false END AS is_bookmarked_by_me,
                -- Quoted post data (for reposts)
                qp.id            AS qp_id,
                qp.user_id       AS qp_user_id,
                COALESCE(qu.name, qp.user_name)             AS qp_user_name,
                COALESCE(qu.avatar_url, qp.user_avatar_url) AS qp_user_avatar_url,
                qp.content       AS qp_content,
                qp.image_urls    AS qp_image_urls,
                qp.created_at    AS qp_created_at,
                qp.metadata      AS qp_metadata,
                qp.likes_count   AS qp_likes_count,
                CASE WHEN qpl.user_id IS NOT NULL THEN true ELSE false END AS qp_is_liked_by_me
            FROM social_posts p
            LEFT JOIN users u  ON u.id = p.user_id
            LEFT JOIN social_post_likes pl ON pl.post_id = p.id AND pl.user_id = $3
            LEFT JOIN social_follows sfo ON sfo.space_id = p.space_id AND sfo.follower_id = $3 AND sfo.following_id = p.user_id
            LEFT JOIN social_posts qp ON qp.id = p.quoted_post_id
            LEFT JOIN users qu ON qu.id = qp.user_id
            LEFT JOIN social_post_likes qpl ON qpl.post_id = qp.id AND qpl.user_id = $3
            LEFT JOIN social_bookmarks bm ON bm.post_id = p.id AND bm.user_id = $3 AND bm.space_id = p.space_id
            WHERE p.space_id = $1
            ORDER BY COALESCE(p.is_pinned, false) DESC, p.created_at DESC
            LIMIT $2 OFFSET ${offset}
        `, [spaceId, limit, userId]);

        const { rows: countRows } = await pool.query(
            'SELECT COUNT(*) FROM social_posts WHERE space_id = $1', [spaceId]
        );

        const mapped = rows.map((row: any) => {
            const post = mapRowToCamelCase(row);
            // Extract and attach quotedPost if present
            if (row.qp_id) {
                post.quotedPost = {
                    id: row.qp_id,
                    userId: row.qp_user_id,
                    userName: row.qp_user_name,
                    userAvatarUrl: row.qp_user_avatar_url,
                    content: row.qp_content,
                    imageUrls: row.qp_image_urls || [],
                    createdAt: row.qp_created_at,
                    metadata: row.qp_metadata,
                    likesCount: Number(row.qp_likes_count) || 0,
                    isLikedByMe: Boolean(row.qp_is_liked_by_me),
                };
            } else {
                post.quotedPost = null;
            }
            // Remove flat qp_ keys
            Object.keys(post).forEach(k => { if (k.startsWith('qp')) delete post[k]; });
            return post;
        });

        res.json({
            data: mapped,
            total: parseInt(countRows[0].count),
            page,
            limit
        });
    } catch (err: any) {
        logger.error('getSocialPosts error:', err);
        res.status(500).json({ message: 'Lỗi tải bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social
// ─────────────────────────────────────────────
export const createSocialPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Chưa đăng nhập.' });

        const { content, quotedPostId } = req.body;

        // Images: uploaded files + library URLs passed as imageUrls[]
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const { optimizeImage } = await import('../utils/imageService.js');
        
        const uploadedFiles = req.files || [];
        const uploadedUrls = [];

        for (const file of uploadedFiles) {
            const optimizedPath = await optimizeImage(file.path);
            const fileName = path.basename(optimizedPath);
            uploadedUrls.push(`/uploads/space-${safeSpaceId}/user-${user.id}/${fileName}`);
        }

        const libraryUrls = req.body.imageUrls
            ? (Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls])
            : [];
        const imageUrls = [...uploadedUrls, ...libraryUrls];

        // Phải có ít nhất nội dung hoặc ảnh hoặc quoted post hoặc metadata (ai_share)
        const trimmedContent = (content || '').trim();
        const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : null;
        if (!trimmedContent && imageUrls.length === 0 && !quotedPostId && !metadata) {
            return res.status(400).json({ message: 'Vui lòng nhập nội dung hoặc đính kèm ảnh.' });
        }

        const qpId = quotedPostId ? parseInt(quotedPostId, 10) : null;

        const { rows } = await pool.query(`
            INSERT INTO social_posts (space_id, user_id, user_name, user_avatar_url, content, image_urls, metadata, quoted_post_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [spaceId, user.id, user.name, user.avatarUrl || null, trimmedContent, imageUrls, metadata ? JSON.stringify(metadata) : null, qpId]);

        // Increment retweets count on original post
        if (qpId) {
            await pool.query('UPDATE social_posts SET retweets_count = retweets_count + 1 WHERE id = $1', [qpId]);
        }

        // Fetch quoted post to embed in response
        let quotedPost = null;
        if (qpId) {
            const { rows: qpRows } = await pool.query(`
                SELECT p.*,
                CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END AS is_liked_by_me
                FROM social_posts p
                LEFT JOIN social_post_likes pl ON pl.post_id = p.id AND pl.user_id = $2
                WHERE p.id = $1
            `, [qpId, user.id]);
            if (qpRows[0]) {
                const qp = mapRowToCamelCase(qpRows[0]);
                quotedPost = {
                    id: qp.id,
                    userName: qp.userName,
                    userAvatarUrl: qp.userAvatarUrl,
                    content: qp.content,
                    imageUrls: qp.imageUrls || [],
                    createdAt: qp.createdAt,
                    metadata: qp.metadata,
                    likesCount: qp.likesCount || 0,
                    isLikedByMe: qp.isLikedByMe || false,
                };
            }
        }

        // ── Create notifications for new post ──
        const newPost = rows[0];
        const io = req.app.get('io');

        try {
            // 1. Notify all followers of this user
            const { rows: followers } = await pool.query(
                'SELECT follower_id FROM social_follows WHERE following_id = $1 AND space_id = $2',
                [user.id, spaceId]
            );
            if (followers.length > 0) {
                const followerIds = followers.map((f: any) => f.follower_id);
                await createSocialNotification(followerIds, user.id, 'new_post', newPost.id);
                // Emit to each follower's private room
                followerIds.forEach((fid: number) => {
                    io.to(`user-${fid}`).emit('social-notification', {
                        type: 'new_post',
                        actorName: user.name,
                        postId: newPost.id,
                        spaceId
                    });
                });
            }
            // 2. Notify @mentioned users in post content
            if (trimmedContent) {
                const mentionedIds = await parseMentionedUserIds(trimmedContent, spaceId);
                if (mentionedIds.length > 0) {
                    await createSocialNotification(mentionedIds, user.id, 'mention', newPost.id);
                    mentionedIds.forEach((mid: number) => {
                        io.to(`user-${mid}`).emit('social-notification', {
                            type: 'mention',
                            actorName: user.name,
                            postId: newPost.id,
                            spaceId
                        });
                    });
                }
            }
            
            // 3. Emit to space room so feed can update live
            io.to(`space-${spaceId}`).emit('new-social-post', mapRowToCamelCase(newPost));

        } catch (notifErr) { logger.error('Post notification error:', notifErr); }

        res.status(201).json({ ...mapRowToCamelCase(rows[0]), isLikedByMe: false, quotedPost });
    } catch (err: any) {
        logger.error('createSocialPost error:', err);
        res.status(500).json({ message: 'Lỗi tạo bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/spaces/:id/social/:postId
// ─────────────────────────────────────────────
export const deleteSocialPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const { rows } = await pool.query('SELECT * FROM social_posts WHERE id = $1', [postId]);
        if (!rows[0]) return res.status(404).json({ message: 'Bài đăng không tồn tại.' });

        if (rows[0].user_id !== req.user?.id && !isAdmin(req.user as any)) {
            return res.status(403).json({ message: 'Không có quyền xóa bài này.' });
        }

        await pool.query('DELETE FROM social_posts WHERE id = $1', [postId]);
        res.status(204).send();
    } catch (err: any) {
        logger.error('deleteSocialPost error:', err);
        res.status(500).json({ message: 'Lỗi xóa bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/like
// ─────────────────────────────────────────────
export const toggleSocialLike = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows: existing } = await pool.query(
            'SELECT 1 FROM social_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]
        );

        let liked;
        if (existing.length > 0) {
            await pool.query('DELETE FROM social_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
            await pool.query('UPDATE social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [postId]);
            liked = false;
        } else {
            await pool.query('INSERT INTO social_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, userId]);
            await pool.query('UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);
            liked = true;
        }

        const { rows } = await pool.query('SELECT likes_count, user_id FROM social_posts WHERE id = $1', [postId]);
        
        // Notify post owner on like (not on unlike)
        if (liked && rows[0]) {
            try { await createSocialNotification([rows[0].user_id], userId, 'like', postId); } catch {}
        }
        
        res.json({ liked, likesCount: rows[0]?.likes_count || 0 });
    } catch (err: any) {
        logger.error('toggleSocialLike error:', err);
        res.status(500).json({ message: 'Lỗi thực hiện like.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/:postId/likes
// ─────────────────────────────────────────────
export const getPostLikers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });
        const { rows } = await pool.query(
            `SELECT u.id, u.name, u.avatar_url as "avatarUrl"
             FROM social_post_likes l
             JOIN users u ON u.id = l.user_id
             WHERE l.post_id = $1
             ORDER BY l.created_at DESC`,
            [postId]
        );
        res.json(rows);
    } catch (err: any) {
        logger.error('getPostLikers error:', err);
        res.status(500).json({ message: 'Lỗi lấy danh sách người thích.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/:postId/comments
// ─────────────────────────────────────────────
export const getSocialComments = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const userId = req.user?.id || null;

        // Ensure likes table + column exist
        await pool.query(`CREATE TABLE IF NOT EXISTS social_comment_likes (
            id SERIAL PRIMARY KEY,
            comment_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (comment_id, user_id)
        )`);
        // Ensure likes_count column exists on comments
        await pool.query(`ALTER TABLE social_post_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`);

        const { rows } = await pool.query(`
            SELECT
                c.*,
                COALESCE(u.name, c.user_name)             AS user_name,
                COALESCE(u.avatar_url, c.user_avatar_url) AS user_avatar_url,
                CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END AS is_liked_by_me
            FROM social_post_comments c
            LEFT JOIN users u ON u.id = c.user_id
            LEFT JOIN social_comment_likes cl ON cl.comment_id = c.id AND cl.user_id = $2
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [postId, userId]);

        res.json(rows.map(mapRowToCamelCase));
    } catch (err: any) {
        logger.error('getSocialComments error:', err);
        res.status(500).json({ message: 'Lỗi tải bình luận.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/comments
// ─────────────────────────────────────────────
export const addSocialComment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const { content, parentCommentId, imageUrl } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ message: 'Nội dung bình luận không được để trống.' });

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows } = await pool.query(`
            INSERT INTO social_post_comments (post_id, user_id, user_name, user_avatar_url, content, parent_comment_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [postId, user.id, user.name, user.avatarUrl || null, content.trim(), parentCommentId || null, imageUrl || null]);

        await pool.query('UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

        // ── Create notifications ──
        const spaceId = parseInt(String(req.params.id), 10);
        const commentRow = rows[0];
        try {
            // 1. Notify post owner
            const { rows: [postRow] } = await pool.query('SELECT user_id FROM social_posts WHERE id = $1', [postId]);
            if (postRow) {
                await createSocialNotification([postRow.user_id], user.id, 'comment', postId, commentRow.id);
            }
            // 2. Notify other commenters on this post
            const { rows: otherCommenters } = await pool.query(
                'SELECT DISTINCT user_id FROM social_post_comments WHERE post_id = $1 AND user_id != $2',
                [postId, user.id]
            );
            if (otherCommenters.length > 0) {
                const otherIds = otherCommenters.map((c: any) => c.user_id);
                await createSocialNotification(otherIds, user.id, 'comment', postId, commentRow.id);
            }
            // 3. Notify @mentioned users
            const mentionedIds = await parseMentionedUserIds(content, spaceId);
            if (mentionedIds.length > 0) {
                await createSocialNotification(mentionedIds, user.id, 'mention', postId, commentRow.id);
            }
        } catch (notifErr) { logger.error('Comment notification error:', notifErr); }

        res.status(201).json(mapRowToCamelCase(rows[0]));
    } catch (err: any) {
        logger.error('addSocialComment error:', err);
        res.status(500).json({ message: 'Lỗi thêm bình luận.' });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/spaces/:id/social/:postId/comments/:commentId
// ─────────────────────────────────────────────
export const deleteSocialComment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = parseInt(String(req.params.commentId), 10);
        const postId = parseInt(String(req.params.postId), 10);
        if (isNaN(commentId) || isNaN(postId)) return res.status(400).json({ message: 'Invalid ID.' });

        const { rows } = await pool.query('SELECT * FROM social_post_comments WHERE id = $1', [commentId]);
        if (!rows[0]) return res.status(404).json({ message: 'Bình luận không tồn tại.' });

        if (rows[0].user_id !== req.user?.id && !isAdmin(req.user as any)) {
            return res.status(403).json({ message: 'Không có quyền xóa bình luận này.' });
        }

        await pool.query('DELETE FROM social_post_comments WHERE id = $1', [commentId]);
        await pool.query('UPDATE social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [postId]);
        res.status(204).send();
    } catch (err: any) {
        logger.error('deleteSocialComment error:', err);
        res.status(500).json({ message: 'Lỗi xóa bình luận.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/comments/:commentId/like
// ─────────────────────────────────────────────
export const toggleCommentLike = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const commentId = parseInt(String(req.params.commentId), 10);
        if (isNaN(commentId)) return res.status(400).json({ message: 'Invalid comment ID.' });

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        // Ensure table exists
        await pool.query(`CREATE TABLE IF NOT EXISTS social_comment_likes (
            id SERIAL PRIMARY KEY,
            comment_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (comment_id, user_id)
        )`);
        await pool.query(`ALTER TABLE social_post_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`);

        const { rows: existing } = await pool.query(
            'SELECT 1 FROM social_comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]
        );

        let liked;
        if (existing.length > 0) {
            await pool.query('DELETE FROM social_comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
            await pool.query('UPDATE social_post_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [commentId]);
            liked = false;
        } else {
            await pool.query('INSERT INTO social_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [commentId, userId]);
            await pool.query('UPDATE social_post_comments SET likes_count = likes_count + 1 WHERE id = $1', [commentId]);
            liked = true;
        }

        const { rows } = await pool.query('SELECT likes_count FROM social_post_comments WHERE id = $1', [commentId]);
        res.json({ liked, likesCount: rows[0]?.likes_count || 0 });
    } catch (err: any) {
        logger.error('toggleCommentLike error:', err);
        res.status(500).json({ message: 'Lỗi thực hiện like bình luận.' });
    }
};

// ─────────────────────────────────────────────
// PUT /api/spaces/:id/social/:postId — Edit post content
// ─────────────────────────────────────────────
export const updateSocialPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const postId = parseInt(String(req.params.postId), 10);
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { content } = req.body;
        if (content === undefined) return res.status(400).json({ message: 'Content is required.' });

        // Check ownership or admin
        const { rows: [post] } = await pool.query('SELECT user_id FROM social_posts WHERE id = $1 AND space_id = $2', [postId, spaceId]);
        if (!post) return res.status(404).json({ message: 'Post not found.' });
        
        const isUserAdmin = (req.user as any)?.role === 'admin' || (req.user as any)?.role === 'root_admin' || isAdmin(req.user as any);
        if (post.user_id !== userId && !isUserAdmin) return res.status(403).json({ message: 'Không có quyền chỉnh sửa.' });

        // Handle images: uploaded files + kept existing URLs
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uploadedUrls = (req.files || []).map(f =>
            `/uploads/space-${safeSpaceId}/user-${userId}/${f.filename}`
        );
        // keptImageUrls = existing image URLs the user chose to keep
        let keptUrls = req.body.keptImageUrls
            ? (Array.isArray(req.body.keptImageUrls) ? req.body.keptImageUrls : [req.body.keptImageUrls])
            : [];

        if (uploadedUrls.length > 0 || req.body.keptImageUrls !== undefined) {
            // Full edit: update both content + images
            const allImages = [...keptUrls, ...uploadedUrls];
            await pool.query('UPDATE social_posts SET content = $1, image_urls = $2 WHERE id = $3', [content, allImages, postId]);
        } else {
            // Description-only edit (lightbox) — no image changes
            await pool.query('UPDATE social_posts SET content = $1 WHERE id = $2', [content, postId]);
        }
        res.json({ success: true });
    } catch (err: any) {
        logger.error('updateSocialPost error:', err);
        res.status(500).json({ message: 'Lỗi cập nhật bài viết.' });
    }
};

// ─────────────────────────────────────────────
// Notification Helpers
// ─────────────────────────────────────────────
const ensureNotificationsTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS social_notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            actor_user_id INTEGER NOT NULL,
            type VARCHAR(20) NOT NULL,
            post_id INTEGER,
            comment_id INTEGER,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    // Index for fast lookup
    try { await pool.query('CREATE INDEX IF NOT EXISTS idx_social_notif_user ON social_notifications(user_id, is_read, created_at DESC)'); } catch {}
};
let notifTableReady = false;
const readyNotifTable = async () => { if (!notifTableReady) { await ensureNotificationsTable(); notifTableReady = true; } };

/**
 * Create notification(s) for social events.
 * Skips creating notification if actor === recipient.
 */
export const createSocialNotification = async (recipientIds: number[], actorUserId: number, type: string, postId: number | null = null, commentId: number | null = null) => {
    await readyNotifTable();
    const uniqueIds = [...new Set(recipientIds)].filter(id => id !== actorUserId);
    if (uniqueIds.length === 0) return;
    
    const values = uniqueIds.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ');
    const params = uniqueIds.flatMap(uid => [uid, actorUserId, type, postId, commentId]);
    await pool.query(`INSERT INTO social_notifications (user_id, actor_user_id, type, post_id, comment_id) VALUES ${values}`, params);
};

/**
 * Parse @mentions from text, return matching user IDs from the space.
 */
export const parseMentionedUserIds = async (text: string, spaceId: number) => {
    if (!text || !text.includes('@')) return [];
    // Get all space members
    const { rows: members } = await pool.query(
        `SELECT u.id, u.name FROM users u JOIN space_members sm ON sm.user_id = u.id WHERE sm.space_id = $1`,
        [spaceId]
    );
    // Sort by name length desc to match longest first
    members.sort((a: any, b: any) => b.name.length - a.name.length);
    const ids: number[] = [];
    for (const m of members) {
        if (text.includes(`@${m.name}`)) {
            ids.push(m.id);
        }
    }
    return ids;
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/notifications
// ─────────────────────────────────────────────
export const getSocialNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        await readyNotifTable();

        const { rows } = await pool.query(`
            SELECT n.id, n.type, n.post_id, n.comment_id, n.is_read, n.created_at,
                   n.actor_user_id, u.name AS actor_name, u.avatar_url AS actor_avatar_url
            FROM social_notifications n
            LEFT JOIN users u ON u.id = n.actor_user_id
            WHERE n.user_id = $1
              AND (n.post_id IS NULL OR n.post_id IN (SELECT id FROM social_posts WHERE space_id = $2))
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [userId, spaceId]);

        res.json(rows.map(mapRowToCamelCase));
    } catch (err: any) {
        logger.error('getSocialNotifications error:', err);
        res.status(500).json({ message: 'Lỗi tải thông báo.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/notifications/read
// ─────────────────────────────────────────────
export const markNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const spaceId = parseInt(String(req.params.id), 10);
        await readyNotifTable();

        await pool.query(`
            UPDATE social_notifications SET is_read = TRUE
            WHERE user_id = $1
              AND is_read = FALSE
              AND (post_id IS NULL OR post_id IN (SELECT id FROM social_posts WHERE space_id = $2))
        `, [userId, spaceId]);

        res.json({ success: true });
    } catch (err: any) {
        logger.error('markNotificationsRead error:', err);
        res.status(500).json({ message: 'Lỗi.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/notifications/count
// ─────────────────────────────────────────────
export const getUnreadNotificationCount = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const spaceId = parseInt(String(req.params.id), 10);
        await readyNotifTable();

        const { rows: [{ count }] } = await pool.query(`
            SELECT COUNT(*) AS count FROM social_notifications
            WHERE user_id = $1
              AND is_read = FALSE
              AND (post_id IS NULL OR post_id IN (SELECT id FROM social_posts WHERE space_id = $2))
        `, [userId, spaceId]);

        res.json({ count: parseInt(count) });
    } catch (err: any) {
        logger.error('getUnreadNotificationCount error:', err);
        res.status(500).json({ message: 'Lỗi.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/follow/:targetUserId
// ─────────────────────────────────────────────
export const toggleSocialFollow = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const targetUserId = parseInt(String(req.params.targetUserId), 10);
        if (isNaN(spaceId) || isNaN(targetUserId)) return res.status(400).json({ message: 'Invalid ID.' });

        const followerId = req.user?.id;
        if (!followerId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
        if (followerId === targetUserId) return res.status(400).json({ message: 'Không thể tự theo dõi.' });

        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_follows (
                id SERIAL PRIMARY KEY,
                space_id INTEGER NOT NULL,
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (space_id, follower_id, following_id)
            )
        `);

        const { rows: existing } = await pool.query(
            'SELECT 1 FROM social_follows WHERE space_id = $1 AND follower_id = $2 AND following_id = $3',
            [spaceId, followerId, targetUserId]
        );

        let following;
        if (existing.length > 0) {
            await pool.query(
                'DELETE FROM social_follows WHERE space_id = $1 AND follower_id = $2 AND following_id = $3',
                [spaceId, followerId, targetUserId]
            );
            following = false;
        } else {
            await pool.query(
                'INSERT INTO social_follows (space_id, follower_id, following_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [spaceId, followerId, targetUserId]
            );
            following = true;
            // Notify the followed user
            try { await createSocialNotification([targetUserId], followerId, 'follow'); } catch {}
        }

        // Return updated counts for the target user
        const { rows: stats } = await pool.query(
            'SELECT COUNT(*) AS followers FROM social_follows WHERE space_id = $1 AND following_id = $2',
            [spaceId, targetUserId]
        );
        res.json({ following, followersCount: parseInt(stats[0].followers) });
    } catch (err: any) {
        logger.error('toggleSocialFollow error:', err);
        res.status(500).json({ message: 'Lỗi thực hiện theo dõi.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/users/:userId/stats
// ─────────────────────────────────────────────
export const getUserSocialStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const targetUserId = parseInt(String(req.params.userId), 10);
        const viewerId = req.user?.id || null;
        if (isNaN(spaceId) || isNaN(targetUserId)) return res.status(400).json({ message: 'Invalid ID.' });

        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS social_follows (
                id SERIAL PRIMARY KEY,
                space_id INTEGER NOT NULL,
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE (space_id, follower_id, following_id)
            )
        `);

        const [postRes, followerRes, followingRes, isFollowingRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM social_posts WHERE space_id = $1 AND user_id = $2', [spaceId, targetUserId]),
            pool.query('SELECT COUNT(*) FROM social_follows WHERE space_id = $1 AND following_id = $2', [spaceId, targetUserId]),
            pool.query('SELECT COUNT(*) FROM social_follows WHERE space_id = $1 AND follower_id = $2', [spaceId, targetUserId]),
            viewerId ? pool.query(
                'SELECT 1 FROM social_follows WHERE space_id = $1 AND follower_id = $2 AND following_id = $3',
                [spaceId, viewerId, targetUserId]
            ) : Promise.resolve({ rows: [] }),
        ]);

        res.json({
            postCount: parseInt(postRes.rows[0].count),
            followersCount: parseInt(followerRes.rows[0].count),
            followingCount: parseInt(followingRes.rows[0].count),
            isFollowing: isFollowingRes.rows.length > 0,
        });
    } catch (err: any) {
        logger.error('getUserSocialStats error:', err);
        res.status(500).json({ message: 'Lỗi tải thống kê.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/bookmark  (#10 Bookmark)
// ─────────────────────────────────────────────
export const toggleBookmark = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const postId = parseInt(String(req.params.postId), 10);
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows: existing } = await pool.query(
            'SELECT 1 FROM social_bookmarks WHERE space_id = $1 AND user_id = $2 AND post_id = $3',
            [spaceId, userId, postId]
        );

        if (existing.length > 0) {
            await pool.query('DELETE FROM social_bookmarks WHERE space_id = $1 AND user_id = $2 AND post_id = $3', [spaceId, userId, postId]);
            return res.json({ bookmarked: false });
        } else {
            await pool.query('INSERT INTO social_bookmarks (space_id, user_id, post_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [spaceId, userId, postId]);
            return res.json({ bookmarked: true });
        }
    } catch (err: any) {
        logger.error('toggleBookmark error:', err);
        res.status(500).json({ message: 'Lỗi bookmark.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/pin  (#7 Pin post)
// ─────────────────────────────────────────────
export const togglePinPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const postId = parseInt(String(req.params.postId), 10);
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        // Only owner or admin can pin
        const { rows: [post] } = await pool.query('SELECT user_id FROM social_posts WHERE id = $1 AND space_id = $2', [postId, spaceId]);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const isUserAdmin = (req.user?.roleIds && req.user.roleIds.length > 0) || isAdmin(req.user as any);
        if (post.user_id !== userId && !isUserAdmin) {
            return res.status(403).json({ message: 'Không có quyền ghim bài viết.' });
        }

        // Toggle
        const { rows: [updated] } = await pool.query(
            'UPDATE social_posts SET is_pinned = NOT COALESCE(is_pinned, false) WHERE id = $1 RETURNING is_pinned',
            [postId]
        );

        res.json({ pinned: updated.is_pinned });
    } catch (err: any) {
        logger.error('togglePinPost error:', err);
        res.status(500).json({ message: 'Lỗi ghim bài viết.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/saved  (#10 Get saved/bookmarked posts)
// ─────────────────────────────────────────────
export const getSavedPosts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const spaceId = parseInt(String(req.params.id), 10);
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows } = await pool.query(`
            SELECT p.*, 
                COALESCE(u.name, p.user_name) AS user_name,
                COALESCE(u.avatar_url, p.user_avatar_url) AS user_avatar_url,
                true AS is_bookmarked_by_me
            FROM social_bookmarks b
            JOIN social_posts p ON p.id = b.post_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE b.space_id = $1 AND b.user_id = $2
            ORDER BY b.created_at DESC
            LIMIT 50
        `, [spaceId, userId]);

        res.json(rows.map(mapRowToCamelCase));
    } catch (err: any) {
        logger.error('getSavedPosts error:', err);
        res.status(500).json({ message: 'Lỗi tải bài đã lưu.' });
    }
};

