// server/services/geminiService.js
import { GoogleGenAI, Type } from "@google/genai";
import { fileParserService } from './fileParserService.js';
import weaviateService from './weaviateService.js';

// ==========================
// Convert conversation to Gemini content format
// ==========================
const toGeminiContent = (messages) => {
    const firstUserMessageIndex = messages.findIndex(m => m.sender === 'user');
    if (firstUserMessageIndex === -1) return [];

    const conversationMessages = messages.slice(firstUserMessageIndex);
    if (conversationMessages.length === 0) return [];

    const contents = [];
    let currentRole = null;
    let currentParts = [];

    const flush = () => {
        if (currentRole && currentParts.length > 0) {
            contents.push({ role: currentRole, parts: currentParts });
        }
    };

    for (const msg of conversationMessages) {
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
                        currentParts.push({
                            inlineData: {
                                mimeType: mimeMatch[1],
                                data: base64Data
                            }
                        });
                    }
                }
            } catch (err) {
                console.error("Error parsing image data URL:", err);
            }
        }
    }

    flush();
    return contents;
};

// ==========================
// PCM to WAV Conversion utilities
// ==========================
function parseMimeType(mimeType) {
    const [fileType, ...params] = (mimeType || '').split(';').map(s => s.trim());
    const [_, format] = (fileType || '').split('/');

    const options = {
        numChannels: 1,
        sampleRate: 24000,
        bitsPerSample: 16
    };

    if (format && format.startsWith('L')) {
        const bits = parseInt(format.slice(1), 10);
        if (!isNaN(bits)) {
            options.bitsPerSample = bits;
        }
    }

    for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim());
        if (key === 'rate') {
            options.sampleRate = parseInt(value, 10) || 24000;
        }
    }

    return options;
}

function createWavHeader(dataLength, options) {
    const { numChannels, sampleRate, bitsPerSample } = options;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);                      // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
    buffer.write('WAVE', 8);                      // Format
    buffer.write('fmt ', 12);                     // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
    buffer.writeUInt32LE(byteRate, 28);           // ByteRate
    buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
    buffer.write('data', 36);                     // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

    return buffer;
}

function convertToWav(rawDataBase64, mimeType) {
    const options = parseMimeType(mimeType);
    const buffer = Buffer.from(rawDataBase64, 'base64');
    const wavHeader = createWavHeader(buffer.length, options);
    return Buffer.concat([wavHeader, buffer]);
}

// ==========================
// Gemini Service
// ==========================
export const geminiService = {
    // ---------- TTS Generation ----------
    generateTts: async (text, apiKey, model, voice, styleInstruction, temperature) => {
        const ai = new GoogleGenAI({ apiKey });

        const targetVoice = voice || 'Algieba';

        // Style instruction is prepended inline to the text (same line), e.g.:
        // "Read aloud in a warm and friendly tone: Kính chào quý vị..."
        const finalText = styleInstruction?.trim()
            ? `${styleInstruction.trim()}\n${text}`
            : text;

        const config = {
            temperature: typeof temperature === 'number' && !isNaN(temperature) ? temperature : 1,
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: targetVoice },
                },
            },
        };

        const response = await ai.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: finalText }] }],
            config,
        });

        const parts = response?.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
            throw new Error('No audio content returned from Gemini TTS.');
        }

        const inlineData = parts[0]?.inlineData;
        if (!inlineData || !inlineData.data) {
            throw new Error('Gemini TTS returned no audio data.');
        }

        let finalAudioBase64 = inlineData.data;
        let finalMimeType = inlineData.mimeType || 'audio/mp3';

        console.log(`[TTS] model=${model} voice=${targetVoice} mimeType=${finalMimeType} seed=0`);

        // Convert PCM to playable WAV
        if (finalMimeType.includes('audio/pcm') || finalMimeType.includes('audio/L16')) {
            const wavBuffer = convertToWav(finalAudioBase64, finalMimeType);
            finalAudioBase64 = wavBuffer.toString('base64');
            finalMimeType = 'audio/wav';
        }

        return {
            audioContent: finalAudioBase64,
            mimeType: finalMimeType
        };
    },


    // ---------- OCR from Image ----------
    extractTextFromImage: async (imageBuffer, mimeType, apiKey, modelName) => {
        const ai = new GoogleGenAI({ apiKey });
        const model = modelName || "gemini-3-flash-preview"; // Use flash for speed

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType,
            },
        };

        const prompt = "Extract all text from this image. Preserve the original formatting as much as possible, including line breaks and spacing.";

        const res = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, { text: prompt }] },
        });

        return res.text;
    },

    // ---------- Format Extracted Text ----------
    formatExtractedText: async (text, apiKey, modelName) => {
        const ai = new GoogleGenAI({ apiKey });
        const model = modelName || "gemini-3-flash-preview";

        const prompt = `
Take the following raw text extracted from a document and format it into clean, readable HTML.
- Use appropriate heading tags (h1, h2, h3).
- Use paragraphs (<p>) for text blocks.
- Use lists (<ul>, <ol>, <li>) where appropriate.
- Preserve bold (**text**) and italic (*text*) formatting by converting them to <b> and <i> tags.
- Ensure the final output is only the HTML content, without any surrounding markdown fences or extra text.

Raw text:
---
${text}
---
Formatted HTML:
`;
        const res = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        // Clean up potential markdown code fences just in case
        return res.text.replace(/```html|```/g, "").trim();
    },

    // ---------- Summarize ----------
    summarizeText: async (text, apiKey, attempt = 1) => {
        if (!apiKey) throw new Error("API Key for Gemini must be provided.");
        if (!text?.trim()) return null;

        const ai = new GoogleGenAI({ apiKey });
        const model = "gemini-3-flash-preview";
        const prompt = `
Please summarize the following text concisely and clearly. The summary should be in the same language as the original text.
Focus on the key ideas, tone, and message.
Text:
---
${text}
---
Summary:`;

        const MAX_ATTEMPTS = 4;
        try {
            const res = await ai.models.generateContent({
                model,
                contents: prompt,
            });
            return res.text;
        } catch (err) {
            const status = err?.status || err?.response?.status;

            // Retry on rate limit (429) or service unavailable (503)
            if ((status === 429 || status === 503) && attempt < MAX_ATTEMPTS) {
                let waitMs = 15000; // default 15s

                // Try to extract retryDelay from API error details
                if (status === 429) {
                    try {
                        const body = JSON.parse(err.message);
                        const retryInfo = body?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                        const delayStr = retryInfo?.retryDelay; // e.g. "34s"
                        if (delayStr) {
                            const seconds = parseInt(delayStr, 10);
                            if (!isNaN(seconds)) waitMs = (seconds + 2) * 1000; // add 2s buffer
                        }
                    } catch (_) { }
                    console.warn(`Gemini rate limit hit (attempt ${attempt}/${MAX_ATTEMPTS}). Waiting ${Math.round(waitMs / 1000)}s before retry...`);
                } else {
                    waitMs = 10000;
                    console.warn(`Gemini 503 (attempt ${attempt}/${MAX_ATTEMPTS}). Waiting 10s...`);
                }

                await new Promise(r => setTimeout(r, waitMs));
                return geminiService.summarizeText(text, apiKey, attempt + 1);
            }

            console.error("Error during Gemini summarization:", err);
            return null;
        }
    },

    // ---------- Stream Chat ----------
    sendMessageStream: async (aiConfig, history, apiKey, callbacks, language, retrievedContext = '') => {
        try {
            if (!apiKey) throw new Error("Gemini API Key missing.");

            // Run context preparation in parallel:
            // 1. prepareAdditionalTrainingText: hits DB + maybe reads files
            // 2. RAG vector search (only if retrievedContext not provided already)
            const lastUserMsg = history.findLast?.(m => m.sender === 'user') ||
                [...history].reverse().find(m => m.sender === 'user');

            const ragSearchPromise = (!retrievedContext && lastUserMsg?.text)
                ? weaviateService.search(aiConfig.modelType, aiConfig.id, lastUserMsg.text, apiKey)
                    .then(results => results?.length > 0
                        ? '--- Relevant Information ---\n' + results.map(r => r.content).join('\n\n') + '\n--- End of Information ---\n\n'
                        : '')
                    .catch(e => { console.warn('Parallel RAG search error:', e.message); return ''; })
                : Promise.resolve(retrievedContext);

            const [additionalTrainingText, ragContext] = await Promise.all([
                fileParserService.prepareAdditionalTrainingText(aiConfig),
                ragSearchPromise,
            ]);

            const languageName = language === 'vi' ? 'Vietnamese' : 'English';

            // Language instruction goes FIRST to take highest priority over training content
            const languageInstruction = language === 'en'
                ? `**CRITICAL LANGUAGE RULE:** You MUST respond ONLY in English. Do NOT use Vietnamese under any circumstances, regardless of any other instructions below. This overrides all other language settings.`
                : `**QUY TẮC NGÔN NGỮ:** Hãy trả lời bằng tiếng Việt.`;

            const systemInstruction = [
                languageInstruction,
                ragContext,
                aiConfig.trainingContent,
                additionalTrainingText,
                `Use Markdown for formatting.`
            ].filter(Boolean).join('\n\n---\n\n');

            const contents = toGeminiContent(history);
            if (contents.length === 0) {
                callbacks.onError(new Error("Please enter a message to start."));
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const model = aiConfig.modelName || "gemini-3-flash-preview";

            const geminiConfig = {
                systemInstruction,
                maxOutputTokens: typeof aiConfig.maxOutputTokens === 'number' ? aiConfig.maxOutputTokens : 8192,
                temperature: 0.7,
            };

            // Apply thinkingBudget only for models that support it (Gemini 2.5+)
            if (typeof aiConfig.thinkingBudget === 'number' && model.includes('2.5')) {
                geminiConfig.thinkingConfig = { thinkingBudget: aiConfig.thinkingBudget };
            }

            const result = await ai.models.generateContentStream({
                model,
                contents,
                config: geminiConfig
            });

            let fullResponseText = '';
            for await (const chunk of result) {
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponseText += chunkText;
                    callbacks.onChunk(chunkText);
                }
            }

            // No thought parsing needed
            callbacks.onEnd({ text: fullResponseText.trim(), thought: null });

        } catch (err) {
            console.error("Error calling Gemini Stream API:", err);

            // Format user-friendly error messages
            const status = err?.status;
            if (status === 429) {
                // Extract retry delay if available
                let retryMsg = '';
                try {
                    const body = JSON.parse(err?.message || '{}');
                    const retryInfo = body?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                    if (retryInfo?.retryDelay) {
                        const secs = parseInt(retryInfo.retryDelay);
                        if (!isNaN(secs)) {
                            const mins = Math.ceil(secs / 60);
                            retryMsg = ` Vui lòng thử lại sau ${mins > 1 ? `${mins} phút` : `${secs} giây`}.`;
                        }
                    }
                } catch (_) { }
                callbacks.onError(new Error(`API Gemini đã đạt giới hạn quota (free tier).${retryMsg} Để sử dụng không giới hạn, hãy nâng cấp lên Gemini API trả phí.`));
            } else if (status === 401 || status === 403) {
                callbacks.onError(new Error('API Key Gemini không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại cài đặt.'));
            } else {
                callbacks.onError(err);
            }
        }
    },

    // ---------- Translate (single text) ----------
    translateText: async (text, targetLanguage, apiKey, modelName, contextPrompt) => {
        const messages = [{ text }];
        const translatedMessages = await geminiService.translateMessages(messages, targetLanguage, apiKey, modelName, contextPrompt);
        return translatedMessages[0].text;
    },

    // ---------- Translate (batch) ----------
    translateMessages: async (messages, targetLanguage, apiKey, modelName, contextPrompt) => {
        const ai = new GoogleGenAI({ apiKey });
        const languageName = targetLanguage === 'en' ? 'English' : 'Vietnamese';
        const texts = messages.map(m => m.text || '');
        if (texts.every(t => !t.trim())) return messages;

        const data = { texts };
        const prompt = `
${contextPrompt ? `**CONTEXT FOR TRANSLATION STYLE:**\n${contextPrompt}\n\n` : ''}Translate each string in 'texts' into ${languageName}.
Return valid JSON: {"translatedTexts": ["..."]}, same order as input.
Input:
${JSON.stringify(data)}
`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                translatedTexts: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['translatedTexts']
        };

        try {
            const res = await ai.models.generateContent({
                model: modelName || 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema
                }
            });
            const parsed = JSON.parse(res.text);
            const translated = parsed.translatedTexts;
            if (translated.length !== messages.length) {
                throw new Error("Mismatch in number of translated messages.");
            }
            return messages.map((m, i) => ({ ...m, text: translated[i] }));
        } catch (err) {
            console.error("Gemini translation error:", err);
            throw new Error("Failed to translate with Gemini.");
        }
    }
};