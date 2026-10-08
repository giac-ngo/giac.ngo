import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_secret_jwt_key_that_has_at_least_32_characters_for_testing';

// Mock DB pool & userModel BEFORE importing app
vi.mock('../db.js', () => ({
    pool: {
        query: vi.fn(),
        connect: vi.fn().mockResolvedValue({
            query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
            release: vi.fn(),
        }),
    },
    verifyPassword: vi.fn().mockResolvedValue(true),
    mapRowToCamelCase: (row: any) => {
        if (!row) return null;
        const newObj: Record<string, any> = {};
        for (const key in row) {
            const camelCaseKey = key.replace(/_([a-z])/g, (g: any) => g[1].toUpperCase());
            newObj[camelCaseKey] = row[key];
        }
        return newObj;
    },
}));

vi.mock('../models/user.model.js', () => ({
    userModel: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn((data: any) => Promise.resolve({ id: 999, ...data })),
        findAll: vi.fn(),
        regenerateApiToken: vi.fn((id: any) => Promise.resolve({ id, apiToken: 'test-token' })),
    },
    enrichUserWithPermissions: vi.fn((u: any) => Promise.resolve(u)),
}));

vi.mock('../services/weaviateService.js', () => ({
    default: {
        resetSchemaForModelType: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../models/billing.model.js', () => ({
    billingModel: {
        getSpaceEarningsStats: vi.fn().mockResolvedValue([{ date: '2026-10-06', earnings: 100 }]),
        findPublicDonationsBySpaceId: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 }),
        findTransactionsBySpaceId: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
        createPlan: vi.fn().mockResolvedValue({ id: 1, name: 'Plan 1' }),
    },
}));

vi.mock('../models/system.model.js', () => ({
    systemModel: {
        getConfig: vi.fn().mockResolvedValue({ id: 1, template: 'default' }),
        getDashboardStats: vi.fn().mockImplementation((spaceIds: any) => {
            const hasSpace1 = Array.isArray(spaceIds) && spaceIds.includes(1);
            return Promise.resolve({
                totalUsers: hasSpace1 ? 10 : 0,
                totalAiConfigs: hasSpace1 ? 5 : 0,
                totalConversations: hasSpace1 ? 20 : 0,
                interactingUsers: hasSpace1 ? 2 : 0,
                topAIs: [],
                recentConversations: [],
                totalDocuments: hasSpace1 ? 15 : 0,
                totalSpaces: hasSpace1 ? 1 : 0,
                totalDharmaTalks: hasSpace1 ? 2 : 0,
                topDocuments: [],
                topSpaces: [],
                topDharmaTalks: [],
            });
        }),
    },
}));

vi.mock('../models/role.model.js', () => ({
    roleModel: {
        findById: vi.fn(),
        findBySpaceId: vi.fn().mockResolvedValue([]),
        findSystemRoles: vi.fn().mockResolvedValue([]),
        create: vi.fn((data: any) => Promise.resolve({ id: 50, ...data })),
        update: vi.fn((id: any, data: any) => Promise.resolve({ id, ...data })),
        delete: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../models/spaceMember.model.js', () => ({
    spaceMemberModel: {
        add: vi.fn().mockResolvedValue(true),
        remove: vi.fn().mockResolvedValue(true),
        isMember: vi.fn((spaceId: any, userId: any) => {
            if (Number(spaceId) === 1 && [100, 101, 102].includes(Number(userId))) return Promise.resolve(true);
            if (Number(spaceId) === 2 && [200].includes(Number(userId))) return Promise.resolve(true);
            return Promise.resolve(false);
        }),
        getSpacesByUser: vi.fn((userId: any) => {
            if (Number(userId) === 102) return Promise.resolve([{ spaceId: 1 }]);
            if (Number(userId) === 100) return Promise.resolve([{ spaceId: 1 }, { spaceId: 2 }]);
            return Promise.resolve([]);
        }),
    },
}));

vi.mock('../models/cmsArticle.model.js', () => ({
    cmsArticleModel: {
        findById: vi.fn((id: any) => {
            if (String(id) === '10') return Promise.resolve({ id: 10, spaceId: 1, title: 'Article 1', status: 'draft', userId: 101 });
            if (String(id) === '20') return Promise.resolve({ id: 20, spaceId: 2, title: 'Article 2', status: 'draft', userId: 200 });
            return Promise.resolve(null);
        }),
        update: vi.fn((id: any, data: any) => Promise.resolve({ id, ...data })),
        delete: vi.fn().mockResolvedValue(true),
        permanentDelete: vi.fn().mockResolvedValue(true),
        findBySpaceId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
        getCountsByStatus: vi.fn().mockResolvedValue({}),
        create: vi.fn((data: any) => Promise.resolve({ id: 99, ...data })),
        updateStatus: vi.fn().mockResolvedValue(true),
    },
    cmsSocialConnectionModel: {
        findById: vi.fn((id: any) => {
            if (String(id) === '10') return Promise.resolve({ id: 10, spaceId: 1, platform: 'facebook', isActive: true });
            if (String(id) === '20') return Promise.resolve({ id: 20, spaceId: 2, platform: 'facebook', isActive: true });
            return Promise.resolve(null);
        }),
        delete: vi.fn().mockResolvedValue(true),
        findBySpaceId: vi.fn().mockResolvedValue([]),
    },
    cmsPublishLogModel: {
        create: vi.fn().mockResolvedValue(true),
        updateByArticleAndPlatform: vi.fn().mockResolvedValue(true),
        findByArticleId: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('../models/document.model.js', () => ({
    documentModel: {
        findById: vi.fn((id: any) => {
            if (Number(id) === 10) return Promise.resolve({ id: 10, spaceId: 1, title: 'Doc 1' });
            if (Number(id) === 20) return Promise.resolve({ id: 20, spaceId: 2, title: 'Doc 2' });
            return Promise.resolve(null);
        }),
        delete: vi.fn().mockResolvedValue(true),
        create: vi.fn().mockResolvedValue({ id: 99, title: 'New Doc' }),
    },
}));

// Import app after mocks
import { app } from '../index.js';
import { pool } from '../db.js';
import { userModel } from '../models/user.model.js';
import { roleModel } from '../models/role.model.js';
import { documentModel } from '../models/document.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';

describe('Real Route Supertest RBAC Matrix & IDOR Prevention', () => {
    const JWT_SECRET = process.env.JWT_SECRET!;

    // Test Users
    const users = {
        globalAdmin: { id: 1, email: 'admin@giacngo.vn', name: 'Global Admin', isGlobalAdmin: true, isActive: true, apiToken: 'token-admin' },
        space1Owner: { id: 100, email: 'owner@space1.vn', name: 'Space 1 Owner', isGlobalAdmin: false, isActive: true, apiToken: 'token-owner' },
        space1Manager: { id: 101, email: 'manager@space1.vn', name: 'Space 1 Manager', isGlobalAdmin: false, isActive: true, apiToken: 'token-manager' },
        space1Member: { id: 102, email: 'member@space1.vn', name: 'Space 1 Member', isGlobalAdmin: false, isActive: true, apiToken: 'token-member' },
        space2Owner: { id: 200, email: 'owner@space2.vn', name: 'Space 2 Owner', isGlobalAdmin: false, isActive: true, apiToken: 'token-owner2' },
        stranger: { id: 999, email: 'stranger@nowhere.vn', name: 'Stranger', isGlobalAdmin: false, isActive: true, apiToken: 'token-stranger' },
        space1SecondaryAdmin: { id: 103, email: 'admin2@space1.vn', name: 'Space 1 Admin 2', isGlobalAdmin: false, isActive: true, apiToken: 'token-admin2' },
    };

    const tokens = {
        globalAdmin: jwt.sign({ id: users.globalAdmin.id }, JWT_SECRET),
        space1Owner: jwt.sign({ id: users.space1Owner.id }, JWT_SECRET),
        space1Manager: jwt.sign({ id: users.space1Manager.id }, JWT_SECRET),
        space1Member: jwt.sign({ id: users.space1Member.id }, JWT_SECRET),
        space2Owner: jwt.sign({ id: users.space2Owner.id }, JWT_SECRET),
        stranger: jwt.sign({ id: users.stranger.id }, JWT_SECRET),
        space1SecondaryAdmin: jwt.sign({ id: 103 }, JWT_SECRET),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // userModel.findById router
        (userModel.findById as any).mockImplementation(async (id: number) => {
            const found = Object.values(users).find(u => u.id === Number(id));
            return found || null;
        });

        // userModel.findByEmail router
        (userModel.findByEmail as any).mockImplementation(async (email: string) => {
            const found = Object.values(users).find(u => u.email === email);
            return found || null;
        });

        // userModel.regenerateApiToken router
        (userModel.regenerateApiToken as any).mockImplementation(async (id: any) => {
            const found = Object.values(users).find(u => u.id === Number(id));
            return found ? { ...found, apiToken: 'test-token' } : { id, apiToken: 'test-token' };
        });

        // roleModel.findById router
        (roleModel.findById as any).mockImplementation(async (id: any) => {
            if (Number(id) === 301) return { id: 301, spaceId: 1, name: 'Manager Role', permissions: ['roles', 'files'] };
            if (Number(id) === 302) return { id: 302, spaceId: 1, name: 'Editor Role', permissions: ['files'] };
            if (Number(id) === 401) return { id: 401, spaceId: 2, name: 'Space 2 Role', permissions: ['files'] };
            return null;
        });

        // pool.query mock for RBAC and IDOR
        (pool.query as any).mockImplementation(async (sql: string, params: any[] = []) => {
            // Documents query: SELECT space_id FROM documents WHERE id = $1
            if (sql.includes('FROM documents WHERE id = $1')) {
                const [docId] = params;
                if (Number(docId) === 10) return { rows: [{ space_id: 1 }], rowCount: 1 };
                if (Number(docId) === 20) return { rows: [{ space_id: 2 }], rowCount: 1 };
                return { rows: [], rowCount: 0 };
            }

            // Manager assigned role check: SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
            if (sql.includes('FROM user_roles WHERE user_id = $1 AND role_id = $2')) {
                const [userId, roleId] = params;
                if (Number(userId) === 101 && Number(roleId) === 301) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                return { rowCount: 0, rows: [] };
            }

            // Distinct permissions: SELECT DISTINCT unnest(r.permissions)
            if (sql.includes('SELECT DISTINCT unnest(r.permissions)')) {
                const [userId, spaceId] = params;
                if (Number(userId) === 101 && Number(spaceId) === 1) {
                    return { rows: [{ permission: 'roles' }, { permission: 'files' }, { permission: 'users' }], rowCount: 3 };
                }
                return { rows: [], rowCount: 0 };
            }
            // Notification members query:
            if (sql.includes('SELECT u.id, u.name, u.email') && sql.includes('FROM users u')) {
                return { rows: [{ id: 102, name: 'Space 1 Member', email: 'member@space1.vn' }], rowCount: 1 };
            }

            // Space membership: SELECT 1 FROM spaces ... UNION SELECT 1 FROM space_members ...
            if (sql.includes('space_members') && (sql.includes('SELECT 1 FROM') || sql.includes('SELECT 1 from'))) {
                const [spaceId, userId] = params;
                const sid = Number(spaceId);
                const uid = Number(userId);
                // Space 1 members: 100 (owner), 101 (manager), 102 (member)
                if (sid === 1 && [100, 101, 102].includes(uid)) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                // Space 2 members: 200 (owner)
                if (sid === 2 && [200].includes(uid)) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                return { rowCount: 0, rows: [] };
            }

            // Dashboard spaces check for space_admins
            if (sql.includes('space_admins sa WHERE sa.user_id = $1') || (sql.includes('spaces s WHERE s.user_id = $1') && sql.includes('space_admins sa'))) {
                const [userId] = params;
                if (Number(userId) === 103) {
                    return { rows: [{ id: 1 }], rowCount: 1 };
                }
            }

            // AI configs manageable query for space_admins:
            if (sql.includes('ac.owner_id = $1') && sql.includes('space_admins')) {
                const [userId] = params;
                if (Number(userId) === 103) {
                    return { rows: [{ id: 501, name: 'Space 1 AI', space_id: 1 }], rowCount: 1 };
                }
                if (Number(userId) === 200) {
                    return { rows: [{ id: 502, name: 'Space 2 AI', space_id: 2 }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }

            // Notification recipients query for space_admins:
            if (sql.includes('SELECT u.id, u.name, u.email') && sql.includes('FROM users u') && sql.includes('ILIKE')) {
                return { rows: [{ id: 102, name: 'Space 1 Member', email: 'member@space1.vn' }], rowCount: 1 };
            }

            // Training data QA for space_admins:
            if (sql.includes("tds.type = 'qa'") && sql.includes('space_admins')) {
                const [userId] = params;
                if (Number(userId) === 103) {
                    return { rows: [{ id: 701, ai_name: 'Space 1 AI', question: 'Question 1', answer: 'Answer 1' }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }

            // Space admin check: SELECT 1 FROM spaces ... UNION ALL SELECT 1 FROM space_admins ...
            if (sql.includes('space_admins')) {
                const [spaceId, userId] = params;
                const sid = Number(spaceId);
                const uid = Number(userId);
                // Space 1 admin: 100 (owner) or 103 (secondary admin)
                if (sid === 1 && (uid === 100 || uid === 103)) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                // Space 2 admin: 200 (owner)
                if (sid === 2 && uid === 200) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                return { rowCount: 0, rows: [] };
            }

            // Space ownership: SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2
            if (sql.includes('FROM spaces WHERE id = $1 AND user_id = $2')) {
                const [spaceId, userId] = params;
                if ((Number(spaceId) === 1 && Number(userId) === 100) ||
                    (Number(spaceId) === 2 && Number(userId) === 200)) {
                    return { rowCount: 1, rows: [{ '?column?': 1 }] };
                }
                return { rowCount: 0, rows: [] };
            }

            // Space by ID: SELECT s.* ... FROM spaces s ... WHERE s.id = $1
            if (sql.includes('FROM spaces s') && sql.includes('WHERE s.id = $1')) {
                const [spaceId] = params;
                if (Number(spaceId) === 1) return { rows: [{ id: 1, name: 'Space 1', slug: 'space-1', userId: 100 }], rowCount: 1 };
                if (Number(spaceId) === 2) return { rows: [{ id: 2, name: 'Space 2', slug: 'space-2', userId: 200 }], rowCount: 1 };
                return { rows: [], rowCount: 0 };
            }

            // Space by slug: SELECT s.* ... FROM spaces s ... WHERE s.slug = $1
            if (sql.includes('FROM spaces s') && sql.includes('WHERE s.slug = $1')) {
                const [slug] = params;
                if (slug === 'space-1') return { rows: [{ id: 1, name: 'Space 1', slug: 'space-1', userId: 100 }], rowCount: 1 };
                if (slug === 'space-2') return { rows: [{ id: 2, name: 'Space 2', slug: 'space-2', userId: 200 }], rowCount: 1 };
                return { rows: [], rowCount: 0 };
            }

            // Space by custom_domain: SELECT s.* ... FROM spaces s ... WHERE s.custom_domain = $1
            if (sql.includes('FROM spaces s') && sql.includes('WHERE s.custom_domain = $1')) {
                const [domain] = params;
                if (domain === 'space-1.vn' || domain === 'giac.ngo') return { rows: [{ id: 1, name: 'Space 1', slug: 'space-1', userId: 100 }], rowCount: 1 };
                return { rows: [], rowCount: 0 };
            }

            // User roles in space
            if (sql.includes('FROM user_roles ur') && sql.includes('JOIN roles r')) {
                const [userId, spaceId, matchPermissions] = params;
                const uid = Number(userId);
                const sid = Number(spaceId);

                // Space 1 Manager (101) has permissions in Space 1:
                if (uid === 101 && sid === 1) {
                    const managerPerms = ['files', 'roles', 'users', 'cms_write', 'cms_approve', 'social-moderate', 'notifications', 'space-billing', 'pricing', 'ai'];
                    const hasMatch = matchPermissions.some((p: string) => managerPerms.includes(p));
                    return { rowCount: hasMatch ? 1 : 0, rows: hasMatch ? [{ '?column?': 1 }] : [] };
                }
                return { rowCount: 0, rows: [] };
            }

            // User managed space IDs
            if (sql.includes('getUserManagedSpaceIds') || sql.includes('FROM spaces WHERE user_id = $1') && sql.includes('UNION')) {
                const [userId] = params;
                if (Number(userId) === 100) return { rows: [{ id: 1 }], rowCount: 1 };
                if (Number(userId) === 101) return { rows: [{ id: 1 }], rowCount: 1 };
                if (Number(userId) === 200) return { rows: [{ id: 2 }], rowCount: 1 };
                return { rows: [], rowCount: 0 };
            }

            // Social post verification: SELECT space_id ... FROM social_posts WHERE id = $1
            if (sql.includes('FROM social_posts WHERE id = $1')) {
                const [postId] = params;
                if (Number(postId) === 10) {
                    return { rows: [{ space_id: 1, user_id: 100, likes_count: 5 }], rowCount: 1 };
                }
                if (Number(postId) === 20) {
                    return { rows: [{ space_id: 2, user_id: 200, likes_count: 2 }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }

            // Social comments table & alters
            if (sql.includes('CREATE TABLE') || sql.includes('ALTER TABLE')) {
                return { rows: [], rowCount: 0 };
            }

            // Social post likes
            if (sql.includes('FROM social_post_likes')) {
                return { rows: [], rowCount: 0 };
            }

            // AI configs isolation check: SELECT id FROM ai_configs WHERE id = ANY($1::int[]) AND (space_id IS NULL OR space_id != $2)
            if (sql.includes('FROM ai_configs WHERE id = ANY($1::int[]) AND (space_id IS NULL OR space_id != $2)')) {
                const [aiIds, targetSpaceId] = params;
                // If aiIds includes 999 (which belongs to space 2), return it as invalid when checking space 1
                if (aiIds.includes(999) && Number(targetSpaceId) === 1) {
                    return { rows: [{ id: 999 }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            }

            // AI visible list query
            if (sql.includes('FROM ai_configs ac')) {
                return {
                    rows: [{
                        id: 1,
                        space_id: 1,
                        name: 'Buddha AI',
                        description: 'Helpful AI',
                        training_content: null, // Ensure training_content is null/hidden
                        is_public: true,
                    }],
                    rowCount: 1,
                };
            }

            return { rows: [], rowCount: 0 };
        });
    });

    // ─────────────────────────────────────────────────────────
    // 1. P0 FIX: POST /api/system/reset-weaviate-schema
    // ─────────────────────────────────────────────────────────
    describe('P0 Fix: Reset Weaviate Schema (requireGlobalAdmin)', () => {
        it('should allow Global Admin to reset schema', async () => {
            const res = await request(app)
                .post('/api/system/reset-weaviate-schema')
                .set('Authorization', `Bearer ${tokens.globalAdmin}`)
                .send({ modelType: 'gemini', apiKey: 'test_key' });
            expect(res.status).toBe(200);
        });

        it('should block Space 1 Owner with 403 Forbidden', async () => {
            const res = await request(app)
                .post('/api/system/reset-weaviate-schema')
                .set('Authorization', `Bearer ${tokens.space1Owner}`)
                .send({ modelType: 'gemini', apiKey: 'test_key' });
            expect(res.status).toBe(403);
        });

        it('should block Space 1 Manager with 403 Forbidden', async () => {
            const res = await request(app)
                .post('/api/system/reset-weaviate-schema')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({ modelType: 'gemini', apiKey: 'test_key' });
            expect(res.status).toBe(403);
        });

        it('should block Unauthenticated Guest with 401 Unauthorized', async () => {
            const res = await request(app)
                .post('/api/system/reset-weaviate-schema')
                .send({ modelType: 'gemini', apiKey: 'test_key' });
            expect(res.status).toBe(401);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 2. Space Earnings RBAC & Cross-Space IDOR Prevention
    // ─────────────────────────────────────────────────────────
    describe('Space Earnings RBAC (/api/billing/stats/space-earnings)', () => {
        it('should allow Global Admin to view Space 1 earnings', async () => {
            const res = await request(app)
                .get('/api/billing/stats/space-earnings?spaceId=1')
                .set('Authorization', `Bearer ${tokens.globalAdmin}`);
            expect(res.status).toBe(200);
        });

        it('should allow Space 1 Owner to view Space 1 earnings', async () => {
            const res = await request(app)
                .get('/api/billing/stats/space-earnings?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space1Owner}`);
            expect(res.status).toBe(200);
        });

        it('should allow Space 1 Manager (with space-billing) to view Space 1 earnings', async () => {
            const res = await request(app)
                .get('/api/billing/stats/space-earnings?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space1Manager}`);
            expect(res.status).toBe(200);
        });

        it('IDOR: should block Space 2 Owner from viewing Space 1 earnings (403)', async () => {
            const res = await request(app)
                .get('/api/billing/stats/space-earnings?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space2Owner}`);
            expect(res.status).toBe(403);
        });

        it('should block ordinary Space 1 Member without billing permission (403)', async () => {
            const res = await request(app)
                .get('/api/billing/stats/space-earnings?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space1Member}`);
            expect(res.status).toBe(403);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 3. Social Membership & Cross-Space IDOR Prevention
    // ─────────────────────────────────────────────────────────
    describe('Social Membership & Cross-Space Protection (/api/space-social/:id/social)', () => {
        it('should allow Space 1 Member to like post in Space 1', async () => {
            const res = await request(app)
                .post('/api/space-social/1/social/10/like')
                .set('Authorization', `Bearer ${tokens.space1Member}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('liked');
        });

        it('should block Space 2 Owner from liking post in Space 1 (403)', async () => {
            const res = await request(app)
                .post('/api/space-social/1/social/10/like')
                .set('Authorization', `Bearer ${tokens.space2Owner}`);
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Không gian');
        });

        it('IDOR: should return 404 if post belongs to Space 1 but requested under Space 2 URL', async () => {
            const res = await request(app)
                .post('/api/space-social/2/social/10/like')
                .set('Authorization', `Bearer ${tokens.space2Owner}`);
            expect(res.status).toBe(404);
        });

        it('should block Non-member from viewing comments of Space 1 (403)', async () => {
            const res = await request(app)
                .get('/api/space-social/1/social/10/comments')
                .set('Authorization', `Bearer ${tokens.stranger}`);
            expect(res.status).toBe(403);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 4. AI Config Security: No Body Spoofing & No Training Content Leak
    // ─────────────────────────────────────────────────────────
    describe('AI Config Security (/api/ai-configs)', () => {
        it('should ignore body userId and never leak training_content in public list', async () => {
            const res = await request(app)
                .post('/api/ai-configs')
                .send({ userId: 100, spaceId: 1 }); // Attempting to spoof userId 100
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                // Critical security check: training_content MUST be null
                expect(res.body[0].trainingContent).toBeNull();
            }
        });
    });

    // ─────────────────────────────────────────────────────────
    // 5. Pricing Plan Cross-Space AI Injection (P1 #14)
    // ─────────────────────────────────────────────────────────
    describe('Pricing Plan Space Isolation (/api/billing/pricing-plans)', () => {
        it('IDOR: should reject Space pricing plan containing AI from another space (400)', async () => {
            const res = await request(app)
                .post('/api/billing/pricing-plans')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({
                    spaceId: 1,
                    planName: 'Pro Space Plan',
                    meritCost: 50,
                    aiConfigIds: [999], // AI 999 belongs to Space 2
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Không gian này');
        });
    });

    // ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────
    // 6. User Creation Guard & Orphan Account Prevention (/api/users)
    // ─────────────────────────────────────────────────────────
    describe('User Creation Guard & Orphan Account Prevention (/api/users)', () => {
        it('should block unauthenticated callers from creating users (401)', async () => {
            const res = await request(app)
                .post('/api/users')
                .send({ email: 'newuser@test.vn', name: 'New User', password: 'Password123!' });
            expect(res.status).toBe(401);
        });

        it('should reject non-global admin creating user without spaceId (400)', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${tokens.space1Member}`)
                .send({ email: 'newuser@test.vn', name: 'New User', password: 'Password123!' });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('spaceId is required');
        });

        it('should block non-global admin without users permission in target space (403)', async () => {
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${tokens.space1Member}`)
                .send({ spaceId: 1, email: 'newuser@test.vn', name: 'New User', password: 'Password123!' });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('do not have permission to manage users');
        });

        it('should allow Space 1 Manager (with users perm) to create user in Space 1', async () => {
            (userModel.create as any).mockResolvedValueOnce({ id: 555, email: 'created@space1.vn', name: 'Created' });
            const res = await request(app)
                .post('/api/users')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({ spaceId: 1, email: 'created@space1.vn', name: 'Created', password: 'Password123!', roleIds: [302] });
            expect(res.status).toBe(201);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 7. Role Management & Manager Self-Edit Lock & Merge Logic (/api/roles)
    // ─────────────────────────────────────────────────────────
    describe('Role Management Guard & IDOR (/api/roles)', () => {
        it('should block Space 1 Manager from editing the role they currently hold (403)', async () => {
            const res = await request(app)
                .put('/api/roles/301')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({ name: 'Hacked Role', permissions: ['roles', 'system'] });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('đang đảm nhiệm');
        });

        it('should block Space 1 Manager from editing role belonging to Space 2 (403)', async () => {
            const res = await request(app)
                .put('/api/roles/401')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({ name: 'Hacked Role 2', permissions: ['files'] });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Không gian');
        });

        it('should allow Space 1 Owner to edit role in Space 1', async () => {
            const res = await request(app)
                .put('/api/roles/301')
                .set('Authorization', `Bearer ${tokens.space1Owner}`)
                .send({ name: 'Updated Role', permissions: ['files'] });
            expect(res.status).toBe(200);
        });

        it('should preserve permissions not held by manager when manager edits role', async () => {
            // Role 302 currently has ['files', 'space-billing'] in DB
            (roleModel.findById as any).mockResolvedValueOnce({
                id: 302,
                spaceId: 1,
                name: 'Editor Role',
                permissions: ['files', 'space-billing']
            });
            // Space 1 Manager has: ['roles', 'files', 'users'] in mock getUserSpacePermissions
            // Manager submits: ['files'] (does not submit 'space-billing' because manager doesn't hold it)
            const res = await request(app)
                .put('/api/roles/302')
                .set('Authorization', `Bearer ${tokens.space1Manager}`)
                .send({ name: 'Renamed Role', permissions: ['files'] });
            expect(res.status).toBe(200);
            // Verify update was called with preserved 'space-billing' + 'files'
            const updateCall = (roleModel.update as any).mock.calls.find((c: any) => c[0] === '302');
            expect(updateCall[1].permissions).toContain('space-billing');
            expect(updateCall[1].permissions).toContain('files');
        });
    });

    // ─────────────────────────────────────────────────────────
    // 8. Document Management & Cross-Space IDOR (/api/documents)
    // ─────────────────────────────────────────────────────────
    describe('Document Management Cross-Space IDOR (/api/documents)', () => {
        it('should allow Space 1 Manager to delete document in Space 1', async () => {
            const res = await request(app)
                .delete('/api/documents/10')
                .set('Authorization', `Bearer ${tokens.space1Manager}`);
            expect([200, 204]).toContain(res.status);
        });

        it('IDOR: should block Space 1 Manager from deleting document in Space 2 (403)', async () => {
            const res = await request(app)
                .delete('/api/documents/20')
                .set('Authorization', `Bearer ${tokens.space1Manager}`);
            expect(res.status).toBe(403);
        });

        it('should block ordinary Space 1 Member from deleting document in Space 1 (403)', async () => {
            const res = await request(app)
                .delete('/api/documents/10')
                .set('Authorization', `Bearer ${tokens.space1Member}`);
            expect(res.status).toBe(403);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 9. CMS Cross-Space IDOR & Isolation (/api/cms)
    // ─────────────────────────────────────────────────────────
    describe('CMS Cross-Space IDOR & Protection (/api/cms)', () => {
        it('IDOR: should return 404 when updating article belonging to another space', async () => {
            // Article 20 belongs to Space 2; requested under Space 1 URL
            const res = await request(app)
                .put('/api/cms/1/articles/20')
                .set('Authorization', `Bearer ${tokens.space1Owner}`)
                .send({ title: 'Hacked Article' });
            expect(res.status).toBe(404);
            expect(res.body.message).toContain('Article not found');
        });

        it('IDOR: should return 404 when deleting article belonging to another space', async () => {
            // Article 20 belongs to Space 2; requested under Space 1 URL
            const res = await request(app)
                .delete('/api/cms/1/articles/20')
                .set('Authorization', `Bearer ${tokens.space1Owner}`);
            expect(res.status).toBe(404);
        });

        it('IDOR: should return 404 when permanently deleting article belonging to another space', async () => {
            const res = await request(app)
                .delete('/api/cms/1/articles/20/permanent')
                .set('Authorization', `Bearer ${tokens.space1Owner}`);
            expect(res.status).toBe(404);
        });

        it('IDOR: should return 404 when publishing article belonging to another space', async () => {
            const res = await request(app)
                .post('/api/cms/1/articles/20/publish')
                .set('Authorization', `Bearer ${tokens.space1Owner}`)
                .send({ platforms: ['facebook'] });
            expect(res.status).toBe(404);
        });

        it('IDOR: should return 404 when deleting connection belonging to another space', async () => {
            // Connection 20 belongs to Space 2; requested under Space 1 URL
            const res = await request(app)
                .delete('/api/cms/1/connections/20')
                .set('Authorization', `Bearer ${tokens.space1Owner}`);
            expect(res.status).toBe(404);
        });

        it('should allow Space 1 Owner to update article in Space 1', async () => {
            const res = await request(app)
                .put('/api/cms/1/articles/10')
                .set('Authorization', `Bearer ${tokens.space1Owner}`)
                .send({ title: 'Legit Article Update' });
            expect(res.status).toBe(200);
        });
    });

    // ─────────────────────────────────────────────────────────
    // 10. Registration Strict Space Association & Orphan Member Prevention
    // ─────────────────────────────────────────────────────────
    describe('Registration & Membership Isolation', () => {
        it('should reject registration when no space is provided or resolved (no fallback to Space 1)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'New Test User',
                    email: 'newuser@example.com',
                    password: 'password123',
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Không thể đăng ký: Không xác định được Không gian');
            expect(userModel.create).not.toHaveBeenCalled();
        });

        it('should atomically create user and assign to requested space', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'New Test User',
                    email: 'newuser@example.com',
                    password: 'password123',
                    spaceId: 1,
                });
            expect(res.status).toBe(201);
            expect(userModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'New Test User', email: 'newuser@example.com' }),
                1
            );
        });

        it('should reject removing member from their only remaining space unless requester is global admin', async () => {
            // User 102 only belongs to Space 1; space1Owner tries to remove them
            const res = await request(app)
                .delete('/api/spaces/1/members/102')
                .set('Authorization', `Bearer ${tokens.space1Owner}`);
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Không thể xoá thành viên khỏi Không gian duy nhất');
        });

        it('should allow global admin to remove member from their only remaining space', async () => {
            const res = await request(app)
                .delete('/api/spaces/1/members/102')
                .set('Authorization', `Bearer ${tokens.globalAdmin}`);
            expect(res.status).toBe(204);
            expect(spaceMemberModel.remove).toHaveBeenCalledWith(1, 102);
        });

        it('should reject login on login.bodhilab.io for non-admin user even without sending context', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'login.bodhilab.io')
                .send({
                    email: 'owner@space1.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Chỉ tài khoản Super Admin mới được đăng nhập tại đây');
        });

        it('should allow login on login.bodhilab.io for Super Admin even without sending context', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'login.bodhilab.io')
                .send({
                    email: 'admin@giacngo.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('admin@giacngo.vn');
        });

        it('should immediately reject registration on login.bodhilab.io even with spaceSlug in body', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .set('Host', 'login.bodhilab.io')
                .send({
                    name: 'Hacker',
                    email: 'hacker@example.com',
                    password: 'password123',
                    spaceSlug: 'space-1',
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Trang quản trị hệ thống không cho phép đăng ký tài khoản');
        });

        it('should reject login on space domain if user is not member or owner of that space', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'space-1.bodhilab.io')
                .send({
                    email: 'stranger@nowhere.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Tài khoản của bạn chưa đăng ký tại không gian này');
        });

        it('should allow login on space domain if user is space member', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'space-1.bodhilab.io')
                .send({
                    email: 'owner@space1.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('owner@space1.vn');
        });

        it('should allow registration on subdomain host (space-1.bodhilab.io) by resolving space from subdomain', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .set('Host', 'space-1.bodhilab.io')
                .send({
                    name: 'Subdomain User',
                    email: 'subuser@example.com',
                    password: 'password123',
                });
            expect(res.status).toBe(201);
            expect(userModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Subdomain User', email: 'subuser@example.com' }),
                1
            );
        });

        it('should reject login on bare domain bodhilab.io for non-admin user without space', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'bodhilab.io')
                .send({
                    email: 'owner@space1.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Chỉ tài khoản Super Admin mới được đăng nhập tại đây');
        });

        it('should allow login on bare domain bodhilab.io for Super Admin', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Host', 'bodhilab.io')
                .send({
                    email: 'admin@giacngo.vn',
                    password: 'password123',
                });
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('admin@giacngo.vn');
        });

        it('should reject registration on bare domain bodhilab.io', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .set('Host', 'bodhilab.io')
                .send({
                    name: 'Bare User',
                    email: 'bare@example.com',
                    password: 'password123',
                });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Trang quản trị hệ thống không cho phép đăng ký tài khoản');
        });

        it('should forbid regular user from deleting files of another user or global files via DELETE /api/system/upload', async () => {
            const res = await request(app)
                .delete('/api/system/upload')
                .set('Authorization', `Bearer ${tokens.space1Member}`)
                .send({ filePath: '/uploads/space-1/user-2/secret.png' });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('You can only delete your own uploaded files');
        });

        it('should forbid path traversal outside uploadsDir in DELETE /api/system/upload', async () => {
            const res = await request(app)
                .delete('/api/system/upload')
                .set('Authorization', `Bearer ${tokens.space1Member}`)
                .send({ filePath: '/uploads/../../etc/passwd' });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('Path out of bounds');
        });

        it('should forbid path traversal using own user-id followed by .. to escape to global or another directory', async () => {
            // space1Member id is 4
            const res = await request(app)
                .delete('/api/system/upload')
                .set('Authorization', `Bearer ${tokens.space1Member}`)
                .send({ filePath: '/uploads/space-1/user-4/../../global/logo.png' });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain('You can only delete your own uploaded files');
        });
    });

    describe('Secondary Space Admin (space_admins) Privilege Isolation & Access', () => {
        it('allows secondary space admin to view Dashboard stats of Space 1 but receives empty for Space 2', async () => {
            // Space 1 Dashboard stats
            const res1 = await request(app)
                .get('/api/system/dashboard/stats?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space1SecondaryAdmin}`);
            expect(res1.status).toBe(200);
            expect(res1.body.totalUsers).toBe(10);
            expect(res1.body.totalDocuments).toBe(15);

            // Space 2 Dashboard stats (should return empty 0s due to space isolation)
            const res2 = await request(app)
                .get('/api/system/dashboard/stats?spaceId=2')
                .set('Authorization', `Bearer ${tokens.space1SecondaryAdmin}`);
            expect(res2.status).toBe(200);
            expect(res2.body.totalUsers).toBe(0);
        });

        it('allows secondary space admin to see manageable AIs in Space 1 and not Space 2', async () => {
            const res = await request(app)
                .post('/api/ai-configs/manageable')
                .set('Authorization', `Bearer ${tokens.space1SecondaryAdmin}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.some((ai: any) => ai.spaceId === 1)).toBe(true);
            expect(res.body.some((ai: any) => ai.spaceId === 2)).toBe(false);
        });

        it('allows secondary space admin to retrieve notification members-list for Space 1', async () => {
            const res = await request(app)
                .get('/api/notifications/members-list?spaceId=1')
                .set('Authorization', `Bearer ${tokens.space1SecondaryAdmin}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.members)).toBe(true);
            expect(res.body.members.length).toBeGreaterThan(0);
            expect(res.body.members[0].email).toBe('member@space1.vn');
        });
    });
});

