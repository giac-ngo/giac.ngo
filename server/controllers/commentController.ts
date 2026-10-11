import { Request, Response } from 'express';
import { commentModel } from '../models/comment.model.js';
import { documentModel } from '../models/document.model.js';
import { logger } from '../utils/logger.js';

export const commentController = {
    async postComment(req: Request, res: Response) {
        const userId = req.user?.id;
        const { commentType, sourceId, content, parentId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Bạn cần đăng nhập để bình luận.' });
        }
        if (!commentType || !sourceId || !content) {
            return res.status(400).json({ message: 'Thiếu thông tin bình luận.' });
        }

        try {
            let sourceTitle = 'Unknown Source';
            if (commentType === 'document') {
                const doc = await documentModel.findById(parseInt(sourceId, 10));
                if (doc) sourceTitle = doc.title;
            }
            
            const newComment = await commentModel.create(userId, commentType, sourceId, sourceTitle, content, parentId);
            res.status(201).json(newComment);
        } catch (error: any) {
            logger.error('postComment error:', error);
            res.status(500).json({ message: 'Lỗi khi gửi bình luận.' });
        }
    },

    async getComments(req: Request, res: Response) {
        try {
            const { status, type, spaceId } = req.query;
            const { isAdmin, getUserManagedSpaceIds } = await import('../middleware/authMiddleware.js');
            const { isSpaceAdmin } = await import('../utils/policy.js');

            const isGlobalAdmin = isAdmin(req.user);
            const targetSpaceId = spaceId ? parseInt(String(spaceId), 10) : undefined;

            if (!isGlobalAdmin) {
                const userManagedSpaces = await getUserManagedSpaceIds(req.user?.id);
                if (targetSpaceId) {
                    const hasAccess = userManagedSpaces.includes(targetSpaceId) || await isSpaceAdmin(req.user?.id, targetSpaceId);
                    if (!hasAccess) {
                        return res.status(403).json({ message: 'Forbidden: You do not manage this space.' });
                    }
                    const comments = await commentModel.findAll({
                        status: status as string,
                        type: type as string,
                        spaceId: targetSpaceId
                    });
                    return res.json(comments);
                } else {
                    if (userManagedSpaces.length === 0) return res.json([]);
                    const comments = await commentModel.findAll({
                        status: status as string,
                        type: type as string,
                        spaceIds: userManagedSpaces
                    });
                    return res.json(comments);
                }
            }

            const comments = await commentModel.findAll({
                status: status as string,
                type: type as string,
                spaceId: targetSpaceId
            });
            res.json(comments);
        } catch (error: any) {
            logger.error('getComments error:', error);
            res.status(500).json({ message: 'Lỗi khi tải bình luận.' });
        }
    },

    async updateCommentStatus(req: Request, res: Response) {
        try {
            const commentId = parseInt(String(req.params.id), 10);
            const { status } = req.body;
            if (!['approved', 'rejected', 'pending'].includes(status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
            }

            const { isAdmin } = await import('../middleware/authMiddleware.js');
            const { isSpaceAdmin } = await import('../utils/policy.js');

            if (!isAdmin(req.user)) {
                const spaceId = await commentModel.getCommentSpaceId(commentId);
                const isAuthorized = spaceId && (await isSpaceAdmin(req.user?.id, spaceId));
                if (!isAuthorized) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to moderate comments in this space.' });
                }
            }

            const updatedComment = await commentModel.updateStatus(commentId, status);
            res.json(updatedComment);
        } catch (error: any) {
            logger.error('updateCommentStatus error:', error);
            res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái bình luận.' });
        }
    },

    async deleteComment(req: Request, res: Response) {
        try {
            const commentId = parseInt(String(req.params.id), 10);
            const { isAdmin } = await import('../middleware/authMiddleware.js');
            const { isSpaceAdmin } = await import('../utils/policy.js');

            if (!isAdmin(req.user)) {
                const spaceId = await commentModel.getCommentSpaceId(commentId);
                const isAuthorized = spaceId && (await isSpaceAdmin(req.user?.id, spaceId));
                if (!isAuthorized) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete comments in this space.' });
                }
            }

            await commentModel.delete(commentId);
            res.status(204).send();
        } catch (error: any) {
            logger.error('deleteComment error:', error);
            res.status(500).json({ message: 'Lỗi khi xóa bình luận.' });
        }
    },
};

