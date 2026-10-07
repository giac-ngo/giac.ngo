
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
import { isSpaceMember, isAdmin } from '../middleware/authMiddleware.js';
import { can } from '../utils/policy.js';
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
        const allowed = await can(req.user, 'files', spaceId ? { spaceId } : 'global');
        if (!allowed) {
            return res.status(403).json({
                message: spaceId
                    ? 'Bạn không có quyền xóa mục này trong Không gian.'
                    : 'Chỉ Global Admin mới có quyền xóa danh mục dùng chung toàn hệ thống.'
            });
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
        const allowed = await can(req.user, 'files', spaceId ? { spaceId } : 'global');
        if (!allowed) {
            return res.status(403).json({
                message: spaceId
                    ? 'Bạn không có quyền quản lý tài liệu trong Không gian này.'
                    : 'Chỉ Global Admin mới có quyền tạo danh mục dùng chung toàn hệ thống.'
            });
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

        const allowed = await can(req.user, 'files', currentSpaceId ? { spaceId: currentSpaceId } : 'global');
        if (!allowed) {
            return res.status(403).json({
                message: currentSpaceId
                    ? 'Bạn không có quyền sửa đổi mục này trong Không gian.'
                    : 'Chỉ Global Admin mới có quyền sửa danh mục dùng chung toàn hệ thống.'
            });
        }

        if (spaceId !== undefined && String(spaceId) !== String(currentSpaceId)) {
            const targetAllowed = await can(req.user, 'files', spaceId ? { spaceId } : 'global');
            if (!targetAllowed) {
                return res.status(403).json({
                    message: spaceId
                        ? 'Bạn không có quyền chuyển mục sang Không gian đích.'
                        : 'Chỉ Global Admin mới có quyền chuyển danh mục thành dùng chung toàn hệ thống.'
                });
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
            const { spaceId, tags, ...docData } = req.body;
            const targetScope = spaceId ? { spaceId } : 'global';
            const allowed = await can(req.user, 'files', targetScope);
            if (!allowed) {
                return res.status(403).json({
                    message: spaceId
                        ? 'Forbidden: You do not have files permission in this Space.'
                        : 'Only Global Admins can create global documents.'
                });
            }

            const newDoc = await documentModel.create({ ...docData, spaceId: spaceId || null }, tags || []);
            res.status(201).json(newDoc);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to create document: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async updateDocument(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            const docRes = await pool.query('SELECT space_id FROM documents WHERE id = $1', [id]);
            if (docRes.rows.length === 0) {
                return res.status(404).json({ message: 'Document not found.' });
            }
            const currentSpaceId = docRes.rows[0].space_id;

            const canEdit = await can(req.user, 'files', currentSpaceId ? { spaceId: currentSpaceId } : 'global');
            if (!canEdit) {
                return res.status(403).json({
                    message: currentSpaceId
                        ? 'Forbidden: You do not have files permission in this Space.'
                        : 'Only Global Admins can edit global documents.'
                });
            }

            if (req.body.spaceId !== undefined) {
                const targetSpaceId = (req.body.spaceId === 'null' || !req.body.spaceId) ? null : parseInt(req.body.spaceId, 10);
                if (targetSpaceId !== currentSpaceId) {
                    const canTarget = await can(req.user, 'files', targetSpaceId ? { spaceId: targetSpaceId } : 'global');
                    if (!canTarget) {
                        return res.status(403).json({
                            message: targetSpaceId
                                ? 'Forbidden: You do not have files permission in the target Space.'
                                : 'Only Global Admins can make documents global.'
                        });
                    }
                }
            }

            const { tags, ...docData } = req.body;

            if (docData.spaceId !== undefined) {
                docData.spaceId = docData.spaceId === 'null' || !docData.spaceId ? null : parseInt(docData.spaceId, 10);
            }

            const updatedDoc = await documentModel.update(id, docData, tags);
            res.json(updatedDoc);
        } catch (error: unknown) {
            res.status(500).json({ message: `Failed to update document: ${(error instanceof Error ? error.message : String(error))}` });
        }
    },

    async deleteDocument(req: Request, res: Response) {
        try {
            const id = parseInt(String(req.params.id), 10);
            const docRes = await pool.query('SELECT space_id FROM documents WHERE id = $1', [id]);
            if (docRes.rows.length === 0) {
                return res.status(404).json({ message: 'Document not found.' });
            }
            const currentSpaceId = docRes.rows[0].space_id;

            const canDel = await can(req.user, 'files', currentSpaceId ? { spaceId: currentSpaceId } : 'global');
            if (!canDel) {
                return res.status(403).json({
                    message: currentSpaceId
                        ? 'Forbidden: You do not have files permission in this Space.'
                        : 'Only Global Admins can delete global documents.'
                });
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
            const rawSpace = req.query.spaceId;
            if (rawSpace && !isAdmin(req.user as any)) {
                const isMember = await isSpaceMember(req.user, String(rawSpace));
                if (!isMember) {
                    return res.status(403).json({ message: "Forbidden: You do not have access to this Space." });
                }
            }
            res.json(await documentModel._findCategory('document_authors', rawSpace as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
        }
    },
    async createDocumentAuthor(req: Request, res: Response) { await _createCategory(req, res, 'document_authors'); },
    async updateDocumentAuthor(req: Request, res: Response) { await _updateCategory(req, res, 'document_authors'); },
    async deleteDocumentAuthor(req: Request, res: Response) { await _deleteCategory(req, res, 'document_authors', req.params.id); },

    async getDocumentTypes(req: Request, res: Response) {
        try {
            const rawSpace = req.query.spaceId;
            if (rawSpace && !isAdmin(req.user as any)) {
                const isMember = await isSpaceMember(req.user, String(rawSpace));
                if (!isMember) {
                    return res.status(403).json({ message: "Forbidden: You do not have access to this Space." });
                }
            }
            res.json(await documentModel._findCategory('document_types', rawSpace as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
        }
    },
    async createDocumentType(req: Request, res: Response) { await _createCategory(req, res, 'document_types'); },
    async updateDocumentType(req: Request, res: Response) { await _updateCategory(req, res, 'document_types'); },
    async deleteDocumentType(req: Request, res: Response) { await _deleteCategory(req, res, 'document_types', req.params.id); },

    async getDocumentTopics(req: Request, res: Response) {
        try {
            const rawSpace = req.query.spaceId;
            if (rawSpace && !isAdmin(req.user as any)) {
                const isMember = await isSpaceMember(req.user, String(rawSpace));
                if (!isMember) {
                    return res.status(403).json({ message: "Forbidden: You do not have access to this Space." });
                }
            }
            res.json(await documentModel._findCategory('document_topics', rawSpace as any));
        } catch (error: unknown) {
            res.status(500).json({ message: (error instanceof Error ? error.message : String(error)) });
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
