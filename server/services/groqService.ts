// server/services/groqService.ts
// Groq Cloud - OpenAI-compatible API, ultra-fast inference via LPU chips
// Docs: https://console.groq.com/docs/openai
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';
import { fileParserService } from './fileParserService.js';
import { AIConfig } from '../types/index.js';
import { ConversationMessage } from '../models/conversation.model.js';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

interface GptMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GptCallbacks {
    onChunk: (chunk: string) => void;
    onEnd: (result: { text: string; thought: string | null }) => void;
    onError: (err: any) => void;
}

// Convert conversation history to OpenAI-compatible messages
const toGroqMessages = (messages: ConversationMessage[], systemPrompt: string): GptMessage[] => {
    const result: GptMessage[] = [{ role: 'system', content: systemPrompt }];
    for (const msg of messages) {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (msg.text) {
            result.push({ role, content: msg.text });
        }
    }
    return result;
};

export const groqService = {

    // ---------- Stream Chat ----------
    sendMessageStream: async (
        aiConfig: AIConfig,
        history: ConversationMessage[],
        apiKey: string,
        callbacks: GptCallbacks,
        language: string,
        retrievedContext = ''
    ): Promise<void> => {
        try {
            if (!apiKey) {
                callbacks.onError(new Error('Groq API Key chưa được cấu hình.'));
                return;
            }

            const additionalTrainingText = await fileParserService.prepareAdditionalTrainingText(aiConfig);
            const languageName = language === 'vi' ? 'Vietnamese' : 'English';

            const systemPrompt = [
                retrievedContext,
                aiConfig.trainingContent,
                additionalTrainingText,
                `**SYSTEM INSTRUCTION:** You are a helpful AI assistant. Respond in ${languageName}. Use Markdown for formatting.`
            ].filter(Boolean).join('\n\n---\n\n');

            const messages = toGroqMessages(history, systemPrompt);
            const model = aiConfig.modelName || 'llama-3.3-70b-versatile';
            const maxTokens = typeof aiConfig.maxOutputTokens === 'number' ? aiConfig.maxOutputTokens : 8192;

            const body = {
                model,
                messages,
                stream: true,
                max_tokens: maxTokens,
                temperature: 0.7,
            };

            const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let errBody: any = {};
                try { errBody = await response.json(); } catch { }
                const status = response.status;
                if (status === 429) {
                    const retryAfter = response.headers.get('retry-after');
                    const retryMsg = retryAfter ? ` Vui lòng thử lại sau ${retryAfter} giây.` : '';
                    callbacks.onError(new Error(`Groq API đã đạt giới hạn quota (free tier).${retryMsg}`));
                } else if (status === 401 || status === 403) {
                    callbacks.onError(new Error('Groq API Key không hợp lệ. Vui lòng kiểm tra lại cài đặt.'));
                } else {
                    callbacks.onError(new Error(errBody?.error?.message || `Groq API lỗi: ${response.statusText}`));
                }
                return;
            }

            if (!response.body) {
                callbacks.onError(new Error('Không nhận được response body từ Groq.'));
                return;
            }

            let fullResponseText = '';
            let buffer = '';
            const decoder = new TextDecoder();

            for await (const chunk of response.body as any) {
                buffer += decoder.decode(chunk, { stream: true });
                let eolIndex;
                while ((eolIndex = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, eolIndex).trim();
                    buffer = buffer.slice(eolIndex + 1);
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                fullResponseText += content;
                                callbacks.onChunk(content);
                            }
                        } catch (e: unknown) {
                            logger.error('[Groq] Parse chunk error:', e);
                        }
                    }
                }
            }

            callbacks.onEnd({ text: fullResponseText.trim(), thought: null });

        } catch (err: unknown) {
            logger.error('[Groq] Stream error:', err);
            callbacks.onError(err);
        }
    },

    // ---------- Translate (single text) ----------
    translateText: async (text: string, targetLanguage: string, apiKey: string, modelName?: string, contextPrompt?: string): Promise<string> => {
        const messages = [{ text }] as any[];
        const translatedMessages = await groqService.translateMessages(messages, targetLanguage, apiKey, modelName, contextPrompt);
        return translatedMessages[0]?.text || text;
    },

    // ---------- Translate (batch) ----------
    translateMessages: async (
        messages: any[],
        targetLanguage: string,
        apiKey: string,
        modelName?: string,
        contextPrompt?: string
    ): Promise<any[]> => {
        const languageName = targetLanguage === 'en' ? 'English' : 'Vietnamese';
        const texts = messages.map((m: any) => m.text || '');
        if (texts.every((t: string) => !t.trim())) return messages;

        const model = modelName || 'llama-3.3-70b-versatile';
        const systemPrompt = `You are a translation assistant. Always respond with only valid JSON. ${contextPrompt || ''}`;
        const userPrompt = `Translate each string in the "texts" array to ${languageName}.
Return ONLY valid JSON: {"translatedTexts": ["..."]}, same order as input.
Input: ${JSON.stringify({ texts })}`;

        const body = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: false,
            response_format: { type: 'json_object' },
            max_tokens: 4096,
        };

        try {
            const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(`Groq translate failed: ${res.statusText}`);
            const json: any = await res.json();
            const content = json.choices?.[0]?.message?.content;
            if (!content) throw new Error('No content in Groq translation response');
            const parsed = JSON.parse(content);
            const translated = parsed.translatedTexts;
            if (!Array.isArray(translated) || translated.length !== messages.length) {
                throw new Error('Mismatch in translated messages count.');
            }
            return messages.map((m: any, i: number) => ({ ...m, text: translated[i] }));
        } catch (err: unknown) {
            logger.error('[Groq] Translation error:', err);
            throw new Error('Failed to translate with Groq.');
        }
    },
};
