
// server/services/vertexService.js
import { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { fileParserService } from './fileParserService.js';
import { logger } from '../utils/logger.js';

/**
 * Chuyển đổi lịch sử tin nhắn sang định dạng nội dung của Gemini API.
 */
const toGeminiContent = (messages: any[]) => {
    const firstUserMessageIndex = messages.findIndex(m => m.sender === 'user');
    if (firstUserMessageIndex === -1) return [];

    const contents: any[] = [];
    let currentRole: string | null = null;
    let currentParts: any[] = [];
    
    const flush = () => {
        if (currentRole && currentParts.length > 0) {
            contents.push({ role: currentRole, parts: currentParts });
        }
    };

    for (const msg of messages.slice(firstUserMessageIndex)) {
        const role = msg.sender === 'user' ? 'user' : 'model';
        if (role !== currentRole) {
            flush();
            currentRole = role;
            currentParts = [];
        }
        if (msg.text) currentParts.push({ text: msg.text });
        if (msg.imageUrl && role === 'user') {
            try {
                const [meta, base64Data] = msg.imageUrl.split(',');
                if (meta && base64Data) {
                    const mimeMatch = meta.match(/:(.*?);/);
                    if (mimeMatch && mimeMatch[1]) {
                        currentParts.push({ inlineData: { mimeType: mimeMatch[1], data: base64Data } });
                    }
                }
            } catch (err: unknown) { 
                logger.error("Lỗi khi xử lý dữ liệu ảnh cho Vertex:", err); 
            }
        }
    }
    flush();
    return contents;
};

export const vertexService = {
    async sendMessageStream(aiConfig: Record<string, any>, history: any[], apiKey: string, callbacks: { onChunk: (chunk: string) => void, onEnd: (finalMessage: any) => void, onError: (err: Error) => void }, language: string, retrievedContext = '') {
        try {
            if (!apiKey) throw new Error("Vertex API Key (Cá nhân) bị thiếu. Vui lòng cấu hình trong phần cài đặt.");
            
            const additionalTrainingText = await fileParserService.prepareAdditionalTrainingText(aiConfig as any);

            const languageInstruction = language === 'en'
                ? `[MANDATORY SYSTEM DIRECTIVE - RESPONSE LANGUAGE: ENGLISH]
The user's current interface language is set to ENGLISH.
You MUST write your entire response strictly in ENGLISH.
- Translate all persona details, wisdom, and training content into natural English.
- NEVER output Vietnamese text.
- This directive OVERRIDES all other instructions, system prompts, training data, and previous conversation history regarding response language.`
                : `[QUY TẮC NGÔN NGỮ: TIẾNG VIỆT]
Hãy trả lời hoàn toàn bằng tiếng Việt.`;

            const systemInstruction = [
                languageInstruction,
                retrievedContext,
                aiConfig.trainingContent,
                additionalTrainingText,
                languageInstruction,
                `Sử dụng Markdown để trình bày.`,
            ].filter(Boolean).join('\n\n---\n\n');

            const contents = toGeminiContent(history);
            if (contents.length === 0) return callbacks.onError(new Error("Lịch sử trò chuyện trống."));

            // Lấy modelResourceName từ cấu hình AI (e.g. projects/.../endpoints/...)
            const modelResourceName = aiConfig.modelName;
            if (!modelResourceName) throw new Error("Model Name (Resource Path) chưa được cấu hình cho AI này.");

            // Phân tích location từ resource name để xác định regional endpoint
            const locationMatch = modelResourceName.match(/locations\/([a-z0-9-]+)/);
            const location = locationMatch ? locationMatch[1] : 'us-central1';
            
            const ai = new GoogleGenAI({ 
                apiKey,
                baseUrl: `https://${location}-aiplatform.googleapis.com/v1`
            } as Record<string, any>);

            /**
             * SDK mặc định chèn "/models/" vào sau baseUrl.
             * Dùng "../" để lùi lại 1 cấp URL, giúp gọi đúng endpoint tài nguyên Vertex.
             */
            const finalModelPath = `../${modelResourceName}`;

            const streamingResp = await ai.models.generateContentStream({
                model: finalModelPath,
                contents,
                config: { 
                    systemInstruction,
                    maxOutputTokens: aiConfig.maxOutputTokens || 65535,
                    temperature: 1,
                    topP: 0.95,
                    thinkingConfig: {
                        // Sử dụng giá trị từ aiConfig nếu có, nếu không mặc định -1 (hoặc 32768 tùy phiên bản SDK)
                        thinkingBudget: aiConfig.thinkingBudget !== undefined ? aiConfig.thinkingBudget : 32768
                    },
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                    ],
                    tools: [{ googleSearch: {} }]
                }
            });

            let fullResponseText = '';
            for await (const chunk of streamingResp) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponseText += chunkText;
                    callbacks.onChunk(chunkText);
                }
            }
            
            let thought = null;
            let finalAnswer = fullResponseText.trim();
            const thoughtMatch = fullResponseText.match(/<thought>([\s\S]*?)<\/thought>/);
            if (thoughtMatch) {
                thought = thoughtMatch[1].trim();
                finalAnswer = fullResponseText.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
            }

            callbacks.onEnd({ text: finalAnswer, thought });
        } catch (err: unknown) { 
            logger.error("Vertex Service Stream Error:", err);
            callbacks.onError(err instanceof Error ? err : new Error(String(err))); 
        }
    }
};
