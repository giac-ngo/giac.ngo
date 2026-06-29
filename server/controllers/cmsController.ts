// server/controllers/cmsController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { pool, mapRowToCamelCase } from '../db.js';
import { cmsArticleModel, cmsSocialConnectionModel, cmsPublishLogModel } from '../models/cmsArticle.model.js';
import { fbAlbumModel } from '../models/fbAlbum.model.js';
import { canAccessSpace } from '../middleware/authMiddleware.js';

const N8N_WEBHOOK_URL = process.env.N8N_CMS_WEBHOOK_URL || '';
const CMS_CALLBACK_SECRET = process.env.CMS_CALLBACK_SECRET || '';
const CMS_OAUTH_DOMAIN = process.env.CMS_OAUTH_DOMAIN || 'apiv2.phoai.vn';

export const cmsController = {
    // ═══════════════════════════════════════════════════════════
    // Articles CRUD
    // ═══════════════════════════════════════════════════════════

    async getArticles(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            const { status, search, page, limit } = req.query;
            const result = await cmsArticleModel.findBySpaceId(spaceId, {
                status: status as string,
                search: search as string,
                page: page ? parseInt(page as string, 10) : 1,
                limit: limit ? parseInt(limit as string, 10) : 20
            });
            const counts = await cmsArticleModel.getCountsByStatus(spaceId);
            res.json({ ...result, counts });
        } catch (error: unknown) {
            logger.error('CMS getArticles error:', error);
            res.status(500).json({ message: 'Failed to fetch articles.' });
        }
    },

    async getArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            const article = await cmsArticleModel.findById(id);
            if (!article) return res.status(404).json({ message: 'Article not found.' });
            res.json(article);
        } catch (error: unknown) {
            logger.error('CMS getArticle error:', error);
            res.status(500).json({ message: 'Failed to fetch article.' });
        }
    },

    async createArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const isGlobalAdmin = !!req.user?.isGlobalAdmin;
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            const isSpaceOwner = spaceRes.rows[0]?.user_id === req.user?.id;
            const hasWrite = req.user?.permissions?.includes('cms_write');
            const hasApprove = req.user?.permissions?.includes('cms_approve');
            const canWrite = isGlobalAdmin || isSpaceOwner || hasApprove || hasWrite;

            if (!canWrite) return res.status(403).json({ message: 'Bạn không có quyền viết bài CMS.' });

            const { title, content, imageUrls, status, scheduledAt, targetPlatforms, sourceDocumentId, tags, author, fbAlbumId } = req.body;
            if (!title || !title.trim()) {
                return res.status(400).json({ message: 'Title is required.' });
            }
            const article = await cmsArticleModel.create({
                spaceId: parseInt(spaceId, 10),
                userId: req.user?.id,
                title: title.trim(),
                content, imageUrls, 
                status: 'draft', // Luôn bắt đầu bằng draft khi khởi tạo
                scheduledAt, targetPlatforms, sourceDocumentId, tags,
                fbAlbumId
            });
            res.status(201).json(article);
        } catch (error: unknown) {
            logger.error('CMS createArticle error:', error);
            res.status(500).json({ message: 'Failed to create article.' });
        }
    },

    async updateArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const existingArticle = await cmsArticleModel.findById(id);
            if (!existingArticle) return res.status(404).json({ message: 'Article not found.' });

            const isGlobalAdmin = !!req.user?.isGlobalAdmin;
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            const isSpaceOwner = spaceRes.rows[0]?.user_id === req.user?.id;
            const hasWrite = req.user?.permissions?.includes('cms_write');
            const hasApprove = req.user?.permissions?.includes('cms_approve');
            const canApprove = isGlobalAdmin || isSpaceOwner || hasApprove;
            
            // Writer edit rules
            if (!canApprove && hasWrite) {
                if (!['draft', 'pending_approval', 'rejected'].includes(existingArticle.status)) {
                    return res.status(403).json({ message: 'Không thể sửa bài viết đã được duyệt hoặc đang xuất bản.' });
                }
                // Nếu không có quyền approve, thì không được phép tự đổi thành approved/publishing v.v.
                if (req.body.status && !['draft', 'pending_approval'].includes(req.body.status)) {
                    return res.status(403).json({ message: 'Bạn không có quyền chuyển sang trạng thái này.' });
                }
            } else if (!canApprove && !hasWrite) {
                return res.status(403).json({ message: 'Bạn không có quyền sửa bài.' });
            }

            const article = await cmsArticleModel.update(id, req.body);
            if (!article) return res.status(404).json({ message: 'Article not found.' });
            res.json(article);
        } catch (error: unknown) {
            logger.error('CMS updateArticle error:', error);
            res.status(500).json({ message: 'Failed to update article.' });
        }
    },

    async deleteArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            await cmsArticleModel.delete(id);
            res.json({ success: true });
        } catch (error: unknown) {
            logger.error('CMS deleteArticle error:', error);
            res.status(500).json({ message: 'Failed to delete article.' });
        }
    },

    async permanentDeleteArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            await cmsArticleModel.permanentDelete(id);
            res.json({ success: true });
        } catch (error: unknown) {
            logger.error('CMS permanentDeleteArticle error:', error);
            res.status(500).json({ message: 'Failed to permanently delete article.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Import from Library
    // ═══════════════════════════════════════════════════════════

    async importDocument(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            const { documentId } = req.body;
            if (!documentId) return res.status(400).json({ message: 'documentId is required.' });

            const docRes = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
            if (!docRes.rows[0]) return res.status(404).json({ message: 'Document not found.' });
            const doc = docRes.rows[0];

            const article = await cmsArticleModel.create({
                spaceId: parseInt(spaceId, 10),
                userId: req.user?.id,
                title: doc.title || 'Untitled',
                content: doc.content ? doc.content
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/<[^>]*>?/gm, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim() : '',
                imageUrls: doc.thumbnail_url ? [doc.thumbnail_url] : [],
                status: 'publishing',
                sourceDocumentId: doc.id,
                tags: [],
                author: doc.author || null
            });
            res.status(201).json(article);
        } catch (error: unknown) {
            logger.error('CMS importDocument error:', error);
            res.status(500).json({ message: 'Failed to import document.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Publish to n8n
    // ═══════════════════════════════════════════════════════════

    async publishArticle(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            
            const isGlobalAdmin = !!req.user?.isGlobalAdmin;
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            const isSpaceOwner = spaceRes.rows[0]?.user_id === req.user?.id;
            const hasApprove = req.user?.permissions?.includes('cms_approve');
            const canApprove = isGlobalAdmin || isSpaceOwner || hasApprove;

            if (!canApprove) {
                return res.status(403).json({ message: 'Bạn không có quyền Xuất bản (Publish) bài viết.' });
            }

            // Remove N8N_WEBHOOK_URL check to allow publishing without it
            // if (!N8N_WEBHOOK_URL) {
            //     return res.status(500).json({ message: 'n8n webhook URL is not configured. Set N8N_CMS_WEBHOOK_URL in .env' });
            // }

            const article = await cmsArticleModel.findById(id);
            if (!article) return res.status(404).json({ message: 'Article not found.' });

            const requestedPlatforms: string[] = req.body.platforms || article.targetPlatforms || [];
            if (requestedPlatforms.length === 0) {
                return res.status(400).json({ message: 'No target platforms selected.' });
            }

            const connections = await cmsSocialConnectionModel.findBySpaceId(spaceId);
            const activeConnections = connections.filter((c: any) => c.isActive);

            const existingLogs = article.publishLogs || [];
            const successfulPlatforms = existingLogs
                .filter((l: any) => l.status === 'success')
                .map((l: any) => l.platform);

            const platformsPayload: any[] = [];
            for (const platform of requestedPlatforms) {
                if (successfulPlatforms.includes(platform)) continue;
                const conn = activeConnections.find((c: any) => c.platform === platform);
                if (!conn) continue;

                // Extract page-specific album ID from JSON map if applicable
                let pageAlbumId = null;
                if (article.fbAlbumId) {
                    if (article.fbAlbumId.startsWith('{')) {
                        try {
                            const albumMap = JSON.parse(article.fbAlbumId);
                            pageAlbumId = albumMap[platform] || null;
                            if (pageAlbumId === 'direct') pageAlbumId = null;
                        } catch (e) {}
                    } else if (platform.startsWith('facebook')) {
                        // Backward compatibility fallback for single simple album ID
                        pageAlbumId = article.fbAlbumId;
                    }
                }

                platformsPayload.push({ 
                    platform: conn.platform, 
                    accessToken: conn.accessToken, 
                    pageName: conn.pageName || '',
                    fbAlbumId: pageAlbumId
                });
            }

            if (platformsPayload.length === 0) {
                const allAlreadyPublished = requestedPlatforms.length > 0 && requestedPlatforms.every(p => successfulPlatforms.includes(p));
                if (allAlreadyPublished) {
                    await cmsArticleModel.updateStatus(article.id, 'published');
                    return res.json({ message: 'Bài viết đã được đăng thành công trước đó.' });
                }
                return res.status(400).json({ message: 'Không tìm thấy kết nối nền tảng MXH nào được bật. Vui lòng kiểm tra lại.' });
            }

            const protocol = req.protocol;
            const host = req.get('host');
            // Resolve slug for callback URL so the /:slug/webhook/publish-result route matches
            const spaceRes2 = await pool.query('SELECT slug FROM spaces WHERE id = $1', [spaceId]);
            const slug = spaceRes2.rows[0]?.slug || '';
            const callbackUrl = `${protocol}://${host}/api/cms/${slug}/webhook/publish-result`;

            const n8nPayload = {
                articleId: article.id,
                spaceId: parseInt(spaceId, 10),
                callbackUrl,
                callbackSecret: CMS_CALLBACK_SECRET,
                platforms: platformsPayload,
                content: {
                    title: article.title,
                    text: article.content || '',
                    imageUrls: article.imageUrls || [],
                    scheduledAt: article.scheduledAt || req.body.scheduledAt || null,
                    fbAlbumId: article.fbAlbumId || null
                }
            };

            for (const pl of platformsPayload) {
                await cmsPublishLogModel.create({ articleId: article.id, platform: pl.platform, status: 'pending' });
            }

            const newStatus = n8nPayload.content.scheduledAt ? 'scheduled' : 'publishing';
            await cmsArticleModel.updateStatus(article.id, newStatus);

            // If N8N_CMS_WEBHOOK_URL is configured, try to PUSH. 
            // If it fails, do not set status to failed because n8n might be set up to PULL instead.
            if (N8N_WEBHOOK_URL && N8N_WEBHOOK_URL.startsWith('http')) {
                try {
                    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(n8nPayload)
                    });
                    if (!n8nResponse.ok) {
                        const errText = await n8nResponse.text();
                        logger.error(`n8n webhook returned ${n8nResponse.status}: ${errText}`);
                        // We do not fail it here, because n8n could PULL it later.
                    } else {
                        logger.info(`CMS article ${article.id} sent to n8n on: ${platformsPayload.map((x: any) => x.platform).join(', ')}`);
                    }
                } catch (fetchErr: unknown) {
                    logger.error('Failed to call n8n webhook push (ignoring for pull):', fetchErr);
                    // We do not fail it here, because n8n could PULL it later.
                }
            }

            const updatedArticle = await cmsArticleModel.findById(id);
            res.json({ success: true, article: updatedArticle });
        } catch (error: unknown) {
            logger.error('CMS publishArticle error:', error);
            res.status(500).json({ message: 'Failed to publish article.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Share to Social Feed
    // ═══════════════════════════════════════════════════════════

    async shareToSocialFeed(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const id = String(req.params.id);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const isGlobalAdmin = !!req.user?.isGlobalAdmin;
            const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [spaceId]);
            const isSpaceOwner = spaceRes.rows[0]?.user_id === req.user?.id;
            const hasApprove = req.user?.permissions?.includes('cms_approve');
            const canApprove = isGlobalAdmin || isSpaceOwner || hasApprove;

            if (!canApprove) {
                return res.status(403).json({ message: 'Bạn không có quyền chia sẻ bài viết lên Bảng tin.' });
            }

            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Not authenticated.' });

            const article = await cmsArticleModel.findById(id);
            if (!article) return res.status(404).json({ message: 'Article not found.' });

            // Build social post content: title + content
            const postContent = [article.title, article.content].filter(Boolean).join('\n\n');
            const imageUrls = article.imageUrls || [];

            const { rows } = await pool.query(`
                INSERT INTO social_posts (space_id, user_id, user_name, user_avatar_url, content, image_urls)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [parseInt(spaceId, 10), user.id, user.name, user.avatarUrl || null, postContent, imageUrls]);

            const socialPost = mapRowToCamelCase(rows[0]);

            // Emit to space room for live feed update
            try {
                const io = req.app.get('io');
                if (io) io.to(`space-${spaceId}`).emit('new-social-post', socialPost);
            } catch (_e) {}

            logger.info(`CMS article ${id} shared to social feed in space ${spaceId}`);
            res.json({ success: true, socialPost });
        } catch (error: unknown) {
            logger.error('CMS shareToSocialFeed error:', error);
            res.status(500).json({ message: 'Failed to share to social feed.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Webhook Callback (n8n calls back with result)
    // ═══════════════════════════════════════════════════════════

    async webhookPublishResult(req: Request, res: Response) {
        try {
            const { apiKey, callbackSecret, articleId, status, externalPostId, externalUrl, errorMessage, n8nExecutionId } = req.body;
            // Normalize platform to lowercase for consistent matching
            const platform = (req.body.platform || '').toLowerCase();

            logger.info(`CMS webhook received body: ${JSON.stringify({ articleId, platform, status, externalPostId, externalUrl, errorMessage })}`);

            const secret = apiKey || callbackSecret;
            if (CMS_CALLBACK_SECRET && secret !== CMS_CALLBACK_SECRET) {
                logger.warn(`CMS webhook: invalid secret. Got "${secret}", expected "${CMS_CALLBACK_SECRET}"`);
                return res.status(401).json({ message: 'Invalid callback secret.' });
            }
            if (!articleId || !platform || !status) {
                logger.warn(`CMS webhook: missing fields. articleId=${articleId}, platform=${platform}, status=${status}`);
                return res.status(400).json({ message: 'articleId, platform, and status are required.' });
            }

            let updateResult = await cmsPublishLogModel.updateByArticleAndPlatform(articleId, platform, {
                status, externalPostId, externalUrl, errorMessage,
                publishedAt: status === 'success' ? new Date().toISOString() : undefined,
                n8nExecutionId
            });

            // If no existing log was found, create one (e.g. article published directly via n8n pull)
            if (!updateResult) {
                logger.warn(`CMS webhook: no existing log for article ${articleId} / ${platform}, creating new one`);
                updateResult = await cmsPublishLogModel.create({ articleId, platform, status });
                // Update the newly created log with extra fields
                await cmsPublishLogModel.updateByArticleAndPlatform(articleId, platform, {
                    status, externalPostId, externalUrl, errorMessage,
                    publishedAt: status === 'success' ? new Date().toISOString() : undefined,
                    n8nExecutionId
                });
            }
            logger.info(`CMS webhook: updateResult = ${JSON.stringify(updateResult)}`);

            const allLogs = await cmsPublishLogModel.findByArticleId(articleId);
            logger.info(`CMS webhook: allLogs = ${JSON.stringify(allLogs.map((l: any) => ({ id: l.id, platform: l.platform, status: l.status })))}`);

            const allSuccess = allLogs.length > 0 && allLogs.every((l: any) => l.status === 'success');
            const allFailed = allLogs.length > 0 && allLogs.every((l: any) => l.status === 'failed');
            const anyPending = allLogs.some((l: any) => l.status === 'pending');

            let articleStatus = 'partial';
            if (allSuccess) articleStatus = 'published';
            else if (allFailed) articleStatus = 'failed';
            else if (anyPending) articleStatus = 'publishing';

            await cmsArticleModel.updateStatus(articleId, articleStatus);
            logger.info(`CMS webhook: article ${articleId}, platform ${platform} → log=${status}, article=${articleStatus}`);
            res.json({ success: true });
        } catch (error: unknown) {
            logger.error('CMS webhookPublishResult error:', error);
            res.status(500).json({ message: 'Failed to process publish result.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Webhook (n8n PULLs pending articles)
    // ═══════════════════════════════════════════════════════════

    async getPendingArticlesForN8n(req: Request, res: Response) {
        try {
            const slug = String(req.params.slug);
            const spaceRes = await pool.query('SELECT id FROM spaces WHERE slug = $1', [slug]);
            const spaceId = spaceRes.rows[0]?.id;
            if (!spaceId) return res.status(404).json({ message: 'Space not found' });

            const { apiKey } = req.query;
            if (CMS_CALLBACK_SECRET && apiKey !== CMS_CALLBACK_SECRET) {
                return res.status(401).json({ message: 'Invalid API key.' });
            }

            // Find articles that are 'publishing' or ('scheduled' and time <= NOW)
            const resArticles = await pool.query(`
                SELECT a.*, d.title as source_document_title 
                FROM cms_articles a
                LEFT JOIN documents d ON a.source_document_id = d.id
                WHERE a.space_id = $1 AND (
                   a.status = 'publishing' 
                   OR (a.status = 'scheduled' AND a.scheduled_at <= NOW())
                )
            `, [spaceId]);

            const articles = resArticles.rows.map(mapRowToCamelCase);
            
            // Get connections for these spaces
            const spaceIds = [...new Set(articles.map(a => a.spaceId))];
            let connections: any[] = [];
            if (spaceIds.length > 0) {
                const resConn = await pool.query(`
                    SELECT * FROM cms_social_connections 
                    WHERE is_active = true AND space_id = ANY($1)
                `, [spaceIds]);
                connections = resConn.rows.map(mapRowToCamelCase);
            }

            // Build payload for n8n
            const payload = articles.map(article => {
                const articleConns = connections.filter(c => c.spaceId === article.spaceId && article.targetPlatforms?.includes(c.platform));
                return {
                    articleId: article.id,
                    spaceId: article.spaceId,
                    title: article.title,
                    content: article.content,
                    author: article.author,
                    imageUrls: article.imageUrls,
                    fbAlbumId: article.fbAlbumId || null,
                    platforms: article.targetPlatforms,
                    callbackUrl: `${req.protocol}://${req.get('host')}/api/cms/${slug}/webhook/publish-result`,
                    callbackSecret: CMS_CALLBACK_SECRET,
                    connections: articleConns.map(c => ({
                        platform: c.platform,
                        accessToken: c.accessToken,
                        pageId: c.pageId,
                        pageName: c.pageName
                    }))
                };
            });

            res.json({ success: true, data: payload });
        } catch (error: unknown) {
            logger.error('CMS getPendingArticlesForN8n error:', error);
            res.status(500).json({ message: 'Failed to fetch pending articles.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Social Connections
    // ═══════════════════════════════════════════════════════════

    async getConnections(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            const connections = await cmsSocialConnectionModel.findBySpaceId(spaceId);
            const safe = connections.map((c: any) => ({
                ...c,
                accessToken: c.accessToken ? '••••••' + c.accessToken.slice(-8) : null
            }));
            res.json({
                connections: safe,
                apiKey: CMS_CALLBACK_SECRET || 'YOUR_SECRET'
            });
        } catch (error: unknown) {
            logger.error('CMS getConnections error:', error);
            res.status(500).json({ message: 'Failed to fetch connections.' });
        }
    },

    async deleteConnection(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const connectionId = String(req.params.connectionId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            await cmsSocialConnectionModel.delete(connectionId);
            res.json({ success: true });
        } catch (error: unknown) {
            logger.error('CMS deleteConnection error:', error);
            res.status(500).json({ message: 'Failed to delete connection.' });
        }
    },

    async getFacebookPages(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            
            const connections = await cmsSocialConnectionModel.findBySpaceId(spaceId);
            const fbConn = connections.find((c: any) => c.platform === 'facebook' && c.isActive);
            if (!fbConn) return res.status(404).json({ message: 'Facebook connection not found.' });

            const response = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${fbConn.accessToken}`);
            const data = await response.json();
            
            if (!response.ok) {
                return res.status(400).json({ message: data.error?.message || 'Failed to fetch Facebook pages.' });
            }

            res.json(data.data || []);
        } catch (error: unknown) {
            logger.error('Error fetching Facebook pages:', error);
            res.status(500).json({ message: 'Failed to fetch Facebook pages.' });
        }
    },

    async updateFacebookConnection(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        try {
            const { pageName, accessToken, pageId, platform } = req.body;
            
            if (!req.user || !pageName || !accessToken) {
                return res.status(400).json({ message: 'Missing required fields.' });
            }
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const finalPlatform = platform || (pageId ? `facebook_${pageId}` : 'facebook');

            // If we are connecting a Facebook Page (finalPlatform starts with facebook_), 
            // delete the root 'facebook' connection to overwrite it directly as requested by the user.
            if (finalPlatform.startsWith('facebook_')) {
                await pool.query(
                    `DELETE FROM cms_social_connections WHERE space_id = $1 AND platform = 'facebook'`,
                    [spaceId]
                );
            }

            const updatedConn = await cmsSocialConnectionModel.upsert({
                spaceId,
                platform: finalPlatform,
                accessToken,
                pageName,
                connectedBy: req.user.id
            });

            res.json({ success: true, connection: updatedConn });
        } catch (error: unknown) {
            logger.error('Error updating Facebook connection:', error);
            res.status(500).json({ message: 'Failed to update Facebook connection.' });
        }
    },

    // ═══════════════════════════════════════════════════════════
    // OAuth Callback
    // ═══════════════════════════════════════════════════════════

    async oauthCallback(req: Request, res: Response) {
        try {
            const state = String(req.query.state || '');
            const code = String(req.query.code || '');

            if (!state || !code) {
                return res.status(400).send('Missing state or code parameter.');
            }

            const match = state.match(/^space_(\d+)_(\w+)$/);
            if (!match) {
                return res.status(400).send('Invalid state format.');
            }

            const spaceId = parseInt(match[1], 10);
            const platform = match[2];
            const accessToken = code;

            await cmsSocialConnectionModel.upsert({
                spaceId, platform, accessToken,
                pageName: platform.charAt(0).toUpperCase() + platform.slice(1),
                connectedBy: req.user?.id || undefined
            });

            logger.info(`CMS OAuth: connected ${platform} for space ${spaceId}`);

            const spaceRes = await pool.query('SELECT slug FROM spaces WHERE id = $1', [spaceId]);
            const slug = spaceRes.rows[0]?.slug || '';

            // Determine frontend base URL
            const host = req.get('host') || '';
            const proto = req.protocol;
            let baseUrl = '';
            // Local dev: backend runs on 3002, frontend on 3000
            if (host.includes('localhost:') || host.includes('127.0.0.1:')) {
                baseUrl = `${proto}://${host.replace(/:\d+$/, ':3000')}`;
            }
            const path = slug ? `/${slug}/admin/cms_approve` : `/admin/cms_approve`;
            res.redirect(`${baseUrl}${path}?oauth=success&platform=${platform}`);
        } catch (error: unknown) {
            logger.error('CMS OAuth callback error:', error);
            res.status(500).send('OAuth callback failed.');
        }
    },

    async getOAuthUrl(req: Request, res: Response) {
        const spaceId = String(req.params.spaceId);
        const platform = String(req.params.platform);
        try {
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            const protocol = req.protocol;
            const host = req.get('host');
            const redirectUri = `${protocol}://${host}/api/cms/oauth/callback`;
            const oauthState = `space_${spaceId}_${platform}`;
            const oauthUrl = `https://facebook-connect.phoai.vn/?state=${oauthState}&redirect_uri=${encodeURIComponent(redirectUri)}&domain=${CMS_OAUTH_DOMAIN}`;
            res.json({ url: oauthUrl });
        } catch (error: unknown) {
            logger.error('CMS getOAuthUrl error:', error);
            res.status(500).json({ message: 'Failed to generate OAuth URL.' });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // FB Albums
    // ─────────────────────────────────────────────────────────────────────────────
    
    async getFbAlbums(req: Request, res: Response) {
        try {
            const spaceId = parseInt(req.params.spaceId as string);
            if (!req.user || isNaN(spaceId)) return res.status(400).json({ message: 'Invalid data.' });
            
            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const { pageId } = req.query;
            if (pageId) {
                const connections = await cmsSocialConnectionModel.findBySpaceId(spaceId);
                const pageConn = connections.find((c: any) => c.platform === `facebook_${pageId}` && c.isActive);
                if (!pageConn) return res.status(404).json({ message: 'Không tìm thấy kết nối Facebook Page.' });

                const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/albums?fields=id,name,cover_photo&limit=100&access_token=${pageConn.accessToken}`);
                const data = await response.json();
                if (!response.ok) {
                    return res.status(400).json({ message: data.error?.message || 'Không thể tải danh sách album từ Facebook.' });
                }
                const mappedAlbums = (data.data || []).map((alb: any) => ({
                    id: alb.id,
                    spaceId: spaceId,
                    name: alb.name,
                    album_id: alb.id
                }));
                return res.json(mappedAlbums);
            }

            const albums = await fbAlbumModel.getBySpaceId(spaceId);
            res.json(albums);
        } catch (error: unknown) {
            logger.error('Error fetching fb albums:', error);
            res.status(500).json({ message: 'Failed to fetch fb albums.' });
        }
    },

    async createFbAlbum(req: Request, res: Response) {
        try {
            const spaceId = parseInt(req.params.spaceId as string);
            const { name, album_id } = req.body;
            
            if (!req.user || isNaN(spaceId) || !name || !album_id) {
                return res.status(400).json({ message: 'Missing required fields.' });
            }

            if (!await canAccessSpace(req.user, spaceId)) {
                return res.status(403).json({ message: 'Access denied.' });
            }

            const newAlbum = await fbAlbumModel.create(spaceId, name, album_id);
            res.status(201).json(newAlbum);
        } catch (error: unknown) {
            logger.error('Error creating fb album:', error);
            res.status(500).json({ message: 'Failed to create fb album.' });
        }
    }
};
