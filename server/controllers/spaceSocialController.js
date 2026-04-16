// server/controllers/spacePostController.js
import { pool, mapRowToCamelCase } from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isAdmin } from '../middleware/authMiddleware.js';




// --- Multer config: lưu ảnh theo uploads/space-{spaceId}/user-{userId}/ ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const spaceId = req.params.id;
        const userId = req.user?.id || 'guest';
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        // User personal folder — flat within space
        const dir = path.join(process.cwd(), 'uploads', `space-${safeSpaceId}`, `user-${userId}`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e5)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh.'), false);
    }
};

export const postImageUpload = multer({ storage, fileFilter, limits: { files: 4, fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social
// ─────────────────────────────────────────────
export const getSocialPosts = async (req, res) => {
    try {
        const spaceId = parseInt(req.params.id, 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, parseInt(req.query.limit) || 10);
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
                -- Quoted post data (for reposts)
                qp.id            AS qp_id,
                qp.user_id       AS qp_user_id,
                COALESCE(qu.name, qp.user_name)             AS qp_user_name,
                COALESCE(qu.avatar_url, qp.user_avatar_url) AS qp_user_avatar_url,
                qp.content       AS qp_content,
                qp.image_urls    AS qp_image_urls,
                qp.created_at    AS qp_created_at,
                qp.metadata      AS qp_metadata
            FROM social_posts p
            LEFT JOIN users u  ON u.id = p.user_id
            LEFT JOIN social_post_likes pl ON pl.post_id = p.id AND pl.user_id = $3
            LEFT JOIN social_follows sfo ON sfo.space_id = p.space_id AND sfo.follower_id = $3 AND sfo.following_id = p.user_id
            LEFT JOIN social_posts qp ON qp.id = p.quoted_post_id
            LEFT JOIN users qu ON qu.id = qp.user_id
            WHERE p.space_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET ${offset}
        `, [spaceId, limit, userId]);

        const { rows: countRows } = await pool.query(
            'SELECT COUNT(*) FROM social_posts WHERE space_id = $1', [spaceId]
        );

        const mapped = rows.map(row => {
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
    } catch (err) {
        console.error('getSocialPosts error:', err);
        res.status(500).json({ message: 'Lỗi tải bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social
// ─────────────────────────────────────────────
export const createSocialPost = async (req, res) => {
    try {
        const spaceId = parseInt(req.params.id, 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Chưa đăng nhập.' });

        const { content, quotedPostId } = req.body;

        // Images: uploaded files + library URLs passed as imageUrls[]
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uploadedUrls = (req.files || []).map(f =>
            `/uploads/space-${safeSpaceId}/user-${user.id}/${f.filename}`
        );
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
            const { rows: qpRows } = await pool.query('SELECT * FROM social_posts WHERE id = $1', [qpId]);
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
                };
            }
        }

        res.status(201).json({ ...mapRowToCamelCase(rows[0]), isLikedByMe: false, quotedPost });
    } catch (err) {
        console.error('createSocialPost error:', err);
        res.status(500).json({ message: 'Lỗi tạo bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/spaces/:id/social/:postId
// ─────────────────────────────────────────────
export const deleteSocialPost = async (req, res) => {
    try {
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const { rows } = await pool.query('SELECT * FROM social_posts WHERE id = $1', [postId]);
        if (!rows[0]) return res.status(404).json({ message: 'Bài đăng không tồn tại.' });

        if (rows[0].user_id !== req.user?.id && !isAdmin(req.user)) {
            return res.status(403).json({ message: 'Không có quyền xóa bài này.' });
        }

        await pool.query('DELETE FROM social_posts WHERE id = $1', [postId]);
        res.status(204).send();
    } catch (err) {
        console.error('deleteSocialPost error:', err);
        res.status(500).json({ message: 'Lỗi xóa bài đăng.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/like
// ─────────────────────────────────────────────
export const toggleSocialLike = async (req, res) => {
    try {
        const postId = parseInt(req.params.postId, 10);
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

        const { rows } = await pool.query('SELECT likes_count FROM social_posts WHERE id = $1', [postId]);
        res.json({ liked, likesCount: rows[0]?.likes_count || 0 });
    } catch (err) {
        console.error('toggleSocialLike error:', err);
        res.status(500).json({ message: 'Lỗi thực hiện like.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/:postId/comments
// ─────────────────────────────────────────────
export const getSocialComments = async (req, res) => {
    try {
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const { rows } = await pool.query(`
            SELECT
                c.*,
                COALESCE(u.name, c.user_name)             AS user_name,
                COALESCE(u.avatar_url, c.user_avatar_url) AS user_avatar_url
            FROM social_post_comments c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [postId]);

        res.json(rows.map(mapRowToCamelCase));
    } catch (err) {
        console.error('getSocialComments error:', err);
        res.status(500).json({ message: 'Lỗi tải bình luận.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/:postId/comments
// ─────────────────────────────────────────────
export const addSocialComment = async (req, res) => {
    try {
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(postId)) return res.status(400).json({ message: 'Invalid post ID.' });

        const { content, parentCommentId } = req.body;
        if (!content || !content.trim()) return res.status(400).json({ message: 'Nội dung bình luận không được để trống.' });

        const user = req.user;
        if (!user) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows } = await pool.query(`
            INSERT INTO social_post_comments (post_id, user_id, user_name, user_avatar_url, content, parent_comment_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [postId, user.id, user.name, user.avatarUrl || null, content.trim(), parentCommentId || null]);

        await pool.query('UPDATE social_posts SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

        res.status(201).json(mapRowToCamelCase(rows[0]));
    } catch (err) {
        console.error('addSocialComment error:', err);
        res.status(500).json({ message: 'Lỗi thêm bình luận.' });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/spaces/:id/social/:postId/comments/:commentId
// ─────────────────────────────────────────────
export const deleteSocialComment = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId, 10);
        const postId = parseInt(req.params.postId, 10);
        if (isNaN(commentId) || isNaN(postId)) return res.status(400).json({ message: 'Invalid ID.' });

        const { rows } = await pool.query('SELECT * FROM social_post_comments WHERE id = $1', [commentId]);
        if (!rows[0]) return res.status(404).json({ message: 'Bình luận không tồn tại.' });

        if (rows[0].user_id !== req.user?.id && !isAdmin(req.user)) {
            return res.status(403).json({ message: 'Không có quyền xóa bình luận này.' });
        }

        await pool.query('DELETE FROM social_post_comments WHERE id = $1', [commentId]);
        await pool.query('UPDATE social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [postId]);
        res.status(204).send();
    } catch (err) {
        console.error('deleteSocialComment error:', err);
        res.status(500).json({ message: 'Lỗi xóa bình luận.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/notifications
// ─────────────────────────────────────────────
export const getSocialNotifications = async (req, res) => {
    try {
        const spaceId = parseInt(req.params.id, 10);
        if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID.' });

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

        const { rows: likes } = await pool.query(`
            SELECT 'like' AS type, pl.user_id AS actor_user_id,
                u.name AS actor_name, u.avatar_url AS actor_avatar_url,
                pl.created_at, p.id AS post_id
            FROM social_post_likes pl
            JOIN social_posts p ON p.id = pl.post_id
            LEFT JOIN users u ON u.id = pl.user_id
            WHERE p.space_id = $1 AND p.user_id = $2 AND pl.user_id != $2
            ORDER BY pl.created_at DESC LIMIT 20
        `, [spaceId, userId]);

        const { rows: comments } = await pool.query(`
            SELECT 'comment' AS type, c.user_id AS actor_user_id,
                c.user_name AS actor_name, c.user_avatar_url AS actor_avatar_url,
                c.created_at, c.post_id
            FROM social_post_comments c
            JOIN social_posts p ON p.id = c.post_id
            WHERE p.space_id = $1 AND p.user_id = $2 AND c.user_id != $2
            ORDER BY c.created_at DESC LIMIT 20
        `, [spaceId, userId]);

        const all = [...likes, ...comments]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 30);

        res.json(all.map(mapRowToCamelCase));
    } catch (err) {
        console.error('getSocialNotifications error:', err);
        res.status(500).json({ message: 'Lỗi tải thông báo.' });
    }
};

// ─────────────────────────────────────────────
// POST /api/spaces/:id/social/follow/:targetUserId
// ─────────────────────────────────────────────
export const toggleSocialFollow = async (req, res) => {
    try {
        const spaceId = parseInt(req.params.id, 10);
        const targetUserId = parseInt(req.params.targetUserId, 10);
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
        }

        // Return updated counts for the target user
        const { rows: stats } = await pool.query(
            'SELECT COUNT(*) AS followers FROM social_follows WHERE space_id = $1 AND following_id = $2',
            [spaceId, targetUserId]
        );
        res.json({ following, followersCount: parseInt(stats[0].followers) });
    } catch (err) {
        console.error('toggleSocialFollow error:', err);
        res.status(500).json({ message: 'Lỗi thực hiện theo dõi.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/spaces/:id/social/users/:userId/stats
// ─────────────────────────────────────────────
export const getUserSocialStats = async (req, res) => {
    try {
        const spaceId = parseInt(req.params.id, 10);
        const targetUserId = parseInt(req.params.userId, 10);
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
    } catch (err) {
        console.error('getUserSocialStats error:', err);
        res.status(500).json({ message: 'Lỗi tải thống kê.' });
    }
};
