// server/controllers/systemController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { systemModel } from '../models/system.model.js';
import { spaceModel } from '../models/space.model.js';
import { gptService } from '../services/gptService.js';
import { geminiService } from '../services/geminiService.js';
import { userModel } from '../models/user.model.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { documentModel } from '../models/document.model.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getUserManagedSpaceIds, isAdmin } from '../middleware/authMiddleware.js';
import { User, AIConfig } from '../types/index.js';
import { pool } from '../db.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const { spaceId, userScoped } = req.body;
        const userId = req.user?.id;
        const isGlobal = isAdmin(req.user);
        let dir: string;

        if (spaceId && spaceId !== 'global' && spaceId !== 'system') {
            const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
            // Unless global admin, user uploads must be scoped under their user folder to prevent overwriting space assets
            if (userScoped === 'true' || userScoped === true || !isGlobal) {
                dir = path.join(uploadsDir, `space-${safeSpaceId}`, `user-${userId || 'anon'}`);
            } else {
                dir = path.join(uploadsDir, `space-${safeSpaceId}`);
            }
        } else if (isGlobal) {
            dir = path.join(uploadsDir, 'system');
        } else {
            // General user uploads go to user-scoped directory
            dir = path.join(uploadsDir, 'users', `user-${userId || 'anon'}`);
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
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
        const randomName = `${crypto.randomUUID()}${safeExt}`;
        cb(null, randomName);
    }
});

const DANGEROUS_EXTENSIONS = new Set([
    '.svg', '.html', '.htm', '.xhtml', '.shtml',
    '.exe', '.dll', '.bat', '.cmd', '.sh', '.bash',
    '.php', '.phtml', '.php3', '.php4', '.php5',
    '.js', '.mjs', '.cjs', '.ts', '.vbs', '.py',
    '.cgi', '.pl', '.jsp', '.asp', '.aspx', '.war'
]);

const trainingFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext || DANGEROUS_EXTENSIONS.has(ext)) {
        return cb(new Error('Phần mở rộng tệp này không được phép tải lên vì lý do bảo mật.'));
    }

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

const maskKey = (key: string): string => {
    if (!key || typeof key !== 'string') return '';
    if (key.length <= 8) return '••••••••';
    return '••••••••' + key.slice(-4);
};

export const systemController = {
    async getSystemConfig(req: Request, res: Response) {
        try {
            const config = await systemModel.getConfig();
            if (!config) {
                return res.status(404).json({ message: 'System configuration not found.' });
            }

            // Global Admin receives full config with masked keys
            if (isAdmin(req.user)) {
                const adminConfig = { ...config };
                if (adminConfig.systemKeys) {
                    const masked: Record<string, string> = {};
                    for (const k in adminConfig.systemKeys) {
                        masked[k] = adminConfig.systemKeys[k] ? maskKey(adminConfig.systemKeys[k]) : '';
                    }
                    adminConfig.systemKeys = masked;
                }
                return res.json(adminConfig);
            }

            // Public safe fields only: NEVER leak API keys or sensitive billing settings
            res.json({
                id: config.id,
                guestMessageLimit: config.guestMessageLimit,
                template: config.template,
                templateSettings: config.templateSettings,
                platformFeePercent: config.platformFeePercent
            });
        } catch (error: any) {
            res.status(500).json({ message: 'Không thể tải cấu hình hệ thống.' });
        }
    },

    async getAdminConfig(req: Request, res: Response) {
        try {
            if (!isAdmin(req.user)) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền truy cập cấu hình quản trị.' });
            }
            const config = await systemModel.getConfig();
            if (!config) {
                return res.status(404).json({ message: 'System configuration not found.' });
            }
            const adminConfig = { ...config };
            if (adminConfig.systemKeys) {
                const masked: Record<string, string> = {};
                for (const k in adminConfig.systemKeys) {
                    masked[k] = adminConfig.systemKeys[k] ? maskKey(adminConfig.systemKeys[k]) : '';
                }
                adminConfig.systemKeys = masked;
            }
            res.json(adminConfig);
        } catch (error: any) {
            res.status(500).json({ message: 'Không thể tải cấu hình quản trị hệ thống.' });
        }
    },

    async updateSystemConfig(req: Request, res: Response) {
        try {
            if (!isAdmin(req.user)) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền cập nhật cấu hình hệ thống.' });
            }
            const updatedConfig = await systemModel.updateConfig(req.body);
            const safeUpdated = { ...updatedConfig };
            if (safeUpdated.systemKeys) {
                const masked: Record<string, string> = {};
                for (const k in safeUpdated.systemKeys) {
                    masked[k] = safeUpdated.systemKeys[k] ? maskKey(safeUpdated.systemKeys[k]) : '';
                }
                safeUpdated.systemKeys = masked;
            }
            res.json(safeUpdated);
        } catch (error: any) {
            res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình hệ thống.' });
        }
    },

    async getDashboardStats(req: Request, res: Response) {
        try {
            // Fix: Global Admin gets all stats. Space managers only see stats for spaces where they own the space or have 'dashboard' permission
            const superAdmin = !!req.user?.isGlobalAdmin;
            let managedSpaceIds: number[] = [];

            if (!superAdmin && req.user?.id) {
                const spacesWithDashboard = await pool.query(`
                    SELECT s.id FROM spaces s WHERE s.user_id = $1
                    UNION
                    SELECT r.space_id FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = $1 AND r.space_id IS NOT NULL AND 'dashboard' = ANY(r.permissions)
                `, [req.user.id]);
                managedSpaceIds = spacesWithDashboard.rows.map(r => Number(r.id));
            }
            
            let spaceIds: (number | string)[] | null = null;
            const reqSpaceId = req.query.spaceId ? parseInt(req.query.spaceId as string, 10) : null;

            if (superAdmin) {
                if (reqSpaceId) {
                    spaceIds = [reqSpaceId];
                } else {
                    spaceIds = null;
                }
            } else {
                if (reqSpaceId) {
                    if (managedSpaceIds.includes(reqSpaceId)) {
                        spaceIds = [reqSpaceId];
                    } else {
                        // Return empty if they request a space they don't have dashboard permission for
                        return res.json({
                            totalUsers: 0, totalAiConfigs: 0, totalConversations: 0,
                            interactingUsers: 0, topAIs: [], recentConversations: [],
                            totalDocuments: 0, totalSpaces: 0, totalDharmaTalks: 0,
                            topDocuments: [], topSpaces: [], topDharmaTalks: [],
                        });
                    }
                } else {
                    spaceIds = managedSpaceIds;
                }
            }

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

    async deleteUpload(req: Request, res: Response) {
        try {
            const { filePath } = req.body;
            if (!filePath || typeof filePath !== 'string') {
                return res.status(400).json({ message: 'filePath is required.' });
            }
            // Strip leading /uploads/ or uploads/
            const cleanRel = filePath.replace(/^\/?uploads\//, '');
            const targetAbs = path.resolve(uploadsDir, cleanRel);
            // Security check: ensure path is inside uploadsDir
            if (!targetAbs.startsWith(uploadsDir)) {
                return res.status(403).json({ message: 'Access denied.' });
            }
            if (fs.existsSync(targetAbs)) {
                await fs.promises.unlink(targetAbs);
            }
            res.json({ success: true });
        } catch (error: any) {
            logger.error('Failed to delete upload:', error);
            res.status(500).json({ message: 'Không thể xóa tệp tải lên.' });
        }
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
                const apiKey = process.env.GPT_API_KEY || process.env.VITE_GPT_API_KEY;
                if (!apiKey) return res.status(400).json({ message: `Vui lòng thêm API key cá nhân cho ${provider.toUpperCase()} trong Cài đặt.` });
                res.json(await gptService.listModels(apiKey));
            } else if (provider === 'gemini') {
                res.json(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview']);
            } else if (provider === 'groq') {
                // Groq Cloud - OpenAI-compatible, ultra-fast LPU inference
                // Free tier: ~14,400 requests/day. Docs: https://console.groq.com/docs/models
                res.json([
                    'llama-3.3-70b-versatile',
                    'llama-3.1-8b-instant',
                    'llama3-70b-8192',
                    'mixtral-8x7b-32768',
                    'gemma2-9b-it',
                    'qwen-qwq-32b',
                ]);
            } else if (provider === 'vertex') {
                res.json(['projects/343195597322/locations/us-central1/endpoints/6040161629629317120']);
            } else if (provider === 'grok') {
                res.json(['grok-1-mock']);
            } else if (provider === 'ollama') {
                // Query local Ollama instance for installed models
                const ollamaBase = process.env.OLLAMA_API_BASE?.replace('/v1', '') || 'http://localhost:11434';
                try {
                    const ollamaRes = await fetch(`${ollamaBase}/api/tags`);
                    if (!ollamaRes.ok) throw new Error(`Ollama API returned ${ollamaRes.status}`);
                    const data: any = await ollamaRes.json();
                    const models = (data.models || []).map((m: any) => m.name || m.model);
                    res.json(models.length > 0 ? models : ['qwen2.5:3b']);
                } catch (e: any) {
                    logger.warn('[Ollama] Could not fetch models from local Ollama:', e.message);
                    res.json(['qwen2.5:3b']); // fallback
                }
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
            
            let finalProvider = provider;
            let finalModel = model;

            // If AI Config found, use its specific TTS settings
            if (aiConfig) {
                if (aiConfig.ttsProvider) finalProvider = aiConfig.ttsProvider;
                if (aiConfig.ttsModel) finalModel = aiConfig.ttsModel;
                if (aiConfig.ttsVoice) finalVoice = aiConfig.ttsVoice;
                if (aiConfig.ttsStyle) finalStyle = aiConfig.ttsStyle;
                if (aiConfig.ttsTemperature !== undefined && aiConfig.ttsTemperature !== null) {
                    finalTemp = typeof aiConfig.ttsTemperature === 'number' ? aiConfig.ttsTemperature : parseFloat(aiConfig.ttsTemperature);
                }
            }

            let finalApiKey: string | null = null;
            if (aiConfig) {
                // If we have an AI config, resolve key through the hierarchy (Space -> Owner -> System)
                finalApiKey = await getApiKeyForAi(aiConfig, finalProvider).catch(() => null);
            } 
            
            if (!finalApiKey) {
                // Fallback logic for pure text-to-speech calls without an AI config
                finalApiKey = systemConfig?.systemKeys?.[finalProvider] || process.env[`${finalProvider.toUpperCase()}_API_KEY`] || process.env[`VITE_${finalProvider.toUpperCase()}_API_KEY`] || null;
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
        const { provider, model, text, targetLanguage, contextPrompt, spaceId } = req.body;
        if (!provider || !model || !text || !targetLanguage) {
            return res.status(400).json({ message: 'Missing required fields for translation.' });
        }

        try {
            const caller = req.user;
            if (!caller) return res.status(401).json({ message: 'Unauthorized' });

            let apiKey = '';
            if (spaceId) {
                const { hasSpacePermission, isAdmin } = await import('../middleware/authMiddleware.js');
                const canUseSpaceAi = isAdmin(caller) || (await hasSpacePermission(caller, spaceId, 'files')) || (await hasSpacePermission(caller, spaceId, 'ai'));
                if (!canUseSpaceAi) {
                    return res.status(403).json({ message: 'Bạn không có quyền sử dụng khóa AI của Space này.' });
                }

                const space = await spaceModel.findById(spaceId);
                if (space?.apiKeys?.[provider]) {
                    apiKey = space.apiKeys[provider] || '';
                }
            } else if (isAdmin(caller)) {
                const config = await systemModel.getConfig();
                const systemApiKeys = config?.apiKeys as Record<string, string> | undefined;
                if (systemApiKeys?.[provider]) {
                    apiKey = systemApiKeys[provider] || '';
                }
            }

            if (!apiKey) {
                return res.status(400).json({ message: `API Key for ${provider} not configured.` });
            }

            let translatedText = '';
            const service = provider === 'gemini' ? geminiService : gptService;

            if (!service || typeof service.translateText !== 'function') {
                return res.status(400).json({ message: `Unsupported translation provider: ${provider}` });
            }

            const docConfig = await documentModel.getConfig();
            const finalContextPrompt = contextPrompt || docConfig?.systemPrompt || '';

            translatedText = await service.translateText(text, targetLanguage, apiKey, model, finalContextPrompt);

            res.json({ translatedText });
        } catch (error: any) {
            res.status(500).json({ message: `Translation failed: ${error.message || String(error)}` });
        }
    },

    async explainContent(req: Request, res: Response) {
        const { provider, model, text, targetLanguage, spaceId } = req.body;
        if (!provider || !model || !text || !targetLanguage) {
            return res.status(400).json({ message: 'Missing required fields for explanation.' });
        }

        try {
            const caller = req.user;
            if (!caller) return res.status(401).json({ message: 'Unauthorized' });

            let apiKey = '';
            if (spaceId) {
                const { hasSpacePermission, isAdmin } = await import('../middleware/authMiddleware.js');
                const canUseSpaceAi = isAdmin(caller) || (await hasSpacePermission(caller, spaceId, 'files')) || (await hasSpacePermission(caller, spaceId, 'ai'));
                if (!canUseSpaceAi) {
                    return res.status(403).json({ message: 'Bạn không có quyền sử dụng khóa AI của Space này.' });
                }

                const space = await spaceModel.findById(spaceId);
                if (space?.apiKeys?.[provider]) {
                    apiKey = space.apiKeys[provider] || '';
                }
            } else if (isAdmin(caller)) {
                const config = await systemModel.getConfig();
                const systemApiKeys = config?.apiKeys as Record<string, string> | undefined;
                if (systemApiKeys?.[provider]) {
                    apiKey = systemApiKeys[provider] || '';
                }
            }

            if (!apiKey) {
                return res.status(400).json({ message: `API Key for ${provider} not configured.` });
            }

            const service = provider === 'gemini' ? geminiService : gptService;

            if (!service || typeof (service as any).generateExplanation !== 'function') {
                return res.status(400).json({ message: `Unsupported explanation provider: ${provider}` });
            }

            const docConfig = await documentModel.getConfig();
            const systemPrompt = docConfig?.systemPrompt || '';

            const explanation = await (service as any).generateExplanation(text, apiKey, model, targetLanguage, systemPrompt);

            res.json({ explanation });
        } catch (error: any) {
            res.status(500).json({ message: `Explanation generation failed: ${error.message || String(error)}` });
        }
    },
};
