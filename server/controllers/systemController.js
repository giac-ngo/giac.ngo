// server/controllers/systemController.js
import { systemModel } from '../models/system.model.js';
import { gptService } from '../services/gptService.js';
import { geminiService } from '../services/geminiService.js';
import { userModel } from '../models/user.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getUserManagedSpaceIds, isAdmin } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { spaceId, userScoped } = req.body;
        const userId = req.user?.id;
        let dir;

        if (spaceId && spaceId !== 'global' && spaceId !== 'system') {
            const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
            // userScoped=true → personal folder (avatar, social)
            if ((userScoped === 'true' || userScoped === true) && userId) {
                dir = path.join(uploadsDir, `space-${safeSpaceId}`, `user-${userId}`);
            } else {
                // Space-level flat directory (TTS audio, admin uploads)
                dir = path.join(uploadsDir, `space-${safeSpaceId}`);
            }
        } else {
            // System-level uploads (super admin)
            dir = path.join(uploadsDir, 'system');
        }

        try {
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        } catch (err) {
            console.error('Error creating upload directory:', err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const utf8OriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const safeOriginalName = path.basename(utf8OriginalName).replace(/[^\w\s.\-\p{L}]/gu, '_');
        cb(null, safeOriginalName);
    }
});

const trainingFileFilter = (req, file, cb) => {
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
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images, audio, PDF, Word, Excel, text.`), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: trainingFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const systemController = {
    async getSystemConfig(req, res) {
        try {
            const config = await systemModel.getConfig();
            if (!config) {
                return res.status(404).json({ message: 'System configuration not found.' });
            }
            res.json(config);
        } catch (error) {
            res.status(500).json({ message: 'Không thể tải cấu hình hệ thống.' });
        }
    },

    async updateSystemConfig(req, res) {
        try {
            const updatedConfig = await systemModel.updateConfig(req.body);
            res.json(updatedConfig);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi khi cập nhật cấu hình hệ thống.' });
        }
    },

    async getDashboardStats(req, res) {
        try {
            // Use isAdmin() function (checks permissions.includes('roles'))
            // instead of legacy req.user.isAdmin field
            const superAdmin = isAdmin(req.user);
            const spaceIds = superAdmin ? [] : await getUserManagedSpaceIds(req.user.id);

            const stats = await systemModel.getDashboardStats(spaceIds);
            res.json(stats);
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    },

    async getPublicStats(req, res) {
        try {
            // Public endpoint - returns global stats without auth
            // Pass empty spaceIds to get all-platform stats
            const stats = await systemModel.getDashboardStats([]);
            // Only return safe, non-sensitive aggregated numbers
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
        } catch (error) {
            console.error('Error in getPublicStats:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },


    uploadFiles(req, res) {
        if (!req.file) {
            return res.status(400).send('No file was uploaded.');
        }
        // Construct the relative path from the 'uploads' directory
        const relativePath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/');
        const filePaths = [`/uploads/${relativePath}`];
        res.json({ filePaths });
    },

    async getAvailableModels(req, res) {
        const { provider } = req.params;
        // Accept userId from query OR from authenticated token
        const rawUserId = req.query.userId || req.user?.id;
        if (!rawUserId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }
        try {
            const userIdNum = parseInt(Array.isArray(rawUserId) ? rawUserId[0] : rawUserId, 10);
            const user = await userModel.findById(userIdNum);

            if (provider === 'gpt') {
                const apiKey = user?.apiKeys?.gpt || process.env.GPT_API_KEY || process.env.VITE_GPT_API_KEY;
                if (!apiKey) return res.status(400).json({ message: `Vui lòng thêm API key cá nhân cho ${provider.toUpperCase()} trong Cài đặt.` });
                res.json(await gptService.listModels(apiKey));
            } else if (provider === 'gemini') {
                res.json(['gemini-3-flash-preview', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash-preview-tts']);
            }
            else if (provider === 'vertex') {
                res.json(['projects/343195597322/locations/us-central1/endpoints/6040161629629317120']);
            } else if (provider === 'grok') {
                res.json(['grok-1-mock']);
            } else {
                res.status(400).json({ message: `Provider '${provider}' is not supported.` });
            }
        } catch (error) {
            res.status(500).json({ message: `Failed to fetch models from ${provider}: ${error.message}` });
        }
    },

    async generateTtsAudio(req, res) {
        const { text, provider, model, voice, lang, userId, styleInstruction, temperature } = req.body;
        if (!text || !provider || !model || !voice || !lang || !userId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        try {
            const user = await userModel.findById(userId);
            const systemConfig = await systemModel.getConfig();
            const apiKey = user?.apiKeys?.[provider] || systemConfig?.systemKeys?.[provider] || process.env[`${provider.toUpperCase()}_API_KEY`] || process.env[`VITE_${provider.toUpperCase()}_API_KEY`];


            if (!apiKey) {
                return res.status(400).json({ message: `API Key for ${provider} not configured.` });
            }

            let audioContent = '';
            let mimeType = 'audio/mp3'; // Default fallback MimeType

            if (provider === 'gemini') {
                const result = await geminiService.generateTts(text, apiKey, model, voice, styleInstruction || '', temperature);
                // Handle returned object { audioContent, mimeType } or just string (legacy fallback)
                if (typeof result === 'string') {
                    audioContent = result;
                } else {
                    audioContent = result.audioContent;
                    mimeType = result.mimeType || 'audio/mp3';
                }
            } else if (provider === 'gpt') {
                audioContent = await gptService.generateTts(text, apiKey, model, voice);
                mimeType = 'audio/mp3'; // OpenAI TTS usually is MP3 unless configured otherwise
            } else {
                return res.status(400).json({ message: 'Unsupported TTS provider.' });
            }

            res.json({ audioContent, mimeType });
        } catch (error) {
            console.error("----- TTS GENERATION ERROR -----");
            console.error(error);
            console.error("--------------------------------");
            res.status(500).json({ message: `TTS generation failed: ${error.message}` });
        }
    },

    async translateText(req, res) {
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
        } catch (error) {
            res.status(500).json({ message: `Translation failed: ${error.message}` });
        }
    },
};