import { meditationModel } from '../models/meditation.model.js';
import { isAdmin, getUserManagedSpaceIds } from '../middleware/authMiddleware.js';

export const meditationController = {
    getAllMeditations: async (req, res) => {
        try {
            let spaceIds = [];
            if (!isAdmin(req.user)) {
                spaceIds = await getUserManagedSpaceIds(req.user.id);
            }
            const sessions = await meditationModel.findAll(spaceIds);
            res.json(sessions);
        } catch (error) {
            console.error('Error fetching meditations:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    getMeditationBySpaceId: async (req, res) => {
        try {
            const { spaceId } = req.params;
            const session = await meditationModel.findBySpaceId(spaceId);
            // If not found, return null instead of 404 to avoid errors in frontend
            res.json(session || null);
        } catch (error) {
            console.error('Error fetching meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    createMeditation: async (req, res) => {
        try {
            const { spaceId, title, titleEn, description, descriptionEn, duration } = req.body;

            // Security check
            if (!isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user.id);
                if (!userSpaceIds.includes(parseInt(spaceId))) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to add meditation to this space' });
                }
            }

            const files = req.files;
            const safeSpaceId = String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_');

            // Prefer URL from body (MediaPickerModal); fall back to uploaded file
            let audioUrl = req.body.audioUrl || '';
            let audioUrlEn = req.body.audioUrlEn || null;
            let endAudioUrl = req.body.endAudioUrl || null;
            let endAudioUrlEn = req.body.endAudioUrlEn || null;

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
        } catch (error) {
            console.error('Error creating meditation:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'A meditation session already exists for this space' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    updateMeditation: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, titleEn, description, descriptionEn, duration, spaceId } = req.body;
            const files = req.files;

            // Security check
            if (spaceId && !isAdmin(req.user)) {
                const userSpaceIds = await getUserManagedSpaceIds(req.user.id);
                if (!userSpaceIds.includes(parseInt(spaceId))) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to manage this space' });
                }
            }

            const updateData = { title, titleEn, description, descriptionEn, duration };
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

            const updatedSession = await meditationModel.update(id, updateData);
            if (!updatedSession) {
                return res.status(404).json({ error: 'Meditation session not found' });
            }

            res.json(updatedSession);
        } catch (error) {
            console.error('Error updating meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    deleteMeditation: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedSession = await meditationModel.delete(id);
            if (!deletedSession) {
                return res.status(404).json({ error: 'Meditation session not found' });
            }
            res.json(deletedSession);
        } catch (error) {
            console.error('Error deleting meditation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
