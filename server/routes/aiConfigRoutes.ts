// server/routes/aiConfigRoutes.js
import { Router } from 'express';
import { aiConfigController } from '../controllers/aiConfigController.js';
import { documentController } from '../controllers/documentController.js';
import { trainingDataController } from '../controllers/trainingDataController.js';
import { conversationController } from '../controllers/conversationController.js';
import { isAuthenticated, requireAiPermission, requireSpacePermission } from '../middleware/authMiddleware.js';


const router = Router();

router.post('/', aiConfigController.getVisibleAiConfigs);
router.post('/manageable', isAuthenticated, aiConfigController.getManageableAiConfigs);
router.post('/create', requireSpacePermission('ai', 'spaceId'), aiConfigController.createAiConfig);
router.get('/space/:spaceId', aiConfigController.getAiConfigsBySpaceId); // GET /api/ai-configs/space/:spaceId

router.get('/:id/trained-conversations', isAuthenticated, conversationController.getTrainedConversationsByAiId);
router.post('/:id/test-conversations', isAuthenticated, conversationController.getTestConversationsByAiId);
router.post('/:id/latest-conversation', isAuthenticated, conversationController.getLatestConversationByAiId);

// AI <-> Document Linking
router.post('/:id/documents', requireAiPermission('ai'), documentController.linkDocumentsToAi);
router.delete('/:id/documents/:docId', requireAiPermission('ai'), documentController.unlinkDocumentFromAi);

// AI <-> Training Data
router.get('/:id/training-data', requireAiPermission('ai'), trainingDataController.getTrainingDataForAI);
router.post('/:id/training-data', requireAiPermission('ai'), trainingDataController.upload.single('file'), trainingDataController.createTrainingDataSourceForAI);


router.put('/:id', requireAiPermission('ai'), aiConfigController.updateAiConfig);
router.delete('/:id', requireAiPermission('ai'), aiConfigController.deleteAiConfig);

// AI Purchasing
router.post('/:id/purchase', isAuthenticated, aiConfigController.purchaseAi);
router.post('/:id/claim', isAuthenticated, aiConfigController.claimFreeAi);

// AI Contact-for-Access User Management
router.get('/:id/access', requireAiPermission('ai'), aiConfigController.getAiAccessList);
router.post('/:id/access', requireAiPermission('ai'), aiConfigController.updateAiAccessList);

// Voice Key: trả về Gemini key của owner AI config để dùng cho Voice Live
router.get('/:id/voice-key', isAuthenticated, aiConfigController.getAiVoiceKey);


export default router;
