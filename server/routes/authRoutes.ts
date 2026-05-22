// server/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { authController } from '../controllers/authController.js';
import { userController } from '../controllers/userController.js';
import { isAuthenticated, checkSelfOrPermission } from '../middleware/authMiddleware.js';
import { OAuth2Client } from 'google-auth-library';

const router = Router();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/refresh', authController.refreshToken);

// Routes frontend calls via /api/auth/...
router.get('/me', isAuthenticated, userController.getProfile);
router.put('/profile', isAuthenticated, (req: Request, res: Response) => {
    req.params.id = req.user?.id?.toString() || '';
    return userController.updateUser(req, res);
});
router.post('/change-password', isAuthenticated, userController.changePassword);
router.post('/regenerate-token', isAuthenticated, userController.regenerateApiToken);

// --- Google OAuth ---
router.get('/google', (req: Request, res: Response) => {
    const returnTo = req.query.returnTo as string || '';
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        state: returnTo,
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
    res.redirect(authorizeUrl);
});

router.get('/google/callback', authController.googleCallback(oauth2Client));

export default router;

