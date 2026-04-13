
// server/services/fileParserService.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { trainingDataModel } from '../models/trainingData.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Fix path: Go up two levels from services to reach project root.
const projectRoot = path.resolve(__dirname, '..', '..');

// 60-second cache so repeated messages to the same AI don't re-query DB + re-read files.
const trainingTextCache = new Map(); // aiConfigId -> { text, ts }
const TRAINING_TEXT_TTL_MS = 60_000;

export const invalidateTrainingTextCache = (aiConfigId) => {
    trainingTextCache.delete(aiConfigId);
};

export const fileParserService = {
    async extractText(fileUrl, originalFileName) {
        // fileUrl is typically /uploads/filename.pdf
        // Construct absolute path based on project root
        // Remove leading slash if present to avoid path.join issues
        const cleanUrl = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
        const filePath = path.join(projectRoot, cleanUrl);
        const extension = path.extname(originalFileName).toLowerCase();

        try {
            const dataBuffer = await fs.readFile(filePath);

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
                const jsonData = xlsx.utils.sheet_to_json(sheet);
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
                    return jsonData.map(row => {
                        const q = row[questionKey] || '';
                        const a = row[answerKey] || '';
                        // Adding "---" separator helps chunking later
                        return `Question: ${q}\nAnswer: ${a}`;
                    }).join('\n\n---\n\n');
                } else {
                    // Fallback: Generic table formatting
                    // Use header:1 to get array of arrays
                    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                    return rows.map(row => {
                        return row.filter(cell => cell !== null && cell !== undefined).join(' | ');
                    }).join('\n');
                }

            } else if (extension === '.jsonl') {
                // Return file content as is
                return dataBuffer.toString('utf-8');
            }
        } catch (error) {
            console.error(`Error parsing file ${originalFileName} at ${filePath}:`, error);
            // Throw to let caller (indexData) decide how to handle: mark as 'failed' not 'skipped'
            throw error;
        }
        return '';
    },

    async prepareAdditionalTrainingText(aiConfig) {
        // Completely disabled: All training data types (files, documents, qa)
        // are now exclusively handled dynamically via Weaviate (RAG).
        // Statically injecting them into the system prompt wastes tokens.
        return '';
    }
};
