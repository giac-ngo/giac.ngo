// server/routes/commentRoutes.js
import { Router } from 'express';
import { commentController } from '../controllers/commentController.js';
import { requireGlobalAdmin, isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

// Public endpoint for posting comments
router.post('/comments', isAuthenticated, commentController.postComment);

// Admin endpoints for managing comments (scoped by space in controller)
router.get('/admin/comments', isAuthenticated, commentController.getComments);
router.put('/admin/comments/:id/status', isAuthenticated, commentController.updateCommentStatus);
router.delete('/admin/comments/:id', isAuthenticated, commentController.deleteComment);

export default router;
