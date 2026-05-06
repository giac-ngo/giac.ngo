// server/routes/libraryRoutes.js
import { Router } from 'express';
import { libraryController } from '../controllers/libraryController.js';

const router = Router();

router.get('/', libraryController.getLibraryDocuments);
router.get('/sidebar', libraryController.getSidebarData);
router.get('/filters', libraryController.getLibraryFilters);
router.get('/documents', libraryController.getLibraryDocuments);
router.get('/documents/:id', libraryController.getDocumentDetail);
router.get('/recommended', libraryController.getRecommendedDocuments);
router.get('/topics', libraryController.getLibraryTopics);

export default router;
