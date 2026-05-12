import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
// server/controllers/libraryController.ts
import { libraryModel } from '../models/library.model.js';
import { documentModel } from '../models/document.model.js';
import { commentModel } from '../models/comment.model.js';
import { pool } from '../db.js';


export const libraryController = {
    async getSidebarData(req: Request, res: Response) {
        try {
            const data = await libraryModel.getSidebarData();
            res.json(data);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch library sidebar data.' });
        }
    },

    async getLibraryFilters(req: Request, res: Response) {
        try {
            const { spaceId, spaceSlug, typeId, authorId, topicsPage, topicsLimit } = req.query;

            let finalSpaceId: number | 'global' | null;

            // If spaceSlug is provided, resolve it to spaceId
            if (spaceSlug) {
                const spaceResult = await pool.query('SELECT id FROM spaces WHERE slug = $1', [spaceSlug as string]);
                if (spaceResult.rows.length > 0) {
                    finalSpaceId = spaceResult.rows[0].id;
                } else {
                    finalSpaceId = null;
                }
            } else if (spaceId === 'global') {
                finalSpaceId = 'global';
            } else if (spaceId) {
                const parsedId = parseInt(spaceId as string, 10);
                finalSpaceId = isNaN(parsedId) ? null : parsedId;
            } else {
                finalSpaceId = null;
            }

            const modelFilters = {
                typeId: typeId ? parseInt(typeId as string, 10) : undefined,
                authorId: authorId ? parseInt(authorId as string, 10) : undefined,
                topicsPage: topicsPage ? parseInt(topicsPage as string, 10) : 1,
                topicsLimit: topicsLimit ? parseInt(topicsLimit as string, 10) : 15,
            };

            const filters = await libraryModel.getFilters(finalSpaceId, {
                ...modelFilters
            });
            res.json(filters);

        } catch (error: unknown) {
            logger.error("Error fetching library filters:", error);
            res.status(500).json({ message: 'Failed to fetch library filters.' });
        }
    },

    async getLibraryDocuments(req: Request, res: Response) {
        try {
            const { search, typeId, authorId, topicId, page = 1, limit = 6, spaceId, spaceSlug } = req.query;

            let finalSpaceId: number | undefined | null;

            // If spaceSlug is provided, resolve it to spaceId
            if (spaceSlug) {
                const spaceResult = await pool.query('SELECT id FROM spaces WHERE slug = $1', [spaceSlug as string]);
                if (spaceResult.rows.length > 0) {
                    finalSpaceId = spaceResult.rows[0].id;
                } else {
                    finalSpaceId = null;
                }
            } else if (spaceId === 'null' || spaceId === 'undefined' || spaceId === undefined) {
                finalSpaceId = null;
            } else {
                const parsedId = parseInt(spaceId as string, 10);
                finalSpaceId = isNaN(parsedId) ? undefined : parsedId;
            }

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);

            const result = await documentModel.find({
                title: search as string || undefined,
                typeId: typeId ? parseInt(typeId as string, 10) : undefined,
                authorId: authorId ? parseInt(authorId as string, 10) : undefined,
                topicId: topicId ? parseInt(topicId as string, 10) : undefined,
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
                spaceId: finalSpaceId,
                excludeCmsSpaceId: req.query.excludeCmsSpaceId as string | undefined
            });
            logger.info(`Library API requested: query=${JSON.stringify(req.query)}, finalSpaceId=${finalSpaceId}, totalFound=${result.total}`); 
            res.json(result); // Returns { data, total }
        } catch (error: unknown) {
            logger.error("Error fetching library documents:", error);
            res.status(500).json({ message: 'Failed to fetch library documents.' });
        }
    },

    async getDocumentDetail(req: Request, res: Response) {
        const documentId = parseInt(String(req.params.id), 10);
        if (isNaN(documentId)) {
            return res.status(400).json({ message: 'Invalid document ID.' });
        }
        try {
            const doc = await libraryModel.getDocumentWithNeighbors(documentId);
            if (!doc) {
                return res.status(404).json({ message: 'Document not found.' });
            }
            const comments = await commentModel.findApproved('document', String(documentId));
            res.json({ ...doc, comments });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch document details.' });
        }
    },

    async getRecommendedDocuments(req: Request, res: Response) {
        try {
            // Get top 3 viewed "K?" and "C�u Chuy?n"
            const { data: topKe } = await documentModel.find({ isLibrary: true, typeName: 'K?', limit: 3, sortBy: 'views', sortOrder: 'DESC' });
            const { data: topTruyen } = await documentModel.find({ isLibrary: true, typeName: 'C�u Chuy?n', limit: 3, sortBy: 'views', sortOrder: 'DESC' });
            res.json({ topKe, topTruyen });
        } catch (error: unknown) {
            logger.error("Error fetching recommended documents:", error);
            res.status(500).json({ message: 'Failed to fetch recommended documents.' });
        }
    },

    async getLibraryTopics(req: Request, res: Response) {
        try {
            const { spaceId, page, limit } = req.query;

            let finalSpaceId: number | 'global' | null;
            if (spaceId === 'global') {
                finalSpaceId = 'global';
            } else if (spaceId) {
                const parsedId = parseInt(spaceId as string, 10);
                finalSpaceId = isNaN(parsedId) ? null : parsedId;
            } else {
                finalSpaceId = null;
            }

            const pageNum = page ? parseInt(page as string, 10) : 1;
            const limitNum = limit ? parseInt(limit as string, 10) : 15;

            const topics = await libraryModel.getTopics(finalSpaceId, pageNum, limitNum);
            res.json(topics);
        } catch (error: unknown) {
            logger.error("Error fetching library topics:", error);
            res.status(500).json({ message: 'Failed to fetch library topics.' });
        }
    },
};



