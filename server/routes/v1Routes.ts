// server/routes/v1Routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { chatController } from '../controllers/chatController.js';
import { systemController } from '../controllers/systemController.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/v1/chat
// Supports both stream and non-stream formats based on req.body.stream
router.post('/chat', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { stream } = req.body;
        if (stream === true || stream === 'true') {
            await chatController.sendMessageStream(req, res);
        } else {
            await chatController.sendMessageJson(req, res);
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/tts
// Converts text to speech using configured model settings from the specified aiConfigId
router.post('/tts', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    const { aiConfigId, text } = req.body;
    if (!aiConfigId) {
        return res.status(400).json({ error: 'aiConfigId is required' });
    }
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'text (string) is required' });
    }

    try {
        const aiConfig = await aiConfigModel.findById(aiConfigId);
        if (!aiConfig) {
            return res.status(404).json({ error: 'AI Config not found' });
        }

        // Map requirements to systemController.generateTtsAudio format
        req.body.aiId = aiConfigId;
        req.body.userId = req.user?.id;
        req.body.provider = aiConfig.ttsProvider || 'gemini';
        req.body.model = aiConfig.ttsModel || 'gemini-2.5-flash';
        req.body.voice = aiConfig.ttsVoice || '';
        req.body.styleInstruction = aiConfig.ttsStyle || '';
        req.body.temperature = aiConfig.ttsTemperature ?? 0.7;

        await systemController.generateTtsAudio(req, res);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/public-ais
// Get list of public AIs (sanitized configs)
router.get('/public-ais', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const publicAis = await aiConfigModel.findVisibleForUser(null);
        // Map to return only safe details to avoid exposing system prompt or internal credentials
        const sanitized = publicAis.map(ai => ({
            id: ai.id,
            spaceId: ai.spaceId,
            name: ai.name,
            nameEn: ai.nameEn,
            description: ai.description,
            descriptionEn: ai.descriptionEn,
            avatarUrl: ai.avatarUrl,
            tags: ai.tags,
            modelType: ai.modelType,
            modelName: ai.modelName,
            baseDailyLimit: ai.baseDailyLimit,
            createdAt: ai.createdAt,
            updatedAt: ai.updatedAt
        }));
        res.json(sanitized);
    } catch (error) {
        next(error);
    }
});

export default router;
