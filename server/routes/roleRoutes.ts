// server/routes/roleRoutes.js
import { Router } from 'express';
import { roleController } from '../controllers/roleController.js';
import { requireGlobalAdmin, isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireGlobalAdmin, roleController.getAllRoles);
router.get('/space/:spaceId', isAuthenticated, roleController.getAllRoles); // GET /api/roles/space/:spaceId
router.post('/', isAuthenticated, roleController.createRole);
router.put('/:id', isAuthenticated, roleController.updateRole);
router.delete('/:id', isAuthenticated, roleController.deleteRole);

export default router;
