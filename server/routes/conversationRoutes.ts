// server/routes/conversationRoutes.js
import { Router } from 'express';
import { conversationController } from '../controllers/conversationController.js';
import { chatController } from '../controllers/chatController.js';
import { isAuthenticated, requireGlobalAdmin, hasSpacePermission, isAdmin } from '../middleware/authMiddleware.js';
import { pool, mapRowToCamelCase } from '../db.js';

const router = Router();

// Streaming and context estimation are part of the 'chat' process
router.post('/chat/stream', chatController.sendMessageStream);
router.post('/chat/estimate-context', chatController.estimateContext);

// Standard conversation CRUD
router.use(isAuthenticated);

const requireConversationAccess = async (req: any, res: any, next: any) => {
    try {
        const id = req.params.id || req.params.conversationId;
        const result = await pool.query(`
            SELECT c.user_id, c.ai_config_id, a.space_id 
            FROM conversations c
            LEFT JOIN ai_configs a ON c.ai_config_id = a.id
            WHERE c.id = $1
        `, [id]);
        if (!result.rows[0]) return res.status(404).json({ message: 'Conversation not found.' });

        const conv = result.rows[0];
        const isOwner = String(conv.user_id) === String(req.user?.id);
        const isGlobalAdmin = isAdmin(req.user);

        if (isOwner || isGlobalAdmin) return next();

        // Check if user has conversations permission for this specific Space
        if (conv.space_id && await hasSpacePermission(req.user, conv.space_id, 'conversations')) {
            return next();
        }

        return res.status(404).json({ message: 'Conversation not found.' });
    } catch (error) {
        next(error);
    }
};

const requireOwnUser = (req: any, res: any, next: any) => {
    const isGlobalAdmin = isAdmin(req.user);
    if (isGlobalAdmin || String(req.params.userId) === String(req.user?.id)) return next();
    return res.status(404).json({ message: 'User not found.' });
};
router.get('/', (req: any, res, next) => {
    const isGlobalAdmin = isAdmin(req.user);
    if (!req.query.userId) req.query.userId = String(req.user.id);
    if (!isGlobalAdmin && String(req.query.userId) !== String(req.user.id)) return res.status(404).json({ message: 'User not found.' });
    next();
}, conversationController.getConversations);
router.get('/user/:userId', requireOwnUser, (req, _res, next) => { req.query.userId = req.params.userId; next(); }, conversationController.getConversations);
router.get('/all', isAuthenticated, conversationController.getAllConversations);
router.get('/:id', requireConversationAccess, async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [req.params.id]);
        return res.json(result.rows[0] ? mapRowToCamelCase(result.rows[0]) : null);
    } catch (error) { next(error); }
});
router.post('/', (req, _res, next) => { req.body.userId = req.user?.id; next(); }, conversationController.createConversation);
router.delete('/:id', requireConversationAccess, conversationController.deleteConversation);
router.put('/:id', requireConversationAccess, conversationController.updateConversationMessages);
router.put('/:id/rename', requireConversationAccess, conversationController.renameConversation);
const requireTrainStatusAccess = async (req: any, res: any, next: any) => {
    try {
        const id = req.params.id || req.params.conversationId;
        const result = await pool.query(`
            SELECT c.user_id, c.ai_config_id, a.space_id, a.owner_id 
            FROM conversations c
            LEFT JOIN ai_configs a ON c.ai_config_id = a.id
            WHERE c.id = $1
        `, [id]);
        if (!result.rows[0]) return res.status(404).json({ message: 'Conversation not found.' });

        const conv = result.rows[0];
        const isGlobalAdmin = isAdmin(req.user);
        const isAiOwner = conv.owner_id && Number(conv.owner_id) === Number(req.user?.id);

        if (isGlobalAdmin || isAiOwner) return next();

        if (conv.space_id && await hasSpacePermission(req.user, conv.space_id, 'conversations')) {
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: You do not have permission to manage training status for this conversation.' });
    } catch (error) {
        next(error);
    }
};

router.put('/:id/train-status', requireTrainStatusAccess, conversationController.updateConversationTrainingStatus);
router.post('/:conversationId/messages/:messageId/feedback', requireConversationAccess, conversationController.setMessageFeedback);

export default router;
