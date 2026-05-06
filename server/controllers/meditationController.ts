import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { meditationModel } from '../models/meditation.model.js';
import { isAdmin, getUserManagedSpaceIds } from '../middleware/authMiddleware.js';

// Type for multer multi-field upload (req.files as a named-field map)
type UploadedFiles = Record<string, Express.Multer.File[]>;

// Shape of data we build before calling meditationModel.update()
interface MeditationUpdateData {
    title?: string;
    titleEn?: string;
    description?: string;
    descriptionEn?: string;
    duration?: number;
    audioUrl?: string;
    audioUrlEn?: string;
    endAudioUrl?: string;
    endAudioUrlEn?: string;
    [key: string]: unknown;
}

export const meditationController = {

    getAllMeditations: async (req: Request, res: Response) => {
        try {
            let spaceIds: number[] = [];
            if (!isAdmin(req.user)) {
                spaceIds = await getUserManagedSpaceIds(req.user?.id);
            }
            const sessions = await meditationModel.findAll(spaceIds);
            res.json(sessions);
        } catch (error: unknown) {
            logger.error('Error fetching meditations:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getMeditationBySpaceId: async (req: Request, res: Response) => {
        try {
            const { spaceId } = req.params;
            const session = await meditationModel.findBySpaceId(String(spaceId));
            res.json(session || null);
        } catch (error: unknown) {
            logger.error('Error fetching meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    createMeditation: async (req: Request, res: Response) => {
        try {
            const { spaceId, title, titleEn, description, descriptionEn, duration } = req.body;

            // Security check
            if (!isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user?.id);
                if (!userSpaceIds.includes(parseInt(String(spaceId), 10))) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to add meditation to this space' });
                }
            }

            const files = req.files as UploadedFiles | undefined;
            const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');

            // Prefer URL from body (MediaPickerModal); fall back to uploaded file
            let audioUrl: string = req.body.audioUrl || '';
            let audioUrlEn: string | null = req.body.audioUrlEn || null;
            let endAudioUrl: string | null = req.body.endAudioUrl || null;
            let endAudioUrlEn: string | null = req.body.endAudioUrlEn || null;

            if (files) {
                if (!audioUrl && files.audioFile)
                    audioUrl = `/uploads/space-${safeSpaceId}/${files.audioFile[0].filename}`;
                if (!audioUrlEn && files.audioFileEn)
                    audioUrlEn = `/uploads/space-${safeSpaceId}/${files.audioFileEn[0].filename}`;
                if (!endAudioUrl && files.endAudioFile)
                    endAudioUrl = `/uploads/space-${safeSpaceId}/${files.endAudioFile[0].filename}`;
                if (!endAudioUrlEn && files.endAudioFileEn)
                    endAudioUrlEn = `/uploads/space-${safeSpaceId}/${files.endAudioFileEn[0].filename}`;
            }

            if (!audioUrl) {
                return res.status(400).json({ error: 'Vietnamese audio URL or file is required' });
            }

            const newSession = await meditationModel.create({
                spaceId, title, titleEn, description, descriptionEn,
                audioUrl, audioUrlEn, endAudioUrl, endAudioUrlEn, duration
            });

            res.status(201).json(newSession);
        } catch (error: unknown) {
            logger.error('Error creating meditation:', error);
            // PostgreSQL unique violation code
            if ((error as NodeJS.ErrnoException).code === '23505') {
                return res.status(400).json({ error: 'A meditation session already exists for this space' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    updateMeditation: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, titleEn, description, descriptionEn, duration, spaceId } = req.body;
            const files = req.files as UploadedFiles | undefined;

            // Security check
            if (spaceId && !isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user?.id);
                if (!userSpaceIds.includes(parseInt(String(spaceId), 10))) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to manage this space' });
                }
            }

            const updateData: MeditationUpdateData = { title, titleEn, description, descriptionEn, duration };
            const safeSpaceId = String(spaceId || '').replace(/[^a-zA-Z0-9_-]/g, '_');

            // Prefer URL from body (MediaPickerModal); fall back to uploaded file
            if (req.body.audioUrl) updateData.audioUrl = req.body.audioUrl;
            if (req.body.audioUrlEn) updateData.audioUrlEn = req.body.audioUrlEn;
            if (req.body.endAudioUrl) updateData.endAudioUrl = req.body.endAudioUrl;
            if (req.body.endAudioUrlEn) updateData.endAudioUrlEn = req.body.endAudioUrlEn;

            if (files && safeSpaceId) {
                if (!updateData.audioUrl && files.audioFile)
                    updateData.audioUrl = `/uploads/space-${safeSpaceId}/${files.audioFile[0].filename}`;
                if (!updateData.audioUrlEn && files.audioFileEn)
                    updateData.audioUrlEn = `/uploads/space-${safeSpaceId}/${files.audioFileEn[0].filename}`;
                if (!updateData.endAudioUrl && files.endAudioFile)
                    updateData.endAudioUrl = `/uploads/space-${safeSpaceId}/${files.endAudioFile[0].filename}`;
                if (!updateData.endAudioUrlEn && files.endAudioFileEn)
                    updateData.endAudioUrlEn = `/uploads/space-${safeSpaceId}/${files.endAudioFileEn[0].filename}`;
            }

            const updatedSession = await meditationModel.update(String(id), updateData);
            if (!updatedSession) {
                return res.status(404).json({ error: 'Meditation session not found' });
            }

            res.json(updatedSession);
        } catch (error: unknown) {
            logger.error('Error updating meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    deleteMeditation: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const deletedSession = await meditationModel.delete(String(id));
            if (!deletedSession) {
                return res.status(404).json({ error: 'Meditation session not found' });
            }
            res.json(deletedSession);
        } catch (error: unknown) {
            logger.error('Error deleting meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
