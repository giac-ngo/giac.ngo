import { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import {
    getSocialPosts,
    createSocialPost,
    deleteSocialPost,
    updateSocialPost,
    toggleSocialLike,
    getPostLikers,
    getSocialComments,
    addSocialComment,
    deleteSocialComment,
    toggleCommentLike,
    getSocialNotifications,
    markNotificationsRead,
    getUnreadNotificationCount,
    toggleSocialFollow,
    getUserSocialStats,
    postImageUpload,
    toggleBookmark,
    togglePinPost,
    getSavedPosts
} from '../controllers/spaceSocialController.js';

const router = Router();

// Tất cả route đều yêu cầu đăng nhập (Guest không vào được)
router.use(isAuthenticated);

// Social Posts
router.get('/:id/social', getSocialPosts);
router.post('/:id/social', postImageUpload.array('images', 4), createSocialPost);
router.put('/:id/social/:postId', postImageUpload.array('images', 4), updateSocialPost);
router.delete('/:id/social/:postId', deleteSocialPost);

// Like toggle & likers
router.post('/:id/social/:postId/like', toggleSocialLike);
router.get('/:id/social/:postId/likes', getPostLikers);

// Comments
router.get('/:id/social/:postId/comments', getSocialComments);
router.post('/:id/social/:postId/comments', addSocialComment);
router.delete('/:id/social/:postId/comments/:commentId', deleteSocialComment);
router.post('/:id/social/:postId/comments/:commentId/like', toggleCommentLike);

// Notifications for current user
router.get('/:id/social/notifications', getSocialNotifications);
router.post('/:id/social/notifications/read', markNotificationsRead);
router.get('/:id/social/notifications/count', getUnreadNotificationCount);

// Follow
router.post('/:id/social/follow/:targetUserId', toggleSocialFollow);

// User stats (post count, followers, following, isFollowing)
router.get('/:id/social/users/:userId/stats', getUserSocialStats);

// Bookmark (#10)
router.post('/:id/social/:postId/bookmark', toggleBookmark);
router.get('/:id/social/saved', getSavedPosts);

// Pin (#7)
router.post('/:id/social/:postId/pin', togglePinPost);

export default router;
