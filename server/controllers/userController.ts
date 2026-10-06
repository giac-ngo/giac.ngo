// server/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { userModel } from '../models/user.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { verifyPassword, pool, mapRowToCamelCase } from '../db.js';
import { User } from '../types/index.js';
import { getUserManagedSpaceIds, isAdmin as checkIsGlobalAdmin } from '../middleware/authMiddleware.js';
import { toPublicUser, toMinimalUser } from '../utils/sanitizeUser.js';

export const userController = {
    async getProfile(req: Request, res: Response) {
        try {
            res.json(toPublicUser(req.user as User));
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không thể tải thông tin hồ sơ.' });
        }
    },
    async updateProfile(req: Request, res: Response) {
        try {
            const user = req.user as User;
            if (!user || !user.id) {
                return res.status(401).json({ message: 'Authentication required.' });
            }
            const { name, avatarUrl, bio } = req.body;
            const payload: Record<string, any> = {};
            if (typeof name === 'string' && name.trim().length > 0) payload.name = name.trim();
            if (typeof avatarUrl === 'string') payload.avatarUrl = avatarUrl.trim();
            if (typeof bio === 'string') payload.bio = bio;

            const updatedUser = await userModel.update(user.id, payload);
            res.json(toPublicUser(updatedUser));
        } catch (error: unknown) {
            logger.error('Error updating user profile:', error);
            res.status(500).json({ message: 'Không thể cập nhật hồ sơ cá nhân.' });
        }
    },
    async getAllUsers(req: Request, res: Response) {
        try {
            const { page = 1, limit = 15, search = '' } = req.query;
            const user = req.user as User;

            // Check permissions inside the controller
            if (user && user.permissions && user.permissions.includes('users')) {
                // Admin role: can see all users with pagination and search
                const users = await userModel.findAll({
                    page: parseInt(page as string, 10),
                    limit: parseInt(limit as string, 10),
                    search: search as string,
                });
                return res.json(users.map(toPublicUser));
            } else if (user && user.permissions && (user.permissions.includes('spaces') || user.permissions.includes('ai'))) {
                // Other management roles (like Content Manager): can only see a list of space owners
                const users = await userModel.findSpaceOwners();
                return res.json(users.map(toMinimalUser));
            }
            // If user has none of these permissions, they are forbidden.
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view users.' });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không thể tải danh sách người dùng.' });
        }
    },

    async getSpaceOwners(req: Request, res: Response) {
        try {
            const users = await userModel.findSpaceOwners();
            res.json(users.map(toMinimalUser));
        } catch (error: unknown) {
            logger.error('Error fetching space owners:', error);
            res.status(500).json({ message: 'Could not fetch space owners.' });
        }
    },

    async getMySpaceOwnerData(req: Request, res: Response) {
        const user = req.user as User;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        try {
            const spacesRes = await pool.query('SELECT id, name, merits, stripe_account_id FROM spaces WHERE user_id = $1', [userId]);
            const ownedSpaces = spacesRes.rows.map(mapRowToCamelCase);
            const ownedSpaceIds = ownedSpaces.map((s: any) => s.id);

            let revenueHistory = [];
            let totalEarnings = 0;

            if (ownedSpaceIds.length > 0) {
                const revenueRes = await pool.query(
                    `SELECT t.*, u.name as user_name 
                     FROM transactions t
                     JOIN users u ON t.user_id = u.id
                     WHERE t.destination_space_id = ANY($1::int[]) 
                     AND t.type IN ('offering', 'ai_purchase')
                     ORDER BY t.timestamp DESC`,
                    [ownedSpaceIds]
                );
                revenueHistory = revenueRes.rows.map(mapRowToCamelCase);
                totalEarnings = revenueHistory.reduce((sum, tx) => sum + Math.abs(tx.merits), 0);
            }

            const withdrawalRes = await pool.query(
                `SELECT wr.*, u.name as user_name 
                 FROM withdrawal_requests wr
                 JOIN users u ON wr.user_id = u.id
                 WHERE wr.user_id = $1 ORDER BY wr.created_at DESC`,
                [userId]
            );

            const responseData = {
                totalEarnings,
                stripeAccountId: user.stripeAccountId,
                ownedSpaces,
                revenueHistory: revenueHistory.map(mapRowToCamelCase),
                withdrawalHistory: withdrawalRes.rows.map(mapRowToCamelCase),
            };

            res.json(responseData);

        } catch (error: unknown) {
            logger.error('Error fetching space owner data:', error);
            res.status(500).json({ message: 'Failed to fetch space owner data.' });
        }
    },

    async createUser(req: Request, res: Response) {
        try {
            const user = req.user as User;
            const isGloballyAdmin = checkIsGlobalAdmin(user) || Boolean(user?.permissions?.includes('users'));
            if (!isGloballyAdmin) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to create users.' });
            }
            const newUser = await userModel.create(req.body);
            res.status(201).json(toPublicUser(newUser));
        } catch (error: unknown) {
            res.status(500).json({ message: `Lỗi khi tạo người dùng: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async updateUser(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không hợp lệ.' });

            const user = req.user as User;
            const isGloballyAdmin = checkIsGlobalAdmin(user);
            const hasUsersPermission = Boolean(user && user.permissions && user.permissions.includes('users'));
            const isSelf = user && user.id === id;

            let isSpaceManagerForUser = false;
            if (!isGloballyAdmin && !hasUsersPermission && !isSelf) {
                const managedSpaceIds = await getUserManagedSpaceIds(user?.id);
                if (managedSpaceIds.length > 0) {
                    const targetUserSpaces = await spaceMemberModel.getSpacesByUser(id);
                    isSpaceManagerForUser = targetUserSpaces.some((s: any) => managedSpaceIds.includes(s.spaceId));
                }
            }

            const canManage = isGloballyAdmin || hasUsersPermission || isSpaceManagerForUser;
            if (!canManage && !isSelf) {
                return res.status(403).json({ message: 'Forbidden: You cannot modify this user.' });
            }

            const payload = { ...req.body };
            if (payload.password === '') delete payload.password;

            // Protect isGlobalAdmin: only global admin can set it, cannot remove own
            if (!isGloballyAdmin) {
                delete payload.isGlobalAdmin;
            } else if (payload.isGlobalAdmin === false && id === user.id) {
                return res.status(403).json({ message: 'Không thể tự bỏ quyền Global Admin của chính mình.' });
            }

            // Merits: only Global Admin can directly modify merits
            if (!isGloballyAdmin) {
                delete payload.merits;
            }

            // Roles & status: only admins (Global or 'users' permission) can change roles / status
            if (!isGloballyAdmin && !hasUsersPermission) {
                delete payload.roleIds;
                delete payload.isActive;
            }

            // Prevent changing password without current password verification:
            // Self-updates must ALWAYS use the changePassword endpoint which verifies oldPassword.
            if (isSelf || (!isGloballyAdmin && !hasUsersPermission)) {
                delete payload.password;
            }

            if (!isGloballyAdmin && !hasUsersPermission) {
                delete payload.email;
            }

            // DO NOT log payload containing raw password!
            const updatedUser = await userModel.update(id, payload);
            res.json(toPublicUser(updatedUser));
        } catch (error: unknown) {
            logger.error("Lỗi khi cập nhật người dùng:", error);
            res.status(500).json({ message: `Lỗi khi cập nhật người dùng: ${error instanceof Error ? error.message : String(error)}` });
        }
    },

    async deleteUser(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không hợp lệ.' });
            
            const user = req.user as User;
            const isGloballyAdmin = checkIsGlobalAdmin(user);
            if (!isGloballyAdmin) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền xóa người dùng.' });
            }
            if (user && user.id === id) {
                return res.status(400).json({ message: 'Bạn không thể xóa chính mình.' });
            }
            await userModel.delete(id);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'Lỗi khi xóa người dùng.' });
        }
    },

    async regenerateApiToken(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không hợp lệ.' });
            const user = req.user as User;
            const isGloballyAdmin = checkIsGlobalAdmin(user);
            const isSelf = user && user.id === id;
            if (!isGloballyAdmin && !isSelf) {
                return res.status(403).json({ message: 'Forbidden: You can only regenerate your own API token.' });
            }
            const updatedUser = await userModel.regenerateApiToken(id);
            res.json({
                ...toPublicUser(updatedUser),
                apiToken: updatedUser?.apiToken
            });
        } catch (error: unknown) {
            res.status(500).json({ message: `Lỗi khi tạo token mới: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async changePassword(req: Request, res: Response) {
        const { userId, oldPassword, newPassword } = req.body;
        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ message: 'User ID, current password, and new password are required.' });
        }
        const userAuth = req.user as User;
        if (userAuth && userAuth.id !== userId) {
            return res.status(403).json({ message: 'Forbidden: You can only change your own password.' });
        }
        try {
            const user = await userModel.findById(userId); // Re-fetch to get password hash
            if (!user) throw new Error('User not found.');
            const isMatch = await verifyPassword(oldPassword, user.password);
            if (!isMatch) throw new Error('Incorrect current password.');

            await userModel.update(userId, { password: newPassword });
            res.status(200).json({ message: 'Password changed successfully.' });
        } catch (error: unknown) {
            const clientMessage = (error instanceof Error ? error.message : String(error)) === 'Incorrect current password.' ? (error as Error).message : 'An error occurred.';
            res.status(400).json({ message: clientMessage });
        }
    },

    async getUserSpaces(req: Request, res: Response) {
        try {
            const userId = parseInt(String(req.params.userId || req.params.id), 10);
            if (isNaN(userId)) return res.status(400).json({ message: 'User ID không hợp lệ.' });
            const user = req.user as User;
            const isGloballyAdmin = checkIsGlobalAdmin(user);
            const isSelf = user && user.id === userId;
            const hasPermission = Boolean(user?.permissions && (user.permissions.includes('users') || user.permissions.includes('spaces')));
            if (!isGloballyAdmin && !isSelf && !hasPermission) {
                return res.status(403).json({ message: 'Forbidden: Access denied to user spaces.' });
            }
            const spaces = await spaceMemberModel.getSpacesByUser(userId);
            res.json(spaces);
        } catch (error: unknown) {
            logger.error('Error fetching user spaces:', error);
            res.status(500).json({ message: 'Lỗi khi tải danh sách không gian.' });
        }
    },
};

