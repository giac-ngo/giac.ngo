// server/routes/trainingDataRoutes.js
import { Router } from 'express';
import { trainingDataController } from '../controllers/trainingDataController.js';
import { checkPermission, requireAiPermission, requireTrainingDataPermission } from '../middleware/authMiddleware.js';

const router = Router();
router.delete('/qa', requireAiPermission('ai', 'aiConfigId'), trainingDataController.deleteTrainingQaDataSource);
router.delete('/:id', requireTrainingDataPermission('ai'), trainingDataController.deleteTrainingDataSource);
router.post('/:id/summarize', requireTrainingDataPermission('ai'), trainingDataController.generateSummaryForDataSource);
router.get('/qa/all', checkPermission('finetune'), trainingDataController.getAllQaTrainingData);
router.post('/qa/export', checkPermission('finetune'), trainingDataController.exportQaDataForFinetune);

export default router;
