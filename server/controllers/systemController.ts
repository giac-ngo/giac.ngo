// server/controllers/systemController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { systemModel } from '../models/system.model.js';
import { gptService } from '../services/gptService.js';
import { geminiService } from '../services/geminiService.js';
import { userModel } from '../models/user.model.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getUserManagedSpaceIds, isAdmin } from '../middleware/authMiddleware.js';
import { User, AIConfig } from '../types/index.js';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const { spaceId, userScoped } = req.body;
        const userId = req.user?.id;
        let dir;

        if (spaceId && spaceId !== 'global' && spaceId !== 'system') {
            const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
            if ((userScoped === 'true' || userScoped === true) && userId) {
                dir = path.join(uploadsDir, `space-${safeSpaceId}`, `user-${userId}`);
            } else {
                dir = path.join(uploadsDir, `space-${safeSpaceId}`);
            }
        } else {
            dir = path.join(uploadsDir, 'system');
        }

        try {
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (err: any) {
            logger.error('Error creating upload directory:', err);
            cb(err, dir);
        }
    },
    filename: (_req, file, cb) => {
        const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeOriginalName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');
        cb(null, safeOriginalName);
    }
});

const trainingFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/webm',
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, audio, PDF, Word, Excel, text.`));
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: trainingFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const systemController = {
    async getSystemConfig(_req: Request, res: Response) {
        try {
            const config = await systemModel.getConfig();
            if (!config) {
                return res.status(404).json({ message: 'System configuration not found.' });
            }
            res.json(config);
        } catch (error: any) {
            res.status(500).json({ message: 'Không thể tải cấu hình hệ thống.' });
        }
    },

    async updateSystemConfig(req: Request, res: Response) {
        try {
            const updatedConfig = await systemModel.updateConfig(req.body);
            res.json(updatedConfig);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình hệ thống.' });
        }
    },

    async getDashboardStats(req: Request, res: Response) {
        try {
            const superAdmin = isAdmin(req.user);
            const spaceIds = superAdmin ? null : await getUserManagedSpaceIds(req.user?.id!);

            // Non-admin user with no spaces: return empty stats
            if (!superAdmin && Array.isArray(spaceIds) && spaceIds.length === 0) {
                return res.json({
                    totalUsers: 0, totalAiConfigs: 0, totalConversations: 0,
                    interactingUsers: 0, topAIs: [], recentConversations: [],
                    totalDocuments: 0, totalSpaces: 0, totalDharmaTalks: 0,
                    topDocuments: [], topSpaces: [], topDharmaTalks: [],
                });
            }

            const stats = await systemModel.getDashboardStats(spaceIds);
            res.json(stats);
        } catch (error: any) {
            logger.error('Error in getDashboardStats:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message || String(error) });
        }
    },

    async getPublicStats(_req: Request, res: Response) {
        try {
            const stats = await systemModel.getDashboardStats([]);
            res.json({
                totalUsers: stats.totalUsers,
                totalAiConfigs: stats.totalAiConfigs,
                totalConversations: stats.totalConversations,
                totalDocuments: stats.totalDocuments,
                totalSpaces: stats.totalSpaces,
                totalDharmaTalks: stats.totalDharmaTalks,
                topSpaces: stats.topSpaces,
                topDocuments: stats.topDocuments,
                topDharmaTalks: stats.topDharmaTalks,
            });
        } catch (error: any) {
            logger.error('Error in getPublicStats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    uploadFiles(req: Request, res: Response) {
        if (!req.file) {
            return res.status(400).send('No file was uploaded.');
        }
        const relativePath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
        const filePaths = [`/uploads/${relativePath}`];
        res.json({ filePaths });
    },

    async getAvailableModels(req: Request, res: Response) {
        const { provider } = req.params;
        const rawUserId = req.query.userId || req.user?.id;
        if (!rawUserId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }
        try {
            const userIdNum = parseInt(Array.isArray(rawUserId) ? (rawUserId[0] as string) : (rawUserId as string), 10);
            const user = await userModel.findById(userIdNum);

            if (provider === 'gpt') {
                const apiKey = user?.apiKeys?.gpt || process.env.GPT_API_KEY || process.env.VITE_GPT_API_KEY;
                if (!apiKey) return res.status(400).json({ message: `Vui lòng thêm API key cá nhân cho ${provider.toUpperCase()} trong Cài đặt.` });
                res.json(await gptService.listModels(apiKey));
            } else if (provider === 'gemini') {
                res.json(['gemini-3-flash-preview', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-3.1-flash-tts-preview']);
            }
            else if (provider === 'vertex') {
                res.json(['projects/343195597322/locations/us-central1/endpoints/6040161629629317120']);
            } else if (provider === 'grok') {
                res.json(['grok-1-mock']);
            } else {
                res.status(400).json({ message: `Provider '${provider}' is not supported.` });
            }
        } catch (error: any) {
            res.status(500).json({ message: `Failed to fetch models from ${provider}: ${error.message}` });
        }
    },

    // ── TTS In-Memory Cache (LRU, max 100 entries, 10-minute TTL) ──
    _ttsCache: new Map<string, { audioContent: string; mimeType: string; ts: number }>(),
    _ttsCacheMaxSize: 100,
    _ttsCacheTTL: 10 * 60 * 1000, // 10 minutes

    _ttsCacheGet(key: string) {
        const entry = systemController._ttsCache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.ts > systemController._ttsCacheTTL) {
            systemController._ttsCache.delete(key);
            return null;
        }
        return entry;
    },

    _ttsCacheSet(key: string, audioContent: string, mimeType: string) {
        // Evict oldest if at capacity
        if (systemController._ttsCache.size >= systemController._ttsCacheMaxSize) {
            const oldest = systemController._ttsCache.keys().next().value;
            if (oldest) systemController._ttsCache.delete(oldest);
        }
        systemController._ttsCache.set(key, { audioContent, mimeType, ts: Date.now() });
    },

    async generateTtsAudio(req: Request, res: Response) {
        const { text, provider, model, voice, lang, userId, styleInstruction, temperature, aiId, spaceId } = req.body;
        if (!text || !provider || !model || !userId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        try {
            // ── PARALLEL: fetch user, systemConfig, and aiConfig simultaneously ──
            const [user, systemConfig, aiConfig] = await Promise.all([
                userModel.findById(userId) as Promise<User | null>,
                systemModel.getConfig(),
                (async (): Promise<AIConfig | null> => {
                    if (aiId) return aiConfigModel.findById(aiId) as Promise<AIConfig | null>;
                    if (spaceId) {
                        const spaceAis = await aiConfigModel.findBySpaceId(parseInt(spaceId, 10));
                        return spaceAis?.[0] || null;
                    }
                    return null;
                })(),
            ]);
            
            let finalVoice = voice;
            let finalStyle = styleInstruction || '';
            let finalTemp = temperature;
            let finalApiKey = user?.apiKeys?.[provider] || systemConfig?.systemKeys?.[provider] || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env[`VITE_${provider.toUpperCase()}_API_KEY`];

            let finalProvider = provider;
            let finalModel = model;

            // If AI Config found, use its specific TTS settings (fallback to space owner's api keys)
            if (aiConfig) {
                if (aiConfig.ttsProvider) finalProvider = aiConfig.ttsProvider;
                if (aiConfig.ttsModel) finalModel = aiConfig.ttsModel;
                if (aiConfig.ttsVoice) finalVoice = aiConfig.ttsVoice;
                if (aiConfig.ttsStyle) finalStyle = aiConfig.ttsStyle;
                if (aiConfig.ttsTemperature !== undefined && aiConfig.ttsTemperature !== null) {
                    finalTemp = typeof aiConfig.ttsTemperature === 'number' ? aiConfig.ttsTemperature : parseFloat(aiConfig.ttsTemperature);
                }

                // Fetch owner API key — only when needed, single query with JOIN
                let targetUserId = aiConfig.ownerId;
                if (aiConfig.spaceId) {
                    const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [aiConfig.spaceId]);
                    if (spaceRes.rows.length > 0 && spaceRes.rows[0].user_id) {
                        targetUserId = spaceRes.rows[0].user_id;
                    }
                }
                
                if (targetUserId && targetUserId !== userId) {
                    const owner = (await userModel.findById(targetUserId)) as User | null;
                    if (owner?.apiKeys && owner.apiKeys[finalProvider]) {
                        finalApiKey = owner.apiKeys[finalProvider];
                    }
                } else if (targetUserId === userId && user?.apiKeys?.[finalProvider]) {
                    finalApiKey = user.apiKeys[finalProvider];
                }
            }

            if (!finalApiKey) {
                return res.status(400).json({ message: `API Key for ${finalProvider} not configured.` });
            }

            // ── CACHE CHECK: skip Gemini/GPT call if we have a cached result ──
            const cacheKey = `${finalProvider}:${finalModel}:${finalVoice}:${finalStyle}:${finalTemp}:${text}`;
            const cached = systemController._ttsCacheGet(cacheKey);
            if (cached) {
                logger.info(`[TTS] Cache HIT — skipping API call`);
                return res.json({
                    audioContent: cached.audioContent,
                    mimeType: cached.mimeType,
                    provider: finalProvider,
                    voice: finalVoice
                });
            }

            let audioContent = '';
            let mimeType = 'audio/mp3';

            if (finalProvider === 'gemini') {
                const result = await geminiService.generateTts(text, finalApiKey, finalModel, finalVoice, finalStyle, finalTemp);
                if (typeof result === 'string') {
                    audioContent = result;
                } else {
                    audioContent = result.audioContent;
                    mimeType = result.mimeType || 'audio/mp3';
                }
            } else if (finalProvider === 'gpt') {
                audioContent = await gptService.generateTts(text, finalApiKey, finalModel, finalVoice);
                mimeType = 'audio/mp3';
            } else {
                return res.status(400).json({ message: `TTS for provider '${finalProvider}' is not supported.` });
            }

            // ── CACHE STORE ──
            systemController._ttsCacheSet(cacheKey, audioContent, mimeType);

            return res.json({
                audioContent,
                mimeType,
                provider: finalProvider,
                voice: finalVoice
            });
        } catch (error: any) {
            logger.error("----- TTS GENERATION ERROR -----");
            logger.error(error);
            logger.error("--------------------------------");
            res.status(500).json({ message: `TTS generation failed: ${error.message || String(error)}` });
        }
    },

    async translateText(req: Request, res: Response) {
        const { provider, model, text, targetLanguage, userId, contextPrompt } = req.body;
        if (!provider || !model || !text || !targetLanguage || !userId) {
            return res.status(400).json({ message: 'Missing required fields for translation.' });
        }

        try {
            const user = await userModel.findById(userId);
            const systemConfig = await systemModel.getConfig();
            const apiKey = user?.apiKeys?.[provider] || systemConfig?.systemKeys?.[provider] || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env[`VITE_${provider.toUpperCase()}_API_KEY`];

            if (!apiKey) {
                return res.status(400).json({ message: `API Key for ${provider} not configured.` });
            }

            let translatedText = '';
            const service = provider === 'gemini' ? geminiService : gptService;

            if (!service || typeof service.translateText !== 'function') {
                return res.status(400).json({ message: `Unsupported translation provider: ${provider}` });
            }

            translatedText = await service.translateText(text, targetLanguage, apiKey, model, contextPrompt);

            res.json({ translatedText });
        } catch (error: any) {
            res.status(500).json({ message: `Translation failed: ${error.message || String(error)}` });
        }
    },
};
