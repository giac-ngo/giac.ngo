// server/routes/roleRoutes.js
import { Router } from 'express';
import { roleController } from '../controllers/roleController.js';
import { checkPermission } from '../middleware/authMiddleware.js';

const router = Router();

const protectRoleRoutes = checkPermission('roles');

router.get('/', protectRoleRoutes, roleController.getAllRoles);
router.get('/space/:spaceId', protectRoleRoutes, roleController.getAllRoles); // GET /api/roles/space/:spaceId
router.post('/', protectRoleRoutes, roleController.createRole);
router.put('/:id', protectRoleRoutes, roleController.updateRole);
router.delete('/:id', protectRoleRoutes, roleController.deleteRole);

export default router;
