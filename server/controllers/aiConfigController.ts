// server/controllers/aiConfigController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { userModel } from '../models/user.model.js';
import weaviateService from '../services/weaviateService.js';
import { pool } from '../db.js';
import { billingModel } from '../models/billing.model.js';
import { AIConfig, User } from '../types/index.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';

const mapAndSanitizeUser = (user: User | null) => {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};

export const aiConfigController = {
    async getVisibleAiConfigs(req: Request, res: Response) {
        const { userId } = req.body;
        try {
            let dbUser: User | null = null;
            if (userId) {
                dbUser = await userModel.findById(userId);
            }
            const configs = await aiConfigModel.findVisibleForUser(dbUser);
            res.json(configs);
        } catch (error: any) {
            logger.error("Lỗi tải danh sách AI:", error);
            res.status(500).json({ message: 'Không thể tải danh sách AI.' });
        }
    },

    async getManageableAiConfigs(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
            const configs = await aiConfigModel.findManageableForUser(req.user);
            res.json(configs);
        } catch (error: any) {
            logger.error("Lỗi tải danh sách AI có thể quản lý:", error);
            res.status(500).json({ message: 'Không thể tải danh sách AI để quản lý.' });
        }
    },

    async getAiConfigsBySpaceId(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.spaceId || req.params.id), 10);
            if (isNaN(spaceId)) {
                return res.status(400).json({ message: 'Invalid Space ID.' });
            }
            const configs = await aiConfigModel.findBySpaceId(spaceId);
            res.json(configs);
        } catch (error: any) {
            logger.error("Lỗi tải danh sách AI cho không gian:", error);
            res.status(500).json({ message: 'Không thể tải danh sách AI cho không gian này.' });
        }
    },

    async createAiConfig(req: Request, res: Response) {
        try {
            const data = { ...req.body };

            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

            // Non-admins (Content Managers) cannot create public AIs directly.
            if (!req.user.permissions.includes('roles')) {
                data.isPublic = false;

                // Also verify they own the space they're assigning to.
                const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [data.spaceId]);
                if (spaceRes.rows.length === 0 || spaceRes.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ message: 'You can only create AIs for spaces you own.' });
                }
            }

            const newConfig = await aiConfigModel.create(data);
            const fullNewConfig = await aiConfigModel.findById(newConfig.id);
            res.status(201).json(fullNewConfig);
        } catch (error: any) {
            logger.error("Lỗi tạo AI:", error);
            res.status(500).json({ message: error.message || 'Lỗi khi tạo AI mới.' });
        }
    },

    async updateAiConfig(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            const aiConfig = (await aiConfigModel.findById(aiId)) as AIConfig | null;
            if (!aiConfig) {
                return res.status(404).json({ message: 'AI not found.' });
            }

            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

            const isSuperAdmin = req.user.permissions.includes('roles');
            const isOwner = req.user.id === aiConfig.ownerId;

            if (!isSuperAdmin && !isOwner) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this AI.' });
            }

            const payload = { ...req.body };

            if (!isSuperAdmin && !isOwner) {
                delete payload.isPublic;
            }

            if (!isSuperAdmin && payload.spaceId) {
                const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [payload.spaceId]);
                if (spaceRes.rows.length === 0 || spaceRes.rows[0].user_id !== req.user.id) {
                    return res.status(403).json({ message: 'You can only assign AIs to spaces you own.' });
                }
            }

            const updatedConfig = await aiConfigModel.update(aiId, payload);
            if (!updatedConfig) {
                return res.status(404).json({ message: 'AI Config not found after update.' });
            }
            const fullUpdatedConfig = await aiConfigModel.findById(updatedConfig.id);
            res.json(fullUpdatedConfig);
        } catch (error: any) {
            logger.error("Error updating AI config:", error);
            res.status(500).json({ message: error.message || 'Lỗi khi cập nhật AI.' });
        }
    },

    async deleteAiConfig(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            const aiConfig = (await aiConfigModel.findById(aiId)) as AIConfig | null;
            if (!aiConfig) {
                return res.status(404).json({ message: 'AI config not found.' });
            }

            if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

            const isSuperAdmin = req.user.permissions.includes('roles');
            const isOwner = req.user.id === aiConfig.ownerId;

            if (!isSuperAdmin && !isOwner) {
                if (aiConfig.spaceId) {
                    const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [aiConfig.spaceId]);
                    if (spaceRes.rows.length === 0 || spaceRes.rows[0].user_id !== req.user.id) {
                        return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this AI.' });
                    }
                } else {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this AI.' });
                }
            }

            const owner = await userModel.findById(aiConfig.ownerId!);
            if (owner && owner.apiKeys) {
                if (owner.apiKeys.gpt) {
                    weaviateService.deleteDataByAiConfigId('gpt', aiId, owner.apiKeys.gpt).catch(err => logger.error(`Failed to cleanup Weaviate GPT data for deleted AI ${aiId}:`, err));
                }
                if (owner.apiKeys.gemini) {
                    weaviateService.deleteDataByAiConfigId('gemini', aiId, owner.apiKeys.gemini).catch(err => logger.error(`Failed to cleanup Weaviate Gemini data for deleted AI ${aiId}:`, err));
                }
            }

            await aiConfigModel.delete(aiId);
            res.status(204).send();
        } catch (error: any) {
            logger.error("Error deleting AI:", error);
            res.status(500).json({ message: 'Lỗi khi xóa AI.' });
        }
    },

    async purchaseAi(req: Request, res: Response) {
        const aiId = parseInt(String(req.params.id), 10);
        const { userId } = req.body;

        if (isNaN(aiId) || !userId) {
            return res.status(400).json({ message: 'Valid AI ID and User ID are required.' });
        }

        try {
            const result = await billingModel.purchaseAi(userId, aiId);
            res.json({ updatedUser: mapAndSanitizeUser(result.updatedUser) });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    },

    async claimFreeAi(req: Request, res: Response) {
        const aiId = parseInt(String(req.params.id), 10);
        const { userId } = req.body;

        if (isNaN(aiId) || !userId) {
            return res.status(400).json({ message: 'Valid AI ID and User ID are required.' });
        }

        try {
            const result = await billingModel.claimFreeAi(userId, aiId);
            res.json({ updatedUser: mapAndSanitizeUser(result.updatedUser) });
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    },

    async getAiAccessList(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            if (isNaN(aiId)) return res.status(400).json({ message: 'Invalid AI ID.' });
            const users = await aiConfigModel.getAccessList(aiId);
            res.json(users.map(mapAndSanitizeUser));
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to fetch access list.' });
        }
    },

    async updateAiAccessList(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            const { emails } = req.body;
            if (isNaN(aiId) || !Array.isArray(emails)) {
                return res.status(400).json({ message: 'Invalid AI ID or emails list.' });
            }

            const userIds = await userModel.findUserIdsByEmails(emails);
            await aiConfigModel.setAccessList(aiId, userIds);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: 'Failed to update access list.' });
        }
    },

    /**
     * Trả về ephemeral token (thay vì raw API key) + Voice/Style config của owner AI config
     * để dùng cho Voice Live Stream. Ephemeral token có hiệu lực 30 phút, chỉ dùng 1 phiên.
     * 
     * Điều này ngăn không cho API key bị lộ ra client-side (nguyên nhân Google vô hiệu hóa key).
     */
    async getAiVoiceKey(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            if (isNaN(aiId)) return res.status(400).json({ message: 'Invalid AI ID.' });

            const aiConfig = (await aiConfigModel.findById(aiId)) as AIConfig | null;
            if (!aiConfig) return res.status(404).json({ message: 'AI config not found.' });

            let realGeminiKey: string;
            try {
                realGeminiKey = await getApiKeyForAi(aiConfig, 'gemini');
            } catch (err: any) {
                return res.status(404).json({ message: err.message || 'Gemini API key not configured.' });
            }

            // Tìm config voice từ Space hoặc Owner
            let geminiVoice = 'Algieba';
            let geminiStyle = '';
            let geminiTemperature = 1;

            if (aiConfig.spaceId) {
                const spaceRes = await pool.query('SELECT api_keys FROM spaces WHERE id = $1', [aiConfig.spaceId]);
                if (spaceRes.rows.length > 0 && spaceRes.rows[0].api_keys) {
                    const spaceKeys = spaceRes.rows[0].api_keys;
                    if (spaceKeys.geminiVoice) geminiVoice = spaceKeys.geminiVoice;
                    if (spaceKeys.geminiStyle) geminiStyle = spaceKeys.geminiStyle;
                    if (spaceKeys.geminiTemperature) geminiTemperature = parseFloat(spaceKeys.geminiTemperature);
                }
            } else if (aiConfig.ownerId) {
                const owner = await userModel.findById(aiConfig.ownerId);
                if (owner?.apiKeys) {
                    if (owner.apiKeys.geminiVoice) geminiVoice = owner.apiKeys.geminiVoice;
                    if (owner.apiKeys.geminiStyle) geminiStyle = owner.apiKeys.geminiStyle;
                    if (owner.apiKeys.geminiTemperature) geminiTemperature = parseFloat(String(owner.apiKeys.geminiTemperature));
                }
            }

            // Tạo ephemeral token thay vì trả raw key
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const client = new GoogleGenAI({ apiKey: realGeminiKey });
                const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000);

                const token = await (client as any).authTokens.create({
                    config: {
                        uses: 1,
                        expireTime,
                        newSessionExpireTime,
                        httpOptions: { apiVersion: 'v1alpha' },
                    },
                });

                return res.json({
                    ephemeralToken: token.name,
                    geminiVoice,
                    geminiStyle,
                    geminiTemperature,
                });
            } catch (tokenErr: any) {
                logger.error('Failed to create ephemeral token, check if the Gemini key is valid:', tokenErr?.message || tokenErr);
                return res.status(500).json({ message: 'Failed to create secure voice session. The Gemini API key may be invalid.' });
            }
        } catch (error: any) {
            logger.error('Error fetching AI voice key:', error);
            res.status(500).json({ message: 'Failed to fetch voice key.' });
        }
    }
};

