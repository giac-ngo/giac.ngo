// server/routes/documentRoutes.js
import { Router } from 'express';
import { documentController } from '../controllers/documentController.js';
import { isAuthenticated, checkPermission } from '../middleware/authMiddleware.js';

const router = Router();

// Document AI Features (Translate, Extract)
router.post('/extract-text', isAuthenticated, documentController.extractUpload.single('file'), documentController.extractTextFromFile);
router.get('/config', documentController.getDocumentConfig);
router.put('/config', checkPermission('files'), documentController.updateDocumentConfig);


// Document CRUD
router.get('/', documentController.getDocuments);
router.post('/', checkPermission('files'), documentController.createDocument);
router.put('/:id', checkPermission('files'), documentController.updateDocument);
router.delete('/:id', checkPermission('files'), documentController.deleteDocument);
router.post('/:id/like', documentController.likeDocument);


// --- Document Categories ---
router.get('/authors', documentController.getDocumentAuthors);
router.post('/authors', checkPermission('files'), documentController.createDocumentAuthor);
router.put('/authors/:id', checkPermission('files'), documentController.updateDocumentAuthor);
router.delete('/authors/:id', checkPermission('files'), documentController.deleteDocumentAuthor);

router.get('/types', documentController.getDocumentTypes);
router.post('/types', checkPermission('files'), documentController.createDocumentType);
router.put('/types/:id', checkPermission('files'), documentController.updateDocumentType);
router.delete('/types/:id', checkPermission('files'), documentController.deleteDocumentType);

router.get('/topics', documentController.getDocumentTopics);
router.post('/topics', checkPermission('files'), documentController.createDocumentTopic);
router.put('/topics/:id', checkPermission('files'), documentController.updateDocumentTopic);
router.delete('/topics/:id', checkPermission('files'), documentController.deleteDocumentTopic);

// Tags
router.get('/tags', documentController.getAllTags);


export default router;
