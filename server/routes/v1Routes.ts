// server/routes/v1Routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { chatController } from '../controllers/chatController.js';
import { systemController } from '../controllers/systemController.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { userModel } from '../models/user.model.js';
import { spaceModel } from '../models/space.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { verifyPassword } from '../db.js';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { documentModel } from '../models/document.model.js';

const router = Router();

// Helper to check if a user has access to a specific space
const checkSpaceAccess = async (spaceId: number, userId: number, isGlobalAdmin: boolean): Promise<boolean> => {
    if (isGlobalAdmin) return true;
    const space = await spaceModel.findById(spaceId);
    if (!space) return false;
    if (space.userId === userId) return true;
    return await spaceMemberModel.isMember(spaceId, userId);
};

// POST /api/v1/chat
// Supports both stream and non-stream formats based on req.body.stream
router.post('/chat', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    const spaceId = req.body.spaceId || req.body.SpaceID;
    if (!spaceId) {
        return res.status(400).json({ error: 'spaceId is required' });
    }
    const parsedSpaceId = parseInt(String(spaceId), 10);
    if (isNaN(parsedSpaceId)) {
        return res.status(400).json({ error: 'spaceId must be a valid number' });
    }

    try {
        const hasAccess = await checkSpaceAccess(parsedSpaceId, req.user?.id || 0, !!req.user?.isGlobalAdmin);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this space' });
        }

        const { aiConfigId } = req.body;
        if (!aiConfigId) {
            return res.status(400).json({ error: 'aiConfigId is required' });
        }
        const parsedAiConfigId = parseInt(String(aiConfigId), 10);
        if (isNaN(parsedAiConfigId)) {
            return res.status(400).json({ error: 'aiConfigId must be a valid number' });
        }

        const aiConfig = await aiConfigModel.findById(parsedAiConfigId);
        if (!aiConfig) {
            return res.status(404).json({ error: 'AI Config not found' });
        }
        if (aiConfig.spaceId !== parsedSpaceId) {
            return res.status(400).json({ error: 'AI Config does not belong to the specified space' });
        }

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
    const spaceId = req.body.spaceId || req.body.SpaceID;
    if (!spaceId) {
        return res.status(400).json({ error: 'spaceId is required' });
    }
    const parsedSpaceId = parseInt(String(spaceId), 10);
    if (isNaN(parsedSpaceId)) {
        return res.status(400).json({ error: 'spaceId must be a valid number' });
    }

    try {
        const hasAccess = await checkSpaceAccess(parsedSpaceId, req.user?.id || 0, !!req.user?.isGlobalAdmin);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this space' });
        }

        const { aiConfigId, text } = req.body;
        if (!aiConfigId) {
            return res.status(400).json({ error: 'aiConfigId is required' });
        }
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'text (string) is required' });
        }

        const parsedAiConfigId = parseInt(String(aiConfigId), 10);
        if (isNaN(parsedAiConfigId)) {
            return res.status(400).json({ error: 'aiConfigId must be a valid number' });
        }

        const aiConfig = await aiConfigModel.findById(parsedAiConfigId);
        if (!aiConfig) {
            return res.status(404).json({ error: 'AI Config not found' });
        }
        if (aiConfig.spaceId !== parsedSpaceId) {
            return res.status(400).json({ error: 'AI Config does not belong to the specified space' });
        }

        // Map requirements to systemController.generateTtsAudio format
        req.body.aiId = parsedAiConfigId;
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

// POST /api/v1/login
// SSO Login endpoint — validates credentials & checks membership in the specified spaceId
// Use this from external apps (e.g. n8n) to obtain a JWT access token without browser session
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, spaceId } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'email và password là bắt buộc.' });
        }
        if (!spaceId) {
            return res.status(400).json({ message: 'spaceId là bắt buộc.' });
        }

        // 1. Find user
        let user = await userModel.findByEmail(email);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.' });
        }

        // 2. Verify password
        const isMatch = await verifyPassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }

        // 3. Verify user is Owner or Member of the specified space
        const space = await spaceModel.findById(spaceId);
        if (!space) {
            return res.status(404).json({ message: `Không tìm thấy không gian có ID: ${spaceId}.` });
        }
        const isOwner = space.userId === user.id;
        const isMember = await spaceMemberModel.isMember(space.id, user.id);
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Tài khoản chưa đăng ký trong không gian này.' });
        }

        // 4. Ensure user has an API token (long-lived refresh token)
        if (!user.apiToken) {
            const renewed = await userModel.regenerateApiToken(user.id);
            if (!renewed) {
                return res.status(500).json({ message: 'Không thể tạo API token cho tài khoản này.' });
            }
            user = renewed;
        }

        // 5. Generate short-lived JWT access token
        const accessToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'fallback_secret_giacngo123',
            { expiresIn: '7d' }
        );

        // 6. Return sanitized user + tokens
        const { password: _pw, resetToken: _rt, resetTokenExpires: _rte, apiToken: _at, ...sanitizedUser } = user as any;
        return res.json({
            ...sanitizedUser,
            apiToken: accessToken,          // Short-lived JWT (7d)
            refreshToken: user.apiToken,     // Long-lived static token (use /api/auth/refresh to renew)
            space: { id: space.id, name: space.name, slug: space.slug }
        });
    } catch (error: unknown) {
        logger.error('v1 Login error:', error);
        next(error);
    }
});

// GET /api/v1/public-ais
// Get list of public AIs (sanitized configs)
router.get('/public-ais', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    const spaceId = req.query.spaceId || req.query.SpaceID;
    if (!spaceId) {
        return res.status(400).json({ error: 'spaceId is required' });
    }
    const parsedSpaceId = parseInt(String(spaceId), 10);
    if (isNaN(parsedSpaceId)) {
        return res.status(400).json({ error: 'spaceId must be a valid number' });
    }

    try {
        const hasAccess = await checkSpaceAccess(parsedSpaceId, req.user?.id || 0, !!req.user?.isGlobalAdmin);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this space' });
        }

        const publicAis = await aiConfigModel.findVisibleForUser(null, parsedSpaceId);
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

// GET /api/v1/documents
// Get list of documents/articles in the library belonging to the specified spaceId
router.get('/documents', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    const { spaceId, page = '1', limit = '10', title } = req.query;
    try {
        if (!spaceId) {
            return res.status(400).json({ error: 'spaceId is required' });
        }

        const parsedSpaceId = parseInt(String(spaceId), 10);
        if (isNaN(parsedSpaceId)) {
            return res.status(400).json({ error: 'spaceId must be a valid number' });
        }

        // Check if space exists
        const space = await spaceModel.findById(parsedSpaceId);
        if (!space) {
            return res.status(404).json({ error: `Space with ID ${parsedSpaceId} not found` });
        }

        // Verify membership or admin
        const isOwner = space.userId === req.user?.id;
        const isMember = await spaceMemberModel.isMember(space.id, req.user?.id || 0);
        const isGlobalAdmin = !!req.user?.isGlobalAdmin;

        if (!isOwner && isMember && !isGlobalAdmin) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this space' });
        }

        const pageNum = parseInt(String(page), 10) || 1;
        const limitNum = parseInt(String(limit), 10) || 10;

        const result = await documentModel.find({
            spaceId: parsedSpaceId,
            limit: limitNum,
            offset: (pageNum - 1) * limitNum,
            title: title ? String(title) : undefined
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
