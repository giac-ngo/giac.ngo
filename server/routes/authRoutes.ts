// server/routes/authRoutes.ts
import { Router, Request, Response } from 'express';
import { authController } from '../controllers/authController.js';
import { userController } from '../controllers/userController.js';
import { isAuthenticated, checkSelfOrPermission } from '../middleware/authMiddleware.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { signOAuthState } from '../utils/oauthState.js';
import { pool } from '../db.js';

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
router.put('/profile', isAuthenticated, userController.updateProfile);
router.post('/change-password', isAuthenticated, userController.changePassword);
router.post('/regenerate-token', isAuthenticated, userController.regenerateApiToken);

// --- Google OAuth ---
router.get('/google', async (req: Request, res: Response) => {
    const requestedReturnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
    const requestHost = req.headers.host?.split(':')[0]?.toLowerCase() || '';
    const allowedOrigins = new Set((process.env.OAUTH_RETURN_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
    if (requestHost) allowedOrigins.add(`${req.protocol}://${requestHost}`);
    let returnTo = '';
    try {
        const parsed = new URL(requestedReturnTo);
        if (allowedOrigins.has(parsed.origin) && parsed.pathname === '/' && !parsed.search && !parsed.hash) returnTo = parsed.origin;
    } catch { /* Invalid or relative redirect targets are rejected. */ }
    if (!returnTo) return res.status(400).json({ message: 'Invalid Google login return address.' });

    // Resolve spaceId from query spaceSlug, spaceId, or request host
    let resolvedSpaceId: number | undefined;
    if (req.query.spaceId && Number.isInteger(Number(req.query.spaceId))) {
        resolvedSpaceId = Number(req.query.spaceId);
    } else if (typeof req.query.spaceSlug === 'string' && req.query.spaceSlug.trim()) {
        const spaceRes = await pool.query('SELECT id FROM spaces WHERE slug = $1 LIMIT 1', [req.query.spaceSlug.trim()]);
        if (spaceRes.rows[0]) resolvedSpaceId = spaceRes.rows[0].id;
    } else if (requestHost && requestHost !== 'login.bodhilab.io' && requestHost !== 'localhost' && requestHost !== '127.0.0.1') {
        const spaceRes = await pool.query('SELECT id FROM spaces WHERE custom_domain = $1 LIMIT 1', [requestHost]);
        if (spaceRes.rows[0]) resolvedSpaceId = spaceRes.rows[0].id;
    }

    const state = signOAuthState({
        returnTo,
        spaceId: resolvedSpaceId,
        issuedAt: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
    });
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        state,
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
    res.redirect(authorizeUrl);
});

router.get('/google/callback', authController.googleCallback(oauth2Client));

export default router;

