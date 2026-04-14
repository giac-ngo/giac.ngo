/**
 * fixLegacyDocuments.js
 * Fixes old documents with path like /uploads/Document/... (no space-id prefix)
 * Copies them to the correct /uploads/space-global/documents/ or /uploads/space-{id}/documents/
 * and updates the DB.
 */
import { pool } from '../server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const log = (msg) => console.log(`[FIX] ${msg}`);
const err = (msg, e) => console.error(`[ERROR] ${msg}`, e?.message || '');

async function ensureDir(d) {
    await fs.mkdir(d, { recursive: true });
}

async function migrateUrl(url, spaceId) {
    if (!url) return null;

    // Already in correct form: /uploads/space-X/documents/... or /uploads/space-global/...
    if (url.match(/\/uploads\/space-[^/]+\/documents\//)) return url;

    const oldRelative = url.replace(/^\/uploads\//, '');
    const oldAbsolute = path.join(uploadsDir, oldRelative);
    const fileName = path.basename(oldRelative);

    const safeSpaceId = spaceId ? String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
    const destDir = path.join(uploadsDir, `space-${safeSpaceId}`, 'documents');
    const destAbsolute = path.join(destDir, fileName);
    const newUrl = `/uploads/space-${safeSpaceId}/documents/${fileName}`;

    let fileExists = false;
    try {
        await fs.access(oldAbsolute);
        fileExists = true;
    } catch {
        log(`File not found on disk: ${oldAbsolute}`);
    }

    if (fileExists) {
        try {
            await ensureDir(destDir);
            try {
                await fs.access(destAbsolute);
                // already exists
            } catch {
                await fs.copyFile(oldAbsolute, destAbsolute);
                log(`Copied: ${fileName} -> space-${safeSpaceId}/documents/`);
            }
        } catch (e) {
            err(`Copy failed for ${fileName}`, e);
            return url; // keep old on error
        }
    }

    return newUrl;
}

async function run() {
    log('Fixing legacy documents...');

    // Fix all document fields that still have wrong paths
    const cols = ['thumbnail_url', 'audio_url', 'audio_url_en'];
    
    for (const col of cols) {
        const snakeCol = col; // already snake_case for DB
        const res = await pool.query(
            `SELECT id, space_id, ${col} FROM documents WHERE ${col} IS NOT NULL AND ${col} NOT LIKE '/uploads/space-%/documents/%'`
        );
        log(`  ${col}: ${res.rows.length} records to fix`);
        
        for (const row of res.rows) {
            const newUrl = await migrateUrl(row[col], row.space_id);
            if (newUrl !== row[col]) {
                await pool.query(`UPDATE documents SET ${col} = $1 WHERE id = $2`, [newUrl, row.id]);
                log(`  Updated doc ${row.id}: ${row[col]} -> ${newUrl}`);
            }
        }
    }

    // Also fix space-41 and space-42 documents that are still in Document/ path
    const res41 = await pool.query(
        "SELECT id, space_id, thumbnail_url FROM documents WHERE thumbnail_url LIKE '/uploads/space-41/%' AND thumbnail_url NOT LIKE '/uploads/space-41/documents/%'"
    );
    log(`space-41 wrong path: ${res41.rows.length}`);
    for (const row of res41.rows) {
        const newUrl = await migrateUrl(row.thumbnail_url, row.space_id);
        if (newUrl !== row.thumbnail_url) {
            await pool.query('UPDATE documents SET thumbnail_url = $1 WHERE id = $2', [newUrl, row.id]);
            log(`  Updated doc ${row.id}: ${row.thumbnail_url} -> ${newUrl}`);
        }
    }

    const res42 = await pool.query(
        "SELECT id, space_id, thumbnail_url FROM documents WHERE thumbnail_url LIKE '/uploads/space-42/%' AND thumbnail_url NOT LIKE '/uploads/space-42/documents/%'"
    );
    log(`space-42 wrong path: ${res42.rows.length}`);
    for (const row of res42.rows) {
        const newUrl = await migrateUrl(row.thumbnail_url, row.space_id);
        if (newUrl !== row.thumbnail_url) {
            await pool.query('UPDATE documents SET thumbnail_url = $1 WHERE id = $2', [newUrl, row.id]);
            log(`  Updated doc ${row.id}: ${row.thumbnail_url} -> ${newUrl}`);
        }
    }

    log('\nAll legacy documents fixed!');
    await pool.end();
    process.exit(0);
}

run().catch(e => {
    console.error('[FATAL]', e);
    process.exit(1);
});
