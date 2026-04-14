/**
 * fixOrphanMedia.js
 * 
 * Copies (does NOT delete) orphan files found in legacy folders into the
 * correct new category folder, so they appear in the MediaPickerModal.
 * 
 * Run: node scripts/fixOrphanMedia.js
 */

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

/** Copy all files from srcDir into destDir (flat, no sub-dirs). Skip duplicates. */
async function copyAll(srcDir, destDir, label) {
    let entries;
    try {
        entries = await fs.readdir(srcDir, { withFileTypes: true });
    } catch (e) {
        if (e.code !== 'ENOENT') err(`Cannot read ${srcDir}`, e);
        return 0;
    }
    await ensureDir(destDir);
    let count = 0;
    for (const entry of entries) {
        if (entry.isDirectory()) continue; // skip subdirs
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);
        try {
            await fs.access(dest); // already exists → skip
        } catch {
            try {
                await fs.copyFile(src, dest);
                log(`Copied [${label}] ${entry.name}`);
                count++;
            } catch (e) {
                err(`Failed to copy ${entry.name}`, e);
            }
        }
    }
    return count;
}

async function run() {
    log('Starting Orphan Media Fix...\n');

    // ── Space 1 ────────────────────────────────────────────────────────────────

    // 1. Old /space-1/avatars/ → /space-1/ai/  (AI avatars were stored here)
    {
        const src = path.join(uploadsDir, 'space-1', 'avatars');
        const dest = path.join(uploadsDir, 'space-1', 'ai');
        const n = await copyAll(src, dest, 'space-1/avatars → ai');
        log(`space-1 avatars: ${n} file(s) copied to ai/`);
    }

    // 2. Old /space-1/media-library/ root files → /space-1/ai/ 
    //    (some AI avatars were saved here directly)
    {
        const src = path.join(uploadsDir, 'space-1', 'media-library');
        const dest = path.join(uploadsDir, 'space-1', 'ai');
        const n = await copyAll(src, dest, 'space-1/media-library → ai');
        log(`space-1 media-library root: ${n} file(s) copied to ai/`);
    }

    // 3. Old /space-1/DharmaTalks/ (capital D) → /space-1/dharma-talks/
    {
        const src = path.join(uploadsDir, 'space-1', 'DharmaTalks');
        const dest = path.join(uploadsDir, 'space-1', 'dharma-talks');
        const n = await copyAll(src, dest, 'DharmaTalks → dharma-talks');
        log(`space-1 DharmaTalks: ${n} file(s) copied`);
    }

    // 4. Old /space-1/Spaces/ → /space-1/assets/
    {
        const src = path.join(uploadsDir, 'space-1', 'Spaces');
        const dest = path.join(uploadsDir, 'space-1', 'assets');
        const n = await copyAll(src, dest, 'Spaces → assets');
        log(`space-1 Spaces: ${n} file(s) copied`);
    }

    // 5. Old /space-1/Document/ (capital D) → /space-1/documents/
    {
        const src = path.join(uploadsDir, 'space-1', 'Document');
        const dest = path.join(uploadsDir, 'space-1', 'documents');
        const n = await copyAll(src, dest, 'Document → documents');
        log(`space-1 Document: ${n} file(s) copied`);
    }

    // ── Other Spaces ───────────────────────────────────────────────────────────

    // 6. space-2/Spaces/ → space-2/assets/
    {
        const src = path.join(uploadsDir, 'space-2', 'Spaces');
        const dest = path.join(uploadsDir, 'space-2', 'assets');
        const n = await copyAll(src, dest, 'space-2/Spaces → assets');
        log(`space-2 Spaces: ${n} file(s) copied`);
    }

    // 7. space-41/Document/ → space-41/documents/
    {
        const src = path.join(uploadsDir, 'space-41', 'Document');
        const dest = path.join(uploadsDir, 'space-41', 'documents');
        const n = await copyAll(src, dest, 'space-41/Document → documents');
        log(`space-41 Document: ${n} file(s) copied`);
    }

    // 8. space-42/Document/ → space-42/documents/
    {
        const src = path.join(uploadsDir, 'space-42', 'Document');
        const dest = path.join(uploadsDir, 'space-42', 'documents');
        const n = await copyAll(src, dest, 'space-42/Document → documents');
        log(`space-42 Document: ${n} file(s) copied`);
    }

    log('\nOrphan fix done. Files have been COPIED (originals kept in legacy folders).');
    log('Tip: After verifying the app works, you can safely delete the empty legacy folders.');
    process.exit(0);
}

run().catch(e => {
    console.error('[FATAL]', e);
    process.exit(1);
});
