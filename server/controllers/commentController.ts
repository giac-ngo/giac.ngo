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
            const { status, type } = req.query;
            const comments = await commentModel.findAll({ status: status as string, type: type as string });
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
            await commentModel.delete(commentId);
            res.status(204).send();
        } catch (error: any) {
            logger.error('deleteComment error:', error);
            res.status(500).json({ message: 'Lỗi khi xóa bình luận.' });
        }
    },
};

