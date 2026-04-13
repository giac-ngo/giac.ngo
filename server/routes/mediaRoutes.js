import express from 'express';
import { mediaController, upload } from '../controllers/mediaController.js';
import { isAuthenticated, checkPermission } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all media files for a specific space
router.get('/:spaceId', isAuthenticated, mediaController.getMediaFiles);

// Upload new media files to a space's media library
router.post('/:spaceId/upload', isAuthenticated, upload.array('files'), mediaController.uploadMedia);

// Delete media files for a specific space
router.delete('/:spaceId', isAuthenticated, mediaController.deleteMedia);

export default router;
