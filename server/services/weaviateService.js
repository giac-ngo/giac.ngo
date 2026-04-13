
// server/services/weaviateService.js
import weaviate from 'weaviate-ts-client';
import 'dotenv/config';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { pool, mapRowToCamelCase } from '../db.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { userModel } from '../models/user.model.js';
import { trainingDataModel } from '../models/trainingData.model.js';
import { fileParserService } from './fileParserService.js';
import { initProgress, updateFileProgress, getSyncProgress } from './syncProgressStore.js';

// ── Gemini Embedding (self-hosted, bypasses text2vec-google module) ──────────
// Weaviate Cloud's text2vec-google requires Vertex AI projectId — we bypass it.
// Auto-detect which embedding model+endpoint works for this API key.
const GEMINI_EMBED_CANDIDATES = [
    { model: 'gemini-embedding-001', api: 'v1beta' }, // ← confirmed available by ListModels
    { model: 'gemini-embedding-001', api: 'v1' },
    { model: 'text-embedding-005', api: 'v1beta' },
    { model: 'text-embedding-005', api: 'v1' },
    { model: 'text-embedding-004', api: 'v1beta' },
    { model: 'text-embedding-004', api: 'v1' },
    { model: 'embedding-001', api: 'v1beta' },
];

// Cache the working (model, api) pair so we don't probe on every call
let _workingEmbedConfig = null;

async function _tryEmbedding(text, apiKey, model, apiVersion, isQuery = false) {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:embedContent?key=${apiKey}`;
    const taskType = isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] }, taskType }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.error || data));
    const values = data?.embedding?.values;
    if (!values?.length) throw new Error('Empty vector returned');
    return values;
}

async function generateGeminiEmbedding(text, apiKey, isQuery = false) {
    const truncated = text.length > 8000 ? text.substring(0, 8000) : text;

    // Use cached config if available
    if (_workingEmbedConfig) {
        return await _tryEmbedding(truncated, apiKey, _workingEmbedConfig.model, _workingEmbedConfig.api, isQuery);
    }

    // Log key prefix for debugging (never log full key)
    console.log(`[EMBED] Probing with key prefix: ${apiKey?.substring(0, 8)}...`);

    // Auto-detect: probe candidates until one works
    for (const candidate of GEMINI_EMBED_CANDIDATES) {
        try {
            const values = await _tryEmbedding(truncated, apiKey, candidate.model, candidate.api, isQuery);
            _workingEmbedConfig = candidate;
            console.log(`[EMBED] ✓ Working config found: model=${candidate.model} api=${candidate.api}`);
            return values;
        } catch (e) {
            console.warn(`[EMBED] ✗ ${candidate.model}@${candidate.api}: ${e.message.substring(0, 80)}`);
        }
    }

    // Diagnostic: list available models for this API key
    try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();
        const embedModels = listData.models
            ?.filter(m => m.supportedGenerationMethods?.includes('embedContent'))
            ?.map(m => m.name) || [];
        console.error(`[EMBED DIAGNOSTIC] Models supporting embedContent for this key: ${JSON.stringify(embedModels)}`);
        if (embedModels.length === 0 && listData.error) {
            console.error(`[EMBED DIAGNOSTIC] ListModels error: ${JSON.stringify(listData.error)}`);
        }
    } catch (diagErr) {
        console.error(`[EMBED DIAGNOSTIC] Could not list models:`, diagErr.message);
    }

    throw new Error('[EMBED] All Gemini embedding models failed. Check your API key, billing, and quota.');
}

const WEAVIATE_CLASSES = {
    gpt: 'TrainingData_gpt',
    gemini: 'TrainingData_gemini_studio', // Changed to distinguish from Vertex
    vertex: 'TrainingData_gemini_vertex',
};

const getClassNameForModel = (modelType) => {
    const className = WEAVIATE_CLASSES[modelType];
    // Default fallback or error handling
    if (!className) {
        // If unknown (e.g. grok), we might not support vector search yet, or default to generic
        console.warn(`Warning: No specific Weaviate class mapped for modelType '${modelType}'.`);
        return null;
    }
    return className;
};

// Generate a consistent UUID for a data source item
const generateUuid = (sourceId, type) => {
    const hash = crypto.createHash('sha1');
    hash.update(`source-${type}-${sourceId}`);
    const hex = hash.digest('hex');
    // Format as UUID
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
};

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Split text into overlapping chunks for better RAG retrieval.
// CHUNK_SIZE: max words per chunk. OVERLAP: words shared between adjacent chunks.
const CHUNK_SIZE_WORDS = 1000;
const CHUNK_OVERLAP_WORDS = 200;

function chunkText(text) {
    if (!text || text.trim().length === 0) return [];

    // Special handling for Excel QA pairs formatting from fileParserService
    if (text.includes('\n\n---\n\n')) {
        return text.split('\n\n---\n\n').filter(Boolean).map(chunk => chunk.trim());
    }

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= CHUNK_SIZE_WORDS) {
        return [text.trim()]; // Short doc: single chunk
    }
    const chunks = [];
    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
        chunks.push(words.slice(start, end).join(' '));
        if (end === words.length) break;
        start += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    }
    return chunks;
}

// In-process cache: tracks which Weaviate classes are known to exist.
// Avoids a slow network schema.getter() call on every chat message.
// TTL: 5 minutes. Reset on schema create/delete.
const schemaCache = new Map(); // className -> { exists: bool, ts: Date.now() }
const SCHEMA_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes – reduces slow schema.getter() calls

const isSchemaCached = (className) => {
    const entry = schemaCache.get(className);
    if (!entry) return null; // unknown
    if (Date.now() - entry.ts > SCHEMA_CACHE_TTL_MS) {
        schemaCache.delete(className);
        return null; // expired
    }
    return entry.exists;
};

const setCacheEntry = (className, exists) => {
    schemaCache.set(className, { exists, ts: Date.now() });
};

// Track classes known to have broken embedding config (e.g. stale text2vec-palm).
// When a class is in this set, search() returns [] immediately without hitting Weaviate.
const brokenSchemas = new Set();


const weaviateService = {
    // Creates a temporary client with owner-specific API keys in the header using the v2 API
    async _getScopedClient(modelType, apiKey) {
        let weaviateUrl = process.env.WEAVIATE_URL;
        if (!weaviateUrl) {
            throw new Error('WEAVIATE_URL is not set in the environment variables. Please check your .env file.');
        }

        let weaviateKey = process.env.WEAVIATE_KEY;
        if (!weaviateKey) {
            throw new Error('WEAVIATE_KEY is not set for Weaviate Cloud connection. Please check your .env file.');
        }

        // Strip quotes if they exist from .env file
        weaviateUrl = weaviateUrl.replace(/["']/g, "");
        weaviateKey = weaviateKey.replace(/["']/g, "");

        const headers = {};

        if (modelType === 'gpt' && apiKey) {
            headers['X-OpenAI-Api-Key'] = apiKey;
        } else if (modelType === 'gemini' && apiKey) {
            // ONLY send X-Goog-Api-Key for Google AI Studio.
            // X-Palm-Api-Key triggers the old PaLM v1beta code path inside Weaviate's
            // text2vec-google module, which returns 404 for text-embedding-004.
            headers['X-Goog-Api-Key'] = apiKey;
        } else if (modelType === 'vertex' && apiKey) {
            // Vertex typically needs more than just an API key (OAuth), but we pass it if configured
            headers['X-Google-Api-Key'] = apiKey;
        }

        try {
            const url = new URL(weaviateUrl);
            const client = weaviate.client({
                scheme: url.protocol.slice(0, -1),
                host: url.host,
                apiKey: new weaviate.ApiKey(weaviateKey),
                headers,
            });

            return client;
        } catch (err) {
            console.error("Failed to connect to Weaviate:", err);
            throw new Error(`Could not connect to Weaviate. Check your config. Original error: ${err.message}`);
        }
    },

    async ensureSchemaForModelType(modelType, apiKey) {
        const className = getClassNameForModel(modelType);
        if (!className) return;

        const client = await this._getScopedClient(modelType, apiKey);

        try {
            const schema = await client.schema.getter().do();
            const existingClass = schema.classes?.find(c => c.class === className);
            if (existingClass) {
                // Auto-detect stale schema (1): text2vec-palm uses deprecated PaLM embedding-001
                if (existingClass.vectorizer === 'text2vec-palm') {
                    console.warn(`[AUTO-RESET] Class ${className} uses stale text2vec-palm. Force-resetting...`);
                    await client.schema.classDeleter().withClassName(className).do();
                    setCacheEntry(className, false);
                    await pool.query(
                        `UPDATE training_data_sources SET indexed_providers = array_remove(indexed_providers, $1) WHERE $1 = ANY(indexed_providers)`,
                        [modelType]
                    ).catch(e => console.warn('Could not clear indexedProviders during auto-reset:', e.message));
                    console.log(`[AUTO-RESET] Class ${className} deleted. Recreating with text2vec-google...`);
                    // Fall through to create the new class below
                } else if (existingClass.vectorizer === 'text2vec-google') {
                    // Auto-detect stale schema (2): class has apiEndpoint/projectId in config
                    // which routes through PaLM v1beta path, causing 404 for text-embedding-004
                    const cfg = existingClass.moduleConfig?.['text2vec-google'];
                    if (cfg && (cfg.apiEndpoint || cfg.projectId === '')) {
                        console.warn(`[AUTO-RESET] Class ${className} has stale apiEndpoint/projectId config causing v1beta routing. Resetting...`);
                        await client.schema.classDeleter().withClassName(className).do();
                        setCacheEntry(className, false);
                        await pool.query(
                            `UPDATE training_data_sources SET indexed_providers = array_remove(indexed_providers, $1) WHERE $1 = ANY(indexed_providers)`,
                            [modelType]
                        ).catch(e => console.warn('Could not clear indexedProviders during auto-reset:', e.message));
                        console.log(`[AUTO-RESET] Class ${className} deleted. Recreating without apiEndpoint override...`);
                        // Fall through to create the new class below
                    } else {
                        return; // Schema exists and is correctly configured
                    }
                } else {
                    return; // Schema exists with unknown vectorizer, leave it alone
                }
            }

            console.log(`Weaviate schema for ${className} not found. Creating...`);

            let classObj;
            const commonProperties = [
                { name: 'content', dataType: ['text'] },
                { name: 'aiConfigId', dataType: ['int'] },
                { name: 'sourceType', dataType: ['text'] },
                { name: 'sourceId', dataType: ['int'] },
            ];

            if (modelType === 'gpt') {
                classObj = {
                    'class': className,
                    'vectorizer': "text2vec-openai",
                    'properties': commonProperties,
                };
            } else if (modelType === 'gemini') {
                // Use vectorizer='none': we provide pre-computed Gemini embeddings.
                // Weaviate Cloud's text2vec-google only supports Vertex AI (needs projectId),
                // not Google AI Studio key-based auth.
                classObj = {
                    'class': className,
                    'vectorizer': 'none',
                    'properties': commonProperties,
                };
                console.log(`[SCHEMA] Creating ${className} with vectorizer=none (self-generated Gemini embeddings via ${GEMINI_EMBED_MODEL})`);
            } else if (modelType === 'vertex') {
                // Vertex AI configuration
                if (!process.env.GOOGLE_PROJECT_ID) {
                    throw new Error('GOOGLE_PROJECT_ID environment variable is not set. It is required for Vertex AI.');
                }
                classObj = {
                    'class': className,
                    'vectorizer': "text2vec-google",
                    'moduleConfig': {
                        'text2vec-google': {
                            'projectId': process.env.GOOGLE_PROJECT_ID,
                            'vectorizeClassName': false,
                            'modelId': 'text-embedding-004'
                        },
                    },
                    'properties': commonProperties,
                };
            } else {
                return;
            }

            await client.schema.classCreator().withClass(classObj).do();
            console.log(`Schema for ${className} created successfully.`);
            setCacheEntry(className, true); // Cache: class now exists

        } catch (error) {
            console.error(`Error during Weaviate schema setup for ${modelType}:`, error.message);
            throw error;
        }
    },

    // Drop and recreate the Weaviate class for a given model type.
    // Call this once after updating the schema config (e.g., switching embedding model).
    async resetSchemaForModelType(modelType, apiKey) {
        const className = getClassNameForModel(modelType);
        if (!className) return;

        const client = await this._getScopedClient(modelType, apiKey);

        try {
            const schema = await client.schema.getter().do();
            const classExists = schema.classes?.some(c => c.class === className);

            if (classExists) {
                console.log(`Dropping stale Weaviate class: ${className}...`);
                await client.schema.classDeleter().withClassName(className).do();
                console.log(`Class ${className} deleted.`);
                setCacheEntry(className, false); // Cache invalidation
            } else {
                console.log(`Class ${className} does not exist. Nothing to drop.`);
            }
        } catch (error) {
            console.error(`Failed to drop class ${className}:`, error.message);
            throw error;
        }

        // Recreate with updated config
        await this.ensureSchemaForModelType(modelType, apiKey);
        console.log(`Class ${className} recreated with updated schema.`);
    },

    async syncAllDataForAI(aiConfigId) {
        console.log(`Starting data sync for AI config ID: ${aiConfigId}`);
        const aiConfig = await aiConfigModel.findById(aiConfigId);
        if (!aiConfig) {
            throw new Error(`AI config with ID ${aiConfigId} not found.`);
        }
        if (!aiConfig.spaceId) {
            throw new Error(`AI config with ID ${aiConfigId} does not belong to a space.`);
        }

        const spaceRes = await pool.query('SELECT user_id FROM spaces WHERE id = $1', [aiConfig.spaceId]);
        if (spaceRes.rows.length === 0) {
            throw new Error(`Space with ID ${aiConfig.spaceId} not found for AI ${aiConfigId}.`);
        }

        const owner = await userModel.findById(spaceRes.rows[0].user_id);
        if (!owner) {
            throw new Error(`Owner (User ID: ${spaceRes.rows[0].user_id}) for Space ${aiConfig.spaceId} not found.`);
        }

        const ownerKeys = owner.apiKeys || {};
        const dataSources = await trainingDataModel.findByAiId(aiConfigId);

        console.log(`Found ${dataSources.length} data sources to sync for AI ${aiConfigId}.`);

        const targetModelType = aiConfig.modelType;
        const ownerKey = ownerKeys[targetModelType];

        if (!ownerKey) {
            throw new Error(`Cannot sync: Owner's ${targetModelType.toUpperCase()} API Key is missing.`);
        }

        // Specific checks for Vertex
        if (targetModelType === 'vertex' && !process.env.GOOGLE_PROJECT_ID) {
            throw new Error(`Cannot sync Vertex: GOOGLE_PROJECT_ID server environment variable is not set.`);
        }

        try {
            console.log(`Ensuring schema exists for ${targetModelType} (AI ID: ${aiConfigId})...`);
            await this.ensureSchemaForModelType(targetModelType, ownerKey);

            // Auto-detect stale schema: check if class uses old text2vec-palm (embedding-001)
            // If so, reset and recreate with text2vec-google (text-embedding-004)
            if (targetModelType === 'gemini') {
                const client = await this._getScopedClient(targetModelType, ownerKey);
                const schema = await client.schema.getter().do();
                const className = getClassNameForModel(targetModelType);
                const existingClass = schema.classes?.find(c => c.class === className);
                if (existingClass && existingClass.vectorizer === 'text2vec-palm') {
                    console.warn(`Detected stale text2vec-palm schema for ${className}. Auto-resetting...`);
                    await this.resetSchemaForModelType(targetModelType, ownerKey);
                    console.log(`Schema auto-reset complete. Will re-index all data.`);
                    // Clear indexedProviders for all sources so they get re-indexed
                    for (const source of dataSources) {
                        if (source.indexedProviders?.includes(targetModelType)) {
                            await trainingDataModel.removeIndexedProvider(source.id, targetModelType).catch(() => { });
                        }
                    }
                    // Refresh data sources after clearing
                    const refreshed = await trainingDataModel.findByAiId(aiConfigId);
                    await this.indexData(targetModelType, refreshed, ownerKey, aiConfigId);
                    return;
                }
            }

            // Log current schema vectorizer for debugging
            if (targetModelType === 'gemini') {
                const debugClient = await this._getScopedClient(targetModelType, ownerKey);
                const debugSchema = await debugClient.schema.getter().do();
                const debugClass = debugSchema.classes?.find(c => c.class === getClassNameForModel(targetModelType));
                console.log(`[DEBUG] Schema for ${getClassNameForModel(targetModelType)}: vectorizer=${debugClass?.vectorizer}, moduleConfig=${JSON.stringify(debugClass?.moduleConfig)}`);
            }
            console.log(`Starting Weaviate sync for ${targetModelType} (AI ID: ${aiConfigId})...`);
            await this.indexData(targetModelType, dataSources, ownerKey, aiConfigId);
        } catch (error) {
            console.error(`Error during Weaviate sync for ${targetModelType} (AI ID: ${aiConfigId}):`, error.message);
            throw new Error(`Error during Weaviate sync: ${error.message}`);
        }
    },

    async indexData(modelType, dataSources, apiKey, aiConfigId) {
        // Only count sources that need indexing
        const toIndex = dataSources.filter(
            s => !s.indexedProviders?.includes(modelType)
        );
        initProgress(aiConfigId, toIndex);

        try {
            const client = await this._getScopedClient(modelType, apiKey);
            const className = getClassNameForModel(modelType);

            let batcher = client.batch.objectsBatcher();
            // Track which sources are in the current batch (for progress updates)
            let batchSourceIds = [];
            let counter = 0;
            const batchSize = 5;

            for (const source of dataSources) {
                // Skip if already indexed for this specific model type
                if (source.indexedProviders?.includes(modelType)) continue;

                updateFileProgress(aiConfigId, source.id, 'indexing');

                // --- Build content chunks ---
                // QA sources: single chunk. File/document sources: split into overlapping chunks.
                let chunks = [];

                if (source.type === 'qa' && source.question && source.answer) {
                    chunks = [`Question: ${source.question}\nAnswer: ${source.answer}`];
                } else if (source.type === 'file' && source.fileUrl && source.fileName) {
                    let rawText = null;
                    if (source.summary) {
                        // If user created a summary, use it as a single chunk (they chose to summarize)
                        rawText = source.summary;
                    } else {
                        try {
                            rawText = await fileParserService.extractText(source.fileUrl, source.fileName);
                        } catch (fileError) {
                            console.error(`Failed to parse file ${source.fileName} (ID: ${source.id}):`, fileError);
                            updateFileProgress(aiConfigId, source.id, 'failed');
                            continue;
                        }
                    }
                    if (rawText) chunks = chunkText(rawText);
                } else if (source.type === 'document' && source.summary) {
                    chunks = chunkText(source.summary);
                }

                if (chunks.length === 0) {
                    console.error(`[INDEX] Empty content for source ${source.id} (${source.fileName || source.type}). Cannot index — file may be empty, unsupported, or failed to parse.`);
                    updateFileProgress(aiConfigId, source.id, 'failed');
                    continue;
                }

                console.log(`[INDEX] Source ${source.id} (${source.type}) → ${chunks.length} chunk(s)`);

                // Add each chunk as a separate Weaviate object
                let sourceIndexFailed = false;
                for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                    const chunkContent = chunks[chunkIdx];
                    const chunkUuid = generateUuid(`${source.id}-chunk-${chunkIdx}`, source.type);
                    const properties = { content: chunkContent, aiConfigId, sourceType: source.type, sourceId: source.id };

                    if (modelType === 'gemini') {
                        try {
                            const vector = await generateGeminiEmbedding(chunkContent, apiKey);
                            batcher = batcher.withObject({ class: className, properties, id: chunkUuid, vector });
                        } catch (embedErr) {
                            console.error(`[INDEX] Gemini embedding failed for source ${source.id} chunk ${chunkIdx}:`, embedErr.message);
                            sourceIndexFailed = true;
                            break;
                        }
                    } else {
                        batcher = batcher.withObject({ class: className, properties, id: chunkUuid });
                    }
                    batchSourceIds.push(source.id);
                    counter++;

                    if (counter >= batchSize) {
                        const results = await batcher.do();
                        let hadEmbeddingError = false;
                        for (let i = 0; i < results.length; i++) {
                            const item = results[i];
                            const sid = batchSourceIds[i];
                            if (item.result?.errors) {
                                const errMsg = item.result.errors[0]?.message || '';
                                const fullErr = JSON.stringify(item.result.errors);
                                if (errMsg.includes('embedding-001') || errMsg.includes('text2vec-palm')) {
                                    hadEmbeddingError = true;
                                } else if (errMsg.includes('text-embedding-004') || (errMsg.includes('404') && errMsg.includes('Google'))) {
                                    throw new Error(`EMBEDDING_MODEL_NOT_FOUND: Gemini API key không có quyền dùng text-embedding-004. Chi tiết: ${errMsg}`);
                                } else {
                                    console.error(`Weaviate batch import failed for source ${sid}:`, fullErr || errMsg || '(no error detail)');
                                    updateFileProgress(aiConfigId, sid, 'failed');
                                }
                            } else {
                                // Only mark done + addIndexedProvider once per sourceId (on first successful chunk)
                                updateFileProgress(aiConfigId, sid, 'done');
                                await trainingDataModel.addIndexedProvider(sid, modelType);
                            }
                        }
                        if (hadEmbeddingError) throw new Error('STALE_EMBEDDING_MODEL');
                        const p = getSyncProgress(aiConfigId);
                        const pct = p ? Math.round((p.indexed / p.total) * 100) : 0;
                        console.log(`Indexed a batch of ${results.length} objects to ${className}. Progress: ${pct}%`);
                        batcher = client.batch.objectsBatcher();
                        batchSourceIds = [];
                        counter = 0;
                        console.log('Sleeping for 2 seconds to respect rate limits...');
                        await sleep(2000);
                    }
                }

                if (sourceIndexFailed) {
                    updateFileProgress(aiConfigId, source.id, 'failed');
                }

            }

            if (counter > 0) {
                const results = await batcher.do();
                for (let i = 0; i < results.length; i++) {
                    const item = results[i];
                    const sid = batchSourceIds[i];
                    if (item.result?.errors) {
                        const errMsg = item.result.errors[0]?.message || '';
                        const fullErr = JSON.stringify(item.result.errors);
                        if (errMsg.includes('embedding-001') || errMsg.includes('text2vec-palm')) {
                            throw new Error('STALE_EMBEDDING_MODEL');
                        } else if (errMsg.includes('text-embedding-004') || (errMsg.includes('404') && errMsg.includes('Google'))) {
                            throw new Error(`EMBEDDING_MODEL_NOT_FOUND: Gemini API key không có quyền dùng text-embedding-004. Chi tiết: ${errMsg}`);
                        }
                        console.error(`Weaviate final batch import failed for source ${sid}:`, fullErr || errMsg || '(no error detail)');
                        updateFileProgress(aiConfigId, sid, 'failed');
                    } else {
                        updateFileProgress(aiConfigId, sid, 'done');
                        await trainingDataModel.addIndexedProvider(sid, modelType);
                    }
                }
            } else if (toIndex.length === 0) {
                console.log(`No new data to index for ${className}.`);
            }
        } catch (error) {
            console.error(`[FATAL] in indexData for ${modelType}: ${error.message}`);
            throw error;
        }
    },


    async search(modelType, aiConfigId, query, apiKey, limit = 5) {
        try {
            const client = await this._getScopedClient(modelType, apiKey);
            const className = getClassNameForModel(modelType);
            if (!className) return [];

            // Skip immediately if we know this class has a broken embedding config
            if (brokenSchemas.has(className)) {
                return [];
            }

            // Use cache to avoid slow schema.getter() call on every message
            let classExists = isSchemaCached(className);
            if (classExists === null) {
                // Cache miss – do the real check once, then cache the result
                const schema = await client.schema.getter().do();
                const existingClass = schema.classes?.find(c => c.class === className);
                classExists = !!existingClass;
                // If class exists but uses stale vectorizer, mark as broken immediately
                if (existingClass?.vectorizer === 'text2vec-palm') {
                    console.warn(`[SEARCH] Class ${className} uses stale text2vec-palm. Marking as broken. Run Koii sync to auto-fix.`);
                    brokenSchemas.add(className);
                    return [];
                }
                setCacheEntry(className, classExists);
            }

            if (!classExists) {
                console.warn(`Weaviate class ${className} does not exist. Skipping RAG search.`);
                return [];
            }

            // Wrap in a timeout so chat never waits forever for Weaviate
            let searchBuilder = client.graphql
                .get()
                .withClassName(className)
                .withFields('content sourceType sourceId')
                .withWhere({
                    operator: 'Equal',
                    path: ['aiConfigId'],
                    valueInt: aiConfigId,
                })
                .withLimit(limit);

            if (modelType === 'gemini') {
                // vectorizer=none: generate query embedding and use nearVector
                const queryVector = await generateGeminiEmbedding(query, apiKey, true);
                searchBuilder = searchBuilder.withNearVector({ vector: queryVector });
            } else {
                searchBuilder = searchBuilder.withNearText({ concepts: [query] });
            }

            const searchPromise = searchBuilder.do();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Weaviate search timeout')), 1500) // Reduced 3s→1.5s for faster chat
            );

            const res = await Promise.race([searchPromise, timeoutPromise]);
            return res.data.Get[className] || [];
        } catch (error) {
            // If embedding-001 error, mark class as broken to skip future searches
            if (error.message?.includes('embedding-001') || error.message?.includes('text2vec-palm')) {
                const className = getClassNameForModel(modelType);
                if (className) {
                    brokenSchemas.add(className);
                    setCacheEntry(className, null); // invalidate schema cache
                    console.error(`[SEARCH] Weaviate class ${className} marked as BROKEN (stale embedding). Run Koii sync to fix.`);
                }
            } else if (!error.message?.includes('timeout')) {
                console.error(`Weaviate search failed for ${modelType}:`, error.message);
            }
            return [];
        }
    },

    async deleteDataByAiConfigId(modelType, aiConfigId, apiKey) {
        try {
            const client = await this._getScopedClient(modelType, apiKey);
            const className = getClassNameForModel(modelType);
            if (!className) return;

            // Check existence before delete to avoid error
            const schema = await client.schema.getter().do();
            if (!schema.classes?.some(c => c.class === className)) return;

            const result = await client.batch.deleter()
                .withClassName(className)
                .withWhere({ operator: 'Equal', path: ['aiConfigId'], valueInt: aiConfigId })
                .do();

            if (result.results && result.results.matches > 0) {
                console.log(`Deleted ${result.results.matches} objects for aiConfigId ${aiConfigId} from ${className}.`);
            }
        } catch (error) {
            console.error(`Failed to delete data for aiConfigId ${aiConfigId}:`, error.message);
        }
    },

    async deleteDataBySourceId(modelType, sourceId, sourceType, apiKey) {
        try {
            const client = await this._getScopedClient(modelType, apiKey);
            const className = getClassNameForModel(modelType);
            if (!className) return;

            // Check existence before delete
            const schema = await client.schema.getter().do();
            if (!schema.classes?.some(c => c.class === className)) return;

            const result = await client.batch.deleter()
                .withClassName(className)
                .withWhere({ operator: 'Equal', path: ['sourceId'], valueInt: sourceId })
                .do();

            if (result.results && result.results.matches > 0) {
                console.log(`Deleted ${result.results.matches} chunk(s) for sourceId ${sourceId} from ${className}.`);
            }
        } catch (error) {
            console.error(`Failed to delete data for sourceId ${sourceId}:`, error.message);
        }
    }
};

export default weaviateService;
