// server/controllers/chatController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { userModel } from '../models/user.model.js';
import { systemModel } from '../models/system.model.js';
import { billingModel } from '../models/billing.model.js';
import { conversationModel } from '../models/conversation.model.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { geminiService } from '../services/geminiService.js';
import { gptService } from '../services/gptService.js';
import { grokService } from '../services/grokService.js';
import { groqService } from '../services/groqService.js';
import { ollamaService } from '../services/ollamaService.js';
import { fileParserService } from '../services/fileParserService.js';
import weaviateService from '../services/weaviateService.js';
import { pgVectorService } from '../services/pgVectorService.js';
import { vertexService } from '../services/vertexService.js';
import { AIConfig, User } from '../types/index.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';
import { spaceModel } from '../models/space.model.js';
import { toPublicUser } from '../utils/sanitizeUser.js';
import { isAdmin, hasSpacePermission } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';
import { FileAccessDeniedError } from '../services/fileParserService.js';

async function performVectorSearch(aiConfig: AIConfig, queryText: string, apiKey: string) {
    const vectorBackend = aiConfig.vectorBackend || 'weaviate';
    if (vectorBackend === 'pgvector') {
        return await pgVectorService.search(aiConfig.id, queryText, apiKey);
    } else {
        const searchProvider = (aiConfig.embeddingProvider as string) || aiConfig.modelType;
        const searchApiKey = searchProvider !== aiConfig.modelType
            ? await getApiKeyForAi(aiConfig, searchProvider).catch(() => apiKey)
            : apiKey;
        return await weaviateService.search(searchProvider, aiConfig.id, queryText, searchApiKey);
    }
}

const getClientIp = (req: Request): string => {
    // Rely strictly on req.ip computed by Express based on 'trust proxy' in index.ts
    // Do NOT parse raw X-Forwarded-For directly from client headers to prevent IP spoofing
    return req.ip || req.socket.remoteAddress || 'unknown_guest';
};

interface GuestDailyRecord {
    date: string;
    count: number;
}
const guestDailyTracker = new Map<string, GuestDailyRecord>();

const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

const refundGuestLimitMemory = (clientIp: string): void => {
    const today = getTodayDateString();
    const current = guestDailyTracker.get(clientIp);
    if (current && current.date === today && current.count > 0) {
        current.count -= 1;
    }
};

const checkAndIncrementGuestLimitMemory = (clientIp: string, dailyLimit: number): { allowed: boolean; count: number } => {
    const today = getTodayDateString();

    if (guestDailyTracker.size > 5000) {
        for (const [key, val] of guestDailyTracker.entries()) {
            if (val.date !== today) {
                guestDailyTracker.delete(key);
            }
        }
    }

    const current = guestDailyTracker.get(clientIp);
    if (!current || current.date !== today) {
        if (dailyLimit <= 0) {
            return { allowed: false, count: 0 };
        }
        guestDailyTracker.set(clientIp, { date: today, count: 1 });
        return { allowed: true, count: 1 };
    }

    if (current.count >= dailyLimit) {
        return { allowed: false, count: current.count };
    }

    current.count += 1;
    return { allowed: true, count: current.count };
};

interface GuestLimitReservation {
    ip: string;
    storage: 'database' | 'memory';
}

const checkAndIncrementGuestLimit = async (clientIp: string, dailyLimit: number): Promise<{ allowed: boolean; count: number; storage: 'database' | 'memory' }> => {
    try {
        const res = await pool.query(`
            WITH ins AS (
                INSERT INTO guest_daily_usage (ip, date, count)
                VALUES ($1, CURRENT_DATE, 1)
                ON CONFLICT (ip, date)
                DO UPDATE SET count = guest_daily_usage.count + 1
                WHERE guest_daily_usage.count < $2
                RETURNING count, false AS exceeded
            )
            SELECT count, exceeded FROM ins
            UNION ALL
            SELECT count, true AS exceeded 
            FROM guest_daily_usage 
            WHERE ip = $1 AND date = CURRENT_DATE 
              AND NOT EXISTS (SELECT 1 FROM ins)
        `, [clientIp, dailyLimit]);
        if (res.rows.length === 0) {
            return { allowed: false, count: dailyLimit, storage: 'database' };
        }
        const { count, exceeded } = res.rows[0];
        return { allowed: !exceeded, count: Number(count), storage: 'database' };
    } catch (dbErr: any) {
        logger.warn('DB guest tracking failed, using memory fallback:', dbErr.message || String(dbErr));
        const memRes = checkAndIncrementGuestLimitMemory(clientIp, dailyLimit);
        return { ...memRes, storage: 'memory' };
    }
};

const canUserAccessAi = async (user: User | null | undefined, aiConfig: AIConfig): Promise<boolean> => {
    if (aiConfig.isPublic) return true;
    if (!user) return false;
    if (isAdmin(user)) return true;
    if (aiConfig.spaceId && await hasSpacePermission(user, aiConfig.spaceId, 'ai')) return true;

    // Check if user was granted access explicitly
    const isGranted = await aiConfigModel.checkUserAccess(aiConfig.id, user.id);
    if (isGranted) return true;

    // Check if user has purchased this AI AND has requests remaining (> 0)
    const perAiCount = await aiConfigModel.getUserRequestCount(user.id, aiConfig.id);
    if (perAiCount !== null && perAiCount > 0) return true;

    return false;
};

interface ChargeReservation {
    method: 'none' | 'ai_specific' | 'subscription' | 'merit_cost';
    dailyUsageIncremented: boolean;
    error?: string;
    statusCode?: number;
}

async function reserveUserCharge(currentUser: User, aiConfig: AIConfig): Promise<ChargeReservation> {
    const isFreeAi = (!aiConfig.purchaseCost || aiConfig.purchaseCost === 0) &&
        (!aiConfig.meritCost || aiConfig.meritCost === 0);

    let dailyUsageIncremented = false;

    // Atomically check daily limit and increment usage in a single conditional DB operation
    if (!aiConfig.isContactForAccess) {
        const baseDailyLimit = aiConfig.baseDailyLimit ?? 20;
        const limitCheck = await billingModel.checkAndIncrementDailyUsage(currentUser.id, baseDailyLimit);
        if (!limitCheck.allowed) {
            return {
                method: 'none',
                dailyUsageIncremented: false,
                error: `DAILY_LIMIT_REACHED:${limitCheck.baseDailyLimit}:${limitCheck.bonusLimit}`,
                statusCode: 429
            };
        }
        dailyUsageIncremented = true;
    }

    if (aiConfig.isContactForAccess) {
        const isGranted = await aiConfigModel.checkUserAccess(aiConfig.id, currentUser.id);
        if (!isGranted) {
            return { method: 'none', dailyUsageIncremented: false, error: "This AI requires special access. Please contact the administrator.", statusCode: 403 };
        }
        return { method: 'none', dailyUsageIncremented: false };
    } else if (isFreeAi) {
        return { method: 'none', dailyUsageIncremented };
    } else {
        // 1. Per-AI purchased requests: atomically decrement
        const perAiCount = await aiConfigModel.getUserRequestCount(currentUser.id, aiConfig.id);
        if (perAiCount !== null) {
            const decRes = await aiConfigModel.decrementUserRequestCount(currentUser.id, aiConfig.id);
            if (decRes.success) {
                return { method: 'ai_specific', dailyUsageIncremented };
            } else {
                if (dailyUsageIncremented) await billingModel.decrementDailyUsage(currentUser.id);
                return { method: 'none', dailyUsageIncremented: false, error: "You have used all your requests for this specific AI.", statusCode: 402 };
            }
        }

        // 2. Merit cost: atomically deduct merits
        if (aiConfig.meritCost && aiConfig.meritCost > 0) {
            const meritRes = await pool.query(
                'UPDATE users SET merits = merits - $1 WHERE id = $2 AND merits >= $1 RETURNING merits',
                [aiConfig.meritCost, currentUser.id]
            );
            if (meritRes.rows.length > 0) {
                userModel.invalidateCache(currentUser.id);
                return { method: 'merit_cost', dailyUsageIncremented };
            } else {
                if (dailyUsageIncremented) await billingModel.decrementDailyUsage(currentUser.id);
                return { method: 'none', dailyUsageIncremented: false, error: "You do not have enough merits for this request.", statusCode: 402 };
            }
        }

        // 3. Purchase required if purchaseCost is set and not owned
        if (aiConfig.purchaseCost && aiConfig.purchaseCost > 0) {
            if (dailyUsageIncremented) await billingModel.decrementDailyUsage(currentUser.id);
            return { method: 'none', dailyUsageIncremented: false, error: "This AI must be purchased to use.", statusCode: 402 };
        }

        // 4. Subscription plan requests: atomically deduct
        if (currentUser.requestsRemaining !== null && currentUser.requestsRemaining !== undefined) {
            const subRes = await pool.query(
                'UPDATE users SET requests_remaining = requests_remaining - 1 WHERE id = $1 AND requests_remaining > 0 RETURNING requests_remaining',
                [currentUser.id]
            );
            if (subRes.rows.length > 0) {
                userModel.invalidateCache(currentUser.id);
                return { method: 'subscription', dailyUsageIncremented };
            } else {
                if (dailyUsageIncremented) await billingModel.decrementDailyUsage(currentUser.id);
                return { method: 'none', dailyUsageIncremented: false, error: "You have reached the request limit for your subscription plan.", statusCode: 402 };
            }
        }

        return { method: 'none', dailyUsageIncremented };
    }
}

async function refundUserCharge(userId: number | string, aiConfig: AIConfig, reservation: ChargeReservation): Promise<void> {
    try {
        if (reservation.dailyUsageIncremented) {
            await billingModel.decrementDailyUsage(userId);
        }
        if (reservation.method === 'none') return;
        switch (reservation.method) {
            case 'ai_specific':
                await pool.query(
                    'UPDATE user_owned_ais SET requests_remaining = requests_remaining + 1 WHERE user_id = $1 AND ai_config_id = $2',
                    [userId, aiConfig.id]
                );
                break;
            case 'subscription':
                await pool.query(
                    'UPDATE users SET requests_remaining = requests_remaining + 1 WHERE id = $1',
                    [userId]
                );
                break;
            case 'merit_cost':
                await pool.query(
                    'UPDATE users SET merits = merits + $1 WHERE id = $2',
                    [aiConfig.meritCost || 0, userId]
                );
                break;
        }
        userModel.invalidateCache(userId);
    } catch (refundErr) {
        logger.error('Failed to refund user charge:', refundErr);
    }
}

async function refundGuestLimit(reservation: GuestLimitReservation): Promise<void> {
    if (reservation.storage === 'memory') {
        refundGuestLimitMemory(reservation.ip);
    } else {
        try {
            await pool.query(
                'UPDATE guest_daily_usage SET count = GREATEST(0, count - 1) WHERE ip = $1 AND date = CURRENT_DATE AND count > 0',
                [reservation.ip]
            );
        } catch (err) {
            logger.error('Failed to refund guest limit in DB:', err);
        }
    }
}

export const chatController = {
    async sendMessageStream(req: Request, res: Response) {
        let { aiConfig, aiConfigId, messages, message, conversationId, isTestChat, language = 'vi', clientAiMessageId, guestTurnCount, userPersona } = req.body;

        if (!messages && message) {
            if (typeof message === 'string') {
                messages = [{
                    id: `msg-${Date.now()}`,
                    sender: 'user',
                    text: message,
                    timestamp: Date.now()
                }];
            } else {
                messages = message;
            }
        }

        const rawConfigId = aiConfigId || (aiConfig && aiConfig.id);
        if (!rawConfigId) {
            res.status(400).json({ error: "aiConfigId is required." });
            return;
        }

        const resolvedAiConfig = await aiConfigModel.findById(Number(rawConfigId));
        if (!resolvedAiConfig) {
            res.status(404).json({ error: "AI Config not found." });
            return;
        }
        aiConfig = resolvedAiConfig;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ error: "message is required." });
            return;
        }

        const currentUser = req.user;
        const userId = currentUser ? currentUser.id : null;

        // Check if AI is private or requires authorization:
        const hasAiAccess = await canUserAccessAi(currentUser, aiConfig);
        if (!hasAiAccess) {
            res.status(403).json({ error: "AI này không công khai hoặc bạn không có quyền truy cập." });
            return;
        }

        // Secure isTestChat: only managers with 'ai' permission in this space or global admins can test-chat
        let validTestChat = false;
        if (isTestChat) {
            if (currentUser && (isAdmin(currentUser) || (aiConfig.spaceId && await hasSpacePermission(currentUser, aiConfig.spaceId, 'ai')))) {
                validTestChat = true;
            }
        }
        isTestChat = validTestChat;

        // Secure conversationId ownership: prevent accessing or modifying other users' conversations
        if (conversationId) {
            const existingConv = await conversationModel.findById(conversationId);
            if (!existingConv) {
                res.status(404).json({ error: "Conversation not found." });
                return;
            }
            if (existingConv.userId) {
                if (!currentUser || (existingConv.userId !== currentUser.id && !isAdmin(currentUser))) {
                    res.status(403).json({ error: "Forbidden: You do not have access to this conversation." });
                    return;
                }
            }
            if (existingConv.aiConfigId && existingConv.aiConfigId !== aiConfig.id) {
                res.status(400).json({ error: "Conversation does not match the requested AI." });
                return;
            }
        }

        const finalMessages = [...messages];
        const lastMessage = finalMessages[finalMessages.length - 1];
        if (lastMessage && lastMessage.sender === 'user' && lastMessage.fileAttachment) {
            if (!currentUser) {
                res.status(401).json({ error: "Bạn cần đăng nhập để gửi tệp đính kèm." });
                return;
            }
            try {
                const { url, name } = lastMessage.fileAttachment;
                const text = await fileParserService.extractText(url, name, {
                    userId: currentUser.id,
                    isAdmin: isAdmin(currentUser),
                });
                lastMessage.text = `File "${name}" content:\n${text}\n\nUser prompt: "${lastMessage.text || ''}"`;
                delete lastMessage.fileAttachment;
            } catch (err: any) {
                if (err instanceof FileAccessDeniedError) {
                    res.status(err.statusCode || 403).json({ error: err.message });
                    return;
                }
                res.status(400).json({ error: `Không thể đọc nội dung tệp tin: ${err.message || 'Tệp bị lỗi hoặc không thể xử lý.'}` });
                return;
            }
        }

        let reservation: ChargeReservation | null = null;
        let guestReservation: GuestLimitReservation | null = null;

        if (!isTestChat) {
            if (currentUser) {
                const chargeResult = await reserveUserCharge(currentUser, aiConfig);
                if (chargeResult.error) {
                    const statusCode = chargeResult.statusCode || (chargeResult.error.startsWith('DAILY_LIMIT_REACHED') ? 429 : 402);
                    res.status(statusCode).json({ error: chargeResult.error });
                    return;
                }
                reservation = chargeResult;
            } else {
                const systemConfig = await systemModel.getConfig();
                
                let guestRegisterThreshold = 5;
                let guestDailyLimit = 20;

                if (aiConfig.spaceId) {
                    const space = await spaceModel.findById(aiConfig.spaceId);
                    guestRegisterThreshold = space?.guestMessageLimit ?? (systemConfig as any).guestMessageLimit ?? 5;
                    guestDailyLimit = space?.guestDailyLimit ?? (systemConfig as any).guestDailyLimit ?? 20;
                } else {
                    guestRegisterThreshold = (systemConfig as any).guestMessageLimit || 5;
                    guestDailyLimit = (systemConfig as any).guestDailyLimit || 20;
                }

                // Server-side daily guest tracking by IP to prevent limit bypass
                const clientIp = getClientIp(req);
                const guestCheck = await checkAndIncrementGuestLimit(clientIp, guestDailyLimit);
                if (!guestCheck.allowed) {
                    res.status(429).json({ error: "Bạn đã hết lượt chat miễn phí hôm nay. Vui lòng đăng nhập để tiếp tục." });
                    return;
                }
                guestReservation = { ip: clientIp, storage: guestCheck.storage };

                const guestMessageTurns = finalMessages.filter(m => m.sender === 'user').length;
                if (guestMessageTurns > guestDailyLimit || (guestTurnCount !== undefined && Number(guestTurnCount) >= guestDailyLimit)) {
                    await refundGuestLimit(guestReservation);
                    res.status(429).json({ error: "Bạn đã hết lượt chat miễn phí hôm nay. Vui lòng đăng nhập để tiếp tục." });
                    return;
                }

                if (aiConfig.isContactForAccess) {
                    await refundGuestLimit(guestReservation);
                    res.status(403).json({ error: "This AI requires special access. Please log in or contact the administrator." });
                    return;
                }
            }
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        let isCompleted = false;
        let chargeRefunded = false;
        const refundOnce = async () => {
            if (chargeRefunded) return;
            chargeRefunded = true;
            if (currentUser && !isTestChat && reservation) {
                await refundUserCharge(currentUser.id, aiConfig, reservation);
            } else if (!currentUser && !isTestChat && guestReservation) {
                await refundGuestLimit(guestReservation);
            }
        };

        // Handle premature client disconnection / abort
        res.on('close', () => {
            if (!isCompleted && !res.writableEnded) {
                refundOnce().catch(err => logger.error("Failed to refund on aborted stream:", err));
            }
        });

        const onError = async (error: any) => {
            await refundOnce();
            const userMessage = error.message || "An unexpected error occurred.";
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.flushHeaders();
            }
            res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
            res.end();
        };

        try {
            let retrievedContext = '';

            const apiKey = await getApiKeyForAi(aiConfig);

            const lastUserMessage = finalMessages.slice().reverse().find(m => m.sender === 'user');
            if (lastUserMessage?.text && apiKey) {
                try {
                    const results = await performVectorSearch(aiConfig, lastUserMessage.text, apiKey);
                    if (results?.length > 0) {
                        retrievedContext = "--- Relevant Information ---\n" + results.map((r: any) => r.content).join('\n\n') + "\n--- End of Information ---\n\n";
                    }
                } catch (e: any) {
                    logger.warn("Vector search failed during stream chat:", e.message || String(e));
                }
            }

            const onChunk = (chunk: string) => res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            
            const onEnd = async (finalMessage: any) => {
                try {
                    let finalConvId = conversationId;
                    const { text, thought } = finalMessage;
                    const aiMessage = { id: clientAiMessageId || `ai-${Date.now()}`, text, sender: 'ai', timestamp: Date.now(), thought: thought || undefined };
                    const allFinalMessages = [...finalMessages, aiMessage];

                    if (conversationId) {
                        await conversationModel.update(conversationId, allFinalMessages);
                    } else if (typeof aiConfig.id === 'number') {
                        const newConv = await conversationModel.create({
                            userId: currentUser?.id as number,
                            userName: currentUser?.name || 'Guest',
                            aiConfigId: aiConfig.id,
                            messages: allFinalMessages,
                            isTestChat,
                        });
                        finalConvId = newConv.id;
                    }

                    let updatedUser: User | null = null;
                    if (currentUser && !isTestChat) {
                        updatedUser = await userModel.findById(currentUser.id);
                    }

                    isCompleted = true;
                    res.write(`data: ${JSON.stringify({ conversationId: finalConvId, done: true, updatedUser: toPublicUser(updatedUser), text, thought })}\n\n`);
                    res.end();
                } catch (error: any) {
                    logger.error("Error in onEnd callback:", error);
                    await onError(error);
                }
            };

            const services: Record<string, any> = { gemini: geminiService, gpt: gptService, grok: grokService, groq: groqService, vertex: vertexService, ollama: ollamaService };
            const service = services[aiConfig.modelType];
            if (!service) return onError(new Error(`Unsupported model type: ${aiConfig.modelType}`));
            
            service.sendMessageStream(aiConfig, finalMessages.slice(-8), apiKey, { onChunk, onEnd, onError }, language, retrievedContext, userPersona);

        } catch (error: any) {
            await onError(error);
        }
    },

    async estimateContext(req: Request, res: Response) {
        try {
            const currentUser = req.user;
            if (!currentUser) {
                return res.status(401).json({ message: 'Authentication required.' });
            }

            const rawConfigId = req.body.aiConfigId || req.body.aiConfig?.id;
            if (!rawConfigId) {
                return res.status(400).json({ message: 'aiConfigId is required.' });
            }

            const aiConfig = await aiConfigModel.findById(Number(rawConfigId));
            if (!aiConfig) {
                return res.status(404).json({ message: 'AI config not found.' });
            }

            // Inspection of system prompt and raw RAG chunks must only be allowed for managers of this AI
            const isOwner = aiConfig.ownerId && Number(aiConfig.ownerId) === Number(currentUser.id);
            const canManageAi = isAdmin(currentUser) || isOwner || (aiConfig.spaceId ? await hasSpacePermission(currentUser, aiConfig.spaceId, 'ai') : false);
            if (!canManageAi) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to inspect this AI.' });
            }

            const { userMessage } = req.body;
            const apiKey = await getApiKeyForAi(aiConfig);

            let ragContext = '';
            if (apiKey && userMessage) {
                try {
                    const results = await performVectorSearch(aiConfig, userMessage, apiKey);
                    if (results?.length > 0) {
                        ragContext = "--- Relevant Information ---\n" + results.map((r: any) => r.content).join('\n\n') + "\n--- End of Information ---\n\n";
                    }
                } catch (e: any) { logger.warn("Vector search failed during estimation:", e.message || String(e)); }
            }

            const systemPrompt = aiConfig.trainingContent || '';
            let qaContext = '';
            let fileContext = '';
            let documentContext = '';

            res.json({ systemPrompt, qaContext, fileContext, documentContext, ragContext });
        } catch (error: any) {
            res.status(500).json({ message: error.message || 'Failed to estimate context tokens.' });
        }
    },

    async sendMessageJson(req: Request, res: Response) {
        let aiConfig: AIConfig | null = null;
        let reservation: ChargeReservation | null = null;
        let guestReservation: GuestLimitReservation | null = null;
        let isCompleted = false;
        let chargeRefunded = false;

        const refundOnce = async () => {
            if (chargeRefunded) return;
            chargeRefunded = true;
            if (req.user && reservation && aiConfig) {
                await refundUserCharge(req.user.id, aiConfig, reservation);
            } else if (!req.user && guestReservation) {
                await refundGuestLimit(guestReservation);
            }
        };

        // Handle premature client disconnection / abort
        res.on('close', () => {
            if (!isCompleted && !res.writableEnded) {
                refundOnce().catch(err => logger.error("Failed to refund on aborted JSON request:", err));
            }
        });

        try {
            let { aiConfigId, message, language = 'vi', userPersona } = req.body;

            if (!aiConfigId) {
                return res.status(400).json({ error: 'aiConfigId is required' });
            }
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: 'message (string) is required' });
            }

            aiConfig = await aiConfigModel.findById(aiConfigId);
            if (!aiConfig) {
                return res.status(404).json({ error: 'AI Config not found' });
            }

            const hasAiAccess = await canUserAccessAi(req.user, aiConfig);
            if (!hasAiAccess) {
                return res.status(403).json({ error: 'AI này không công khai hoặc bạn không có quyền truy cập.' });
            }

            const messages = [{
                id: `msg-${Date.now()}`,
                sender: 'user',
                text: message,
                timestamp: Date.now()
            }];

            const finalMessages = [...messages];
            const lastMessage = finalMessages[finalMessages.length - 1];
            if (lastMessage && lastMessage.sender === 'user' && (lastMessage as any).fileAttachment) {
                if (!req.user) {
                    return res.status(401).json({ error: "Bạn cần đăng nhập để gửi tệp đính kèm." });
                }
                const { url, name } = (lastMessage as any).fileAttachment;
                try {
                    const text = await fileParserService.extractText(url, name, {
                        userId: req.user.id,
                        isAdmin: isAdmin(req.user),
                    });
                    lastMessage.text = `File "${name}" content:\n${text}\n\nUser prompt: "${lastMessage.text || ''}"`;
                    delete (lastMessage as any).fileAttachment;
                } catch (err: any) {
                    if (err instanceof FileAccessDeniedError) {
                        return res.status(err.statusCode || 403).json({ error: err.message });
                    }
                    return res.status(400).json({ error: `Không thể đọc nội dung tệp tin: ${err.message || 'Tệp bị lỗi hoặc không thể xử lý.'}` });
                }
            }

            if (req.user) {
                const chargeResult = await reserveUserCharge(req.user, aiConfig);
                if (chargeResult.error) {
                    const statusCode = chargeResult.statusCode || (chargeResult.error.startsWith('DAILY_LIMIT_REACHED') ? 429 : 402);
                    return res.status(statusCode).json({ error: chargeResult.error });
                }
                reservation = chargeResult;
            } else {
                const systemConfig = await systemModel.getConfig();
                const guestDailyLimit = (aiConfig.spaceId ? (await spaceModel.findById(aiConfig.spaceId))?.guestDailyLimit : null)
                    ?? (systemConfig as any).guestDailyLimit ?? 20;

                const clientIp = getClientIp(req);
                const guestCheck = await checkAndIncrementGuestLimit(clientIp, guestDailyLimit);
                if (!guestCheck.allowed) {
                    return res.status(429).json({ error: "Bạn đã hết lượt chat miễn phí hôm nay. Vui lòng đăng nhập để tiếp tục." });
                }
                guestReservation = { ip: clientIp, storage: guestCheck.storage };

                if (aiConfig.isContactForAccess) {
                    await refundGuestLimit(guestReservation);
                    return res.status(403).json({ error: "This AI requires special access. Please log in or contact the administrator." });
                }
            }

            const apiKey = await getApiKeyForAi(aiConfig);

            let retrievedContext = '';
            const lastUserMessage = finalMessages.slice().reverse().find(m => m.sender === 'user');
            if (lastUserMessage?.text && apiKey) {
                try {
                    const results = await performVectorSearch(aiConfig, lastUserMessage.text, apiKey);
                    if (results?.length > 0) {
                        retrievedContext = "--- Relevant Information ---\n" + results.map((r: any) => r.content).join('\n\n') + "\n--- End of Information ---\n\n";
                    }
                } catch (e: any) {
                    logger.warn("Vector search failed:", e.message || String(e));
                }
            }

            let fullResponseText = '';
            let responseThought = null;
            let hasError = false;
            let errorMessage = '';

            const onChunk = (chunk: string) => {
                fullResponseText += chunk;
            };

            const onEnd = async (finalMessage: any) => {
                const { text, thought } = finalMessage;
                fullResponseText = text || fullResponseText;
                responseThought = thought;
            };

            const onError = (error: any) => {
                hasError = true;
                errorMessage = error.message || 'An error occurred';
            };

            const services: Record<string, any> = { gemini: geminiService, gpt: gptService, grok: grokService, groq: groqService, vertex: vertexService, ollama: ollamaService };
            const service = services[aiConfig.modelType];
            if (!service) {
                await refundOnce();
                return res.status(400).json({ error: `Unsupported model type: ${aiConfig.modelType}` });
            }

            await service.sendMessageStream(
                aiConfig,
                finalMessages.slice(-8),
                apiKey,
                { onChunk, onEnd, onError },
                language,
                retrievedContext,
                userPersona
            );

            if (hasError) {
                await refundOnce();
                return res.status(500).json({ error: errorMessage });
            }

            isCompleted = true;
            res.json({
                message: fullResponseText,
                thought: responseThought || undefined
            });

        } catch (error: any) {
            logger.error('External chat error:', error);
            await refundOnce();
            if (error instanceof FileAccessDeniedError) {
                return res.status(error.statusCode || 403).json({ error: error.message });
            }
            res.status(500).json({
                error: error.message || 'An error occurred while processing your request'
            });
        }
    }
};
