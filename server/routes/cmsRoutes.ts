// server/routes/cmsRoutes.ts
import { Router } from 'express';
import { cmsController } from '../controllers/cmsController.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// OAuth callback — no JWT auth required (user redirected from facebook-connect)
router.get('/oauth/callback', cmsController.oauthCallback);

// Webhook callback — no JWT auth required (n8n calls this)
router.post('/:slug/webhook/publish-result', cmsController.webhookPublishResult);

// Endpoint for n8n to PULL pending/scheduled articles
router.get('/:slug/webhook/pending-articles', cmsController.getPendingArticlesForN8n);

// All other routes require authentication
router.use(isAuthenticated);

// OAuth init URL
router.get('/:spaceId/oauth/:platform/url', cmsController.getOAuthUrl);

// Social connections
router.get('/:spaceId/connections', cmsController.getConnections);
router.delete('/:spaceId/connections/:connectionId', cmsController.deleteConnection);
router.get('/:spaceId/connections/facebook/pages', cmsController.getFacebookPages);
router.put('/:spaceId/connections/facebook', cmsController.updateFacebookConnection);

// Articles CRUD
router.get('/:spaceId/articles', cmsController.getArticles);
router.get('/:spaceId/articles/:id', cmsController.getArticle);
router.post('/:spaceId/articles', cmsController.createArticle);
router.put('/:spaceId/articles/:id', cmsController.updateArticle);
router.delete('/:spaceId/articles/:id', cmsController.deleteArticle);
router.delete('/:spaceId/articles/:id/permanent', cmsController.permanentDeleteArticle);

// Publishing
router.post('/:spaceId/articles/:id/publish', cmsController.publishArticle);

// Share to social feed
router.post('/:spaceId/articles/:id/share-to-feed', cmsController.shareToSocialFeed);

// Import from library
router.post('/:spaceId/articles/import-document', cmsController.importDocument);

// FB Albums
router.get('/:spaceId/fb-albums', cmsController.getFbAlbums);
router.post('/:spaceId/fb-albums', cmsController.createFbAlbum);

export default router;
