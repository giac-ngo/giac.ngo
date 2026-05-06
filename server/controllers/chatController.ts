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
import { fileParserService } from '../services/fileParserService.js';
import weaviateService from '../services/weaviateService.js';
import { vertexService } from '../services/vertexService.js';
import { AIConfig, User } from '../types/index.js';

const mapAndSanitizeUser = (user: User | null) => {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};

async function getApiKeyForAi(aiConfig: AIConfig) {
    if (!aiConfig.ownerId) {
        const systemConfig = await systemModel.getConfig();
        const apiKey = systemConfig?.systemKeys?.[aiConfig.modelType];
        if (!apiKey) throw new Error(`System API Key for ${aiConfig.modelType.toUpperCase()} not configured, and AI has no owner.`);
        return apiKey;
    }

    const owner = await userModel.findById(aiConfig.ownerId);
    if (!owner) throw new Error(`AI owner with ID ${aiConfig.ownerId} not found.`);

    const apiKey = owner.apiKeys?.[aiConfig.modelType];
    if (!apiKey) throw new Error(`Owner's API key for ${aiConfig.modelType.toUpperCase()} is missing.`);

    return apiKey;
}

export const chatController = {
    async sendMessageStream(req: Request, res: Response) {
        let { aiConfig, aiConfigId, messages, message, conversationId, isTestChat, language, clientAiMessageId, guestTurnCount } = req.body;

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

        if (!aiConfig && aiConfigId) {
            aiConfig = await aiConfigModel.findById(aiConfigId);
            if (!aiConfig) {
                res.status(404).json({ error: "AI Config not found." });
                return;
            }
        } else if (!aiConfig) {
            res.status(400).json({ error: "aiConfig or aiConfigId is required." });
            return;
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ error: "message is required." });
            return;
        }

        const currentUser = req.user;
        const userId = currentUser ? currentUser.id : null;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const onError = (error: any) => {
            const userMessage = error.message || "An unexpected error occurred.";
            res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
            res.end();
        };

        try {
            const finalMessages = [...messages];
            const lastMessage = finalMessages[finalMessages.length - 1];
            if (lastMessage.sender === 'user' && lastMessage.fileAttachment) {
                const { url, name } = lastMessage.fileAttachment;
                const text = await fileParserService.extractText(url, name);
                lastMessage.text = `File "${name}" content:\n${text}\n\nUser prompt: "${lastMessage.text || ''}"`;
                delete lastMessage.fileAttachment;
            }

            let retrievedContext = '';
            let requestChargeMethod = 'none'; // 'none', 'ai_specific', 'subscription', 'merit_cost'

            if (!isTestChat) {
                const isFreeAi = (!aiConfig.purchaseCost || aiConfig.purchaseCost === 0) &&
                    (!aiConfig.meritCost || aiConfig.meritCost === 0);

                if (currentUser) {
                    if (!aiConfig.isContactForAccess) {
                        const baseDailyLimit = aiConfig.baseDailyLimit ?? 20;
                        const userSub = await billingModel.getUserSubscription(currentUser.id);

                        const today = new Date().toISOString().split('T')[0];
                        const resetDate = userSub.dailyResetDate
                            ? new Date(userSub.dailyResetDate).toISOString().split('T')[0]
                            : null;
                        const dailyUsed = resetDate === today ? (userSub.dailyMsgUsed || 0) : 0;

                        const bonusActive = userSub.expiresAt && new Date(userSub.expiresAt) > new Date();
                        const bonusLimit = bonusActive ? (userSub.dailyLimitBonus || 0) : 0;

                        if (dailyUsed >= baseDailyLimit + bonusLimit) {
                            return onError(new Error(`DAILY_LIMIT_REACHED:${baseDailyLimit}:${bonusLimit}`));
                        }
                    }

                    if (aiConfig.isContactForAccess) {
                        const isGranted = await aiConfigModel.checkUserAccess(aiConfig.id, currentUser.id);
                        if (!isGranted) {
                            return onError(new Error("This AI requires special access. Please contact the administrator."));
                        }
                        requestChargeMethod = 'none';
                    } else if (isFreeAi) {
                        requestChargeMethod = 'none';
                    } else {
                        const perAiRequestCount = await aiConfigModel.getUserRequestCount(currentUser.id, aiConfig.id);

                        if (perAiRequestCount !== null && perAiRequestCount > 0) {
                            requestChargeMethod = 'ai_specific';
                        } else if (perAiRequestCount === 0) {
                            return onError(new Error("You have used all your requests for this specific AI."));
                        } else if (aiConfig.meritCost && aiConfig.meritCost > 0) {
                            if (currentUser.merits !== undefined && currentUser.merits !== null && currentUser.merits >= aiConfig.meritCost) {
                                requestChargeMethod = 'merit_cost';
                            } else {
                                return onError(new Error("You do not have enough merits for this request."));
                            }
                        } else if (aiConfig.purchaseCost && aiConfig.purchaseCost > 0) {
                            return onError(new Error("This AI must be purchased to use."));
                        } else {
                            if (currentUser.requestsRemaining !== undefined && currentUser.requestsRemaining !== null && currentUser.requestsRemaining <= 0) {
                                return onError(new Error("You have reached the request limit for your subscription plan."));
                            }
                            requestChargeMethod = currentUser.requestsRemaining !== null ? 'subscription' : 'none';
                        }
                    }
                } else {
                    const systemConfig = await systemModel.getConfig();
                    const guestRegisterThreshold = (systemConfig as any).guestMessageLimit || 5;
                    const guestDailyLimit = (systemConfig as any).guestDailyLimit || 20;

                    if (guestTurnCount !== undefined && guestTurnCount >= guestDailyLimit) {
                        return onError(new Error("Bạn đã hết 20 lượt chat miễn phí hôm nay. Vui lòng đăng nhập để tiếp tục."));
                    }

                    if (guestTurnCount !== undefined && guestTurnCount >= guestRegisterThreshold) {
                        return onError(new Error("GUEST_REGISTER_NUDGE: Để lưu lại duyên lành và hành trình vấn đáp, mong bạn hoan hỉ tạo một tài khoản."));
                    }

                    if (aiConfig.isContactForAccess) {
                        return onError(new Error("This AI requires special access. Please log in or contact the administrator."));
                    }
                    requestChargeMethod = 'none';
                }
            }

            const apiKey = await getApiKeyForAi(aiConfig);

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
                        switch (requestChargeMethod) {
                            case 'ai_specific':
                                await aiConfigModel.decrementUserRequestCount(currentUser.id, aiConfig.id);
                                break;
                            case 'subscription':
                                await userModel.deductRequest(currentUser.id);
                                break;
                            case 'merit_cost':
                                await billingModel.addMerits(currentUser.id, -aiConfig.meritCost, null, 'ai_usage');
                                break;
                        }
                        if (!aiConfig.isContactForAccess) {
                            await billingModel.incrementDailyUsage(currentUser.id);
                        }
                        updatedUser = await userModel.findById(currentUser.id);
                    }

                    res.write(`data: ${JSON.stringify({ conversationId: finalConvId, done: true, updatedUser: mapAndSanitizeUser(updatedUser), text, thought })}\n\n`);
                    res.end();
                } catch (error: any) {
                    logger.error("Error in onEnd callback:", error);
                    onError(error);
                }
            };

            const services: Record<string, any> = { gemini: geminiService, gpt: gptService, grok: grokService, vertex: vertexService };
            const service = services[aiConfig.modelType];
            if (!service) return onError(new Error(`Unsupported model type: ${aiConfig.modelType}`));
            
            service.sendMessageStream(aiConfig, finalMessages.slice(-8), apiKey, { onChunk, onEnd, onError }, language, retrievedContext);

        } catch (error: any) {
            onError(error);
        }
    },

    async estimateContext(req: Request, res: Response) {
        try {
            const { aiConfig, userMessage } = req.body;
            if (!aiConfig) {
                return res.status(400).json({ message: 'AI config is required.' });
            }

            const apiKey = await getApiKeyForAi(aiConfig);

            let ragContext = '';
            if (apiKey && userMessage) {
                try {
                    const results = await weaviateService.search(aiConfig.modelType, aiConfig.id, userMessage, apiKey);
                    if (results?.length > 0) {
                        ragContext = "--- Relevant Information ---\n" + results.map((r: any) => r.content).join('\n\n') + "\n--- End of Information ---\n\n";
                    }
                } catch (e: any) { logger.warn("Weaviate search failed during estimation:", e.message || String(e)); }
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
        try {
            let { aiConfigId, message, language = 'vi' } = req.body;

            if (!aiConfigId) {
                return res.status(400).json({ error: 'aiConfigId is required' });
            }
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: 'message (string) is required' });
            }

            const aiConfig = await aiConfigModel.findById(aiConfigId);
            if (!aiConfig) {
                return res.status(404).json({ error: 'AI Config not found' });
            }

            const messages = [{
                id: `msg-${Date.now()}`,
                sender: 'user',
                text: message,
                timestamp: Date.now()
            }];

            const apiKey = await getApiKeyForAi(aiConfig);

            const finalMessages = [...messages];
            const lastMessage = finalMessages[finalMessages.length - 1];
            if (lastMessage.sender === 'user' && (lastMessage as any).fileAttachment) {
                const { url, name } = (lastMessage as any).fileAttachment;
                const text = await fileParserService.extractText(url, name);
                lastMessage.text = `File "${name}" content:\n${text}\n\nUser prompt: "${lastMessage.text || ''}"`;
                delete (lastMessage as any).fileAttachment;
            }

            let retrievedContext = '';
            const lastUserMessage = finalMessages.slice().reverse().find(m => m.sender === 'user');
            if (lastUserMessage?.text && apiKey) {
                try {
                    const results = await weaviateService.search(aiConfig.modelType, aiConfig.id, lastUserMessage.text, apiKey);
                    if (results?.length > 0) {
                        retrievedContext = "--- Relevant Information ---\n" + results.map((r: any) => r.content).join('\n\n') + "\n--- End of Information ---\n\n";
                    }
                } catch (e: any) {
                    logger.warn("Weaviate search failed:", e.message || String(e));
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

            const services: Record<string, any> = { gemini: geminiService, gpt: gptService, grok: grokService, vertex: vertexService };
            const service = services[aiConfig.modelType];
            if (!service) {
                return res.status(400).json({ error: `Unsupported model type: ${aiConfig.modelType}` });
            }

            await service.sendMessageStream(
                aiConfig,
                finalMessages.slice(-8),
                apiKey,
                { onChunk, onEnd, onError },
                language,
                retrievedContext
            );

            if (hasError) {
                return res.status(500).json({ error: errorMessage });
            }

            res.json({
                message: fullResponseText,
                thought: responseThought || undefined
            });

        } catch (error: any) {
            logger.error('External chat error:', error);
            res.status(500).json({
                error: error.message || 'An error occurred while processing your request'
            });
        }
    }
};
