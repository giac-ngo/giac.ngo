// server/controllers/spacesController.js
import { Request, Response, NextFunction } from 'express';
import { spaceModel } from '../models/space.model.js';
import { spaceMemberModel } from '../models/spaceMember.model.js';
import { userModel } from '../models/user.model.js';
import { isAdmin, getUserManagedSpaceIds, canAccessSpace } from '../middleware/authMiddleware.js';
import { pool } from '../db.js';



// Add a local helper function to sanitize user data before sending it to the client.
const mapAndSanitizeUser = (user: Record<string, unknown> | null) => {
    if (!user) return null;
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};

export const spacesController = {
    async getAllSpaces(req: Request, res: Response) {
        try {
            const spaces = await spaceModel.findAll();

            // Super admin sees everything
            if (req.user && isAdmin(req.user as any)) {
                return res.json(spaces);
            }

            // Authenticated non-admin: only spaces they own or are a member of
            if (req.user && (req.user as any).id) {
                const managedIds = await getUserManagedSpaceIds((req.user as any).id);
                const mySpaces = spaces.filter(space => managedIds.includes(space.id as number));
                return res.json(mySpaces);
            }

            // Unauthenticated: return all (public listing for homepage/landing)
            res.json(spaces);
        } catch (error: unknown) {
            console.error('Error fetching spaces:', error);
            res.status(500).json({ message: 'Failed to fetch spaces.' });
        }
    },

    // FIX: Add controller method to get a space by its numeric ID.
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
            res.json(space);
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
            res.json(space);
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
            res.json(space);
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

            if (req.user && !isAdmin(req.user as any)) {
                const hasAccess = await canAccessSpace(req.user as any, id);
                if (!hasAccess) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to edit this space.' });
                }
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
            res.json(updatedSpace);
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

            if (req.user && !isAdmin(req.user as any)) {
                const hasAccess = await canAccessSpace(req.user as any, id);
                if (!hasAccess) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this space.' });
                }
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
        const { amount, userId } = req.body;

        if (isNaN(spaceId) || !amount || amount <= 0 || !userId) {
            return res.status(400).json({ message: 'Valid Space ID, amount, and User ID are required.' });
        }

        try {
            const { updatedUser } = await spaceModel.makeOffering(spaceId, userId, amount);
            res.json({ updatedUser: mapAndSanitizeUser(updatedUser) });
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

            // Only admin or space owner can upload
            if (req.user && !isAdmin(req.user as any) && existingSpace.userId !== (req.user as any).id) {
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

            await spaceMemberModel.remove(spaceId, userId);
            res.status(204).send();
        } catch (error: unknown) {
            console.error('Error removing space member:', error);
            res.status(500).json({ message: 'Lỗi khi xoá thành viên.' });
        }
    }
};
