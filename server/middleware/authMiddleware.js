// server/middleware/authMiddleware.js
import { userModel } from '../models/user.model.js';
import { pool } from '../db.js';

const mapAndSanitizeUser = (user) => {
    if (!user) return null;
    const { password, resetToken, resetTokenExpires, ...sanitizedUser } = user;
    return sanitizedUser;
};


import jwt from 'jsonwebtoken';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_giacngo123', async (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    // Critical: Return 401 so the frontend Axios Interceptor catches it and calls /refreshToken
                    return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
                }
                
                // Fallback for older non-JWT static sessions during the transition phase
                const legacyUser = await userModel.findByApiToken(token);
                if (legacyUser && legacyUser.isActive) {
                    req.user = mapAndSanitizeUser(legacyUser);
                } else {
                    req.user = null;
                }
                return next();
            }

            // Valid JWT
            const user = await userModel.findById(decoded.id);
            if (user && user.isActive) {
                req.user = mapAndSanitizeUser(user);
            } else {
                req.user = null;
            }
            next();
        });
    } catch (error) {
        console.error('Authentication exception:', error);
        req.user = null;
        next();
    }
};

export const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    next();
};

// Like isAuthenticated, but does NOT block unauthenticated requests.
// Sets req.user if a valid token is present, otherwise req.user stays null.
export const optionalAuth = (req, res, next) => {
    next(); // authenticateToken already ran globally and set req.user; just pass through
};


export const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required permission.' });
        }
        next();
    };
};

export const checkSelfOrPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const isSelf = req.params.id && String(req.user.id) === String(req.params.id);
        const hasAdminPermission = req.user.permissions && req.user.permissions.includes(permission);

        if (isSelf || hasAdminPermission) {
            return next();
        }

        console.warn(`Access denied for user ${req.user.id} to resource ${req.params.id}. IsSelf: ${isSelf}, HasPermission: ${hasAdminPermission}`);
        return res.status(403).json({ message: 'Forbidden: You do not have permission for this resource.' });
    };
};

// Helper functions for space-based access control
// Helper functions for space-based access control

export const getUserManagedSpaceIds = async (userId) => {
    const result = await pool.query('SELECT id FROM spaces WHERE user_id = $1', [userId]);
    return result.rows.map(row => row.id);
};

export const isAdmin = (user) => {
    return user && user.permissions && user.permissions.includes('roles');
};

export const canAccessSpace = async (user, spaceId) => {
    if (isAdmin(user)) return true;
    const userSpaceIds = await getUserManagedSpaceIds(user.id);
    return userSpaceIds.includes(parseInt(spaceId));
};

