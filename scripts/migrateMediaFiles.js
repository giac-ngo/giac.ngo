import { pool } from '../server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');

const log = (msg) => console.log(`[MIGRATION] ${msg}`);
const err = (msg, e) => console.error(`[ERROR] ${msg}`, e?.message || e);

/** Ensure a directory exists */
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (e) {
        if (e.code !== 'EEXIST') throw e;
    }
}

/** 
 * Safely move a file from an old URL to a new structured URL 
 * Returns the new URL if successful or if file already in correct place.
 * Returns null if file not found or error.
 */
async function migrateFile(oldUrl, spaceId, category, userId = null) {
    if (!oldUrl) return null;

    // Check if already correct: /uploads/space-{spaceId}/{category}/...
    const safeSpaceId = (spaceId && spaceId !== 'global' && spaceId !== 'system') 
        ? String(spaceId).replace(/[^a-zA-Z0-9_-]/g, '_') 
        : 'global';
    
    // Some categories (like avatar) might be user-scoped in the future, 
    // but globally for database we can just put them in the category folder.
    // Notice: mediaController.js scopes avatar with user-{userId} for regular users, 
    // but admin sees the whole category. Let's just put it in the category root or user root.
    const userScope = (userId && ['avatar', 'social', 'media-library'].includes(category)) ? `user-${userId}` : '';
    const newRelativeDir = path.join(`space-${safeSpaceId}`, category, userScope);
    const expectedPrefix = `/uploads/${newRelativeDir.replace(/\\/g, '/')}/`;

    if (oldUrl.startsWith(expectedPrefix)) {
        return oldUrl; // Already correct
    }

    // Clean old relative path
    const oldRelativePath = oldUrl.replace(/^\/uploads\//, '');
    const oldAbsolute = path.join(uploadsDir, oldRelativePath);

    // Check if file exists physically
    try {
        await fs.access(oldAbsolute);
    } catch (e) {
        // file doesn't exist on disk, we can't migrate it physically
        // but we might still leave the URL as is, or return oldUrl so DB doesn't null it
        return oldUrl; 
    }

    // Prepare target
    const fileName = path.basename(oldRelativePath);
    const targetAbsoluteDir = path.join(uploadsDir, newRelativeDir);
    const targetAbsolute = path.join(targetAbsoluteDir, fileName);

    if (oldAbsolute === targetAbsolute) return oldUrl; // same file

    try {
        await ensureDir(targetAbsoluteDir);
        // Rename/move file
        await fs.rename(oldAbsolute, targetAbsolute);
        const newUrl = `${expectedPrefix}${fileName}`;
        log(`Moved: ${oldUrl} -> ${newUrl}`);
        return newUrl;
    } catch (e) {
        // If cross-device link error, try copy then unlink
        if (e.code === 'EXDEV') {
            try {
                 await fs.copyFile(oldAbsolute, targetAbsolute);
                 await fs.unlink(oldAbsolute);
                 const newUrl = `${expectedPrefix}${fileName}`;
                 log(`Moved (Copy+Del): ${oldUrl} -> ${newUrl}`);
                 return newUrl;
            } catch (copyErr) {
                 err(`Failed to copy file ${oldAbsolute}`, copyErr);
                 return oldUrl;
            }
        }
        err(`Failed to move file ${oldAbsolute}`, e);
        return oldUrl;
    }
}

async function run() {
    log('Starting Database Media Migration...');
    
    try {
        // 1. Documents
        log('--- Migrating Documents ---');
        const docsRes = await pool.query('SELECT id, space_id, thumbnail_url, audio_url, audio_url_en FROM documents');
        for (const row of docsRes.rows) {
            let updated = false;
            let { thumbnail_url, audio_url, audio_url_en } = row;

            const newThumb = await migrateFile(thumbnail_url, row.space_id, 'documents');
            const newAudio = await migrateFile(audio_url, row.space_id, 'documents');
            const newAudioEn = await migrateFile(audio_url_en, row.space_id, 'documents');

            if (newThumb !== thumbnail_url || newAudio !== audio_url || newAudioEn !== audio_url_en) {
                await pool.query(
                    'UPDATE documents SET thumbnail_url = $1, audio_url = $2, audio_url_en = $3 WHERE id = $4',
                    [newThumb, newAudio, newAudioEn, row.id]
                );
                updated = true;
            }
            if (updated) log(`Updated DB for Document ID: ${row.id}`);
        }

        // 2. Dharma Talks
        log('--- Migrating Dharma Talks ---');
        const dharmaRes = await pool.query('SELECT id, space_id, speaker_avatar_url, url, url_en FROM dharma_talks');
        for (const row of dharmaRes.rows) {
            let updated = false;
            let { speaker_avatar_url, url, url_en } = row;

            const newAvatar = await migrateFile(speaker_avatar_url, row.space_id, 'dharma-talks');
            const newUrl = await migrateFile(url, row.space_id, 'dharma-talks');
            const newUrlEn = await migrateFile(url_en, row.space_id, 'dharma-talks');

            if (newAvatar !== speaker_avatar_url || newUrl !== url || newUrlEn !== url_en) {
                await pool.query(
                    'UPDATE dharma_talks SET speaker_avatar_url = $1, url = $2, url_en = $3 WHERE id = $4',
                    [newAvatar, newUrl, newUrlEn, row.id]
                );
                updated = true;
            }
            if (updated) log(`Updated DB for Dharma Talk ID: ${row.id}`);
        }

        // 3. Meditation Sessions
        log('--- Migrating Meditation Sessions ---');
        const medRes = await pool.query('SELECT id, space_id, audio_url, audio_url_en, end_audio_url, end_audio_url_en FROM meditation_sessions');
        for (const row of medRes.rows) {
            let updated = false;
            let { audio_url, audio_url_en, end_audio_url, end_audio_url_en } = row;

            const newAudioUrl = await migrateFile(audio_url, row.space_id, 'meditation');
            const newAudioEnUrl = await migrateFile(audio_url_en, row.space_id, 'meditation');
            const newEndAudioUrl = await migrateFile(end_audio_url, row.space_id, 'meditation');
            const newEndAudioEnUrl = await migrateFile(end_audio_url_en, row.space_id, 'meditation');

            if (newAudioUrl !== audio_url || newAudioEnUrl !== audio_url_en || newEndAudioUrl !== end_audio_url || newEndAudioEnUrl !== end_audio_url_en) {
                await pool.query(
                    'UPDATE meditation_sessions SET audio_url = $1, audio_url_en = $2, end_audio_url = $3, end_audio_url_en = $4 WHERE id = $5',
                    [newAudioUrl, newAudioEnUrl, newEndAudioUrl, newEndAudioEnUrl, row.id]
                );
                updated = true;
            }
            if (updated) log(`Updated DB for Meditation ID: ${row.id}`);
        }

        // 4. AI Configs
        log('--- Migrating AI Configs ---');
        const aiRes = await pool.query('SELECT id, space_id, avatar_url FROM ai_configs');
        for (const row of aiRes.rows) {
            const newAvatar = await migrateFile(row.avatar_url, row.space_id, 'ai');
            if (newAvatar !== row.avatar_url) {
                await pool.query('UPDATE ai_configs SET avatar_url = $1 WHERE id = $2', [newAvatar, row.id]);
                log(`Updated DB for AI Config ID: ${row.id}`);
            }
        }

        // 5. Training Data Sources
        log('--- Migrating Training Data Sources ---');
        const trainRes = await pool.query(`
            SELECT t.id, t.file_url, a.space_id 
            FROM training_data_sources t 
            LEFT JOIN ai_configs a ON t.ai_config_id = a.id 
            WHERE t.type = 'file'
        `);
        for (const row of trainRes.rows) {
            const newFile = await migrateFile(row.file_url, row.space_id, 'training');
            if (newFile !== row.file_url) {
                await pool.query('UPDATE training_data_sources SET file_url = $1 WHERE id = $2', [newFile, row.id]);
                log(`Updated DB for Training Data ID: ${row.id}`);
            }
        }

        // 6. Spaces
        log('--- Migrating Spaces ---');
        const spaceRes = await pool.query('SELECT id, icon_url, image_url, favicon_url, qr_code_image FROM spaces');
        for (const row of spaceRes.rows) {
            let updated = false;
            const newIcon = await migrateFile(row.icon_url, row.id, 'assets');
            const newImage = await migrateFile(row.image_url, row.id, 'assets');
            const newFavicon = await migrateFile(row.favicon_url, row.id, 'assets');
            const newQr = await migrateFile(row.qr_code_image, row.id, 'assets');

            if (newIcon !== row.icon_url || newImage !== row.image_url || newFavicon !== row.favicon_url || newQr !== row.qr_code_image) {
                await pool.query(
                    'UPDATE spaces SET icon_url = $1, image_url = $2, favicon_url = $3, qr_code_image = $4 WHERE id = $5',
                    [newIcon, newImage, newFavicon, newQr, row.id]
                );
                updated = true;
            }
            if (updated) log(`Updated DB for Space ID: ${row.id}`);
        }

        // 7. Pricing Plans
        log('--- Migrating Pricing Plans ---');
        const planRes = await pool.query('SELECT id, space_id, image_url FROM pricing_plans');
        for (const row of planRes.rows) {
            const newImage = await migrateFile(row.image_url, row.space_id, 'plans');
            if (newImage !== row.image_url) {
                await pool.query('UPDATE pricing_plans SET image_url = $1 WHERE id = $2', [newImage, row.id]);
                log(`Updated DB for Pricing Plan ID: ${row.id}`);
            }
        }

        // 8. Users
        log('--- Migrating Users ---');
        const userRes = await pool.query('SELECT id, avatar_url FROM users');
        for (const row of userRes.rows) {
            // User avatars usually go to global space with user scope, 
            // but the mediaController.js specifies `space-global/avatar/user-{id}` if we want to be strict.
            // Actually, let's just put it in `global` space -> `avatar` -> `user-{id}`
            const newAvatar = await migrateFile(row.avatar_url, 'global', 'avatar', row.id);
            if (newAvatar !== row.avatar_url) {
                await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [newAvatar, row.id]);
                log(`Updated DB for User ID: ${row.id}`);
            }
        }

    } catch (e) {
        err('Migration failed unexpectedly', e);
    } finally {
        // We do not end the pool because the app might be running/db.js holds it open.
        log('Migration Finished.');
        process.exit(0);
    }
}

run();
