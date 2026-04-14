import { pool } from '../server/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadsDir = path.join(projectRoot, 'uploads');

async function ensureDir(d) { await fs.mkdir(d, { recursive: true }); }

const plans = await pool.query('SELECT id, plan_name, space_id, image_url FROM pricing_plans ORDER BY id');
console.log('=== Pricing Plans ===');
for (const row of plans.rows) {
    console.log(row.id, '|', row.plan_name, '| sp:', row.space_id, '|', row.image_url || 'null');
}

// Fix any that are not in /plans/ folder
for (const row of plans.rows) {
    if (!row.image_url) continue;
    const safeSpaceId = row.space_id ? String(row.space_id).replace(/[^a-zA-Z0-9_-]/g, '_') : 'global';
    const correctPrefix = `/uploads/space-${safeSpaceId}/plans/`;
    if (row.image_url.startsWith(correctPrefix)) continue;

    const fileName = path.basename(row.image_url.replace(/^\/uploads\//, ''));
    const oldAbsolute = path.join(uploadsDir, row.image_url.replace(/^\/uploads\//, ''));
    const destDir = path.join(uploadsDir, `space-${safeSpaceId}`, 'plans');
    const destAbsolute = path.join(destDir, fileName);
    const newUrl = `${correctPrefix}${fileName}`;

    let exists = false;
    try { await fs.access(oldAbsolute); exists = true; } catch {}

    if (exists) {
        try {
            await ensureDir(destDir);
            try { await fs.access(destAbsolute); } catch { await fs.copyFile(oldAbsolute, destAbsolute); console.log('Copied:', fileName); }
        } catch (e) { console.error('Copy failed:', e.message); }
    } else {
        console.log('File not found on disk:', oldAbsolute);
    }

    await pool.query('UPDATE pricing_plans SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
    console.log('Updated plan', row.id, '->', newUrl);
}

await pool.end();
process.exit(0);
