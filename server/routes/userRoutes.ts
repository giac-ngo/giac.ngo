// server/routes/userRoutes.js
import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireGlobalAdmin, checkSelfOrPermission, isAuthenticated } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireGlobalAdmin, userController.getAllUsers);
router.get('/profile', isAuthenticated, userController.getProfile);
router.get('/space-owners', requireGlobalAdmin, userController.getSpaceOwners);
router.get('/my-space-owner-data', isAuthenticated, userController.getMySpaceOwnerData);

router.post('/', isAuthenticated, userController.createUser);
router.put('/:id', checkSelfOrPermission('users'), userController.updateUser);
router.delete('/:id', requireGlobalAdmin, userController.deleteUser);
router.post('/:id/regenerate-token', checkSelfOrPermission('users'), userController.regenerateApiToken);

router.post('/change-password', isAuthenticated, userController.changePassword);
router.get('/:id/spaces', requireGlobalAdmin, userController.getUserSpaces);

export default router;
