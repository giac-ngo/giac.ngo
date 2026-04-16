// server/routes/spacePostRoutes.js
import { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import {
    getSocialPosts,
    createSocialPost,
    deleteSocialPost,
    toggleSocialLike,
    getPostLikers,
    getSocialComments,
    addSocialComment,
    deleteSocialComment,
    getSocialNotifications,
    toggleSocialFollow,
    getUserSocialStats,
    postImageUpload
} from '../controllers/spaceSocialController.js';

const router = Router();

// Tất cả route đều yêu cầu đăng nhập (Guest không vào được)
router.use(isAuthenticated);

// Social Posts
router.get('/:id/social', getSocialPosts);
router.post('/:id/social', postImageUpload.array('images', 4), createSocialPost);
router.delete('/:id/social/:postId', deleteSocialPost);

// Like toggle & likers
router.post('/:id/social/:postId/like', toggleSocialLike);
router.get('/:id/social/:postId/likes', getPostLikers);

// Comments
router.get('/:id/social/:postId/comments', getSocialComments);
router.post('/:id/social/:postId/comments', addSocialComment);
router.delete('/:id/social/:postId/comments/:commentId', deleteSocialComment);

// Notifications for current user
router.get('/:id/social/notifications', getSocialNotifications);

// Follow
router.post('/:id/social/follow/:targetUserId', toggleSocialFollow);

// User stats (post count, followers, following, isFollowing)
router.get('/:id/social/users/:userId/stats', getUserSocialStats);

export default router;
