// server/services/gptService.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import fetch, { Response as FetchResponse } from 'node-fetch';
import { fileParserService } from './fileParserService.js';
import { AIConfig } from '../types/index.js';
import { ConversationMessage } from '../models/conversation.model.js';

interface GptMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | GptContentPart[];
}

interface GptContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
}

interface GptCallbacks {
    onChunk: (chunk: string) => void;
    onEnd: (result: { text: string; thought: string | null }) => void;
    onError: (err: any) => void;
}

// ==========================
// Convert message history for GPT
// ==========================
const toGptMessages = (messages: ConversationMessage[], systemPrompt: string): GptMessage[] => {
    const gptMessages: GptMessage[] = [{ role: "system", content: systemPrompt }];
    
    messages.forEach(msg => {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (role === 'assistant') {
            if (msg.text) gptMessages.push({ role: 'assistant', content: msg.text });
            return;
        }
        
        const contentParts: GptContentPart[] = [];
        if (msg.text) contentParts.push({ type: 'text', text: msg.text });
        if (msg.imageUrl) {
            contentParts.push({
                type: 'image_url',
                image_url: { url: msg.imageUrl }
            });
        }
        
        if (contentParts.length > 0) {
            if (contentParts.length === 1 && contentParts[0].type === 'text') {
                gptMessages.push({ role: 'user', content: contentParts[0].text as string });
            } else {
                gptMessages.push({ role: 'user', content: contentParts });
            }
        }
    });
    return gptMessages;
};

// ==========================
// Call OpenAI API
// ==========================
const callOpenAI = async (
    messages: GptMessage[], 
    apiKey: string, 
    model: string, 
    stream: boolean, 
    response_format?: { type: 'json_object' | 'text' }, 
    max_tokens?: number
): Promise<FetchResponse> => {
    const body: any = { model, messages, stream };
    if (response_format) body.response_format = response_format;

    // Use provided max_tokens, or default to 4096.
    body.max_tokens = typeof max_tokens === 'number' ? max_tokens : 4096;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let err;
        try { err = await response.json(); } catch { err = {}; }
        logger.error("OpenAI API Error:", err);
        throw new Error(err.error?.message || `OpenAI request failed: ${response.statusText}`);
    }

    return response;
};

// ==========================
// GPT Service
// ==========================
export const gptService = {

    // ---------- TTS Generation ----------
    generateTts: async (text: string, apiKey: string, model: string, voice: string): Promise<string> => {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model, // e.g., 'tts-1'
                input: text,
                voice: voice, // e.g., 'alloy'
            }),
        });
        if (!response.ok) {
            const err: any = await response.json();
            throw new Error(err.error?.message || 'GPT TTS request failed');
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    },

    // STREAM VERSION (main)
    sendMessageStream: async (
        aiConfig: AIConfig, 
        history: ConversationMessage[], 
        apiKey: string, 
        callbacks: GptCallbacks, 
        language: string, 
        retrievedContext = ''
    ): Promise<void> => {
        const additionalTrainingText = await fileParserService.prepareAdditionalTrainingText(aiConfig);
        const languageName = language === 'vi' ? 'Vietnamese' : 'English';

        // Simplified instructions - No more thought blocks
        const systemPrompt = [
            retrievedContext,
            aiConfig.trainingContent,
            additionalTrainingText,
            `**SYSTEM INSTRUCTION:** You are a helpful AI assistant. Respond in ${languageName}. Use Markdown for formatting.`
        ].filter(Boolean).join('\n\n---\n\n');

        const messages = toGptMessages(history, systemPrompt);
        const model = aiConfig.modelName || 'gpt-4o';
        const maxTokens = aiConfig.maxOutputTokens;

        try {
            const response = await callOpenAI(messages, apiKey, model, true, undefined, maxTokens);
            if (!response.body) throw new Error('No response body from OpenAI.');

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
                            const content = parsed.choices[0]?.delta?.content || '';
                            if (content) {
                                fullResponseText += content;
                                callbacks.onChunk(content);
                            }
                        } catch (e: unknown) {
                            logger.error("Parse chunk error:", e);
                        }
                    }
                }
            }

            // No thought parsing needed
            callbacks.onEnd({ text: fullResponseText.replace(/```/g, '').trim(), thought: null });

        } catch (err: unknown) {
            logger.error("Error in GPT Stream service:", err);
            callbacks.onError(err);
        }
    },

    // Summarize
    summarizeText: async (text: string, apiKey: string): Promise<string | null> => {
        if (!apiKey) throw new Error("Missing API Key for GPT summarization.");
        if (!text?.trim()) return null;

        const systemPrompt = `
You are an expert summarizer.
Summarize the provided text clearly and concisely.
Keep it in the same language as the original text.
`;
        const messages: GptMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please summarize the following text:\n\n---\n${text}\n---` }
        ];

        try {
            const response = await callOpenAI(messages, apiKey, 'gpt-4o', false, undefined, 1024);
            const json: any = await response.json();
            const summary = json.choices[0]?.message?.content?.trim();
            return summary || null;
        } catch (err: unknown) {
            logger.error("Summarization error:", err);
            return null;
        }
    },
    
    // Format Extracted Text
    formatExtractedText: async (text: string, apiKey: string, modelName?: string): Promise<string> => {
        const model = modelName || 'gpt-4o';
        const systemPrompt = `You are an expert text formatter. Take the following raw text and format it into clean, readable HTML. 
- Use appropriate tags like <h1>, <h2>, <p>, <ul>, <ol>, <li>, <b>, <i>. 
- Convert markdown-like syntax (e.g., **bold**, *italic*) to their HTML equivalents.
- Ensure the final output is ONLY the HTML content, without any surrounding markdown fences (\`\`\`html) or explanatory text.`;
        
        const messages: GptMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please format this raw text into HTML:\n\n---\n${text}\n---` }
        ];

        try {
            const response = await callOpenAI(messages, apiKey, model, false, undefined, 4096);
            const json: any = await response.json();
            const formattedHtml = json.choices[0]?.message?.content?.trim();
            // Clean up potential markdown code fences just in case
            return formattedHtml?.replace(/```html|```/g, "").trim() || '';
        } catch (err: unknown) {
            logger.error("GPT formatting error:", err);
            // Return a formatted error to be displayed in the editor
            return `<p><strong>Error formatting text:</strong> ${(err instanceof Error ? err.message : String(err))}</p>`;
        }
    },

    // Translate Text (single)
    translateText: async (text: string, targetLanguage: string, apiKey: string, modelName?: string, contextPrompt?: string): Promise<string> => {
        const messages = [{ text }];
        const translatedMessages = await gptService.translateMessages(messages, targetLanguage, apiKey, modelName, contextPrompt);
        return translatedMessages[0].text || '';
    },

    // Translate Messages (batch)
    translateMessages: async (
        messages: ConversationMessage[], 
        targetLanguage: string, 
        apiKey: string, 
        modelName?: string, 
        contextPrompt?: string
    ): Promise<ConversationMessage[]> => {
        const model = modelName || 'gpt-4o';
        const languageName = targetLanguage === 'en' ? 'English' : 'Vietnamese';
        const texts = messages.map((m: ConversationMessage) => m.text || '');
        if (texts.every((t: string) => !t.trim())) return messages;

        const prompt = `
Translate each string in the provided JSON array into ${languageName}.
Return a valid JSON object with a single key "translatedTexts" which is an array of the translated strings, in the exact same order as the input.
Example Input: {"texts": ["hello world", "how are you?"]}
Example Output for Vietnamese: {"translatedTexts": ["xin chào thế giới", "bạn khoẻ không?"]}

Input:
${JSON.stringify({ texts })}
`;
        const systemPrompt = `You are a helpful translation assistant. You always respond with only valid JSON. ${contextPrompt || ''}`;
        const requestMessages: GptMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await callOpenAI(requestMessages, apiKey, model, false, { "type": "json_object" }, 4096);
            const json: any = await response.json();
            const content = json.choices[0]?.message?.content;
            if (!content) throw new Error("No content in translation response");

            const parsed = JSON.parse(content);
            const translated = parsed.translatedTexts;

            if (!Array.isArray(translated) || translated.length !== messages.length) {
                throw new Error("Mismatch in number of translated messages or invalid format.");
            }
            return messages.map((m, i) => ({ ...m, text: translated[i] }));
        } catch (error: unknown) {
            logger.error('GPT Translation Error:', error);
            throw new Error("Failed to translate with GPT.");
        }
    },

    // List models
    listModels: async (apiKey: string): Promise<string[]> => {
        try {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error('Failed to list models');
            const data: any = await res.json();
            return data.data
                .filter((m: any) => m.id.includes('gpt'))
                .map((m: any) => m.id);
        } catch (e: unknown) {
            logger.error("Error listing models:", e);
            throw e;
        }
    }
};
