// server/services/ocrService.ts
import { logger } from '../utils/logger.js';
import { fileParserService } from './fileParserService.js';
import { geminiService } from './geminiService.js';
import { gptService } from './gptService.js';

export const ocrService = {
    async extractAndFormat(file: Express.Multer.File, provider: string, model: string, apiKey: string): Promise<string> {
        if (!apiKey) {
            throw new Error(`API Key for ${provider.toUpperCase()} not found in your personal or system settings.`);
        }

        const mimeType = file.mimetype;
        let textContent = '';

        if (mimeType.startsWith('image/')) {
            if (provider !== 'gemini') {
                throw new Error(`OCR for images is currently only supported with Gemini. Please select a Gemini model.`);
            }
            textContent = (await geminiService.extractTextFromImage(file.buffer, mimeType, apiKey, model)) || '';
        } else {
            // For other files (PDF, DOCX, TXT): parse the uploaded buffer directly.
            // (fileParserService.extractText only accepts paths inside uploads/, so no temp files.)
            try {
                textContent = await fileParserService.extractTextFromBuffer(file.buffer, file.originalname);
            } catch (err: any) {
                logger.error(`Error parsing uploaded file ${file.originalname}:`, err);
                throw new Error("Không đọc được tệp, vui lòng thử lại.");
            }
        }

        if (!textContent || !textContent.trim()) {
            return '<i>(No text could be extracted from the document.)</i>';
        }

        // Now, format the extracted text using an AI model.
        if (provider === 'gemini') {
            return await geminiService.formatExtractedText(textContent, apiKey, model);
        } else if (provider === 'gpt') {
            return await gptService.formatExtractedText(textContent, apiKey, model);
        } else if (provider === 'grok') {
            // Grok service is a mock, so just do basic formatting.
            return `<p>${textContent.replace(/\n/g, '<br />')}</p>`;
        }

        throw new Error(`Unsupported provider for text formatting: ${provider}`);
    }
};
