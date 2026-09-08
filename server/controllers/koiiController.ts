import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
// server/controllers/koiiController.js
import { koiiModel } from '../models/koii.model.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import weaviateService from '../services/weaviateService.js';
import { pgVectorService } from '../services/pgVectorService.js';
import { getSyncProgress } from '../services/syncProgressStore.js';

export const koiiController = {
    async submitTask(req: Request, res: Response) {
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

            const aiConfig = await aiConfigModel.findById(aiConfigId);
            const vectorBackend = aiConfig?.vectorBackend || 'weaviate';

            // Asynchronously trigger the sync without awaiting
            const syncPromise = vectorBackend === 'pgvector'
                ? pgVectorService.syncAllDataForAI(aiConfigId)
                : weaviateService.syncAllDataForAI(aiConfigId);

            syncPromise
                .then(() => koiiModel.updateStatusByAiId(aiConfigId, 'completed'))
                .catch((err) => {
                    logger.error(`Koii task failed for AI ${aiConfigId}:`, err);
                    koiiModel.updateStatusByAiId(aiConfigId, 'failed', err.message);
                });
            res.status(202).json({ message: 'Task submitted successfully.' });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to submit task.' });
        }
    },
    async getTaskStatus(req: Request, res: Response) {
        try {
            const task = await koiiModel.findLatest((req.params.aiConfigId as string));
            if (!task) {
                return res.json(null);
            }
            res.json(task);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to get task status.' });
        }
    },
    async getProgress(req: Request, res: Response) {
        const aiConfigId = parseInt((req.params.aiConfigId as string), 10);
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
