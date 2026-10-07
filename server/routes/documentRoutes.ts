// server/routes/documentRoutes.js
import { Router } from 'express';
import { documentController } from '../controllers/documentController.js';
import { isAuthenticated, requireGlobalAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Document AI Features (Translate, Extract)
router.post('/extract-text', isAuthenticated, documentController.extractUpload.single('file'), documentController.extractTextFromFile);
router.get('/config', documentController.getDocumentConfig);
router.put('/config', requireGlobalAdmin, documentController.updateDocumentConfig);


// Document CRUD
router.get('/', documentController.getDocuments);
router.post('/', isAuthenticated, documentController.createDocument);
router.put('/:id', isAuthenticated, documentController.updateDocument);
router.delete('/:id', isAuthenticated, documentController.deleteDocument);
router.post('/:id/like', documentController.likeDocument);


// --- Document Categories ---
router.get('/authors', documentController.getDocumentAuthors);
router.post('/authors', isAuthenticated, documentController.createDocumentAuthor);
router.put('/authors/:id', isAuthenticated, documentController.updateDocumentAuthor);
router.delete('/authors/:id', isAuthenticated, documentController.deleteDocumentAuthor);

router.get('/types', documentController.getDocumentTypes);
router.post('/types', isAuthenticated, documentController.createDocumentType);
router.put('/types/:id', isAuthenticated, documentController.updateDocumentType);
router.delete('/types/:id', isAuthenticated, documentController.deleteDocumentType);

router.get('/topics', documentController.getDocumentTopics);
router.post('/topics', isAuthenticated, documentController.createDocumentTopic);
router.put('/topics/:id', isAuthenticated, documentController.updateDocumentTopic);
router.delete('/topics/:id', isAuthenticated, documentController.deleteDocumentTopic);

// Tags
router.get('/tags', documentController.getAllTags);


export default router;
