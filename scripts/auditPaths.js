import { pool } from '../server/db.js';

console.log('=== FINAL PATH AUDIT ===\n');

// Documents
const d1 = await pool.query("SELECT COUNT(*) FROM documents WHERE thumbnail_url IS NOT NULL AND thumbnail_url NOT LIKE '/uploads/space-%/%'");
console.log('Documents wrong thumbnail_url:', d1.rows[0].count);

const d2 = await pool.query("SELECT COUNT(*) FROM documents WHERE audio_url IS NOT NULL AND audio_url NOT LIKE '/uploads/space-%/%'");
console.log('Documents wrong audio_url:', d2.rows[0].count);

// Dharma talks
const dt = await pool.query("SELECT COUNT(*) FROM dharma_talks WHERE url IS NOT NULL AND url NOT LIKE '/uploads/space-%/%'");
console.log('DharmaTalks wrong url:', dt.rows[0].count);

// AI configs
const ai = await pool.query("SELECT COUNT(*) FROM ai_configs WHERE avatar_url IS NOT NULL AND avatar_url NOT LIKE '/uploads/space-%/%'");
console.log('AI configs wrong avatar_url:', ai.rows[0].count);

// Meditation
const med = await pool.query("SELECT COUNT(*) FROM meditation_sessions WHERE audio_url IS NOT NULL AND audio_url NOT LIKE '/uploads/space-%/%'");
console.log('Meditation wrong audio_url:', med.rows[0].count);

// Training
const tr = await pool.query("SELECT COUNT(*) FROM training_data_sources WHERE file_url IS NOT NULL AND file_url NOT LIKE '/uploads/space-%/%'");
console.log('Training wrong file_url:', tr.rows[0].count);

console.log('\n=== DONE ===');
await pool.end();
process.exit(0);
