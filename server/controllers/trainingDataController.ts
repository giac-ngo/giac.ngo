
// server/controllers/trainingDataController.js
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { trainingDataModel } from '../models/trainingData.model.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { userModel } from '../models/user.model.js';
import { fileParserService } from '../services/fileParserService.js';
import { geminiService } from '../services/geminiService.js';
import { gptService } from '../services/gptService.js';
import weaviateService from '../services/weaviateService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool } from '../db.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Fix path: Go up two levels from controllers to reach project root, then into uploads
const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');

// Ensure uploads directory exists
(async () => {
    try {
        await fs.mkdir(uploadsDir, { recursive: true });
    } catch (e: unknown) {
        logger.error("Could not create uploads directory:", e);
    }
})();

// Use memory storage; we'll write to correct space folder after resolving spaceId
const trainingDataStorage = multer.memoryStorage();

export const trainingDataController = {
    upload: multer({
        storage: trainingDataStorage,
        limits: { fileSize: 50 * 1024 * 1024 } // Limit to 50MB
    }),

    async getTrainingDataForAI(req: Request, res: Response) {
        try {
            // @ts-ignore
            const aiId = parseInt(String(req.params.id), 10);
            if (isNaN(aiId)) return res.status(400).json({ message: 'Invalid AI ID.' });

            const data = await trainingDataModel.findByAiId(aiId);
            res.setHeader('Cache-Control', 'no-store');
            res.json(data);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch training data.' });
        }
    },

    async createTrainingDataSourceForAI(req: Request, res: Response) {
        // @ts-ignore
        const aiId = parseInt(String(req.params.id), 10);
        const { type, question, answer, thought } = req.body;

        // Path to clean up in case of error (if file was uploaded)
        let uploadedFilePath = req.file ? req.file.path : null;

        try {
            const aiConfig = await aiConfigModel.findById(aiId);
            if (!aiConfig) {
                if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => { });
                return res.status(404).json({ message: 'AI Config not found.' });
            }

            const owner = aiConfig.ownerId ? await userModel.findById(aiConfig.ownerId) : null;
            let newSourceData = { aiConfigId: aiId, type };

            if (type === 'file') {
                // Mode 1: URL from body (MediaPickerModal � file already in media library)
                if (req.body.fileUrl) {
                    const fileUrl = req.body.fileUrl;
                    const fileName = path.basename(fileUrl.split('?')[0]);
                    // @ts-ignore
                    newSourceData.fileUrl = fileUrl;
                    // @ts-ignore
                    newSourceData.fileName = fileName;
                }
                // Mode 2: Direct file upload via multer
                else if (req.file) {
                    const safeSpaceId = aiConfig.spaceId
                        ? String(aiConfig.spaceId).replace(/[^a-zA-Z0-9_-]/g, '_')
                        : 'global';
                    // Flat space directory � no training subfolder
                    const spaceDir = safeSpaceId === 'global'
                        ? path.join(uploadsDir, 'global')
                        : path.join(uploadsDir, `space-${safeSpaceId}`);
                    await fs.mkdir(spaceDir, { recursive: true });

                    const utf8Name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
                    const safeName = path.basename(utf8Name).replace(/[^\w\s.\-\p{L}]/gu, '_');
                    const destPath = path.join(spaceDir, safeName);
                    await fs.writeFile(destPath, req.file.buffer);
                    uploadedFilePath = destPath;

                    // @ts-ignore
                    newSourceData.fileUrl = `/uploads/space-${safeSpaceId}/${safeName}`;
                    // @ts-ignore
                    newSourceData.fileName = utf8Name;
                }
                else {
                    return res.status(400).json({ message: 'File or fileUrl is required.' });
                }

            } else if (type === 'qa') {
                if (!question || !answer) return res.status(400).json({ message: 'Question and Answer are required.' });
                // @ts-ignore
                newSourceData.question = question;
                // @ts-ignore
                newSourceData.answer = answer;
                // @ts-ignore
                newSourceData.thought = thought;
            } else {
                return res.status(400).json({ message: 'Invalid training data type.' });
            }

            // Create DB Entry
            const createdSource = await trainingDataModel.create(newSourceData);

            // Respond to client IMMEDIATELY
            res.status(201).json(createdSource);

            // -- Background: auto-index Q&A into Weaviate right away --
            // Fire-and-forget: errors are logged but don't affect the response.
            if (type === 'qa') {
                (async () => {
                    try {
                        const aiConf = await aiConfigModel.findById(aiId);
                        if (!aiConf) return;

                        const apiKey = await getApiKeyForAi(aiConf, aiConf.modelType).catch(() => null);
                        if (!apiKey) {
                            logger.warn(`[AUTO-INDEX] Skipping: owner API key missing for modelType ${aiConf.modelType}`);
                            return;
                        }

                        await weaviateService.ensureSchemaForModelType(aiConf.modelType, apiKey);
                        await weaviateService.indexData(aiConf.modelType, [createdSource], apiKey, aiId);
                        logger.info(`[AUTO-INDEX] Q&A source ${createdSource.id} indexed for AI ${aiId} (${aiConf.modelType})`);
                    } catch (indexErr: unknown) {
                        // @ts-ignore
                        logger.error(`[AUTO-INDEX] Failed to auto-index Q&A source ${createdSource.id}:`, indexErr.message);
                    }
                })();
            }

        } catch (error: unknown) {
            logger.error("Error in createTrainingDataSourceForAI:", error);
            if (uploadedFilePath) {
                try { await fs.unlink(uploadedFilePath); } catch (e: unknown) { }
            }
            if (!res.headersSent) {
                // @ts-ignore
                res.status(500).json({ message: 'Failed to create training data source: ' + error.message });
            }
        }
    },

    async generateSummaryForDataSource(req: Request, res: Response) {
        // @ts-ignore
        const sourceId = parseInt(String(req.params.id), 10);
        try {
            // Find specific source without getting all data
            const queryRes = await pool.query('SELECT * FROM training_data_sources WHERE id = $1', [sourceId]);
            // @ts-ignore
            const source = queryRes.rows[0] ? mapRowToCamelCase(queryRes.rows[0]) : null;

            if (!source || source.type !== 'file') {
                return res.status(404).json({ message: 'File training data source not found.' });
            }
            if (source.summary) return res.json(source);

            const aiConfig = await aiConfigModel.findById(source.aiConfigId);
            if (!aiConfig) return res.status(404).json({ message: 'Associated AI config not found.' });

            const apiKey = await getApiKeyForAi(aiConfig, aiConfig.modelType).catch(() => null);
            if (!apiKey) return res.status(400).json({ message: `Owner's API key not set.` });

            const text = await fileParserService.extractText(source.fileUrl, source.fileName);
            if (!text?.trim()) return res.status(400).json({ message: 'File is empty or text could not be extracted.' });

            const service = aiConfig.modelType === 'gemini' ? geminiService : gptService;
            const summary = await service.summarizeText(text, apiKey);
            if (!summary) throw new Error('Failed to generate summary from AI provider.');

            const updatedSource = await trainingDataModel.updateSummary(source.id, summary);
            res.json(updatedSource);
        } catch (error: unknown) {
            logger.error("Summary generation error:", error);
            res.status(500).json({ message: (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) : String(error)) || 'Failed to generate summary.' });
        }
    },

    async deleteTrainingDataSource(req: Request, res: Response) {
        try {
            // @ts-ignore
            const sourceId = parseInt(String(req.params.id), 10);
            // Get source info before deleting to know which providers indexed it
            const sourceToDelete = await trainingDataModel.delete(sourceId);

            if (!sourceToDelete) return res.status(404).json({ message: 'Training data source not found.' });

            // Clean up Weaviate for ALL providers that have indexed this file
            const aiConfig = await aiConfigModel.findById(sourceToDelete.aiConfigId);
            if (aiConfig) {
                const owner = aiConfig.ownerId ? await userModel.findById(aiConfig.ownerId) : null;

                // Iterate through all providers (gpt, gemini, etc.) that have this file indexed
                if (sourceToDelete.indexedProviders && Array.isArray(sourceToDelete.indexedProviders)) {
                    for (const provider of sourceToDelete.indexedProviders) {
                        const providerKey = await getApiKeyForAi(aiConfig, provider).catch(() => null);
                        if (providerKey) {
                            await weaviateService.deleteDataBySourceId(provider, sourceToDelete.id, sourceToDelete.type, providerKey)
                                .catch(err => logger.error(`Weaviate cleanup failed for provider ${provider}:`, err.message));
                        }
                    }
                }
            }

            // Clean up physical file
            if (sourceToDelete.type === 'file' && sourceToDelete.fileUrl) {
                // Construct absolute path using project root
                // fileUrl is like "/uploads/..."
                const absolutePath = path.join(projectRoot, sourceToDelete.fileUrl);
                try {
                    await fs.unlink(absolutePath);
                } catch (e: unknown) {
                    // @ts-ignore
                    logger.warn(`Failed to delete file from disk: ${absolutePath}`, e.message);
                }
            }

            res.status(204).send();
        } catch (error: unknown) {
            logger.error('Delete error:', error);
            res.status(500).json({ message: 'Failed to delete training data source.' });
        }
    },

    async deleteTrainingQaDataSource(req: Request, res: Response) {
        const { aiConfigId, question, answer } = req.body;
        try {
            const deletedSource = await trainingDataModel.deleteByContent(aiConfigId, question, answer);
            if (deletedSource) {
                const aiConfig = await aiConfigModel.findById(deletedSource.aiConfigId);
                if (aiConfig) {
                    const owner = aiConfig.ownerId ? await userModel.findById(aiConfig.ownerId) : null;

                    // Same logic: iterate through all indexed providers
                    if (deletedSource.indexedProviders && Array.isArray(deletedSource.indexedProviders)) {
                        for (const provider of deletedSource.indexedProviders) {
                            const providerKey = await getApiKeyForAi(aiConfig, provider).catch(() => null);
                            if (providerKey) {
                                await weaviateService.deleteDataBySourceId(provider, deletedSource.id, 'qa', providerKey)
                                    .catch(err => logger.error(`Weaviate cleanup failed for provider ${provider}:`, err.message));
                            }
                        }
                    }
                }
            }
            res.status(200).json({ message: 'Training data source deleted.' });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to delete training data.' });
        }
    },

    async getAllQaTrainingData(req: Request, res: Response) {
        try {
            // Pass the current user's ID to filter by owner
            const userId = req.user?.id;
            res.json(await trainingDataModel.findAllQaData(userId));
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch QA training data.' });
        }
    },

    async exportQaDataForFinetune(req: Request, res: Response) {
        try {
            const { sourcesToExport } = req.body;
            if (!Array.isArray(sourcesToExport) || sourcesToExport.length === 0) {
                return res.status(400).json({ message: 'No sources provided for export.' });
            }

            const jsonlLines = sourcesToExport.map(source => {
                let assistantContent = source.answer;
                if (source.thought) {
                    assistantContent = `<thought>${source.thought}</thought>\n${source.answer}`;
                }
                return JSON.stringify({
                    messages: [
                        { role: 'user', content: source.question },
                        { role: 'assistant', content: assistantContent }
                    ]
                });
            });

            // @ts-ignore
            await trainingDataModel.markAsExported(sourcesToExport.map((s: Record<string, unknown>) => s.id));

            const fileName = `finetune_data_${new Date().toISOString().split('T')[0]}.jsonl`;
            res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-type', 'application/jsonl');
            res.send(jsonlLines.join('\n'));
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to export QA training data.' });
        }
    }
};

