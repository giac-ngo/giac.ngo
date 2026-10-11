// server/controllers/spacesController.js
import { Request, Response, NextFunction } from 'express';
import { spaceModel } from '../models/space.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { userModel } from '../models/user.model.js';
import { isAdmin, getUserManagedSpaceIds, isSpaceMember, hasSpacePermission } from '../middleware/authMiddleware.js';
import { can, isSpaceAdmin, isSpaceOwner } from '../utils/policy.js';
import { pool } from '../db.js';



import { toPublicUser } from '../utils/sanitizeUser.js';
import { toPublicSpace, toAdminSpace } from '../utils/sanitizeSpace.js';

const canManageSpaceSettings = async (user: any, spaceId: number): Promise<boolean> => {
    if (await isSpaceAdmin(user?.id, spaceId)) return true;
    for (const permission of ['spaces', 'settings', 'payment-settings']) {
        if (await can(user, permission, { spaceId })) return true;
    }
    return false;
};

export const spacesController = {
    async getAllSpaces(req: Request, res: Response) {
        try {
            const spaces = await spaceModel.findAll();
            // Never leak API keys, SMTP passwords, or PayOS credentials on public/general space lists
            res.json(spaces.map(toPublicSpace));
        } catch (error: unknown) {
            console.error('Error fetching spaces:', error);
            res.status(500).json({ message: 'Failed to fetch spaces.' });
        }
    },

    // Get a space by its numeric ID.
    async getSpaceById(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID.' });
            }
            const space = await spaceModel.findById(id);
            if (!space) {
                return res.status(404).json({ message: 'Space not found.' });
            }
            // Only return admin-masked object (including masked keys) if superAdmin or authorized space manager
            if (req.user && (isAdmin(req.user as any) || await hasSpacePermission(req.user as any, space.id as number, 'spaces'))) {
                return res.json(toAdminSpace(space));
            }
            res.json(toPublicSpace(space));
        } catch (error: unknown) {
            console.error(`Error fetching space with id ${req.params.id}:`, error);
            res.status(500).json({ message: 'Failed to fetch space.' });
        }
    },

    async getSpaceByDomain(req: Request, res: Response) {
        try {
            const domain = req.params.domain as string;
            const space = await spaceModel.findByCustomDomain(domain);
            if (!space) {
                return res.status(404).json({ message: 'Space not found.' });
            }
            // Domain lookup is used for public portal loading — always strip secrets
            res.json(toPublicSpace(space));
        } catch (error: unknown) {
            console.error(`Error fetching space with domain ${req.params.domain}:`, error);
            res.status(500).json({ message: 'Failed to fetch space.' });
        }
    },

    async getSpaceBySlug(req: Request, res: Response) {
        try {
            const slug = req.params.slug as string;
            const space = await spaceModel.findBySlug(slug);
            if (!space) {
                return res.status(404).json({ message: 'Space not found.' });
            }
            // Admin screens (/:slug/admin) load the space by slug: give authorized managers the
            // masked admin view so settings forms keep (and never blank out) stored secrets.
            if (req.user && (isAdmin(req.user as any) || await canManageSpaceSettings(req.user, space.id as number))) {
                return res.json(toAdminSpace(space));
            }
            res.json(toPublicSpace(space));
        } catch (error: unknown) {
            console.error(`Error fetching space with slug ${req.params.slug}:`, error);
            res.status(500).json({ message: 'Failed to fetch space.' });
        }
    },

    async createSpace(req: Request, res: Response) {
        try {
            const spaceData = { ...req.body };
            if (req.file) {
                // Path relative: system/pending-space-assets/{name} (will be moved after creation if needed)
                const relativePath = req.file.path
                    .replace(/\\/g, '/')
                    .split('/uploads/')
                    .pop();
                spaceData.imageUrl = `/uploads/${relativePath}`;
            }
            // Convert string arrays from form-data
            if (spaceData.tags && typeof spaceData.tags === 'string') {
                spaceData.tags = spaceData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (!spaceData.tags) {
                spaceData.tags = [];
            }
            if (spaceData.tagsEn && typeof spaceData.tagsEn === 'string') {
                spaceData.tagsEn = spaceData.tagsEn.split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (!spaceData.tagsEn) {
                spaceData.tagsEn = [];
            }
            // Convert numbers which are sent as strings from multipart/form-data
            if (spaceData.rank) spaceData.rank = parseInt(spaceData.rank, 10);
            if (spaceData.membersCount) spaceData.membersCount = parseInt(spaceData.membersCount, 10);
            if (spaceData.views) spaceData.views = parseInt(spaceData.views, 10);
            if (spaceData.likes) spaceData.likes = parseInt(spaceData.likes, 10);
            if (spaceData.rating) spaceData.rating = parseFloat(spaceData.rating);
            if (spaceData.userId) spaceData.userId = parseInt(spaceData.userId, 10);
            if (spaceData.stripeAccountId) spaceData.stripeAccountId = String(spaceData.stripeAccountId);

            // Default slug to SpaceID if empty or not provided
            let NeedsSlugUpdate = false;
            if (!spaceData.slug || spaceData.slug.trim() === '') {
                spaceData.slug = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                NeedsSlugUpdate = true;
            } else {
                // Check slug uniqueness on creation
                const spaceWithSameSlug = await spaceModel.findBySlug(spaceData.slug);
                if (spaceWithSameSlug) {
                    return res.status(400).json({ message: 'Slug (URL) đã tồn tại. Vui lòng chọn một Slug khác.' });
                }
            }

            // Enforce ownership if not admin
            if (req.user && !isAdmin(req.user as any)) {
                return res.status(403).json({ message: 'Forbidden: Only admins can create spaces.' });
            }

            let newSpace = await spaceModel.create(spaceData);

            // Re-update the slug to the actual ID if it was auto-generated
            if (NeedsSlugUpdate && newSpace) {
                const updated = await spaceModel.update(newSpace.id, { slug: newSpace.id.toString() });
                if (updated) newSpace = updated;
            }

            res.status(201).json(newSpace);
        } catch (error: unknown) {
            console.error('Error creating space:', error);
            res.status(500).json({ message: `Failed to create space: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async updateSpace(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID.' });
            }

            // Check existing space for ownership
            const existingSpace = await spaceModel.findById(id);
            if (!existingSpace) {
                return res.status(404).json({ message: 'Space not found.' });
            }

            const hasAccess = await can(req.user, 'spaces', { spaceId: id });
            if (!hasAccess) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this space.' });
            }

            const spaceData = { ...req.body };
            if (req.file) {
                // req.file.path is absolute; extract relative from uploads/
                const relativePath = req.file.path
                    .replace(/\\/g, '/')
                    .split('/uploads/')
                    .pop();
                spaceData.imageUrl = `/uploads/${relativePath}`;
            }
            // Convert string arrays from form-data
            if (spaceData.tags && typeof spaceData.tags === 'string') {
                spaceData.tags = spaceData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            }
            if (spaceData.tagsEn && typeof spaceData.tagsEn === 'string') {
                spaceData.tagsEn = spaceData.tagsEn.split(',').map((t: string) => t.trim()).filter(Boolean);
            }
            // Convert numbers
            if (spaceData.rank) spaceData.rank = parseInt(spaceData.rank, 10);
            if (spaceData.membersCount) spaceData.membersCount = parseInt(spaceData.membersCount, 10);
            if (spaceData.views) spaceData.views = parseInt(spaceData.views, 10);
            if (spaceData.likes) spaceData.likes = parseInt(spaceData.likes, 10);
            if (spaceData.rating) spaceData.rating = parseFloat(spaceData.rating);
            if (spaceData.userId) spaceData.userId = parseInt(spaceData.userId, 10);
            if (spaceData.stripeAccountId) spaceData.stripeAccountId = String(spaceData.stripeAccountId);

            // Prevent non-admin from changing ownership or slug
            const isOwner = String(existingSpace.userId) === String(req.user?.id);
            const isGlobalAdminUser = Boolean(req.user?.isGlobalAdmin);

            // Payment settings protection: Only Space Owner or Global Admin can modify payment credentials
            const paymentFields = ['payosClientId', 'payosApiKey', 'payosChecksumKey', 'stripeAccountId', 'venmoUsername'];
            const hasPaymentUpdate = paymentFields.some(f => spaceData[f] !== undefined);
            if (hasPaymentUpdate && !isOwner && !isGlobalAdminUser) {
                return res.status(403).json({ message: 'Chỉ Chủ sở hữu Không gian hoặc Admin chính mới có quyền cập nhật cấu hình thanh toán.' });
            }

            if (req.user && !isAdmin(req.user as any)) {
                delete spaceData.userId;
                delete spaceData.slug;
            } else if (spaceData.slug && spaceData.slug !== existingSpace.slug) {
                // If admin is explicitly changing the slug, verify it doesn't collide
                const spaceWithSameSlug = await spaceModel.findBySlug(spaceData.slug);
                if (spaceWithSameSlug) {
                    return res.status(400).json({ message: 'Slug (URL) đã tồn tại. Vui lòng chọn một Slug khác.' });
                }
            }

            const updatedSpace = await spaceModel.update(id, spaceData);
            res.json(toAdminSpace(updatedSpace as any));
        } catch (error: unknown) {
            console.error('Error updating space:', error);
            res.status(500).json({ message: `Failed to save space: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async deleteSpace(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid ID.' });
            }

            // Check existing space for ownership
            const existingSpace = await spaceModel.findById(id);
            if (!existingSpace) {
                return res.status(404).json({ message: 'Space not found.' });
            }

            const isOwner = String(existingSpace.userId) === String(req.user?.id);
            if (!req.user?.isGlobalAdmin && !isOwner) {
                return res.status(403).json({ message: 'Forbidden: Only the Space Owner or Global Admin can delete this space.' });
            }

            await spaceModel.delete(id);
            res.status(204).send();
        } catch (error: unknown) {
            console.error('Error deleting space:', error);
            res.status(500).json({ message: 'Failed to delete space.' });
        }
    },

    async incrementViews(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            await spaceModel.incrementViews(id);
            res.status(204).send();
        } catch (error: unknown) {
            // This is a non-critical action, so just log the error and don't crash
            console.error('Error incrementing view count:', error);
            res.status(500).send();
        }
    },

    async getDharmaTalksBySpaceId(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) {
                return res.status(400).json({ message: 'Invalid Space ID.' });
            }
            const talks = await spaceModel.findDharmaTalksBySpaceId(spaceId);
            res.json(talks);
        } catch (error: unknown) {
            console.error('Error fetching dharma talks for space:', error);
            res.status(500).json({ message: 'Failed to fetch dharma talks for this space.' });
        }
    },

    async getDocumentsBySpaceId(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) {
                return res.status(400).json({ message: 'Invalid Space ID.' });
            }
            const docs = await spaceModel.findDocumentsBySpaceId(spaceId);
            res.json(docs);
        } catch (error: unknown) {
            console.error('Error fetching documents for space:', error);
            res.status(500).json({ message: 'Failed to fetch documents for this space.' });
        }
    },

    async makeOffering(req: Request, res: Response) {
        const spaceId = parseInt(String(req.params.id), 10);
        const { amount } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        if (isNaN(spaceId) || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Valid Space ID and positive amount are required.' });
        }

        try {
            const { updatedUser } = await spaceModel.makeOffering(spaceId, userId, amount);
            res.json({ updatedUser: toPublicUser(updatedUser) });
        } catch (error: unknown) {
            res.status(400).json({ message: (error instanceof Error ? error.message : String(error)) });
        }
    },

    async likeSpace(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            const result = await spaceModel.incrementLikes(id);
            res.json(result);
        } catch (error: unknown) {
            console.error('Error liking space:', error);
            res.status(500).json({ message: 'Failed to like space.' });
        }
    },

    /**
     * Upload a QR code image for a space.
     * Saves the file URL to qr_code_image in the spaces table.
     */
    async uploadQrCode(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });

            const existingSpace = await spaceModel.findById(id);
            if (!existingSpace) return res.status(404).json({ message: 'Space not found.' });

            // Route guard enforces the permission in this Space; repeat it here
            // so this controller stays safe if it is mounted elsewhere later.
            if (!req.user || (!isAdmin(req.user as any) && !await hasSpacePermission(req.user as any, id, 'spaces'))) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'No QR code image file provided.' });
            }

            const relativePath = req.file.path
                .replace(/\\/g, '/')
                .split('/uploads/')
                .pop();
            const qrCodeImage = `/uploads/${relativePath}`;
            const updated = await spaceModel.update(id, { qrCodeImage });
            if (!updated) {
                return res.status(500).json({ message: 'Failed to update space with QR code.' });
            }
            res.json({ qrCodeImage: updated.qrCodeImage });
        } catch (error: unknown) {
            console.error('Error uploading QR code:', error);
            res.status(500).json({ message: 'Failed to upload QR code.' });
        }
    },

    /**
     * Confirm a QR donation after user transfers money.
     * Logged-in users: records transaction (Merit tracked on space side).
     * Guests: records transaction with isGuest=true, no Merit credited to user.
     */
    async confirmQrDonation(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid Space ID.' });

            const { amount, note, billImageUrl } = req.body;
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                return res.status(400).json({ message: 'Valid amount is required.' });
            }

            // userId is null for guests
            const userId = req.user ? req.user.id : null;

            const result = await spaceModel.addQrDonation(
                spaceId,
                userId,
                Number(amount),
                note,
                billImageUrl
            );

            res.json({
                success: true,
                isGuest: result.isGuest,
                message: result.isGuest
                    ? 'Cảm ơn bạn đã cúng dường! Đăng ký tài khoản để nhận Merit và theo dõi lịch sử ủng hộ của bạn.'
                    : 'Đã ghi nhận cúng dường thành công. Cảm ơn tấm lòng của bạn! 🙏'
            });
        } catch (error: unknown) {
            console.error('Error confirming QR donation:', error);
            res.status(500).json({ message: 'Failed to confirm donation.' });
        }
    },

    // --- Space Member Management ---

    async getMembers(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID' });

            const members = await spaceMemberModel.getMembersBySpace(spaceId);
            res.json(members);
        } catch (error: unknown) {
            console.error('Error fetching space members:', error);
            res.status(500).json({ message: 'Lỗi khi tải thành viên.' });
        }
    },

    async addMember(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            const { userId } = req.body;

            if (isNaN(spaceId) || !userId) return res.status(400).json({ message: 'Invalid IDs' });

            const member = await spaceMemberModel.add(spaceId, userId);
            res.status(201).json(member);
        } catch (error: unknown) {
            console.error('Error adding space member:', error);
            res.status(500).json({ message: 'Lỗi khi thêm thành viên.' });
        }
    },

    async removeMember(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            const userId = parseInt(String(req.params.userId), 10);

            if (isNaN(spaceId) || isNaN(userId)) return res.status(400).json({ message: 'Invalid IDs' });

            // Admin Space bị gỡ khỏi space_members: Chặn, phải gỡ quyền admin trước
            if (await isSpaceAdmin(userId, spaceId)) {
                return res.status(400).json({ message: 'Không thể xoá thành viên đang giữ quyền Admin Space. Vui lòng gỡ quyền Admin trước.' });
            }

            // Tránh tạo tài khoản mồ côi: nếu người dùng chỉ còn thuộc 1 Space này, không cho xoá trừ khi là Global Admin
            const userSpaces = await spaceMemberModel.getSpacesByUser(userId);
            if (userSpaces.length <= 1 && !req.user?.isGlobalAdmin) {
                return res.status(400).json({ message: 'Không thể xoá thành viên khỏi Không gian duy nhất của họ (tránh tạo tài khoản không thuộc Không gian nào).' });
            }

            await spaceMemberModel.remove(spaceId, userId);
            res.status(204).send();
        } catch (error: unknown) {
            console.error('Error removing space member:', error);
            res.status(500).json({ message: 'Lỗi khi xoá thành viên.' });
        }
    },

    /**
     * GET /api/spaces/my-spaces
     * Returns only spaces the current user manages.
     * If user.isGlobalAdmin → returns ALL spaces.
     */
    async getMySpaces(req: Request, res: Response) {
        try {
            const user = req.user as any;
            if (!user?.id) {
                return res.status(401).json({ message: 'Unauthorized.' });
            }

            const allSpaces = await spaceModel.findAll();

            // Global admin sees all spaces (with masked keys for safe admin management)
            if (user.isGlobalAdmin) {
                return res.json(allSpaces.map(s => ({
                    ...toAdminSpace(s),
                    isOwner: s.userId === user.id
                })));
            }

            // Only spaces the user owns OR is admin in OR has explicit 'spaces' management permission in
            const manageableSpaces: any[] = [];
            for (const s of allSpaces) {
                const isAdmin = await isSpaceAdmin(user.id, s.id as number);
                if (isAdmin || await hasSpacePermission(user, s.id as number, 'spaces')) {
                    manageableSpaces.push({
                        ...toAdminSpace(s),
                        isOwner: s.userId === user.id
                    });
                }
            }
            res.json(manageableSpaces);
        } catch (error: unknown) {
            console.error('Error fetching my spaces:', error);
            res.status(500).json({ message: 'Lỗi khi tải danh sách không gian.' });
        }
    },

    async getSpaceAdmins(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID' });

            const user = req.user as any;
            if (!user?.isGlobalAdmin && !(await isSpaceAdmin(user?.id, spaceId))) {
                return res.status(403).json({ message: 'Chỉ Admin Space hoặc Super Admin mới có quyền xem danh sách Admin.' });
            }

            const query = `
                SELECT u.id, u.name, u.email, u.avatar_url, (s.user_id = u.id) AS is_owner, sa.created_at
                FROM spaces s
                JOIN users u ON u.id = s.user_id OR u.id IN (SELECT user_id FROM space_admins WHERE space_id = s.id)
                LEFT JOIN space_admins sa ON sa.space_id = s.id AND sa.user_id = u.id
                WHERE s.id = $1
                ORDER BY is_owner DESC, sa.created_at ASC, u.id ASC;
            `;
            const result = await pool.query(query, [spaceId]);
            const admins = result.rows.map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                avatarUrl: r.avatar_url,
                isOwner: Boolean(r.is_owner),
                createdAt: r.created_at
            }));

            res.json(admins);
        } catch (error) {
            console.error('Error fetching space admins:', error);
            res.status(500).json({ message: 'Lỗi khi tải danh sách Admin Space.' });
        }
    },

    async addSpaceAdmins(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            if (isNaN(spaceId)) return res.status(400).json({ message: 'Invalid space ID' });

            const user = req.user as any;
            if (!user?.isGlobalAdmin && !(await isSpaceAdmin(user?.id, spaceId))) {
                return res.status(403).json({ message: 'Chỉ Admin Space hoặc Super Admin mới có quyền thêm Admin.' });
            }

            const space = await spaceModel.findById(spaceId);
            if (!space) return res.status(404).json({ message: 'Space not found' });

            const { emails = [], userIds = [], createIfMissing = false, defaultPassword } = req.body;
            const targetEmails: string[] = Array.isArray(emails) ? emails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) : [];
            const targetUserIds: number[] = Array.isArray(userIds) ? userIds.map((id: any) => Number(id)).filter(id => !isNaN(id)) : [];

            const results: Array<{ email?: string; userId?: number; status: string; message: string; name?: string }> = [];

            // Xử lý theo userIds nếu có
            for (const uid of targetUserIds) {
                if (uid === space.userId) {
                    results.push({ userId: uid, status: 'already_admin', message: 'Người dùng là Chủ sở hữu' });
                    continue;
                }
                const existingAdmin = await pool.query('SELECT 1 FROM space_admins WHERE space_id = $1 AND user_id = $2', [spaceId, uid]);
                if (existingAdmin.rows.length > 0) {
                    results.push({ userId: uid, status: 'already_admin', message: 'Đã là Admin Space' });
                    continue;
                }
                await pool.query('INSERT INTO space_admins (space_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [spaceId, uid, user.id]);
                await spaceMemberModel.add(spaceId, uid).catch(() => {});
                userModel.invalidateCache(uid);
                results.push({ userId: uid, status: 'added', message: 'Thêm Admin Space thành công' });
            }

            // Xử lý theo emails
            for (const email of targetEmails) {
                const foundUser = await userModel.findByEmail(email);
                if (foundUser) {
                    if (foundUser.id === space.userId) {
                        results.push({ email, userId: foundUser.id, name: foundUser.name, status: 'already_admin', message: 'Người dùng là Chủ sở hữu' });
                        continue;
                    }
                    const existingAdmin = await pool.query('SELECT 1 FROM space_admins WHERE space_id = $1 AND user_id = $2', [spaceId, foundUser.id]);
                    if (existingAdmin.rows.length > 0) {
                        results.push({ email, userId: foundUser.id, name: foundUser.name, status: 'already_admin', message: 'Đã là Admin Space' });
                        continue;
                    }
                    await pool.query('INSERT INTO space_admins (space_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [spaceId, foundUser.id, user.id]);
                    await spaceMemberModel.add(spaceId, foundUser.id).catch(() => {});
                    userModel.invalidateCache(foundUser.id);
                    results.push({ email, userId: foundUser.id, name: foundUser.name, status: 'added', message: 'Thêm Admin Space thành công' });
                } else {
                    if (createIfMissing) {
                        const pwd = typeof defaultPassword === 'string' && defaultPassword.length >= 6 ? defaultPassword : 'password';
                        const newUser = await userModel.create({
                            name: email.split('@')[0],
                            email,
                            password: pwd,
                            isActive: true,
                            merits: 0,
                            requestsRemaining: 0,
                            roleIds: [],
                            avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
                            template: 'giacngo'
                        }, spaceId);

                        if (newUser) {
                            await pool.query('INSERT INTO space_admins (space_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [spaceId, newUser.id, user.id]);
                            userModel.invalidateCache(newUser.id);
                            results.push({ email, userId: newUser.id, name: newUser.name, status: 'created', message: 'Đã tạo tài khoản và gán Admin Space' });
                        } else {
                            results.push({ email, status: 'error', message: 'Không thể tạo tài khoản mới' });
                        }
                    } else {
                        results.push({ email, status: 'not_found', message: 'Tài khoản chưa tồn tại trong hệ thống' });
                    }
                }
            }

            res.json({ success: true, results });
        } catch (error) {
            console.error('Error adding space admins:', error);
            res.status(500).json({ message: 'Lỗi khi thêm Admin Space.' });
        }
    },

    async removeSpaceAdmin(req: Request, res: Response) {
        try {
            const spaceId = parseInt(String(req.params.id), 10);
            const targetUserId = parseInt(String(req.params.userId), 10);
            if (isNaN(spaceId) || isNaN(targetUserId)) return res.status(400).json({ message: 'Invalid IDs' });

            const user = req.user as any;
            const space = await spaceModel.findById(spaceId);
            if (!space) return res.status(404).json({ message: 'Space not found' });

            // Quy tắc mục 2: Gỡ Admin Space phụ: Admin chính + Admin Space chính (chủ sở hữu)
            const isOwner = space.userId === user?.id;
            if (!user?.isGlobalAdmin && !isOwner) {
                return res.status(403).json({ message: 'Chỉ Chủ sở hữu Không gian hoặc Super Admin mới có quyền gỡ Admin Space.' });
            }

            // Chặn gỡ chủ sở hữu
            if (targetUserId === space.userId) {
                return res.status(400).json({ message: 'Không thể gỡ quyền Admin của Chủ sở hữu Không gian.' });
            }

            await pool.query('DELETE FROM space_admins WHERE space_id = $1 AND user_id = $2', [spaceId, targetUserId]);
            userModel.invalidateCache(targetUserId);

            res.json({ success: true, message: 'Đã gỡ quyền Admin Space thành công.' });
        } catch (error) {
            console.error('Error removing space admin:', error);
            res.status(500).json({ message: 'Lỗi khi gỡ Admin Space.' });
        }
    },
};

