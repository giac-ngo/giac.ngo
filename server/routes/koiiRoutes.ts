// server/routes/koiiRoutes.js
import { Router } from 'express';
import { koiiController } from '../controllers/koiiController.js';
import { requireAiPermission } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/submit-task', requireAiPermission('ai', 'aiConfigId'), koiiController.submitTask);
router.get('/task-status/:aiConfigId', requireAiPermission('ai', 'aiConfigId'), koiiController.getTaskStatus);
router.get('/progress/:aiConfigId', requireAiPermission('ai', 'aiConfigId'), koiiController.getProgress);

export default router;
