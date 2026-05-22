
// server/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { userModel } from '../models/user.model.js';
import { mailService } from '../services/mailService.js';
import { verifyPassword, pool } from '../db.js';
import { spaceModel } from '../models/space.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../types/index.js';

const generateAccessToken = (user: User) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'fallback_secret_giacngo123',
        { expiresIn: '7d' } // 7 days
    );
};

const mapAndSanitizeUser = (user: User | null) => {
    if (!user) return null;
    const { password, resetToken, resetTokenExpires, apiToken, ...sanitizedUser } = user;
    
    // Convert static DB apiToken into dual JWT Access / Refresh Token pair for the frontend
    sanitizedUser.apiToken = generateAccessToken(user); // Short-lived Access Token
    sanitizedUser.refreshToken = apiToken; // Long-lived Refresh Token (Database static)

    return sanitizedUser;
};

export const authController = {
    async login(req: Request, res: Response) {
        const { email, password, context, spaceSlug } = req.body;
        try {
            let user = await userModel.findByEmail(email);
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.' });
            }
            const isMatch = await verifyPassword(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
            }

            // --- Two-tier login validation ---
            // Enrich user with permissions for the check
            const { enrichUserWithPermissions } = await import('../models/user.model.js');
            const enrichedUser = await enrichUserWithPermissions(user);

            if (context === 'admin') {
                // Root domain login: only super admin allowed
                if (!enrichedUser) {
                    return res.status(403).json({ message: 'Không thể xác thực quyền hạn.' });
                }
                const isSuperAdmin = enrichedUser.permissions && enrichedUser.permissions.includes('roles');
                if (!isSuperAdmin) {
                    return res.status(403).json({ message: 'Chỉ tài khoản Super Admin mới được đăng nhập tại đây.' });
                }
            } else if (context === 'space' && spaceSlug) {
                // Space domain login: chỉ cho phép Owner hoặc Member đã đăng ký
                const space = await spaceModel.findBySlug(spaceSlug);
                if (!space) {
                    return res.status(404).json({ message: 'Không tìm thấy không gian này.' });
                }
                const isOwner = space.userId === user.id;
                const isMember = await spaceMemberModel.isMember(space.id, user.id);
                if (!isOwner && !isMember) {
                    return res.status(403).json({ message: 'Tài khoản của bạn chưa đăng ký tại không gian này. Vui lòng đăng ký trước.' });
                }
            }
            // --- End two-tier validation ---

            if (!user.apiToken) {
                logger.info(`User ${user.email} logged in without an API token. Generating one now.`);
                user = await userModel.regenerateApiToken(user.id);
            }

            res.json(mapAndSanitizeUser(user));
        } catch (error: unknown) {
            logger.error('Login error:', error);
            res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
        }
    },

    async register(req: Request, res: Response) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Tên, email, và mật khẩu là bắt buộc.' });
            }
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                // Email đã tồn tại → verify password → auto-add vào space → login luôn
                const isMatch = await verifyPassword(password, existingUser.password);
                if (!isMatch) {
                    return res.status(401).json({ message: 'Email đã được đăng ký. Vui lòng đăng nhập hoặc kiểm tra lại mật khẩu.' });
                }
                // Auto-add to space (resolve from hostname)
                try {
                    const host = req.headers.host?.split(':')[0];
                    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
                    if (host && host !== mainDomain && !host.endsWith('.' + mainDomain) && host !== 'localhost') {
                        const space = await spaceModel.findByCustomDomain(host);
                        if (space) await spaceMemberModel.add(space.id, existingUser.id);
                    } else {
                        await spaceMemberModel.add(1, existingUser.id);
                    }
                } catch (memberErr) {
                    logger.error('Auto-membership on register (non-fatal):', memberErr);
                }
                // Return existing user as logged-in
                let returnUser = existingUser;
                if (!returnUser.apiToken) {
                    returnUser = await userModel.regenerateApiToken(returnUser.id) || returnUser;
                }
                return res.status(200).json(mapAndSanitizeUser(returnUser));
            }
            const newUserPayload = {
                name, email, password,
                isActive: true, merits: 0, requestsRemaining: 0,
                avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
                roleIds: [], // User mới không gán quyền mặc định (để null/rỗng)
                template: 'giacngo'
            };
            const newUser = await userModel.create(newUserPayload);
            if (!newUser) {
                throw new Error('Không thể tạo người dùng mới.');
            }
            // Auto-assign to space if registering via custom domain
            try {
                const host = req.headers.host?.split(':')[0];
                const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
                if (host && host !== mainDomain && !host.endsWith('.' + mainDomain) && host !== 'localhost') {
                    const space = await spaceModel.findByCustomDomain(host);
                    if (space) await spaceMemberModel.add(space.id, newUser.id);
                } else {
                    await spaceMemberModel.add(1, newUser.id); // Assign to Giác Ngộ (Space 1)
                }
            } catch (memberErr) {
                logger.error('Auto-membership error (non-fatal):', memberErr);
            }
            try {
                await mailService.sendWelcomeEmail(email, name, 'vi', { host: req.headers.host });
            } catch (mailError) {
                logger.error("Lỗi gửi email chào mừng:", mailError);
            }
            res.status(201).json(mapAndSanitizeUser(newUser));
        } catch (error: unknown) {
            logger.error("Lỗi đăng ký:", error);
            res.status(500).json({ message: `Lỗi khi tạo người dùng: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async forgotPassword(req: Request, res: Response) {
        try {
            const { email, language } = req.body;
            const user = await userModel.findByEmail(email);
            if (!user) {
                return res.status(404).json({ message: language === 'en' ? 'Account with this email does not exist.' : 'Không tìm thấy tài khoản với email này.' });
            }
            const token = crypto.randomBytes(32).toString('hex');
            await userModel.saveResetToken(user.id, token);
            await mailService.sendPasswordResetEmail(user.email, token, language, { host: req.headers.host });
            
            res.status(200).json({ message: language === 'en' ? 'A password reset email has been sent.' : 'Một email đặt lại mật khẩu đã được gửi đi.' });
        } catch (error: unknown) {
            logger.error('Forgot password error:', error);
            res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu.' });
        }
    },

    async resetPassword(req: Request, res: Response) {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                return res.status(400).json({ message: 'Token and new password are required.' });
            }
            const user = await userModel.findByResetToken(token);
            if (!user) {
                return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
            }
            await userModel.update(user.id, {
                password,
                resetToken: null,
                resetTokenExpires: null
            });
            res.status(200).json({ message: 'Password has been reset successfully.' });
        } catch (error: unknown) {
            logger.error('Reset password error:', error);
            res.status(500).json({ message: 'An error occurred while resetting the password.' });
        }
    },

    async refreshToken(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(401).json({ message: 'Refresh Token required' });
            
            // The refreshToken is the persistent api_token in the DB
            const user = await userModel.findByApiToken(refreshToken);
            if (!user || !user.isActive) {
                return res.status(403).json({ message: 'Invalid or revoked Refresh Token' });
            }
            
            const newAccessToken = generateAccessToken(user);
            res.json({ accessToken: newAccessToken });
        } catch (error: unknown) {
            logger.error('Refresh Token error:', error);
            res.status(500).json({ message: 'Lỗi server khi refresh token.' });
        }
    },

    googleCallback: (oauth2Client: any) => async (req: Request, res: Response) => {
        const { code, state } = req.query;
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const ticket = await oauth2Client.verifyIdToken({
                idToken: tokens.id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                throw new Error('Google authentication failed: no payload');
            }
            const { email, name, picture } = payload;
            if (!email || !name) {
                throw new Error('Google authentication failed: missing email or name');
            }

            let user = await userModel.findByEmail(email);
            if (!user) {
                const randomPassword = crypto.randomBytes(20).toString('hex');
                user = await userModel.create({
                    name, email, password: randomPassword,
                    avatarUrl: picture, isActive: true, merits: 0, requestsRemaining: 0,
                    roleIds: [], template: 'giacngo'
                });
                if (!user) {
                    throw new Error('Không thể tạo người dùng mới qua Google.');
                }
                // Auto-assign to space if registering via custom domain
                try {
                    const host = req.headers.host?.split(':')[0];
                    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
                    if (host && host !== mainDomain && !host.endsWith('.' + mainDomain) && host !== 'localhost') {
                        const space = await spaceModel.findByCustomDomain(host);
                        if (space) await spaceMemberModel.add(space.id, user.id);
                    } else {
                        await spaceMemberModel.add(1, user.id); // Assign to Giác Ngộ (Space 1)
                    }
                } catch (memberErr) {
                    logger.error('Auto-membership error (non-fatal):', memberErr);
                }
                try {
                    await mailService.sendWelcomeEmail(email, name, 'vi', { host: req.headers.host });
                } catch (mailError) {
                    logger.error("Lỗi gửi email chào mừng (Google):", mailError);
                }
            }

            if (!user.isActive) {
                return res.redirect('/#/login?error=account_disabled');
            }

            const sanitizedUser = mapAndSanitizeUser(user);
            const userJson = JSON.stringify(sanitizedUser);
            const base64User = Buffer.from(userJson).toString('base64');
            
            let redirectBase = '';
            if (state && typeof state === 'string' && state.startsWith('http')) {
                redirectBase = state;
            }
            res.redirect(`${redirectBase}/#/auth/callback?user=${base64User}`);
        } catch (error: unknown) {
            logger.error('Google auth callback error:', error);
            res.redirect('/#/login?error=auth_failed');
        }
    }
};

