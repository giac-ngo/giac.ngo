
// server/controllers/documentController.js
import { Request, Response, NextFunction } from 'express';
import { documentModel } from '../models/document.model.js';
import { ocrService } from '../services/ocrService.js';
import { geminiService } from '../services/geminiService.js';
import { gptService } from '../services/gptService.js';
import { userModel } from '../models/user.model.js';
import { systemModel } from '../models/system.model.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { pool } from '../db.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';
import { canAccessSpace, hasSpacePermission, isAdmin } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const _deleteCategory = async (req: Request, res: Response, tableName: string, id: any) => {
    try {
        const itemRes = await pool.query(`SELECT space_id FROM ${tableName} WHERE id = $1`, [id]);
        if (itemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found.' });
        }
        const spaceId = itemRes.rows[0].space_id;
        if (!isAdmin(req.user)) {
            if (!spaceId) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền xóa danh mục dùng chung toàn hệ thống.' });
            }
            const hasAccess = await hasSpacePermission(req.user, spaceId, 'files');
            if (!hasAccess) {
                return res.status(403).json({ message: 'Bạn không có quyền xóa mục này trong Không gian.' });
            }
        }
        await documentModel._deleteCategory(tableName, id);
        res.status(204).send();
    } catch (e: unknown) {
        res.status(400).json({ message: (e instanceof Error ? e.message : String(e)) });
    }
};

const _createCategory = async (req: Request, res: Response, tableName: string, additionalData: any = {}) => {
    try {
        const { name, nameEn, spaceId } = req.body;
        // Global item (no spaceId): ONLY Global Admin can create
        if (!spaceId) {
            if (!isAdmin(req.user)) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền tạo danh mục dùng chung toàn hệ thống.' });
            }
        } else {
            // Space-specific item: requires 'files' permission on this specific Space
            const hasAccess = await hasSpacePermission(req.user, spaceId, 'files');
            if (!hasAccess) {
                return res.status(403).json({ message: 'Bạn không có quyền quản lý tài liệu trong Không gian này.' });
            }
        }
        const payload = { name, nameEn, spaceId: spaceId || null, ...additionalData };
        const item = await documentModel._createCategory(tableName, payload);
        res.status(201).json(item);
    } catch (e: unknown) {
        res.status(500).json({ message: (e instanceof Error ? e.message : String(e)) });
    }
};

const _updateCategory = async (req: Request, res: Response, tableName: string) => {
    try {
        const { name, nameEn, spaceId, typeId, authorId } = req.body;
        const id = req.params.id;

        const itemRes = await pool.query(`SELECT space_id FROM ${tableName} WHERE id = $1`, [id]);
        if (itemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found.' });
        }
        const currentSpaceId = itemRes.rows[0].space_id;

        if (!isAdmin(req.user)) {
            if (!currentSpaceId) {
                return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền sửa danh mục dùng chung toàn hệ thống.' });
            }
            const hasAccess = await hasSpacePermission(req.user, currentSpaceId, 'files');
            if (!hasAccess) {
                return res.status(403).json({ message: 'Bạn không có quyền sửa đổi mục này trong Không gian.' });
            }
            if (spaceId !== undefined) {
                if (!spaceId) {
                    return res.status(403).json({ message: 'Chỉ Global Admin mới có quyền chuyển danh mục thành dùng chung toàn hệ thống.' });
                }
                if (String(spaceId) !== String(currentSpaceId)) {
                    const hasTargetAccess = await hasSpacePermission(req.user, spaceId, 'files');
                    if (!hasTargetAccess) {
                        return res.status(403).json({ message: 'Bạn không có quyền chuyển mục sang Không gian đích.' });
                    }
                }
            }
        }

        const dataToUpdate = {};
        if (name !== undefined) (dataToUpdate as any).name = name;
        if (nameEn !== undefined) (dataToUpdate as any).nameEn = nameEn;
        if (spaceId !== undefined) (dataToUpdate as any).spaceId = spaceId || null;

        if (tableName === 'document_topics') {
            if (typeId !== undefined) (dataToUpdate as any).typeId = typeId || null;
            if (authorId !== undefined) (dataToUpdate as any).authorId = authorId || null;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'No fields to update provided.' });
        }

        const updatedItem = await documentModel._updateCategory(tableName, String(id), dataToUpdate);
        res.json(updatedItem);
    } catch (error: unknown) {
        res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
    }
};


export const documentController = {
    extractUpload: multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    }),

    // Document AI Features
    async extractTextFromFile(req: Request, res: Response) {
        const { provider, model } = req.body;
        const file = req.file;
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        if (!provider || !model || !file) {
            return res.status(400).json({ message: 'Missing required fields: provider, model, and file.' });
        }
        try {
            // Bind to authenticated user's id, never trust userId from request body
            const dummyAiConfig: any = { modelType: provider, ownerId: currentUser.id };
            const apiKey = await getApiKeyForAi(dummyAiConfig, provider).catch(() => null);
            
            if (!apiKey) {
                return res.status(400).json({ message: `API Key for ${provider} not configured.` });
            }
            
            const htmlContent = await ocrService.extractAndFormat(file, provider, model, apiKey);
            res.json({ htmlContent });
        } catch (error: unknown) {
            const rawMsg = error instanceof Error ? error.message : String(error);
            logger.error('extractTextFromFile failed:', rawMsg);
            const safeMsg = rawMsg.includes('ENOENT') || rawMsg.includes('/tmp') || rawMsg.includes('\\tmp')
                ? 'Không đọc được tệp, vui lòng thử lại.'
                : (rawMsg || 'Không đọc được tệp, vui lòng thử lại.');
            res.status(500).json({ message: safeMsg });
        }
    },

    async getDocumentConfig(req: Request, res: Response) {
        try {
            const config = await documentModel.getConfig();
            res.json(config);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to get document config.' });
        }
    },

    async updateDocumentConfig(req: Request, res: Response) {
        try {
            const config = await documentModel.updateConfig(req.body);
            res.json(config);
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to update document config.' });
        }
    },

    // Document CRUD
    async getDocuments(req: Request, res: Response) {
        try {
            const { title, authorId, typeId, topicId, tagId, spaceId, page = '1', limit = '10' } = req.query;
            const pageNum = parseInt(String(page), 10);
            const limitNum = parseInt(String(limit), 10);

            // Import helper functions
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');

            // Determine which spaces the user can access
            let spaceIds = null;
            if (!req.user || !isAdmin(req.user as any)) {
                // Regular user: only see documents from their managed spaces
                const managedIds = await getUserManagedSpaceIds(req.user?.id || 0);
                if (managedIds.length === 0) {
                    return res.json({ data: [], total: 0 });
                }

                if (spaceId) {
                    const requestedId = parseInt(String(spaceId), 10);
                    if (managedIds.includes(requestedId)) {
                        spaceIds = [requestedId];
                    } else {
                        return res.status(403).json({ message: "Forbidden: You do not own this space." });
                    }
                } else {
                    spaceIds = managedIds;
                }
            } else if (spaceId) {
                // Admin with space filter: filter by specific space
                spaceIds = [parseInt(String(spaceId), 10)];
            }
            // Admin without filter: spaceIds remains null (see all)

            const filters = {
                title: title ? String(title) : undefined,
                authorId: authorId ? parseInt(String(authorId), 10) : undefined,
                typeId: typeId ? parseInt(String(typeId), 10) : undefined,
                topicId: topicId ? parseInt(String(topicId), 10) : undefined,
                tagId: tagId ? parseInt(String(tagId), 10) : undefined,
                spaceIds: spaceIds || undefined, // Pass array of space IDs or undefined
                limit: limitNum,
                offset: (pageNum - 1) * limitNum,
            };
            const result = await documentModel.find(filters);
            res.json({
                data: result.data,
                total: result.total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(result.total / limitNum)
            });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to fetch documents.' });
        }
    },

    async createDocument(req: Request, res: Response) {
        try {
            const { spaceId } = req.body;
            if (!req.user?.isGlobalAdmin && spaceId) {
                const hasAccess = await canAccessSpace(req.user, spaceId);
                if (!hasAccess) {
                    return res.status(403).json({ message: 'You can only create documents for spaces you own or manage.' });
                }
            }

            const { tags, ...docData } = req.body;
            const newDoc = await documentModel.create(docData, tags || []);
            res.status(201).json(newDoc);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to create document: ${(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))}` });
        }
    },

    async updateDocument(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);

            if (!req.user?.isGlobalAdmin) {
                const docRes = await pool.query('SELECT space_id FROM documents WHERE id = $1', [id]);
                if (docRes.rows.length > 0 && docRes.rows[0].space_id) {
                    const hasAccess = await canAccessSpace(req.user, docRes.rows[0].space_id);
                    if (!hasAccess) {
                        return res.status(403).json({ message: 'You can only edit documents from spaces you own or manage.' });
                    }
                }
            }

            const { tags, ...docData } = req.body;

            if (docData.spaceId) {
                docData.spaceId = docData.spaceId === 'null' ? null : parseInt(docData.spaceId, 10);
            }

            const updatedDoc = await documentModel.update(id, docData, tags);
            res.json(updatedDoc);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to update document: ${(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))}` });
        }
    },

    async deleteDocument(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            if (!req.user?.isGlobalAdmin) {
                const docRes = await pool.query('SELECT space_id FROM documents WHERE id = $1', [id]);
                if (docRes.rows.length > 0 && docRes.rows[0].space_id) {
                    const hasAccess = await canAccessSpace(req.user, docRes.rows[0].space_id);
                    if (!hasAccess) {
                        return res.status(403).json({ message: 'You can only delete documents from spaces you own or manage.' });
                    }
                }
            }

            const doc = await documentModel.findById(id);
            if (doc) {
                const unlinkQuietly = async (filePath: string) => {
                    if (filePath) try { await fs.unlink(path.join(projectRoot, filePath)); } catch (e: unknown) { console.error(`Failed to delete file: ${(e instanceof Error ? (e instanceof Error ? e.message : String(e)) : String(e))}`); }
                };
                await unlinkQuietly(doc.thumbnailUrl);
                await unlinkQuietly(doc.audioUrl);
                await unlinkQuietly(doc.audioUrlEn);
            }
            await documentModel.delete(id);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to delete document.' });
        }
    },

    async likeDocument(req: Request, res: Response) {
        try {
            res.json(await documentModel.incrementLikes(parseInt(String(req.params.id), 10)));
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to like document.' });
        }
    },

    // Linking
    async linkDocumentsToAi(req: Request, res: Response) {
        const aiConfigId = parseInt(String(req.params.id), 10);
        const { documentIds } = req.body;
        if (isNaN(aiConfigId) || !Array.isArray(documentIds)) {
            return res.status(400).json({ message: 'Valid aiConfigId and documentIds array are required.' });
        }
        try {
            await documentModel.linkToAi(aiConfigId, documentIds);
            res.status(201).json({ success: true });
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to link documents.' });
        }
    },

    async unlinkDocumentFromAi(req: Request, res: Response) {
        const aiConfigId = parseInt(String(req.params.id), 10);
        const documentId = parseInt(String(req.params.docId), 10);
        if (isNaN(aiConfigId) || isNaN(documentId)) {
            return res.status(400).json({ message: 'Valid aiConfigId and documentId are required.' });
        }
        try {
            await documentModel.unlinkFromAi(aiConfigId, documentId);
            res.status(204).send();
        } catch (error: unknown) {
            res.status(500).json({ message: 'Failed to unlink document.' });
        }
    },

    // Tags & Categories
    async getAllTags(req: Request, res: Response) { res.json(await documentModel.findAllTags()); },

    async getDocumentAuthors(req: Request, res: Response) {
        try {
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');
            let spaceFilter = req.query.spaceId;

            if (req.user && !isAdmin(req.user as any)) {
                const managedIds = await getUserManagedSpaceIds(req.user.id);
                if (managedIds.length === 0) return res.json([]);

                if (spaceFilter) {
                    if (!managedIds.includes(parseInt(String(spaceFilter), 10))) {
                        return res.status(403).json({ message: "Forbidden: You do not own this space." });
                    }
                } else {
                    spaceFilter = managedIds as any;
                }
            }
            res.json(await documentModel._findCategory('document_authors', spaceFilter as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) });
        }
    },
    async createDocumentAuthor(req: Request, res: Response) { await _createCategory(req, res, 'document_authors'); },
    async updateDocumentAuthor(req: Request, res: Response) { await _updateCategory(req, res, 'document_authors'); },
    async deleteDocumentAuthor(req: Request, res: Response) { await _deleteCategory(req, res, 'document_authors', req.params.id); },

    async getDocumentTypes(req: Request, res: Response) {
        try {
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');
            let spaceFilter = req.query.spaceId;

            if (req.user && !isAdmin(req.user as any)) {
                const managedIds = await getUserManagedSpaceIds(req.user.id);
                if (managedIds.length === 0) return res.json([]);

                if (spaceFilter) {
                    if (!managedIds.includes(parseInt(String(spaceFilter), 10))) {
                        return res.status(403).json({ message: "Forbidden: You do not own this space." });
                    }
                } else {
                    spaceFilter = managedIds as any;
                }
            }
            res.json(await documentModel._findCategory('document_types', spaceFilter as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) });
        }
    },
    async createDocumentType(req: Request, res: Response) { await _createCategory(req, res, 'document_types'); },
    async updateDocumentType(req: Request, res: Response) { await _updateCategory(req, res, 'document_types'); },
    async deleteDocumentType(req: Request, res: Response) { await _deleteCategory(req, res, 'document_types', req.params.id); },

    async getDocumentTopics(req: Request, res: Response) {
        try {
            const { getUserManagedSpaceIds, isAdmin } = await import('../middleware/authMiddleware.js');
            let spaceFilter = req.query.spaceId;

            if (req.user && !isAdmin(req.user as any)) {
                const managedIds = await getUserManagedSpaceIds(req.user.id);
                if (managedIds.length === 0) return res.json([]);

                if (spaceFilter) {
                    if (!managedIds.includes(parseInt(String(spaceFilter), 10))) {
                        return res.status(403).json({ message: "Forbidden: You do not own this space." });
                    }
                } else {
                    spaceFilter = managedIds as any;
                }
            }
            res.json(await documentModel._findCategory('document_topics', spaceFilter as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) });
        }
    },
    async createDocumentTopic(req: Request, res: Response) {
        const { typeId, authorId } = req.body;
        if (typeId === undefined || authorId === undefined) {
            return res.status(400).json({ message: 'typeId and authorId are required for topics.' });
        }
        await _createCategory(req, res, 'document_topics', { typeId, authorId });
    },
    async updateDocumentTopic(req: Request, res: Response) { await _updateCategory(req, res, 'document_topics'); },
    async deleteDocumentTopic(req: Request, res: Response) { await _deleteCategory(req, res, 'document_topics', req.params.id); },
};
