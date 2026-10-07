// server/routes/trainingDataRoutes.js
import { Router } from 'express';
import { trainingDataController } from '../controllers/trainingDataController.js';
import { requireGlobalAdmin, requireAiPermission, requireTrainingDataPermission } from '../middleware/authMiddleware.js';

const router = Router();
router.delete('/qa', requireAiPermission('ai', 'aiConfigId'), trainingDataController.deleteTrainingQaDataSource);
router.delete('/:id', requireTrainingDataPermission('ai'), trainingDataController.deleteTrainingDataSource);
router.post('/:id/summarize', requireTrainingDataPermission('ai'), trainingDataController.generateSummaryForDataSource);
router.get('/qa/all', requireGlobalAdmin, trainingDataController.getAllQaTrainingData);
router.post('/qa/export', requireGlobalAdmin, trainingDataController.exportQaDataForFinetune);

export default router;
