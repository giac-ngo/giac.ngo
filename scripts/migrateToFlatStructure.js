/**
 * migrateToFlatStructure.js
 * 
 * Migrates from category-based structure to flat 2-level structure:
 *   OLD: uploads/space-{id}/{category}/...
 *   NEW: uploads/space-{id}/              (space-level files)
 *        uploads/space-{id}/user-{id}/    (user personal files)
 * 
 * Run: node scripts/migrateToFlatStructure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const uploadsDir = path.join(__dirname, '../uploads');

// Connect to DB
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Space-level categories (go to flat space-{id}/)
const SPACE_CATEGORIES = ['ai', 'training', 'documents', 'dharma-talks', 'dharmatalks', 'meditation', 'assets', 'plans'];
// User-level categories (go to space-{id}/user-{id}/)
const USER_CATEGORIES = ['avatar', 'social', 'media-library'];

/**
 * Resolve unique filename — append _ before ext if conflict
 */
function resolveUnique(dir, fileName) {
    let candidate = fileName;
    while (fs.existsSync(path.join(dir, candidate))) {
        const ext = path.extname(candidate);
        const base = path.basename(candidate, ext);
        candidate = `${base}_${ext}`;
    }
    return candidate;
}

/**
 * Move a file, ensure dest dir exists, handle naming conflict
 * Returns { oldPath, newPath, url }
 */
async function moveFile(srcPath, destDir) {
    await fs.promises.mkdir(destDir, { recursive: true });
    const fileName = path.basename(srcPath);
    const uniqueName = resolveUnique(destDir, fileName);
    const destPath = path.join(destDir, uniqueName);
    await fs.promises.rename(srcPath, destPath);
    return { srcPath, destPath, uniqueName };
}

/**
 * Build URL mapping: old relative path → new relative path
 */
function toUrl(p) {
    return '/uploads/' + path.relative(uploadsDir, p).replace(/\\/g, '/');
}

async function main() {
    console.log('=== Migrate to Flat Media Structure ===\n');

    const urlMap = {}; // old URL → new URL

    // Find all space-{id} directories
    const entries = await fs.promises.readdir(uploadsDir, { withFileTypes: true });
    const spaceDirs = entries.filter(e => e.isDirectory() && /^space-\d+$/.test(e.name));

    for (const spaceDir of spaceDirs) {
        const spaceRoot = path.join(uploadsDir, spaceDir.name);
        const spaceId = spaceDir.name.replace('space-', '');
        console.log(`\nProcessing ${spaceDir.name}...`);

        const subDirs = await fs.promises.readdir(spaceRoot, { withFileTypes: true });

        for (const sub of subDirs) {
            if (!sub.isDirectory()) continue;
            const subName = sub.name;
            const subPath = path.join(spaceRoot, subName);

            // ─── Space-level categories → flat space-{id}/ ───
            if (SPACE_CATEGORIES.includes(subName)) {
                console.log(`  Flattening ${subName}/`);
                const files = await getAllFiles(subPath);
                for (const filePath of files) {
                    const oldUrl = toUrl(filePath);
                    const { destPath } = await moveFile(filePath, spaceRoot);
                    const newUrl = toUrl(destPath);
                    if (oldUrl !== newUrl) {
                        urlMap[oldUrl] = newUrl;
                        console.log(`    ${oldUrl} → ${newUrl}`);
                    }
                }
                // Remove empty category dir
                await removeEmptyDir(subPath);
            }

            // ─── User-level categories → flat space-{id}/user-{id}/ ───
            else if (USER_CATEGORIES.includes(subName)) {
                console.log(`  Processing user category ${subName}/`);
                // Each subfolder is user-{id} or numeric userId
                const userEntries = await fs.promises.readdir(subPath, { withFileTypes: true });
                for (const userEntry of userEntries) {
                    if (!userEntry.isDirectory()) {
                        // File directly in category (no user subfolder) → skip or move to space root
                        const filePath = path.join(subPath, userEntry.name);
                        const oldUrl = toUrl(filePath);
                        const { destPath } = await moveFile(filePath, spaceRoot);
                        const newUrl = toUrl(destPath);
                        if (oldUrl !== newUrl) {
                            urlMap[oldUrl] = newUrl;
                            console.log(`    (no-user) ${oldUrl} → ${newUrl}`);
                        }
                        continue;
                    }

                    const userDirName = userEntry.name; // e.g. "user-5" or "5"
                    const userId = userDirName.replace('user-', '');
                    const userSrcPath = path.join(subPath, userDirName);
                    const userDestDir = path.join(spaceRoot, `user-${userId}`);

                    const files = await getAllFiles(userSrcPath);
                    for (const filePath of files) {
                        const oldUrl = toUrl(filePath);
                        const { destPath } = await moveFile(filePath, userDestDir);
                        const newUrl = toUrl(destPath);
                        if (oldUrl !== newUrl) {
                            urlMap[oldUrl] = newUrl;
                            console.log(`    ${oldUrl} → ${newUrl}`);
                        }
                    }
                    await removeEmptyDir(userSrcPath);
                }
                await removeEmptyDir(subPath);
            }
        }
    }

    console.log(`\n✓ Moved ${Object.keys(urlMap).length} files. Updating DB...\n`);

    // ─── Update DB URLs ───
    await updateDatabase(urlMap);

    console.log('\n✅ Migration complete!');
    await pool.end();
}

async function getAllFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await getAllFiles(full, results);
        else results.push(full);
    }
    return results;
}

async function removeEmptyDir(dir) {
    try {
        const files = await getAllFiles(dir);
        if (files.length === 0) {
            await fs.promises.rm(dir, { recursive: true, force: true });
            console.log(`    Removed empty dir: ${path.relative(uploadsDir, dir)}`);
        }
    } catch (e) {
        console.warn(`    Could not remove ${dir}: ${e.message}`);
    }
}

async function updateDatabase(urlMap) {
    if (Object.keys(urlMap).length === 0) {
        console.log('  No URL changes needed.');
        return;
    }

    // Tables and columns to update
    const targets = [
        { table: 'ai_configs',           columns: ['avatar_url', 'logo_url'] },
        { table: 'training_data_sources',columns: ['file_url'] },
        { table: 'documents',            columns: ['thumbnail_url', 'audio_url', 'audio_url_en'] },
        { table: 'dharma_talks',         columns: ['url', 'url_en', 'audio_url', 'audio_url_en', 'speaker_avatar_url', 'thumbnail_url'] },
        { table: 'meditation_sessions',  columns: ['audio_url', 'audio_url_en', 'end_audio_url', 'end_audio_url_en'] },
        { table: 'pricing_plans',        columns: ['image_url'] },
        { table: 'spaces',               columns: ['image_url', 'favicon_url', 'qr_code_url'] },
        { table: 'users',                columns: ['avatar_url'] },
    ];

    for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
        for (const { table, columns } of targets) {
            for (const col of columns) {
                // Check if column exists first
                try {
                    const res = await pool.query(
                        `UPDATE ${table} SET ${col} = $1 WHERE ${col} = $2`,
                        [newUrl, oldUrl]
                    );
                    if (res.rowCount > 0) {
                        console.log(`  Updated ${table}.${col}: ${oldUrl} → ${newUrl}`);
                    }
                } catch (e) {
                    if (!e.message.includes('column') && !e.message.includes('does not exist')) {
                        console.warn(`  Warning updating ${table}.${col}: ${e.message}`);
                    }
                }
            }
        }

        // Handle array column: social_posts.image_urls (TEXT[])
        try {
            const res = await pool.query(
                `UPDATE social_posts
                 SET image_urls = array_replace(image_urls, $1, $2)
                 WHERE $1 = ANY(image_urls)`,
                [oldUrl, newUrl]
            );
            if (res.rowCount > 0) {
                console.log(`  Updated social_posts.image_urls: ${oldUrl} → ${newUrl}`);
            }
        } catch (e) {
            console.warn(`  Warning updating social_posts.image_urls: ${e.message}`);
        }
    }
}

main().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
