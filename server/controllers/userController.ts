// server/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { userModel } from '../models/user.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { verifyPassword, pool, mapRowToCamelCase } from '../db.js';
import { User } from '../types/index.js';

const mapAndSanitizeUser = (user: User | null) => {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};

export const userController = {
    async getProfile(req: Request, res: Response) {
        try {
            res.json(mapAndSanitizeUser(req.user as User));
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không th? t?i thông tin h? so.' });
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
                return res.json(users.map(mapAndSanitizeUser));
            } else if (user && user.permissions && (user.permissions.includes('spaces') || user.permissions.includes('ai'))) {
                // Other management roles (like Content Manager): can only see a list of space owners
                const users = await userModel.findSpaceOwners();
                return res.json(users.map(mapAndSanitizeUser));
            }
            // If user has none of these permissions, they are forbidden.
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view users.' });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Không th? t?i danh sách ngu?i dùng.' });
        }
    },

    async getSpaceOwners(req: Request, res: Response) {
        try {
            const users = await userModel.findSpaceOwners();
            res.json(users.map(mapAndSanitizeUser));
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
            const newUser = await userModel.create(req.body);
            res.status(201).json(mapAndSanitizeUser(newUser));
        } catch (error: unknown) {
            res.status(500).json({ message: `L?i khi t?o ngu?i dùng: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async updateUser(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không h?p l?.' });

            const user = req.user as User;
            const isAdmin = user && user.permissions && user.permissions.includes('users');

            const payload = { ...req.body };
            if (payload.password === '') delete payload.password;

            // Prevent non-admins from escalating privileges or changing sensitive fields
            if (!isAdmin) {
                delete payload.roleIds;
                delete payload.isActive;
                delete payload.merits;
                delete payload.email;
                delete payload.password;
            }

            const updatedUser = await userModel.update(id, payload);
            res.json(mapAndSanitizeUser(updatedUser));
        } catch (error: unknown) {
            logger.error("L?i khi c?p nh?t ngu?i dùng:", error);
            res.status(500).json({ message: 'L?i khi c?p nh?t ngu?i dùng.' });
        }
    },

    async deleteUser(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không h?p l?.' });
            
            const user = req.user as User;
            if (user && user.id === id) {
                return res.status(400).json({ message: 'B?n không th? xóa chính mình.' });
            }
            await userModel.delete(id);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'L?i khi xóa ngu?i dùng.' });
        }
    },

    async regenerateApiToken(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'User ID không h?p l?.' });
            const updatedUser = await userModel.regenerateApiToken(id);
            res.json(mapAndSanitizeUser(updatedUser));
        } catch (error: unknown) {
            res.status(500).json({ message: `L?i khi t?o token m?i: ${(error instanceof Error ? error.message : String(error))}` });
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
            const userId = parseInt(String(req.params.id), 10);
            if (isNaN(userId)) return res.status(400).json({ message: 'User ID không h?p l?.' });
            const spaces = await spaceMemberModel.getSpacesByUser(userId);
            res.json(spaces);
        } catch (error: unknown) {
            logger.error('Error fetching user spaces:', error);
            res.status(500).json({ message: 'L?i khi t?i danh sách không gian.' });
        }
    },
};


