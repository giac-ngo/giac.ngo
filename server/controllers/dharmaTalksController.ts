// server/controllers/dharmaTalksController.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { dharmaTalkModel } from '../models/dharmaTalk.model.js';
import { spaceModel } from '../models/space.model.js';
import { pool, mapRowToCamelCase } from '../db.js';
import { User } from '../types/index.js';

const parseAndProcessTalkData = (req: Request) => {
    const data = { ...req.body };
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    // Use space-{id} convention
    const rawSpaceId = data.spaceId;
    const spaceDir = rawSpaceId && rawSpaceId !== '' && rawSpaceId !== 'null'
        ? `space-${String(rawSpaceId).replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : 'space-1'; // No global folder — default to space-1

    if (files) {
        if (files.avatarFile) {
            data.speakerAvatarUrl = `/uploads/${spaceDir}/dharmatalks/${files.avatarFile[0].filename}`;
        }
        // Audio VI: file upload overrides body URL
        if (files.audioFileVi) {
            data.url = `/uploads/${spaceDir}/dharmatalks/${files.audioFileVi[0].filename}`;
        }
        // Audio EN: file upload overrides body URL
        if (files.audioFileEn) {
            data.urlEn = `/uploads/${spaceDir}/dharmatalks/${files.audioFileEn[0].filename}`;
        }
        // Legacy support
        if (files.audioFile && !files.audioFileVi) {
            data.url = `/uploads/${spaceDir}/dharmatalks/${files.audioFile[0].filename}`;
        }
    }
    // If no uploaded file for audio, keep URL from req.body (from MediaPickerModal)
    // data.url and data.urlEn already come from req.body via spread at line 8

    // FIX: Properly handle empty strings for array fields to prevent DB errors.
    // An empty string from FormData should be converted to an empty array for PostgreSQL.
    if (typeof data.tags === 'string') {
        data.tags = data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    }
    if (typeof data.tagsEn === 'string') {
        data.tagsEn = data.tagsEn ? data.tagsEn.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    }

    // Handle numeric fields that might be strings, converting empty values to null
    ['spaceId', 'duration', 'notifications', 'views', 'likes', 'episodeNumber'].forEach(field => {
        if (data[field] === '' || data[field] === null || data[field] === undefined) {
            data[field] = null;
        } else {
            const num = Number(data[field]);
            data[field] = isNaN(num) ? null : num;
        }
    });

    // Handle floating point numbers
    if (data.rating === '' || data.rating === null || data.rating === undefined) {
        data.rating = null;
    } else {
        const num = parseFloat(data.rating);
        data.rating = isNaN(num) ? null : num;
    }

    // Handle category field — ensure valid value
    if (data.category && !['dharma_talk', 'music', 'podcast'].includes(data.category)) {
        data.category = 'dharma_talk';
    }

    // Handle empty date string
    if (data.date === '' || data.date === 'null') {
        data.date = null;
    }

    return data;
}


export const dharmaTalksController = {
    async getAllDharmaTalks(req: Request, res: Response) {
        try {
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');

            let query = `
                SELECT dt.*, s.name as space_name 
                FROM dharma_talks dt 
                LEFT JOIN spaces s ON dt.space_id = s.id
            `;
            const params: any[] = [];

            if (req.user && !isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user.id);
                if (userSpaceIds.length === 0) {
                    return res.json([]);
                }
                query += ' WHERE dt.space_id = ANY($1)';
                params.push(userSpaceIds);
            }

            query += ' ORDER BY dt.date DESC NULLS LAST';
            const { rows } = await pool.query(query, params);
            res.json(rows.map(mapRowToCamelCase));
        } catch (error: unknown) {
            logger.error('Error fetching all dharma talks:', error);
            res.status(500).json({ message: 'Failed to fetch all dharma talks.' });
        }
    },

    async createDharmaTalk(req: Request, res: Response) {
        try {
            const talkData = parseAndProcessTalkData(req);
            const { spaceId } = talkData;
            const user = req.user as User;

            if (!user?.isGlobalAdmin) {
                if (!spaceId) {
                    return res.status(403).json({ message: 'Only Global Admins can create global dharma talks.' });
                }
                const { hasSpacePermission } = await import('../middleware/authMiddleware.js');
                if (!await hasSpacePermission(user, spaceId, 'dharma-talks')) {
                    return res.status(403).json({ message: 'Forbidden: You do not have dharma-talks permission in this space.' });
                }
            }

            const newTalk = await dharmaTalkModel.create(talkData);
            res.status(201).json(newTalk);
        } catch (error: unknown) {
            logger.error('Error creating dharma talk:', error);
            res.status(500).json({ message: 'Failed to create dharma talk.' });
        }
    },

    async updateDharmaTalk(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            const talkData = parseAndProcessTalkData(req);
            const user = req.user as User;

            if (!user?.isGlobalAdmin) {
                const talkSpaceResUpd = await pool.query('SELECT dt.space_id FROM dharma_talks dt WHERE dt.id = $1', [id]);
                if (talkSpaceResUpd.rows.length === 0) {
                    return res.status(404).json({ message: 'Dharma talk not found.' });
                }
                const spaceId = talkSpaceResUpd.rows[0].space_id;
                if (!spaceId) {
                    return res.status(403).json({ message: 'Only Global Admins can update global dharma talks.' });
                }
                const { hasSpacePermission } = await import('../middleware/authMiddleware.js');
                if (!await hasSpacePermission(user, spaceId, 'dharma-talks')) {
                    return res.status(403).json({ message: 'Forbidden: You do not have dharma-talks permission in this space.' });
                }
                // Do not allow transferring talk to another space
                if (talkData.spaceId !== undefined && talkData.spaceId !== null && Number(talkData.spaceId) !== Number(spaceId)) {
                    return res.status(403).json({ message: 'Forbidden: Cannot change spaceId of dharma talk.' });
                }
            }

            const updatedTalk = await dharmaTalkModel.update(id, talkData);
            if (!updatedTalk) {
                return res.status(404).json({ message: 'Dharma talk not found.' });
            }
            res.json(updatedTalk);
        } catch (error: unknown) {
            logger.error('Error updating dharma talk:', error);
            res.status(500).json({ message: `Failed to update dharma talk: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async deleteDharmaTalk(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            const user = req.user as User;

            if (!user?.isGlobalAdmin) {
                const talkSpaceResDel = await pool.query('SELECT dt.space_id FROM dharma_talks dt WHERE dt.id = $1', [id]);
                if (talkSpaceResDel.rows.length === 0) {
                    return res.status(404).json({ message: 'Dharma talk not found.' });
                }
                const spaceId = talkSpaceResDel.rows[0].space_id;
                if (!spaceId) {
                    return res.status(403).json({ message: 'Only Global Admins can delete global dharma talks.' });
                }
                const { hasSpacePermission } = await import('../middleware/authMiddleware.js');
                if (!await hasSpacePermission(user, spaceId, 'dharma-talks')) {
                    return res.status(403).json({ message: 'Forbidden: You do not have dharma-talks permission in this space.' });
                }
            }

            const deleted = await dharmaTalkModel.delete(id);
            if (!deleted) {
                return res.status(404).json({ message: 'Dharma talk not found.' });
            }
            res.status(204).send();
        } catch (error: unknown) {
            logger.error('Error deleting dharma talk:', error);
            res.status(500).json({ message: 'Failed to delete dharma talk.' });
        }
    },

    async likeDharmaTalk(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            const result = await dharmaTalkModel.incrementLikes(id);
            res.json(result);
        } catch (error: unknown) {
            logger.error('Error liking dharma talk:', error);
            res.status(500).json({ message: 'Failed to like dharma talk.' });
        }
    },

    async incrementDharmaTalkView(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (isNaN(id)) return res.status(400).json({ message: 'Invalid ID.' });
            const result = await dharmaTalkModel.incrementViews(id);
            res.json(result);
        } catch (error: unknown) {
            logger.error('Error incrementing dharma talk view:', error);
            res.status(500).json({ message: 'Failed to increment view.' });
        }
    }
};
