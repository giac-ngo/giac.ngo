import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { meditationModel } from '../models/meditation.model.js';
import { isAdmin, getUserManagedSpaceIds } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

/**
 * Validates whether an audio file exists on disk.
 * If the path in the DB is outdated or broken (e.g. legacy subfolder /meditation/),
 * it dynamically heals the URL by checking sibling folders or selecting the best
 * matching audio file for the space.
 */
function resolveValidAudioUrl(spaceId: string | number | undefined, url?: string | null, isEndAudio = false): string | null {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

    // 1. Direct path check
    const cleanRel = trimmed.replace(/^\/uploads\//, '').replace(/^\//, '');
    const directPath = path.join(uploadsDir, cleanRel);
    if (fs.existsSync(directPath)) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    // 2. Try removing legacy subdirectories like /meditation/
    const noMeditationRel = cleanRel.replace(/meditation\//g, '');
    if (fs.existsSync(path.join(uploadsDir, noMeditationRel))) {
        return `/uploads/${noMeditationRel}`;
    }

    // 3. Scan the space's uploads folder for available audio files
    if (spaceId) {
        const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
        const spaceDir = path.join(uploadsDir, `space-${safeSpaceId}`);
        if (fs.existsSync(spaceDir)) {
            try {
                const files = fs.readdirSync(spaceDir);
                const audioFiles = files.filter(f => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f));
                const candidates = audioFiles.filter(f => isEndAudio ? /end/i.test(f) : !/end/i.test(f));
                if (candidates.length > 0) {
                    // Sort descending by size to get the full audio track (for main audio)
                    candidates.sort((a, b) => {
                        try {
                            return fs.statSync(path.join(spaceDir, b)).size - fs.statSync(path.join(spaceDir, a)).size;
                        } catch {
                            return 0;
                        }
                    });
                    return `/uploads/space-${safeSpaceId}/${candidates[0]}`;
                }
            } catch (e) {
                logger.warn('Error scanning space audio directory:', e);
            }
        }
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function sanitizeSessionUrls<T extends Record<string, any>>(session: T): T {
    if (!session) return session;
    const spaceId = session.spaceId;
    return {
        ...session,
        audioUrl: resolveValidAudioUrl(spaceId, session.audioUrl, false),
        audioUrlEn: resolveValidAudioUrl(spaceId, session.audioUrlEn, false),
        endAudioUrl: resolveValidAudioUrl(spaceId, session.endAudioUrl, true),
        endAudioUrlEn: resolveValidAudioUrl(spaceId, session.endAudioUrlEn, true)
    };
}

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
            res.json(sessions.map(sanitizeSessionUrls));
        } catch (error: unknown) {
            logger.error('Error fetching meditations:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getMeditationBySpaceId: async (req: Request, res: Response) => {
        try {
            const { spaceId } = req.params;
            const session = await meditationModel.findBySpaceId(String(spaceId));
            res.json(session ? sanitizeSessionUrls(session) : null);
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
