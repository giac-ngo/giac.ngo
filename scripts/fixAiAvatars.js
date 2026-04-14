/**
 * fixAiAvatars.js
 * Migrates AI avatar files into the correct /ai/ category folder
 * and updates DB accordingly.
 */
import { pool } from '../server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const log = (msg) => console.log(`[AI-FIX] ${msg}`);
const err = (msg, e) => console.error(`[ERROR] ${msg}`, e?.message || '');

async function ensureDir(d) {
    await fs.mkdir(d, { recursive: true });
}

async function run() {
    log('Starting AI Avatar Migration...');

    const res = await pool.query('SELECT id, name, space_id, avatar_url FROM ai_configs ORDER BY id');
    log(`Found ${res.rows.length} AI configs`);

    for (const row of res.rows) {
        if (!row.avatar_url) continue;

        const spaceId = row.space_id;
        const safeSpaceId = spaceId ? String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
        
        // Check if already in correct ai/ folder
        const correctPrefix = `/uploads/space-${safeSpaceId}/ai/`;
        if (row.avatar_url.startsWith(correctPrefix)) {
            log(`AI ${row.id} (${row.name}) already correct: ${row.avatar_url}`);
            continue;
        }

        // Get physical file path
        const oldRelative = row.avatar_url.replace(/^\/uploads\//, '');
        const oldAbsolute = path.join(uploadsDir, oldRelative);
        
        // Check if file exists
        let fileExists = false;
        try {
            await fs.access(oldAbsolute);
            fileExists = true;
        } catch {
            log(`AI ${row.id} (${row.name}) file not found on disk: ${oldAbsolute}`);
        }

        const fileName = path.basename(oldRelative);
        const destDir = path.join(uploadsDir, `space-${safeSpaceId}`, 'ai');
        const destAbsolute = path.join(destDir, fileName);
        const newUrl = `${correctPrefix}${fileName}`;

        if (fileExists) {
            try {
                await ensureDir(destDir);
                
                // Check if dest already exists
                try {
                    await fs.access(destAbsolute);
                    log(`AI ${row.id} dest already exists, skipping file copy`);
                } catch {
                    await fs.copyFile(oldAbsolute, destAbsolute);
                    log(`Copied: ${oldAbsolute} -> ${destAbsolute}`);
                }
            } catch (e) {
                err(`Failed to copy file for AI ${row.id}`, e);
            }
        }

        // Always update DB with new URL path
        await pool.query('UPDATE ai_configs SET avatar_url = $1 WHERE id = $2', [newUrl, row.id]);
        log(`Updated DB for AI ${row.id} (${row.name}): ${row.avatar_url} -> ${newUrl}`);
    }

    log('\nAI Avatar migration complete.');
    await pool.end();
    process.exit(0);
}

run().catch(e => {
    console.error('[FATAL]', e);
    process.exit(1);
});
