// server/routes/koiiRoutes.js
import { Router } from 'express';
import { koiiController } from '../controllers/koiiController.js';
import { checkPermission } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/submit-task', checkPermission('ai'), koiiController.submitTask);
router.get('/task-status/:aiConfigId', checkPermission('ai'), koiiController.getTaskStatus);
router.get('/progress/:aiConfigId', checkPermission('ai'), koiiController.getProgress);

export default router;
