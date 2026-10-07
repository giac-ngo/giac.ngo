// server/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { userModel } from '../models/user.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { verifyPassword, pool, mapRowToCamelCase } from '../db.js';
import { User } from '../types/index.js';
import { getUserManagedSpaceIds, hasSpacePermission, isAdmin as checkIsGlobalAdmin } from '../middleware/authMiddleware.js';
import { roleModel } from '../models/role.model.js';
import { toPublicUser, toMinimalUser } from '../utils/sanitizeUser.js';
import { can } from '../utils/policy.js';

/** A non-global admin can assign a role only if it belongs to a Space where they hold 'users'. System roles never. */
const canAssignRole = async (editor: User, roleId: number): Promise<boolean> => {
    if (!Number.isInteger(roleId) || roleId <= 0) return false;
    const role: any = await roleModel.findById(roleId);
    if (!role || !role.spaceId) return false;
    return hasSpacePermission(editor, role.spaceId, 'users');
};

/** Returns the subset of requested role IDs the editor may assign, or null if they manage users nowhere. */
const filterAssignableRoleIds = async (editor: User, requested: unknown[]): Promise<number[] | null> => {
    const managed = await getUserManagedSpaceIds(editor.id);
    let managesAny = false;
    for (const sid of managed) {
        if (await hasSpacePermission(editor, sid, 'users')) { managesAny = true; break; }
    }
    if (!managesAny) return null;
    const result: number[] = [];
    for (const raw of requested) {
        const rid = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
        if (await canAssignRole(editor, rid)) result.push(rid);
    }
    return result;
};

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

            // Only Global Admin can see all platform users
            if (user && user.isGlobalAdmin) {
                const users = await userModel.findAll({
                    page: parseInt(page as string, 10),
                    limit: parseInt(limit as string, 10),
                    search: search as string,
                });
                return res.json(users.map(toPublicUser));
            }
            return res.status(403).json({ message: 'Forbidden: Global Admin access required.' });
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
            if (!user) return res.status(401).json({ message: 'Authentication required.' });
            const isGloballyAdmin = checkIsGlobalAdmin(user);

            const { email, password, name, avatarUrl, template } = req.body;
            const payload: Record<string, unknown> = { email, password, name, avatarUrl, template };

            if (isGloballyAdmin) {
                payload.roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds : [];
                const newUser = await userModel.create(payload);
                if (newUser && req.body.spaceId) {
                    const sid = Number(req.body.spaceId);
                    if (Number.isInteger(sid) && sid > 0) {
                        await spaceMemberModel.add(sid, newUser.id);
                    }
                }
                return res.status(201).json(toPublicUser(newUser));
            }

            // Non-global admins MUST supply spaceId and have 'users' permission in that Space
            const targetSpaceId = Number(req.body.spaceId);
            if (!Number.isInteger(targetSpaceId) || targetSpaceId <= 0) {
                return res.status(400).json({ message: 'spaceId is required to create a user.' });
            }

            const canManageUsersInSpace = await can(user, 'users', { spaceId: targetSpaceId });
            if (!canManageUsersInSpace) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to manage users in this Space.' });
            }

            // Role assignment must only include roles belonging to this target Space
            const requestedRoles = Array.isArray(req.body.roleIds) ? req.body.roleIds : [];
            const allowedRoleIds: number[] = [];
            for (const raw of requestedRoles) {
                const rid = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
                if (Number.isInteger(rid) && rid > 0) {
                    const role: any = await roleModel.findById(rid);
                    if (role && Number(role.spaceId) === targetSpaceId) {
                        allowedRoleIds.push(rid);
                    }
                }
            }
            payload.roleIds = allowedRoleIds;

            const newUser = await userModel.create(payload);
            if (newUser) {
                await spaceMemberModel.add(targetSpaceId, newUser.id);
            }
            return res.status(201).json(toPublicUser(newUser));
        } catch (error: unknown) {
            logger.error('Error creating user:', error);
            res.status(500).json({ message: 'Lỗi khi tạo người dùng.' });
        }
    },

    async updateUser(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không hợp lệ.' });

            const user = req.user as User;
            if (!user) return res.status(401).json({ message: 'Authentication required.' });
            const isGloballyAdmin = checkIsGlobalAdmin(user);
            const isSelf = user.id === id;
            const body = req.body || {};

            // 1. Global Admin: full control (except removing own global admin flag).
            if (isGloballyAdmin) {
                const payload = { ...body };
                delete payload.id;
                if (payload.password === '') delete payload.password;
                if (payload.isGlobalAdmin === false && isSelf) {
                    return res.status(403).json({ message: 'Không thể tự bỏ quyền Global Admin của chính mình.' });
                }
                const updatedUser = await userModel.update(id, payload);
                return res.json(toPublicUser(updatedUser));
            }

            const target = await userModel.findById(id);
            if (!target) return res.status(404).json({ message: 'User not found.' });

            // 2. Self (non-admin): profile fields only. Password via /change-password.
            const profilePayload: Record<string, unknown> = {};
            if (typeof body.name === 'string' && body.name.trim()) profilePayload.name = body.name.trim();
            if (typeof body.avatarUrl === 'string') profilePayload.avatarUrl = body.avatarUrl.trim();
            if (typeof body.bio === 'string') profilePayload.bio = body.bio;

            if (isSelf) {
                const updatedUser = await userModel.update(id, profilePayload);
                return res.json(toPublicUser(updatedUser));
            }

            // 3. Space admin managing another member: only when they hold 'users' in a Space
            //    the target belongs to. Never touch Global Admins, credentials, merits, plans or status.
            if (target.isGlobalAdmin) {
                return res.status(403).json({ message: 'Forbidden: Global Admin accounts can only be changed by a Global Admin.' });
            }
            const targetSpaces = await spaceMemberModel.getSpacesByUser(id);
            let managesTarget = false;
            for (const s of targetSpaces as any[]) {
                if (await hasSpacePermission(user, s.spaceId, 'users')) { managesTarget = true; break; }
            }
            if (!managesTarget) {
                return res.status(403).json({ message: 'Forbidden: You cannot modify this user.' });
            }

            const payload: Record<string, unknown> = { ...profilePayload };
            if (Array.isArray(body.roleIds)) {
                // Keep roles the editor cannot manage; replace only roles they can assign.
                const currentRoleIds: number[] = (target.roleIds || []).map((r: unknown) => Number(r));
                const keep: number[] = [];
                for (const rid of currentRoleIds) {
                    if (!(await canAssignRole(user, rid))) keep.push(rid);
                }
                const assignable = await filterAssignableRoleIds(user, body.roleIds);
                payload.roleIds = Array.from(new Set([...keep, ...(assignable || [])]));
            }

            const updatedUser = await userModel.update(id, payload);
            res.json(toPublicUser(updatedUser));
        } catch (error: unknown) {
            logger.error('Lỗi khi cập nhật người dùng:', error);
            res.status(500).json({ message: 'Lỗi khi cập nhật người dùng.' });
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

