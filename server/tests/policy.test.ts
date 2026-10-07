import { describe, it, expect, vi, beforeEach } from 'vitest';
import { can, PermissionAction } from '../utils/policy.js';
import { pool } from '../db.js';
import { User } from '../types/index.js';

// Mock DB pool
vi.mock('../db.js', () => ({
    pool: {
        query: vi.fn(),
    },
}));

describe('RBAC Matrix: 2 Spaces × 4 Tiers Authorization Policy', () => {
    // 4 Tiers of Users
    const globalAdmin: User = {
        id: 1,
        email: 'global_admin@giacngo.vn',
        name: 'Global Admin',
        isGlobalAdmin: true,
        permissions: ['system', 'pricing', 'manual-billing', 'files', 'roles', 'cms_write', 'cms_approve', 'social-moderate', 'notifications'],
    };

    const space1Owner: User = {
        id: 100,
        email: 'owner@space1.vn',
        name: 'Space 1 Owner',
        isGlobalAdmin: false,
        permissions: [],
    };

    const space1Manager: User = {
        id: 101,
        email: 'manager@space1.vn',
        name: 'Space 1 Manager',
        isGlobalAdmin: false,
        permissions: ['files', 'roles', 'cms_write', 'cms_approve', 'social-moderate', 'notifications'],
    };

    const space1WriterOnly: User = {
        id: 103,
        email: 'writer@space1.vn',
        name: 'Space 1 Writer',
        isGlobalAdmin: false,
        permissions: ['cms_write'],
    };

    const space1ApproverOnly: User = {
        id: 104,
        email: 'approver@space1.vn',
        name: 'Space 1 Approver',
        isGlobalAdmin: false,
        permissions: ['cms_approve'],
    };

    const space1Member: User = {
        id: 102,
        email: 'member@space1.vn',
        name: 'Space 1 Member',
        isGlobalAdmin: false,
        permissions: [],
    };

    const space2Owner: User = {
        id: 200,
        email: 'owner@space2.vn',
        name: 'Space 2 Owner',
        isGlobalAdmin: false,
        permissions: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Implement mock pool.query responding to Space ownership and roles
        (pool.query as any).mockImplementation(async (sql: string, params: any[]) => {
            // Space ownership check: SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2
            if (sql.includes('FROM spaces WHERE id = $1 AND user_id = $2')) {
                const [spaceId, userId] = params;
                if ((Number(spaceId) === 1 && Number(userId) === 100) ||
                    (Number(spaceId) === 2 && Number(userId) === 200)) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                return { rowCount: 0, rows: [] };
            }

            // Space role permissions check: SELECT 1 FROM user_roles ur JOIN roles r ...
            if (sql.includes('FROM user_roles ur') && sql.includes('JOIN roles r')) {
                const [userId, spaceId, matchPermissions] = params;
                const uid = Number(userId);
                const sid = Number(spaceId);

                // Space 1 Manager has: files, roles, cms_write, cms_approve, social-moderate, notifications in Space 1
                if (uid === 101 && sid === 1) {
                    const managerPerms = ['files', 'roles', 'cms_write', 'cms_approve', 'social-moderate', 'notifications'];
                    const hasMatch = matchPermissions.some((p: string) => managerPerms.includes(p));
                    return { rowCount: hasMatch ? 1 : 0, rows: hasMatch ? [{ '?column?': 1 }] : [] };
                }

                // Space 1 Writer has: cms_write
                if (uid === 103 && sid === 1) {
                    const hasMatch = matchPermissions.includes('cms_write');
                    return { rowCount: hasMatch ? 1 : 0, rows: hasMatch ? [{ '?column?': 1 }] : [] };
                }

                // Space 1 Approver has: cms_approve
                if (uid === 104 && sid === 1) {
                    const hasMatch = matchPermissions.includes('cms_approve');
                    return { rowCount: hasMatch ? 1 : 0, rows: hasMatch ? [{ '?column?': 1 }] : [] };
                }

                return { rowCount: 0, rows: [] };
            }

            return { rowCount: 0, rows: [] };
        });
    });

    describe('Tier 1: Global Admin (users.is_global_admin = true)', () => {
        it('allows Global Admin to perform system actions on global scope', async () => {
            expect(await can(globalAdmin, 'system', 'global')).toBe(true);
            expect(await can(globalAdmin, 'pricing', 'global')).toBe(true);
            expect(await can(globalAdmin, 'files', 'global')).toBe(true);
        });

        it('allows Global Admin full access to any Space (Space 1 and Space 2)', async () => {
            expect(await can(globalAdmin, 'files', { spaceId: 1 })).toBe(true);
            expect(await can(globalAdmin, 'roles', { spaceId: 1 })).toBe(true);
            expect(await can(globalAdmin, 'files', { spaceId: 2 })).toBe(true);
            expect(await can(globalAdmin, 'social-moderate', { spaceId: 2 })).toBe(true);
        });
    });

    describe('Tier 2: Space Owner (spaces.user_id = user.id)', () => {
        it('DENIES Space Owner from global scope actions', async () => {
            expect(await can(space1Owner, 'files', 'global')).toBe(false);
            expect(await can(space1Owner, 'system', 'global')).toBe(false);
            expect(await can(space1Owner, 'pricing', 'global')).toBe(false);
        });

        it('allows Space 1 Owner full management within Space 1', async () => {
            expect(await can(space1Owner, 'files', { spaceId: 1 })).toBe(true);
            expect(await can(space1Owner, 'roles', { spaceId: 1 })).toBe(true);
            expect(await can(space1Owner, 'cms_write', { spaceId: 1 })).toBe(true);
            expect(await can(space1Owner, 'cms_approve', { spaceId: 1 })).toBe(true);
            expect(await can(space1Owner, 'social-moderate', { spaceId: 1 })).toBe(true);
            expect(await can(space1Owner, 'notifications', { spaceId: 1 })).toBe(true);
        });

        it('PREVENTS Space 1 Owner from accessing Space 2 (Cross-Tenant Isolation)', async () => {
            expect(await can(space1Owner, 'files', { spaceId: 2 })).toBe(false);
            expect(await can(space1Owner, 'roles', { spaceId: 2 })).toBe(false);
            expect(await can(space1Owner, 'cms_approve', { spaceId: 2 })).toBe(false);
            expect(await can(space1Owner, 'social-moderate', { spaceId: 2 })).toBe(false);
        });
    });

    describe('Tier 3: Space Manager (user_roles with space_id & permissions)', () => {
        it('DENIES Space Manager from global scope', async () => {
            expect(await can(space1Manager, 'files', 'global')).toBe(false);
            expect(await can(space1Manager, 'roles', 'global')).toBe(false);
        });

        it('allows Space Manager to perform granted permissions in their Space', async () => {
            expect(await can(space1Manager, 'files', { spaceId: 1 })).toBe(true);
            expect(await can(space1Manager, 'roles', { spaceId: 1 })).toBe(true);
            expect(await can(space1Manager, 'social-moderate', { spaceId: 1 })).toBe(true);
            expect(await can(space1Manager, 'notifications', { spaceId: 1 })).toBe(true);
        });

        it('DENIES Space Manager for permissions they do NOT hold in their Space', async () => {
            expect(await can(space1Manager, 'pricing', { spaceId: 1 })).toBe(false);
            expect(await can(space1Manager, 'system', { spaceId: 1 })).toBe(false);
        });

        it('PREVENTS Space 1 Manager from accessing Space 2 (Cross-Tenant Isolation)', async () => {
            expect(await can(space1Manager, 'files', { spaceId: 2 })).toBe(false);
            expect(await can(space1Manager, 'roles', { spaceId: 2 })).toBe(false);
            expect(await can(space1Manager, 'social-moderate', { spaceId: 2 })).toBe(false);
        });
    });

    describe('Tier 4: Space Member / Regular User (space_members only, no roles)', () => {
        it('DENIES Space Member from any managerial or mutation actions', async () => {
            expect(await can(space1Member, 'files', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'roles', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'cms_write', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'cms_approve', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'social-moderate', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'notifications', { spaceId: 1 })).toBe(false);
            expect(await can(space1Member, 'files', 'global')).toBe(false);
        });
    });

    describe('CMS Permissions Granularity & Inheritance', () => {
        it('allows writer to cms_write but blocks cms_approve', async () => {
            expect(await can(space1WriterOnly, 'cms_write', { spaceId: 1 })).toBe(true);
            expect(await can(space1WriterOnly, 'cms_approve', { spaceId: 1 })).toBe(false);
        });

        it('allows approver to cms_approve AND automatically inherits cms_write', async () => {
            expect(await can(space1ApproverOnly, 'cms_approve', { spaceId: 1 })).toBe(true);
            expect(await can(space1ApproverOnly, 'cms_write', { spaceId: 1 })).toBe(true);
        });
    });
});
