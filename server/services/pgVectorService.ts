// server/services/pgVectorService.ts
import 'dotenv/config';
import { pool, mapRowToCamelCase } from '../db.js';
import { aiConfigModel } from '../models/aiConfig.model.js';
import { trainingDataModel } from '../models/trainingData.model.js';
import { fileParserService } from './fileParserService.js';
import { initProgress, updateFileProgress } from './syncProgressStore.js';
import { getApiKeyForAi } from '../utils/getApiKeyForAi.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Fallback: dùng Gemini đọc PDF dạng ảnh/scan khi pdf-parse trả về rỗng
async function extractTextFromPdfGemini(filePath: string, apiKey: string): Promise<string> {
    try {
        const buffer = await fs.readFile(filePath);
        const fileSizeMB = buffer.length / (1024 * 1024);
        console.log(`[PGVECTOR] PDF size: ${fileSizeMB.toFixed(2)}MB, sending to Gemini...`);

        // Gemini inline data limit is 20MB
        if (fileSizeMB > 19) {
            console.warn(`[PGVECTOR] PDF too large (${fileSizeMB.toFixed(2)}MB > 19MB) for Gemini inline. Skipping.`);
            return '';
        }

        const base64 = buffer.toString('base64');
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'application/pdf', data: base64 } },
                        { text: 'Extract ALL text content from this PDF. Return plain text only, preserving paragraphs and structure.' }
                    ]
                }
            ]
        });
        const text = res.text?.trim() || '';
        console.log(`[PGVECTOR] Gemini PDF response length: ${text.length} chars`);
        if (!text) {
            // Log raw response for debugging
            console.warn(`[PGVECTOR] Gemini returned empty for PDF. Raw candidates:`, JSON.stringify(res?.candidates?.[0]?.finishReason));
        }
        return text;
    } catch (err: any) {
        console.error('[PGVECTOR] Gemini PDF fallback failed:', err.message || err);
        return '';
    }
}


// ── Gemini Embedding auto-detect ──────────────────────────
const GEMINI_EMBED_CANDIDATES = [
    { model: 'gemini-embedding-001', api: 'v1beta' },
    { model: 'gemini-embedding-001', api: 'v1' },
    { model: 'text-embedding-005', api: 'v1beta' },
    { model: 'text-embedding-005', api: 'v1' },
    { model: 'text-embedding-004', api: 'v1beta' },
    { model: 'text-embedding-004', api: 'v1' },
    { model: 'embedding-001', api: 'v1beta' },
];

let _workingEmbedConfig: { model: string; api: string } | null = null;

// Target embedding dimension — must match vector_embeddings table column vector(N)
const EMBEDDING_DIM = 768;

async function _tryEmbedding(text: string, apiKey: string, model: string, apiVersion: string, isQuery = false) {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:embedContent?key=${apiKey}`;
    const taskType = isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: { parts: [{ text }] },
            taskType,
            // Force fixed output dimension so all models (incl. gemini-embedding-001
            // which defaults to 3072) return vectors matching the DB column size.
            outputDimensionality: EMBEDDING_DIM,
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.error || data));
    const values = data?.embedding?.values;
    if (!values?.length) throw new Error('Empty vector returned');
    if (values.length !== EMBEDDING_DIM) {
        throw new Error(`Dimension mismatch: expected ${EMBEDDING_DIM}, got ${values.length}`);
    }
    return values;
}

async function generateGeminiEmbedding(text: string, apiKey: string, isQuery = false): Promise<number[]> {
    const truncated = text.length > 8000 ? text.substring(0, 8000) : text;

    if (_workingEmbedConfig) {
        return await _tryEmbedding(truncated, apiKey, _workingEmbedConfig.model, _workingEmbedConfig.api, isQuery);
    }

    console.log(`[PGVECTOR EMBED] Probing with key prefix: ${apiKey?.substring(0, 8)}...`);

    for (const candidate of GEMINI_EMBED_CANDIDATES) {
        try {
            const values = await _tryEmbedding(truncated, apiKey, candidate.model, candidate.api, isQuery);
            _workingEmbedConfig = candidate;
            console.log(`[PGVECTOR EMBED] ✓ Working config found: model=${candidate.model} api=${candidate.api}`);
            return values;
        } catch (e: any) {
            console.warn(`[PGVECTOR EMBED] ✗ ${candidate.model}@${candidate.api}: ${e.message?.substring(0, 80)}`);
        }
    }

    throw new Error('[PGVECTOR EMBED] All Gemini embedding models failed. Check your API key, billing, and quota.');
}

// ── Text Chunking ─────────────────────────────────────────────
const CHUNK_SIZE_WORDS = 1000;
const CHUNK_OVERLAP_WORDS = 200;

function chunkText(text: string): string[] {
    if (!text || text.trim().length === 0) return [];

    if (text.includes('\n\n---\n\n')) {
        return text.split('\n\n---\n\n').filter(Boolean).map(chunk => chunk.trim());
    }

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= CHUNK_SIZE_WORDS) {
        return [text.trim()];
    }
    const chunks: string[] = [];
    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
        chunks.push(words.slice(start, end).join(' '));
        if (end === words.length) break;
        start += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    }
    return chunks;
}

let isSchemaEnsured = false;

// Ensure the vector column dimension matches EMBEDDING_DIM.
// Run once on startup to ALTER the column if it was created with wrong dimensions.
async function _ensureColumnDimension() {
    try {
        const res = await pool.query(`
            SELECT atttypmod FROM pg_attribute
            WHERE attrelid = 'vector_embeddings'::regclass
              AND attname = 'embedding'
        `);
        if (res.rowCount && res.rowCount > 0) {
            const rawTypmod = res.rows[0].atttypmod as number;
            // In pgvector, atttypmod can be N directly or N+1 depending on postgres version.
            const storedDim = (rawTypmod === EMBEDDING_DIM || rawTypmod === EMBEDDING_DIM + 1)
                ? EMBEDDING_DIM
                : (rawTypmod > 0 ? rawTypmod - 1 : rawTypmod);

            if (storedDim > 0 && storedDim !== EMBEDDING_DIM) {
                console.warn(`[PGVECTOR] Column dimension mismatch: stored=${storedDim}, target=${EMBEDDING_DIM}. Recreating table...`);
                await pool.query('DROP TABLE IF EXISTS vector_embeddings CASCADE;');
                console.log('[PGVECTOR] Dropped vector_embeddings for recreation with correct dimension.');
            }
        }
    } catch (_) {
        // Table doesn't exist yet — will be created fresh.
    }
}

export const pgVectorService = {
    async ensureSchema() {
        if (isSchemaEnsured) return;
        try {
            // Try to enable vector extension — requires superuser.
            // If the DB user (e.g. giacngo) lacks superuser privilege, this will fail
            // with "permission denied". In that case, a superuser (postgres) must have
            // already created the extension manually:
            //   sudo -u postgres psql -d giacngo -c "CREATE EXTENSION IF NOT EXISTS vector;"
            try {
                await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
            } catch (extErr: any) {
                const msg: string = extErr.message || '';
                // "already exists" → fine. Permission/availability errors → re-throw clearly.
                if (!msg.includes('already exists')) {
                    if (msg.includes('permission denied') || msg.includes('must be superuser')) {
                        console.warn('[PGVECTOR] Cannot CREATE EXTENSION vector (no superuser privilege). ' +
                            'Run manually: sudo -u postgres psql -d <db> -c "CREATE EXTENSION IF NOT EXISTS vector;"');
                        // Verify the extension actually exists before continuing
                        const check = await pool.query(
                            `SELECT extname FROM pg_extension WHERE extname = 'vector'`
                        );
                        if (check.rowCount === 0) {
                            throw new Error(
                                'pgvector extension is not installed in this database. ' +
                                'Please run as superuser: CREATE EXTENSION vector;'
                            );
                        }
                        console.log('[PGVECTOR] Extension vector already exists — continuing.');
                    } else {
                        throw extErr;
                    }
                }
            }
            // Fix dimension mismatch if table already exists with wrong vector size
            await _ensureColumnDimension();

            // Create embeddings table
            await pool.query(`
                CREATE TABLE IF NOT EXISTS vector_embeddings (
                    id SERIAL PRIMARY KEY,
                    ai_config_id INT NOT NULL REFERENCES ai_configs(id) ON DELETE CASCADE,
                    source_id INT,
                    source_type VARCHAR(50),
                    content TEXT NOT NULL,
                    chunk_index INT DEFAULT 0,
                    embedding vector(768),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_vector_embeddings_ai_config 
                ON vector_embeddings(ai_config_id);
            `);

            // Try HNSW index (ignore if pgvector version doesn't support hnsw index or index exists)
            try {
                await pool.query(`
                    CREATE INDEX IF NOT EXISTS idx_vector_embeddings_hnsw 
                    ON vector_embeddings USING hnsw (embedding vector_cosine_ops);
                `);
            } catch (indexErr: any) {
                console.warn('[PGVECTOR] HNSW index creation skipped/not supported:', indexErr.message);
            }

            isSchemaEnsured = true;
            console.log('[PGVECTOR] Database schema & extension vector verified successfully.');
        } catch (error: any) {
            console.error('[PGVECTOR] Failed to ensure schema:', error.message);
            throw new Error(`pgvector schema setup failed: ${error.message}`);
        }
    },

    async syncAllDataForAI(aiConfigId: string | number) {
        console.log(`[PGVECTOR] Starting data sync for AI config ID: ${aiConfigId}`);
        await this.ensureSchema();

        const aiConfig = await aiConfigModel.findById(aiConfigId);
        if (!aiConfig) {
            throw new Error(`AI config with ID ${aiConfigId} not found.`);
        }

        const dataSources = await trainingDataModel.findByAiId(aiConfigId);
        console.log(`[PGVECTOR] Found ${dataSources.length} data sources to sync for AI ${aiConfigId}.`);

        const embeddingProvider = (aiConfig.embeddingProvider as string) || aiConfig.modelType || 'gemini';
        const apiKey = await getApiKeyForAi(aiConfig, embeddingProvider).catch(() => null);

        if (!apiKey) {
            throw new Error(`Cannot sync: API Key for ${embeddingProvider.toUpperCase()} is missing.`);
        }

        await this.indexData(dataSources, apiKey, aiConfigId);
    },

    async indexData(dataSources: any[], apiKey: string, aiConfigId: string | number) {
        const providerTag = 'pgvector';
        const toIndex = dataSources.filter((s: Record<string, unknown>) => !(s.indexedProviders as any[])?.includes(providerTag));
        initProgress(aiConfigId, toIndex);

        for (const source of dataSources) {
            if (source.indexedProviders?.includes(providerTag)) continue;

            updateFileProgress(aiConfigId, source.id, 'indexing');

            let chunks: string[] = [];

            if (source.type === 'qa' && source.question && source.answer) {
                chunks = [`Question: ${source.question}\nAnswer: ${source.answer}`];
            } else if (source.type === 'file' && source.fileUrl && source.fileName) {
                // pgVector chỉ index docx và excel — bỏ qua các định dạng khác (pdf, txt, v.v.)
                const ext = path.extname(source.fileName).toLowerCase();
                const SUPPORTED_EXTENSIONS = ['.docx', '.xlsx', '.xls', '.csv'];
                if (!SUPPORTED_EXTENSIONS.includes(ext)) {
                    console.log(`[PGVECTOR INDEX] Skipping unsupported file type (${ext}) for source ${source.id}: ${source.fileName}`);
                    updateFileProgress(aiConfigId, source.id, 'skipped');
                    // Mark as indexed so it won't be retried on every sync
                    await trainingDataModel.addIndexedProvider(source.id, providerTag);
                    continue;
                }
                let rawText: string | null = null;
                try {
                    rawText = await fileParserService.extractText(source.fileUrl, source.fileName);
                } catch (fileError) {
                    console.error(`[PGVECTOR] Failed to parse file ${source.fileName} (ID: ${source.id}):`, fileError);
                    updateFileProgress(aiConfigId, source.id, 'failed');
                    continue;
                }
                if (rawText?.trim()) chunks = chunkText(rawText);
            } else if (source.type === 'document' && source.summary) {
                chunks = chunkText(source.summary);
            }

            if (chunks.length === 0) {
                console.warn(`[PGVECTOR INDEX] Empty content for source ${source.id} (${source.fileName || source.type}). Skipping.`);
                updateFileProgress(aiConfigId, source.id, 'skipped');
                await trainingDataModel.addIndexedProvider(source.id, providerTag);
                continue;
            }

            console.log(`[PGVECTOR INDEX] Source ${source.id} (${source.type}) → ${chunks.length} chunk(s)`);

            // Clear old embeddings for this specific source if re-indexing
            await pool.query(
                'DELETE FROM vector_embeddings WHERE ai_config_id = $1 AND source_id = $2',
                [aiConfigId, source.id]
            ).catch(() => {});

            let sourceFailed = false;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunkContent = chunks[chunkIdx];
                // Log progress mỗi 5 chunks để dễ theo dõi trên VPS
                if (chunkIdx === 0 || (chunkIdx + 1) % 5 === 0 || chunkIdx === chunks.length - 1) {
                    console.log(`[PGVECTOR INDEX] Source ${source.id}: embedding chunk ${chunkIdx + 1}/${chunks.length}...`);
                }
                try {
                    const vector = await generateGeminiEmbedding(chunkContent, apiKey);
                    const vectorStr = `[${vector.join(',')}]`;

                    await pool.query(
                        `INSERT INTO vector_embeddings (ai_config_id, source_id, source_type, content, chunk_index, embedding)
                         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
                        [aiConfigId, source.id, source.type, chunkContent, chunkIdx, vectorStr]
                    );

                    // Pause 500ms mỗi 5 chunks để tránh rate limit Gemini
                    if ((chunkIdx + 1) % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (embedErr: any) {
                    console.error(`[PGVECTOR INDEX] Embedding failed for source ${source.id} chunk ${chunkIdx}/${chunks.length}:`, embedErr.message);
                    sourceFailed = true;
                    break;
                }
            }

            if (!sourceFailed) {
                await trainingDataModel.addIndexedProvider(source.id, providerTag);
                updateFileProgress(aiConfigId, source.id, 'completed');
                console.log(`[PGVECTOR INDEX] ✓ Source ${source.id} fully indexed: ${chunks.length} chunks saved to vector_embeddings.`);
            } else {
                updateFileProgress(aiConfigId, source.id, 'failed');
                console.error(`[PGVECTOR INDEX] ✗ Source ${source.id} indexing FAILED. Chunks processed before failure: ${chunks.length}.`);
            }
        }
    },

    async search(aiConfigId: string | number, queryText: string, apiKey: string, limit = 5) {
        try {
            await this.ensureSchema();
            const queryVector = await generateGeminiEmbedding(queryText, apiKey, true);
            const vectorStr = `[${queryVector.join(',')}]`;

            const res = await pool.query(
                `SELECT content, source_type as "sourceType", source_id as "sourceId", (1 - (embedding <=> $1::vector)) as score
                 FROM vector_embeddings
                 WHERE ai_config_id = $2
                 ORDER BY embedding <=> $1::vector ASC
                 LIMIT $3`,
                [vectorStr, aiConfigId, limit]
            );

            return res.rows.map(row => ({
                content: row.content,
                sourceType: row.sourceType,
                sourceId: row.sourceId,
                score: parseFloat(row.score)
            }));
        } catch (error: any) {
            console.error('[PGVECTOR SEARCH] Search failed:', error.message);
            return [];
        }
    },

    async deleteDataByAiConfigId(aiConfigId: string | number) {
        try {
            await pool.query('DELETE FROM vector_embeddings WHERE ai_config_id = $1', [aiConfigId]);
            console.log(`[PGVECTOR] Deleted all embeddings for aiConfigId ${aiConfigId}`);
        } catch (error: any) {
            console.error(`[PGVECTOR] Failed to delete embeddings for aiConfigId ${aiConfigId}:`, error.message);
        }
    },

    async deleteDataBySourceId(sourceId: string | number) {
        try {
            await pool.query('DELETE FROM vector_embeddings WHERE source_id = $1', [sourceId]);
            console.log(`[PGVECTOR] Deleted embeddings for sourceId ${sourceId}`);
        } catch (error: any) {
            console.error(`[PGVECTOR] Failed to delete embeddings for sourceId ${sourceId}:`, error.message);
        }
    }
};
