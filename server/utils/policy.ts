// server/utils/policy.ts
import { pool } from '../db.js';
import { User } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

export type PermissionAction =
    | 'system'
    | 'spaces'
    | 'roles'
    | 'users'
    | 'ai'
    | 'files'
    | 'dharma-talks'
    | 'meditation'
    | 'cms'
    | 'cms_write'
    | 'cms_approve'
    | 'social'
    | 'social-moderate'
    | 'notifications'
    | 'space-billing'
    | 'conversations'
    | 'dashboard'
    | 'pricing';

export type PolicyScope = 'global' | { spaceId: number | string };

/**
 * Core Policy Engine: can(user, action, scope)
 * 
 * Rules:
 * 1. Global Admin (users.is_global_admin = true) has all permissions across the platform.
 * 2. If scope is 'global', ONLY Global Admin can perform the action.
 * 3. Space Owner (spaces.user_id = user.id) has all permissions within their own Space.
 * 4. Space Manager: Has permission if and only if their role in that specific Space includes the requested action.
 */
export async function can(
    user: User | null | undefined,
    action: PermissionAction | string,
    scope: PolicyScope
): Promise<boolean> {
    if (!user || !user.id) return false;

    // 1. Global Admin has universal access
    if (user.isGlobalAdmin) return true;

    // 2. Global resources require Global Admin
    if (scope === 'global') return false;

    const rawSpaceId = scope.spaceId;
    if (rawSpaceId === undefined || rawSpaceId === null || !/^\d+$/.test(String(rawSpaceId))) {
        return false;
    }
    const spaceId = Number(rawSpaceId);

    // 3. Space Admin (Owner or in space_admins) is tenant administrator for this Space
    if (await isSpaceAdmin(user.id, spaceId)) return true;

    // 4. Space Manager with role permission in this specific Space
    // Normalize CMS permissions
    let matchPermissions = [action];
    if (action === 'cms' || action === 'cms_write') {
        matchPermissions = ['cms', 'cms_write', 'cms_approve'];
    } else if (action === 'cms_approve') {
        matchPermissions = ['cms', 'cms_approve'];
    }

    const roleRes = await pool.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1
           AND r.space_id = $2
           AND r.permissions && $3::text[]
         LIMIT 1`,
        [user.id, spaceId, matchPermissions]
    );

    return (roleRes.rowCount ?? 0) > 0;
}

/**
 * Checks if a user is an Admin of a Space (Owner or appointed in space_admins).
 */
export async function isSpaceAdmin(userId: number | undefined | null, spaceId: number | string | undefined | null): Promise<boolean> {
    if (!userId || !spaceId || !/^\d+$/.test(String(spaceId))) return false;
    const res = await pool.query(
        `SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2
         UNION ALL
         SELECT 1 FROM space_admins WHERE space_id = $1 AND user_id = $2
         LIMIT 1`,
        [Number(spaceId), userId]
    );
    return (res.rowCount ?? 0) > 0;
}

/**
 * Checks if a user is the primary owner of a Space (spaces.user_id = user.id).
 * Reserved for: Stripe Connect / PayOS payout credentials, changing space ownership, deleting space.
 */
export async function isSpaceOwner(userId: number | undefined | null, spaceId: number | string | undefined | null): Promise<boolean> {
    if (!userId || !spaceId || !/^\d+$/.test(String(spaceId))) return false;
    const res = await pool.query(
        'SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2 LIMIT 1',
        [Number(spaceId), userId]
    );
    return (res.rowCount ?? 0) > 0;
}

/**
 * Returns all space IDs where the user is an admin (owner or space_admins).
 */
export async function getUserAdminSpaceIds(userId: number | undefined | null): Promise<number[]> {
    if (!userId) return [];
    const res = await pool.query(
        `SELECT id FROM spaces WHERE user_id = $1
         UNION
         SELECT space_id AS id FROM space_admins WHERE user_id = $1`,
        [userId]
    );
    return res.rows.map(r => Number(r.id));
}

/**
 * Returns distinct permissions held by a user in a specific Space.
 */
export async function getUserSpacePermissions(userId: number | undefined | null, spaceId: number | string | undefined | null): Promise<string[]> {
    if (!userId || !spaceId || !/^\d+$/.test(String(spaceId))) return [];
    const res = await pool.query(
        `SELECT DISTINCT unnest(r.permissions) as permission
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1 AND r.space_id = $2`,
        [userId, Number(spaceId)]
    );
    return res.rows.map(r => r.permission);
}

/**
 * Checks if a user currently has a specific role ID.
 */
export async function userHasRoleId(userId: number | undefined | null, roleId: number | string | undefined | null): Promise<boolean> {
    if (!userId || !roleId || !/^\d+$/.test(String(roleId))) return false;
    const res = await pool.query(
        'SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2 LIMIT 1',
        [userId, Number(roleId)]
    );
    return (res.rowCount ?? 0) > 0;
}

/**
 * Middleware: requireSpaceOf(action, loader)
 * Asynchronously loads the space_id of the targeted resource (document, role, article, etc.).
 * If resource has no space_id (global resource), requires Global Admin.
 */
export function requireSpaceOf(
    action: PermissionAction | string,
    loader: (req: Request) => Promise<number | string | null | undefined>
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        try {
            const spaceId = await loader(req);

            if (spaceId === null || spaceId === undefined || String(spaceId).trim() === '') {
                // Global resource
                const allowed = await can(req.user, action, 'global');
                if (!allowed) {
                    return res.status(403).json({ message: 'Forbidden: Global Admin required for global resources.' });
                }
                return next();
            }

            const allowed = await can(req.user, action, { spaceId });
            if (!allowed) {
                return res.status(403).json({ message: `Forbidden: You do not have permission '${action}' in this Space.` });
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
}
