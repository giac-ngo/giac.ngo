import { pool } from '../server/db.js';

const docs = await pool.query("SELECT id, space_id, thumbnail_url FROM documents WHERE thumbnail_url LIKE '%/Document/%' LIMIT 20");
console.log('Wrong path docs:', docs.rows.length);
docs.rows.forEach(r => console.log(r.id, 'sp:' + r.space_id, r.thumbnail_url));

const dt = await pool.query("SELECT id, space_id, url FROM dharma_talks WHERE url LIKE '%/dharmatalks/%' LIMIT 10");
console.log('Wrong path dharma:', dt.rows.length);
dt.rows.forEach(r => console.log(r.id, r.url));

await pool.end();
process.exit(0);
