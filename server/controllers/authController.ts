
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
import { getJwtSecret } from '../utils/jwtSecret.js';
import { verifyOAuthState } from '../utils/oauthState.js';
import { isAdminHost, isLocalhost, resolveSpaceFromHost, getMainDomain, getAdminHost } from '../utils/domain.js';

const generateAccessToken = (user: User) => {
    return jwt.sign(
        { id: user.id },
        getJwtSecret(),
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
        const { email, password, context, spaceSlug, spaceId } = req.body;
        try {
            let user = await userModel.findByEmail(email);
            if (!user || !user.isActive) {
                return res.status(401).json({ message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa.' });
            }
            const isMatch = await verifyPassword(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
            }

            // Enrich user with permissions for the check
            const { enrichUserWithPermissions } = await import('../models/user.model.js');
            const enrichedUser = await enrichUserWithPermissions(user);

            const host = req.headers.host?.split(':')[0]?.toLowerCase() || '';

            // Quy tắc 1: Nếu đăng nhập tại ADMIN_HOST (login.bodhilab.io), CHỈ CHO PHÉP Super Admin
            // Tự động kiểm tra dựa trên host (không phụ thuộc vào client gửi context)
            if (isAdminHost(host) || context === 'admin') {
                if (!enrichedUser?.isGlobalAdmin) {
                    return res.status(403).json({ message: 'Chỉ tài khoản Super Admin mới được đăng nhập tại đây.' });
                }
            } else {
                // Quy tắc 2: Tên miền Không gian hoặc client chỉ định Space
                let targetSpace = await resolveSpaceFromHost(host);

                if (!targetSpace) {
                    if (spaceSlug && typeof spaceSlug === 'string' && spaceSlug.trim()) {
                        targetSpace = await spaceModel.findBySlug(spaceSlug.trim());
                    } else if (spaceId && Number.isInteger(Number(spaceId))) {
                        targetSpace = await spaceModel.findById(Number(spaceId));
                    }
                }

                if (targetSpace) {
                    const isOwner = targetSpace.userId === user.id;
                    const isMember = await spaceMemberModel.isMember(targetSpace.id, user.id);
                    if (!isOwner && !isMember && !enrichedUser?.isGlobalAdmin) {
                        return res.status(403).json({ message: 'Tài khoản của bạn chưa đăng ký tại không gian này. Vui lòng đăng ký trước.' });
                    }
                } else if (!isLocalhost(host) && host !== getMainDomain()) {
                    return res.status(404).json({ message: 'Không tìm thấy không gian này.' });
                }
            }

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
            const host = req.headers.host?.split(':')[0]?.toLowerCase() || '';

            // Quy tắc 1: Nếu gọi ở ADMIN_HOST (login.bodhilab.io), CHẶN NGAY LẬP TỨC 400 (không xét body)
            if (isAdminHost(host)) {
                return res.status(400).json({ message: 'Trang quản trị hệ thống không cho phép đăng ký tài khoản.' });
            }

            const { name, email, password, spaceId, spaceSlug } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Tên, email, và mật khẩu là bắt buộc.' });
            }
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
            }

            // Quy tắc 2: Xác định Space (ưu tiên host/subdomain trước, rồi mới tới spaceId/spaceSlug gửi từ dev/localhost)
            let resolvedSpace = await resolveSpaceFromHost(host);

            if (!resolvedSpace) {
                if (spaceId && Number.isInteger(Number(spaceId))) {
                    resolvedSpace = await spaceModel.findById(Number(spaceId));
                } else if (typeof spaceSlug === 'string' && spaceSlug.trim()) {
                    resolvedSpace = await spaceModel.findBySlug(spaceSlug.trim());
                }
            }

            if (!resolvedSpace) {
                return res.status(400).json({
                    message: 'Không thể đăng ký: Không xác định được Không gian (Space) hợp lệ. Vui lòng đăng ký qua đường dẫn hoặc tên miền của Không gian.'
                });
            }

            const newUserPayload = {
                name, email, password,
                isActive: true, merits: 0, requestsRemaining: 0,
                avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
                roleIds: [], // User mới không gán quyền mặc định (để null/rỗng)
                template: 'giacngo'
            };

            // Atomically create user and assign space membership in single DB transaction
            const newUser = await userModel.create(newUserPayload, resolvedSpace.id);
            if (!newUser) {
                throw new Error('Không thể tạo người dùng mới.');
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
            if (user) {
                const token = crypto.randomBytes(32).toString('hex');
                await userModel.saveResetToken(user.id, token);
                try {
                    await mailService.sendPasswordResetEmail(user.email, token, language, { host: req.headers.host });
                } catch (mailError) {
                    logger.error('Password reset email could not be sent.', mailError);
                }
            }
            return res.status(200).json({ message: language === 'en' ? 'If the account exists, a password reset email has been sent.' : 'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi qua email.' });
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
            if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
                return res.status(400).json({ message: 'Password must be between 8 and 256 characters.' });
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
            // Revoke persistent refresh/API tokens issued before the password reset.
            await userModel.regenerateApiToken(user.id);
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
        let returnTarget = '/#/login';
        try {
            const oauthState = verifyOAuthState(state);
            if (!oauthState) return res.redirect('/#/login?error=auth_failed');
            returnTarget = oauthState.returnTo || '/#/login';

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
                // User mới: bắt buộc phải có Space hợp lệ từ oauthState, không fallback Space 1
                const targetSpaceId = oauthState.spaceId;
                if (!targetSpaceId) {
                    logger.warn(`Google signup rejected for ${email}: No space resolved in oauthState.`);
                    return res.redirect(`${oauthState.returnTo || ''}/#/login?error=no_space`);
                }

                const space = await spaceModel.findById(targetSpaceId);
                if (!space) {
                    logger.warn(`Google signup rejected for ${email}: Space ${targetSpaceId} does not exist.`);
                    return res.redirect(`${oauthState.returnTo || ''}/#/login?error=invalid_space`);
                }

                const randomPassword = crypto.randomBytes(20).toString('hex');
                // Tạo user và thêm thành viên space trong cùng 1 transaction DB
                user = await userModel.create({
                    name, email, password: randomPassword,
                    avatarUrl: picture, isActive: true, merits: 0, requestsRemaining: 0,
                    roleIds: [], template: 'giacngo'
                }, space.id);

                if (!user) {
                    throw new Error('Không thể tạo người dùng mới qua Google.');
                }

                try {
                    await mailService.sendWelcomeEmail(email, name, 'vi', { host: req.headers.host });
                } catch (mailError) {
                    logger.error("Lỗi gửi email chào mừng (Google):", mailError);
                }
            }

            // Tài khoản đã có sẵn: chỉ đăng nhập, TUYỆT ĐỐI không tự động gán thêm Space
            if (!user.isActive) {
                return res.redirect(`${oauthState.returnTo || ''}/#/login?error=account_disabled`);
            }

            const { enrichUserWithPermissions } = await import('../models/user.model.js');
            const enrichedUser = await enrichUserWithPermissions(user);

            // Kiểm tra phân quyền truy cập tương tự đăng nhập bằng mật khẩu:
            let returnHost = '';
            if (oauthState.returnTo) {
                try {
                    returnHost = new URL(oauthState.returnTo).hostname.toLowerCase();
                } catch {}
            }

            // Nếu đăng nhập trên ADMIN_HOST: chỉ Super Admin mới được đăng nhập
            if (isAdminHost(returnHost)) {
                if (!enrichedUser?.isGlobalAdmin) {
                    logger.warn(`Google login rejected for ${email}: Not super admin on ${returnHost}`);
                    return res.redirect(`${oauthState.returnTo}/#/login?error=admin_only`);
                }
            } else if (oauthState.spaceId) {
                // Nếu đăng nhập trên trang Space: phải là Owner hoặc Member (hoặc Super Admin)
                const space = await spaceModel.findById(oauthState.spaceId);
                if (space) {
                    const isOwner = space.userId === user.id;
                    const isMember = await spaceMemberModel.isMember(space.id, user.id);
                    if (!isOwner && !isMember && !enrichedUser?.isGlobalAdmin) {
                        logger.warn(`Google login rejected for ${email}: User is not member of space ${space.id}`);
                        return res.redirect(`${oauthState.returnTo || ''}/#/login?error=not_member`);
                    }
                }
            }

            const sanitizedUser = mapAndSanitizeUser(user);
            const userJson = JSON.stringify(sanitizedUser);
            const base64User = Buffer.from(userJson).toString('base64');
            
            const redirectBase = oauthState.returnTo;
            res.redirect(`${redirectBase}/#/auth/callback?user=${base64User}`);
        } catch (error: unknown) {
            logger.error('Google auth callback error:', error);
            res.redirect(`${returnTarget}?error=auth_failed`);
        }
    }
};

