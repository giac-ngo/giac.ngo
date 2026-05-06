// server/routes/systemRoutes.ts
import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { systemController, upload } from '../controllers/systemController.js';
import { documentController } from '../controllers/documentController.js';
import { spacePageController } from '../controllers/spacePageController.js';
import { checkPermission, isAuthenticated } from '../middleware/authMiddleware.js';
import weaviateService from '../services/weaviateService.js';

const router = Router();

router.get('/system-config', systemController.getSystemConfig);
router.get('/config', systemController.getSystemConfig);         // alias: frontend calls /api/system/config
router.put('/system-config', checkPermission('settings'), systemController.updateSystemConfig);
router.put('/config', checkPermission('settings'), systemController.updateSystemConfig); // alias
router.post('/upload', isAuthenticated, upload.single('file'), systemController.uploadFiles);
router.post('/upload-multiple', isAuthenticated, upload.single('file'), systemController.uploadFiles); // alias
router.get('/models/:provider', isAuthenticated, systemController.getAvailableModels);

// Public stats endpoint - no auth required, safe aggregated data only
router.get('/public/stats', systemController.getPublicStats);

// Dashboard (requires 'dashboard' permission)
router.get('/dashboard/stats', checkPermission('dashboard'), systemController.getDashboardStats);

// TTS
router.post('/tts/generate', isAuthenticated, systemController.generateTtsAudio);

// A new translation route for document AI features
router.post('/translate', isAuthenticated, systemController.translateText);

// Tags - alias for /api/documents/tags (documentController.getAllTags)
router.get('/tags', documentController.getAllTags);

// Contact form - alias for /api/space-pages/:id/contact
// Frontend calls /api/system/contact without a spaceId, use space 1 as default
router.post('/contact', spacePageController.handleContactForm);

// Admin-only: drop and recreate Weaviate class after embedding model update
// Body: { modelType: 'gemini' | 'gpt' | 'vertex', apiKey: '...' }
// @ts-ignore
router.post('/reset-weaviate-schema', checkPermission('settings'), async (req: Request, res: Response) => {
    // @ts-ignore
    const { modelType, apiKey } = req.body;
    if (!modelType || !apiKey) {
        // @ts-ignore
        return res.status(400).json({ message: 'modelType and apiKey are required.' });
    }
    try {
        await weaviateService.resetSchemaForModelType(modelType, apiKey);
        // @ts-ignore
        res.json({ message: `Weaviate schema for '${modelType}' has been reset successfully. All previously indexed data for this class has been deleted. Please re-index your training data.` });
    } catch (error: unknown) {
        logger.error('Failed to reset Weaviate schema:', (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error)));
        // @ts-ignore
        res.status(500).json({ message: error.message });
    }
});

export default router;
