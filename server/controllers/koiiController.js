// server/controllers/koiiController.js
import { koiiModel } from '../models/koii.model.js';
import weaviateService from '../services/weaviateService.js';
import { getSyncProgress } from '../services/syncProgressStore.js';

export const koiiController = {
    async submitTask(req, res) {
        const { aiConfigId } = req.body;
        if (!aiConfigId) {
            return res.status(400).json({ message: 'aiConfigId is required.' });
        }
        try {
            const existingTask = await koiiModel.findLatest(aiConfigId);
            if (existingTask && (existingTask.status === 'pending' || existingTask.status === 'processing')) {
                return res.status(409).json({ message: 'A task for this AI is already in progress.' });
            }
            await koiiModel.create(aiConfigId);

            // Asynchronously trigger the sync without awaiting
            weaviateService.syncAllDataForAI(aiConfigId)
                .then(() => koiiModel.updateStatusByAiId(aiConfigId, 'completed'))
                .catch((err) => {
                    console.error(`Koii task failed for AI ${aiConfigId}:`, err);
                    koiiModel.updateStatusByAiId(aiConfigId, 'failed', err.message);
                });

            res.status(202).json({ message: 'Task submitted successfully.' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to submit task.' });
        }
    },

    async getTaskStatus(req, res) {
        try {
            const task = await koiiModel.findLatest(req.params.aiConfigId);
            if (!task) {
                return res.status(404).json(null);
            }
            res.json(task);
        } catch (error) {
            res.status(500).json({ message: 'Failed to get task status.' });
        }
    },

    async getProgress(req, res) {
        const aiConfigId = parseInt(req.params.aiConfigId, 10);
        const progress = getSyncProgress(aiConfigId);
        if (!progress) return res.json(null);
        res.json({
            total: progress.total,
            indexed: progress.indexed,
            failed: progress.failed,
            percent: progress.total > 0 ? Math.round((progress.indexed / progress.total) * 100) : 0,
            files: progress.files,
        });
    }
};