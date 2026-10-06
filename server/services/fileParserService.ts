// server/services/fileParserService.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - pdf-parse might not have types installed
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { trainingDataModel } from '../models/trainingData.model.js';
import { AIConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Fix path: Go up two levels from services to reach project root.
const projectRoot = path.resolve(__dirname, '..', '..');

// 60-second cache so repeated messages to the same AI don't re-query DB + re-read files.
const trainingTextCache = new Map<number, { text: string, ts: number }>(); // aiConfigId -> { text, ts }
const TRAINING_TEXT_TTL_MS = 60_000;

export const invalidateTrainingTextCache = (aiConfigId: number) => {
    trainingTextCache.delete(aiConfigId);
};

const uploadsDir = path.resolve(projectRoot, 'uploads');

export class FileAccessDeniedError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 403) {
        super(message);
        this.name = 'FileAccessDeniedError';
        this.statusCode = statusCode;
    }
}

export const fileParserService = {
    async extractText(fileUrl: string, originalFileName: string, userContext?: { userId?: number | null; isAdmin?: boolean }): Promise<string> {
        if (!fileUrl || typeof fileUrl !== 'string') {
            throw new Error('Invalid file URL.');
        }

        // Prevent null byte injections or obvious path traversal
        if (fileUrl.includes('\0') || fileUrl.includes('..')) {
            logger.warn(`[FileParser] Path traversal attempt detected: ${fileUrl}`);
            throw new FileAccessDeniedError('Access denied: Invalid file path.', 403);
        }

        // Strip any protocol and domain if present
        let relativePath = fileUrl.replace(/^https?:\/\/[^\/]+/i, '');
        relativePath = relativePath.replace(/^[\/\\]+/, '');
        if (relativePath.toLowerCase().startsWith('uploads/') || relativePath.toLowerCase().startsWith('uploads\\')) {
            relativePath = relativePath.slice(8);
        }

        // Resolve strictly within uploads directory
        const filePath = path.resolve(uploadsDir, relativePath);
        if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
            logger.warn(`[FileParser] Path traversal attempt blocked: ${fileUrl} -> ${filePath}`);
            throw new FileAccessDeniedError('Access denied: File must reside within the uploads directory.', 403);
        }

        // Enforce user ownership verification when userContext is passed
        if (userContext !== undefined) {
            if (!userContext.userId) {
                logger.warn(`[FileParser] Unauthenticated attempt to parse file: ${fileUrl}`);
                throw new FileAccessDeniedError('Access denied: Authentication required to parse files.', 401);
            }
            if (!userContext.isAdmin) {
                const relativeToUploads = path.relative(uploadsDir, filePath);
                const segments = relativeToUploads.split(/[\\/]/);
                const isUserOwned = segments.includes(`user-${userContext.userId}`);
                if (!isUserOwned) {
                    logger.warn(`[FileParser] User ${userContext.userId} attempted unauthorized access to file: ${filePath}`);
                    throw new FileAccessDeniedError('Access denied: You do not have permission to access this file.', 403);
                }
            }
        }

        // Strictly read file from its exact resolved path.
        // NEVER search other folders across users or spaces.
        const dataBuffer = await fs.readFile(filePath);
        return this.extractTextFromBuffer(dataBuffer, originalFileName || fileUrl);
    },

    /** Parse an in-memory file (internal callers only, e.g. OCR uploads). Never takes a client path. */
    async extractTextFromBuffer(dataBuffer: Buffer, originalFileName: string): Promise<string> {
        const extension = path.extname(originalFileName || '').toLowerCase();
        const filePath = originalFileName;

        try {

            if (extension === '.pdf') {
                const data = await pdf(dataBuffer);
                return data.text;
            } else if (extension === '.docx') {
                const { value } = await mammoth.extractRawText({ buffer: dataBuffer });
                return value;
            } else if (extension === '.txt') {
                return dataBuffer.toString('utf-8');
            } else if (['.xlsx', '.xls', '.csv'].includes(extension)) {
                const workbook = xlsx.read(dataBuffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Read as objects to find headers
                const jsonData = xlsx.utils.sheet_to_json(sheet) as any[];
                if (jsonData.length === 0) return '';

                // Detect Q&A columns (Case insensitive, supports VI/EN)
                const firstRowKeys = Object.keys(jsonData[0]);

                const questionKey = firstRowKeys.find(k =>
                    ['question', 'câu hỏi', 'hỏi', 'q', 'input', 'prompt', 'problem', 'vấn đề'].includes(k.toLowerCase().trim())
                );
                const answerKey = firstRowKeys.find(k =>
                    ['answer', 'trả lời', 'đáp', 'a', 'output', 'response', 'completion', 'giải pháp'].includes(k.toLowerCase().trim())
                );

                if (questionKey && answerKey) {
                    // Smart Q&A Formatting for LLM
                    return jsonData.map((row: any) => {
                        const q = row[questionKey] || '';
                        const a = row[answerKey] || '';
                        // Adding "---" separator helps chunking later
                        return `Question: ${q}\nAnswer: ${a}`;
                    }).join('\n\n---\n\n');
                } else {
                    // Fallback: Generic table formatting
                    // Use header:1 to get array of arrays
                    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
                    return rows.map((row: any[]) => {
                        return row.filter(cell => cell !== null && cell !== undefined).join(' | ');
                    }).join('\n');
                }

            } else if (extension === '.jsonl') {
                // Return file content as is
                return dataBuffer.toString('utf-8');
            }
        } catch (error: unknown) {
            logger.error(`Error parsing file ${originalFileName} at ${filePath}:`, error);
            // Throw to let caller (indexData) decide how to handle: mark as 'failed' not 'skipped'
            throw error;
        }
        return '';
    },

    async prepareAdditionalTrainingText(aiConfig: AIConfig): Promise<string> {
        // Completely disabled: All training data types (files, documents, qa)
        // are now exclusively handled dynamically via Weaviate (RAG).
        // Statically injecting them into the system prompt wastes tokens.
        return '';
    }
};

