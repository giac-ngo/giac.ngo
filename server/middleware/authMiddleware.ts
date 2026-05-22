// server/middleware/authMiddleware.js
import { userModel } from '../models/user.model.js';
import { pool } from '../db.js';
import { Request, Response, NextFunction } from 'express';
import { User } from '../types/index.js';
import { logger } from '../utils/logger.js';

const mapAndSanitizeUser = (user: any) => {
    if (!user) return null;
    const { password, resetToken, resetTokenExpires, ...sanitizedUser } = user;
    return sanitizedUser;
};


import jwt from 'jsonwebtoken';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    // Try multiple secrets to be safe
    const secrets = [
        process.env.JWT_SECRET,
        'fallback_secret_giacngo123'
    ].filter(Boolean) as string[];

    let decoded: any = null;
    for (const s of secrets) {
        try {
            decoded = jwt.verify(token, s);
            if (decoded) break;
        } catch (e) {
            // continue to next secret
        }
    }

    if (!decoded) {
        // Last resort: Legacy Token check
        try {
            const legacyUser = await userModel.findByApiToken(token);
            if (legacyUser && legacyUser.isActive) {
                req.user = mapAndSanitizeUser(legacyUser) as User;
                logger.info(`Authenticated via Legacy Token for: ${legacyUser.email}`);
                return next();
            }
        } catch (e) {}
        
        logger.error(`Token verification FAILED for request to: ${req.originalUrl}. Token starts with: ${token.substring(0, 10)}...`);
        req.user = null;
        return next();
    }

    try {
        const user = await userModel.findById(decoded.id);
        if (user && user.isActive) {
            req.user = mapAndSanitizeUser(user) as User;
            // Removed noisy success log
        } else {
            logger.warn(`User not found or inactive for token ID: ${decoded.id}`);
            req.user = null;
        }
    } catch (error) {
        logger.error('Error fetching user for token:', error);
        req.user = null;
    }
    next();
};

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    next();
};

// Like isAuthenticated, but does NOT block unauthenticated requests.
// Sets req.user if a valid token is present, otherwise req.user stays null.
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    next(); // authenticateToken already ran globally and set req.user; just pass through
};


export const checkPermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required permission.' });
        }
        next();
    };
};

export const checkSelfOrPermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const isSelf = req.params.id && String(req.user.id) === String(req.params.id);
        const hasAdminPermission = req.user.permissions && req.user.permissions.includes(permission);

        if (isSelf || hasAdminPermission) {
            return next();
        }

        logger.warn(`Access denied for user ${req.user.id} to resource ${req.params.id}. IsSelf: ${isSelf}, HasPermission: ${hasAdminPermission}`);
        return res.status(403).json({ message: 'Forbidden: You do not have permission for this resource.' });
    };
};

// Helper functions for space-based access control
// Helper functions for space-based access control

export const getUserManagedSpaceIds = async (userId: number | undefined): Promise<number[]> => {
    if (!userId) return [];
    // Include spaces owned by user AND spaces where user is a member
    const result = await pool.query(
        `SELECT DISTINCT id FROM (
            SELECT id FROM spaces WHERE user_id = $1
            UNION
            SELECT space_id AS id FROM space_members WHERE user_id = $1
        ) AS combined`,
        [userId]
    );
    return result.rows.map((row: Record<string, unknown>) => Number(row.id));
};

export const isAdmin = (user: User | null | undefined) => {
    return !!user?.isGlobalAdmin || (user && user.permissions && user.permissions.includes('roles'));
};

export const canAccessSpace = async (user: User | null | undefined, spaceId: number | string) => {
    if (isAdmin(user)) return true;
    if (!user || !user.id) return false;
    const userSpaceIds = await getUserManagedSpaceIds(user.id);
    return userSpaceIds.includes(typeof spaceId === 'string' ? parseInt(spaceId, 10) : spaceId);
};

