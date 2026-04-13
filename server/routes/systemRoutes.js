// server/routes/systemRoutes.js
import { Router } from 'express';
import { systemController, upload } from '../controllers/systemController.js';
import { checkPermission, isAuthenticated } from '../middleware/authMiddleware.js';
import weaviateService from '../services/weaviateService.js';

const router = Router();

router.get('/system-config', systemController.getSystemConfig);
router.put('/system-config', checkPermission('settings'), systemController.updateSystemConfig);
router.post('/upload', isAuthenticated, upload.single('file'), systemController.uploadFiles);
router.get('/models/:provider', isAuthenticated, systemController.getAvailableModels);


// Public stats endpoint - no auth required, safe aggregated data only
router.get('/public/stats', systemController.getPublicStats);

// Dashboard (requires 'dashboard' permission)
router.get('/dashboard/stats', checkPermission('dashboard'), systemController.getDashboardStats);


// TTS - This is now also handled in documentController to be more feature-specific
router.post('/tts/generate', isAuthenticated, systemController.generateTtsAudio);

// A new translation route for document AI features
router.post('/translate', isAuthenticated, systemController.translateText);

// Admin-only: drop and recreate Weaviate class after embedding model update
// Body: { modelType: 'gemini' | 'gpt' | 'vertex', apiKey: '...' }
router.post('/reset-weaviate-schema', checkPermission('settings'), async (req, res) => {
    const { modelType, apiKey } = req.body;
    if (!modelType || !apiKey) {
        return res.status(400).json({ message: 'modelType and apiKey are required.' });
    }
    try {
        await weaviateService.resetSchemaForModelType(modelType, apiKey);
        res.json({ message: `Weaviate schema for '${modelType}' has been reset successfully. All previously indexed data for this class has been deleted. Please re-index your training data.` });
    } catch (error) {
        console.error('Failed to reset Weaviate schema:', error.message);
        res.status(500).json({ message: error.message });
    }
});

export default router;