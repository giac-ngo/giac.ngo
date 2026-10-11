import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
// server/controllers/conversationController.ts
import { conversationModel } from '../models/conversation.model.js';
import { userModel } from '../models/user.model.js';
import { pool, mapRowToCamelCase } from '../db.js';

export const conversationController = {
    async getConversations(req: Request, res: Response) {
        const { userId, aiConfigId, page = '1', limit = '15' } = req.query;

        if (!userId) {
            // Though we check on the frontend, a server-side check is good practice.
            return res.status(400).json({ message: 'User ID is required.' });
        }

        try {
            const userIdNum = parseInt(userId as string, 10);

            if (aiConfigId) {
                // Paginated fetch for a specific AI
                const aiConfigIdNum = parseInt(aiConfigId as string, 10);
                const pageNum = parseInt(page as string, 10);
                const limitNum = parseInt(limit as string, 10);

                if (isNaN(userIdNum) || isNaN(aiConfigIdNum) || isNaN(pageNum) || isNaN(limitNum)) {
                    return res.status(400).json({ message: 'Invalid query parameters.' });
                }

                const data = await conversationModel.findPaginatedForUserAndAi({
                    userId: userIdNum,
                    aiConfigId: aiConfigIdNum,
                    limit: limitNum,
                    offset: (pageNum - 1) * limitNum
                });
                res.json(data);
            } else {
                // Fetch all conversations for a user (maintains old behavior if needed)
                const conversations = await conversationModel.findAllByUserId(userIdNum);
                res.json(conversations);
            }
        } catch (error: unknown) {
            logger.error("Error fetching conversations:", error);
            res.status(500).json({ message: 'Không th? t?i l?ch s? h?i tho?i.' });
        }
    },

    async getTrainedConversationsByAiId(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            if (isNaN(aiId)) return res.status(400).json({ message: 'Invalid AI ID.' });

            // Only AI owner, space AI manager, or global admin can inspect training conversations
            const { aiConfigModel } = await import('../models/aiConfig.model.js');
            const { isAdmin, hasSpacePermission } = await import('../middleware/authMiddleware.js');
            const aiConfig = await aiConfigModel.findById(aiId);
            if (!aiConfig) return res.status(404).json({ message: 'AI config not found.' });

            const isOwner = aiConfig.ownerId && Number(aiConfig.ownerId) === Number(req.user?.id);
            const canManageAi = isAdmin(req.user) || isOwner || (aiConfig.spaceId ? await hasSpacePermission(req.user, aiConfig.spaceId, 'ai') : false);
            if (!canManageAi) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to inspect training conversations.' });
            }

            const conversations = await conversationModel.findTrainedByAiId(aiId);
            res.json(conversations);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch trained conversations.' });
        }
    },

    async getTestConversationsByAiId(req: Request, res: Response) {
        try {
            const aiId = parseInt(String(req.params.id), 10);
            const user = req.user;
            if (isNaN(aiId) || !user) return res.status(400).json({ message: 'Invalid AI ID or missing User ID.' });
            const conversations = await conversationModel.findTestByAiId(aiId, user.id);
            res.json(conversations);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch test conversations.' });
        }
    },

    async getLatestConversationByAiId(req: Request, res: Response) {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'User is required.' });
            const aiId = parseInt(String(req.params.id), 10);
            if (isNaN(aiId)) return res.status(400).json({ message: 'Invalid AI ID.' });
            // Always use authenticated user's ID to prevent accessing other users' conversations
            const conversation = await conversationModel.findLatestByAiId(aiId, user.id);
            res.json(conversation);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to get latest conversation.' });
        }
    },

    async getAllConversations(req: Request, res: Response) {
        try {
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');
            const targetSpaceId = req.query.spaceId ? parseInt(String(req.query.spaceId), 10) : null;

            if (req.user && !isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user.id);
                if (targetSpaceId) {
                    if (!userSpaceIds.includes(targetSpaceId)) {
                        return res.status(403).json({ message: 'Forbidden: You do not manage this space.' });
                    }
                    const query = `
                        SELECT c.*, a.name AS ai_name
                        FROM conversations c
                        JOIN ai_configs a ON c.ai_config_id = a.id
                        WHERE a.space_id = $1
                        ORDER BY c.start_time DESC
                        LIMIT 200
                    `;
                    const { rows } = await pool.query(query, [targetSpaceId]);
                    return res.json(rows.map(mapRowToCamelCase));
                }

                if (userSpaceIds.length === 0) return res.json([]);
                const query = `
                    SELECT c.*, a.name AS ai_name
                    FROM conversations c
                    JOIN ai_configs a ON c.ai_config_id = a.id
                    WHERE (a.owner_id = $1 OR (a.space_id = ANY($2::int[])))
                    ORDER BY c.start_time DESC
                    LIMIT 200
                `;
                const { rows } = await pool.query(query, [req.user.id, userSpaceIds]);
                return res.json(rows.map(mapRowToCamelCase));
            }

            // Global admin
            let query = `
                SELECT c.*, a.name AS ai_name 
                FROM conversations c
                LEFT JOIN ai_configs a ON c.ai_config_id = a.id
            `;
            const params: any[] = [];
            if (targetSpaceId) {
                query += ' WHERE a.space_id = $1';
                params.push(targetSpaceId);
            }
            query += ' ORDER BY c.start_time DESC LIMIT 200';
            const { rows } = await pool.query(query, params);
            res.json(rows.map(mapRowToCamelCase));
        } catch (error: unknown) {
            logger.error("Error fetching all conversations:", error);
            res.status(500).json({ message: 'Không thể tải tất cả hội thoại.' });
        }
    },

    async createConversation(req: Request, res: Response) {
        const { aiConfigId, messages, userId } = req.body;
        if (!aiConfigId || !messages || !userId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }
        try {
            const user = await userModel.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            const newConv = await conversationModel.create({
                userId: userId,
                userName: user.name,
                aiConfigId: aiConfigId,
                messages: messages,
            });
            res.status(201).json(newConv);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to create conversation.' });
        }
    },

    async updateConversationMessages(req: Request, res: Response) {
        try {
            const { messages } = req.body;
            if (!messages) return res.status(400).json({ message: 'Messages are required.' });
            const conversationId = parseInt(String(req.params.id), 10);
            if (isNaN(conversationId)) return res.status(400).json({ message: 'Invalid conversation ID.' });
            await conversationModel.update(conversationId, messages);
            res.status(200).json({ message: 'Conversation updated successfully.' });
        } catch (error: unknown) {
            res.status(500).json({ message: 'L?i khi c?p nh?t h?i tho?i.' });
        }
    },

    async deleteConversation(req: Request, res: Response) {
        try {
            const conversationId = parseInt(String(req.params.id), 10);
            if (isNaN(conversationId)) return res.status(400).json({ message: 'Invalid conversation ID.' });
            await conversationModel.delete(conversationId);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'L?i khi xóa h?i tho?i.' });
        }
    },

    async renameConversation(req: Request, res: Response) {
        const { title } = req.body;
        if (!title) return res.status(400).json({ message: 'New title is required.' });
        try {
            const conversationId = parseInt(String(req.params.id), 10);
            if (isNaN(conversationId)) return res.status(400).json({ message: 'Invalid conversation ID.' });
            const updatedConv = await conversationModel.rename(conversationId, title);
            res.json(updatedConv);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to rename conversation.' });
        }
    },

    async updateConversationTrainingStatus(req: Request, res: Response) {
        const { isTrained } = req.body;
        if (typeof isTrained !== 'boolean') {
            return res.status(400).json({ message: 'isTrained (boolean) is required.' });
        }
        try {
            const conversationId = parseInt(String(req.params.id), 10);
            if (isNaN(conversationId)) return res.status(400).json({ message: 'Invalid conversation ID.' });
            const updatedConv = await conversationModel.updateTrainingStatus(conversationId, isTrained);
            res.json(updatedConv);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to update training status.' });
        }
    },

    async setMessageFeedback(req: Request, res: Response) {
        const { conversationId, messageId } = req.params;
        const { feedback } = req.body;

        if (!['liked', 'disliked', null].includes(feedback)) {
            return res.status(400).json({ message: 'Invalid feedback type.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const convoRes = await client.query('SELECT messages FROM conversations WHERE id = $1 FOR UPDATE', [conversationId]);
            if (convoRes.rows.length === 0) {
                return res.status(404).json({ message: 'Conversation not found.' });
            }

            const messages = convoRes.rows[0].messages;
            const messageIndex = (messages as any[]).findIndex(m => String(m.id) === messageId);

            if (messageIndex === -1) {
                return res.status(404).json({ message: 'Message not found in conversation.' });
            }

            if (feedback === null) {
                delete messages[messageIndex].feedback;
            } else {
                messages[messageIndex].feedback = feedback;
            }

            await client.query('UPDATE conversations SET messages = $1 WHERE id = $2', [JSON.stringify(messages), conversationId]);

            await client.query('COMMIT');
            res.status(200).json({ success: true, updatedMessage: messages[messageIndex] });
        } catch (error: unknown) {
            await client.query('ROLLBACK');
            logger.error("Error saving message feedback:", error);
            res.status(500).json({ message: 'Failed to save feedback.' });
        } finally {
            client.release();
        }
    },
};


