// server/services/ollamaService.ts
// Ollama Local LLM - OpenAI-compatible local API service
// Docs: https://github.com/ollama/ollama/blob/main/docs/openai.md
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';
import { fileParserService } from './fileParserService.js';
import { AIConfig } from '../types/index.js';
import { ConversationMessage } from '../models/conversation.model.js';

const OLLAMA_API_BASE = process.env.OLLAMA_API_BASE || 'http://localhost:11434/v1';

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
// For small models: inject RAG context into the LAST user message (not system prompt)
// because small models pay most attention to recent user messages.
const toOllamaMessages = (
    messages: ConversationMessage[],
    systemPrompt: string,
    contextBlock: string
): GptMessage[] => {
    const result: GptMessage[] = [{ role: 'system', content: systemPrompt }];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        if (!msg.text) continue;

        const isLastUser = role === 'user' && i === messages.length - 1;
        if (isLastUser && contextBlock) {
            // Inject context directly into the user's question
            result.push({
                role: 'user',
                content: `${contextBlock}\n\n---\nCâu hỏi của người dùng: ${msg.text}\n\nHãy trả lời dựa trên thông tin ở trên. Nếu thông tin không liên quan đến câu hỏi, hãy trả lời tự nhiên.`
            });
        } else {
            result.push({ role, content: msg.text });
        }
    }
    return result;
};

export const ollamaService = {

    // ---------- Stream Chat ----------
    sendMessageStream: async (
        aiConfig: AIConfig,
        history: ConversationMessage[],
        apiKey: string, // Unused by Ollama, but kept for interface compatibility
        callbacks: GptCallbacks,
        language: string,
        retrievedContext = ''
    ): Promise<void> => {
        try {
            const additionalTrainingText = await fileParserService.prepareAdditionalTrainingText(aiConfig);
            const languageName = language === 'vi' ? 'Vietnamese' : 'English';

            // System prompt: SHORT — only role/personality (small models follow short system prompts better)
            const systemParts: string[] = [];
            if (aiConfig.trainingContent) {
                systemParts.push(aiConfig.trainingContent);
            }
            systemParts.push(`Respond in ${languageName}. Use Markdown for formatting.`);
            const systemPrompt = systemParts.join('\n\n');

            // Context block: goes INTO the user message (not system prompt)
            const contextParts: string[] = [];
            if (retrievedContext) {
                contextParts.push(retrievedContext);
            }
            if (additionalTrainingText) {
                contextParts.push(additionalTrainingText);
            }
            const contextBlock = contextParts.join('\n\n');

            const messages = toOllamaMessages(history, systemPrompt, contextBlock);
            const model = aiConfig.modelName || 'qwen2.5:3b';
            const maxTokens = typeof aiConfig.maxOutputTokens === 'number' ? aiConfig.maxOutputTokens : 4096;

            const body = {
                model,
                messages,
                stream: true,
                max_tokens: maxTokens,
                temperature: 0.7,
            };

            const response = await fetch(`${OLLAMA_API_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let errBody = '';
                try { errBody = await response.text(); } catch { }
                callbacks.onError(new Error(`Ollama API Lỗi (${response.status}): ${errBody || response.statusText}`));
                return;
            }

            if (!response.body) {
                callbacks.onError(new Error('Không nhận được response body từ Ollama.'));
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
                            // Suppress parse errors for metadata/keep-alive lines
                        }
                    }
                }
            }

            callbacks.onEnd({ text: fullResponseText.trim(), thought: null });

        } catch (err: any) {
            logger.error('[Ollama] Stream error:', err);
            callbacks.onError(new Error(`Không thể kết nối đến Ollama (${OLLAMA_API_BASE}). Vui lòng đảm bảo ứng dụng Ollama đã được mở và đang chạy.`));
        }
    },
};
