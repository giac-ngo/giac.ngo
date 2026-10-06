// server/middleware/authMiddleware.js
import { userModel } from '../models/user.model.js';
import { pool } from '../db.js';
import { Request, Response, NextFunction } from 'express';
import { User } from '../types/index.js';
import { logger } from '../utils/logger.js';

const mapAndSanitizeUser = (user: any) => {
    if (!user) return null;
    const { password, resetToken, resetTokenExpires, apiToken, ...sanitizedUser } = user;
    return sanitizedUser;
};


import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwtSecret.js';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    let decoded: any = null;
    let isExpired = false;
    try {
        decoded = jwt.verify(token, getJwtSecret());
    } catch (e: any) {
        if (e && e.name === 'TokenExpiredError') {
            isExpired = true;
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
        
        if (isExpired) {
            logger.warn(`Token expired for request to: ${req.originalUrl}.`);
        } else {
            logger.warn(`Token verification failed for request to: ${req.originalUrl}.`);
        }
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

export const requireGlobalAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!isAdmin(req.user)) {
        return res.status(403).json({ message: 'Forbidden: Global Admin access required.' });
    }
    next();
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
    return !!user?.isGlobalAdmin;
};

export const canAccessSpace = async (user: User | null | undefined, spaceId: number | string) => {
    if (isAdmin(user)) return true;
    if (!user || !user.id) return false;
    const userSpaceIds = await getUserManagedSpaceIds(user.id);
    return userSpaceIds.includes(typeof spaceId === 'string' ? parseInt(spaceId, 10) : spaceId);
};

// Resolve permissions from system roles and only the role for the requested
// space. `req.user.permissions` is a convenient union for UI rendering, but it
// must not authorize writes across all spaces a member belongs to.
export const hasSpacePermission = async (user: User | null | undefined, spaceId: number | string, permission: string) => {
    if (isAdmin(user)) return true;
    if (!user?.id || !/^\d+$/.test(String(spaceId))) return false;

    // A Space owner is its tenant administrator, regardless of which Space
    // roles happen to be included in the user's UI permission union.
    const ownership = await pool.query(
        'SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2 LIMIT 1',
        [Number(spaceId), user.id]
    );
    if (ownership.rows.length > 0) return true;

    const result = await pool.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
           AND r.space_id = $2
           AND $3 = ANY(r.permissions)
         LIMIT 1`,
        [user.id, spaceId, permission]
    );
    return result.rows.length > 0;
};

/** Authorize a permission in one explicitly identified Space. A missing
 * Space is never inferred from req.user.permissions: only global admins may
 * use this guard for system-wide resources with no Space association. */
export const requireSpacePermission = (permission: string, spaceIdParamName = 'id') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const rawSpaceId = req.params[spaceIdParamName]
            ?? req.body?.spaceId
            ?? req.query?.spaceId;
        if (rawSpaceId === undefined || rawSpaceId === null || String(rawSpaceId).trim() === '') {
            if (isAdmin(req.user)) return next();
            return res.status(400).json({ message: 'Space ID is required.' });
        }
        if (!/^\d+$/.test(String(rawSpaceId))) {
            return res.status(400).json({ message: 'Invalid Space ID.' });
        }

        try {
            if (await hasSpacePermission(req.user, String(rawSpaceId), permission)) return next();
            return res.status(403).json({ message: 'Forbidden: You do not have this permission in the requested Space.' });
        } catch (error) {
            return next(error);
        }
    };
};

/** Authorize management of an AI config by global admin, its owner, or a user
 * with the requested permission in the AI's own Space. */
export const requireAiPermission = (permission = 'ai', aiIdParamName = 'id') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
        const rawAiId = req.params[aiIdParamName] ?? req.body?.aiConfigId;
        if (rawAiId === undefined || !/^\d+$/.test(String(rawAiId))) {
            return res.status(400).json({ message: 'Invalid AI ID.' });
        }

        try {
            const result = await pool.query(
                'SELECT id, owner_id, space_id FROM ai_configs WHERE id = $1 LIMIT 1',
                [Number(rawAiId)]
            );
            const ai = result.rows[0];
            if (!ai) return res.status(404).json({ message: 'AI config not found.' });
            if (isAdmin(req.user) || Number(ai.owner_id) === Number(req.user.id)) return next();
            if (ai.space_id && await hasSpacePermission(req.user, String(ai.space_id), permission)) return next();
            return res.status(403).json({ message: 'Forbidden: You do not have this permission for the AI config.' });
        } catch (error) {
            return next(error);
        }
    };
};

/** Scope operations addressed by a training-data source ID through its AI. */
export const requireTrainingDataPermission = (permission = 'ai') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
        const rawSourceId = req.params.id;
        if (rawSourceId === undefined || !/^\d+$/.test(String(rawSourceId))) {
            return res.status(400).json({ message: 'Invalid training data source ID.' });
        }
        try {
            const result = await pool.query(
                `SELECT a.id, a.owner_id, a.space_id
                 FROM training_data_sources t
                 JOIN ai_configs a ON a.id = t.ai_config_id
                 WHERE t.id = $1 LIMIT 1`,
                [Number(rawSourceId)]
            );
            const ai = result.rows[0];
            if (!ai) return res.status(404).json({ message: 'Training data source not found.' });
            if (isAdmin(req.user) || Number(ai.owner_id) === Number(req.user.id)) return next();
            if (ai.space_id && await hasSpacePermission(req.user, String(ai.space_id), permission)) return next();
            return res.status(403).json({ message: 'Forbidden: You do not have this permission for the training data source.' });
        } catch (error) {
            return next(error);
        }
    };
};

