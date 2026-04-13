
// server/controllers/authController.js
import { userModel } from '../models/user.model.js';
import { mailService } from '../services/mailService.js';
import { verifyPassword } from '../db.js';
import { spaceModel } from '../models/space.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'fallback_secret_giacngo123',
        { expiresIn: '7d' } // 7 days
    );
};

const mapAndSanitizeUser = (user) => {
    if (!user) return null;
    const { password, resetToken, resetTokenExpires, apiToken, ...sanitizedUser } = user;
    
    // Convert static DB apiToken into dual JWT Access / Refresh Token pair for the frontend
    sanitizedUser.apiToken = generateAccessToken(user); // Short-lived Access Token
    sanitizedUser.refreshToken = apiToken; // Long-lived Refresh Token (Database static)

    return sanitizedUser;
};

export const authController = {
    async login(req, res) {
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
                const isSuperAdmin = enrichedUser.permissions && enrichedUser.permissions.includes('roles');
                if (!isSuperAdmin) {
                    return res.status(403).json({ message: 'Chỉ tài khoản Super Admin mới được đăng nhập tại đây.' });
                }
            } else if (context === 'space' && spaceSlug) {
                // Space domain login: must be a member of that space (or owner)
                const space = await spaceModel.findBySlug(spaceSlug);
                if (!space) {
                    return res.status(404).json({ message: 'Không tìm thấy không gian này.' });
                }
                const isOwner = space.userId === user.id;
                const isMember = await spaceMemberModel.isMember(space.id, user.id);
                if (!isOwner && !isMember) {
                    return res.status(403).json({ message: 'Bạn không phải thành viên của không gian này. Vui lòng liên hệ quản trị viên.' });
                }
            }
            // --- End two-tier validation ---

            if (!user.apiToken) {
                console.log(`User ${user.email} logged in without an API token. Generating one now.`);
                user = await userModel.regenerateApiToken(user.id);
            }

            res.json(mapAndSanitizeUser(user));
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
        }
    },

    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ message: 'Tên, email, và mật khẩu là bắt buộc.' });
            }
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Email đã được sử dụng.' });
            }
            const newUserPayload = {
                name, email, password,
                isActive: true, merits: 0, requestsRemaining: 0,
                avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
                roleIds: [3], // Default 'User' role
                template: 'giacngo'
            };
            const newUser = await userModel.create(newUserPayload);
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
                console.error('Auto-membership error (non-fatal):', memberErr);
            }
            try {
                await mailService.sendWelcomeEmail(email, name, 'vi', { host: req.headers.host });
            } catch (mailError) {
                console.error("Lỗi gửi email chào mừng:", mailError);
            }
            res.status(201).json(mapAndSanitizeUser(newUser));
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            res.status(500).json({ message: `Lỗi khi tạo người dùng: ${error.message}` });
        }
    },

    async forgotPassword(req, res) {
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
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu.' });
        }
    },

    async resetPassword(req, res) {
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
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: 'An error occurred while resetting the password.' });
        }
    },

    async refreshToken(req, res) {
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
        } catch (error) {
            console.error('Refresh Token error:', error);
            res.status(500).json({ message: 'Lỗi server khi refresh token.' });
        }
    },

    googleCallback: (oauth2Client) => async (req, res) => {
        const { code } = req.query;
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const ticket = await oauth2Client.verifyIdToken({
                idToken: tokens.id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            const { email, name, picture } = payload;

            let user = await userModel.findByEmail(email);
            if (!user) {
                const randomPassword = crypto.randomBytes(20).toString('hex');
                user = await userModel.create({
                    name, email, password: randomPassword,
                    avatarUrl: picture, isActive: true, merits: 0, requestsRemaining: 0,
                    roleIds: [3], template: 'giacngo'
                });
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
                    console.error('Auto-membership error (non-fatal):', memberErr);
                }
                try {
                    await mailService.sendWelcomeEmail(email, name, 'vi', { host: req.headers.host });
                } catch (mailError) {
                    console.error("Lỗi gửi email chào mừng (Google):", mailError);
                }
            }

            if (!user.isActive) {
                return res.redirect('/#/login?error=account_disabled');
            }

            const sanitizedUser = mapAndSanitizeUser(user);
            const userJson = JSON.stringify(sanitizedUser);
            const base64User = Buffer.from(userJson).toString('base64');
            res.redirect(`/#/auth/callback?user=${base64User}`);
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('/#/login?error=auth_failed');
        }
    }
};
