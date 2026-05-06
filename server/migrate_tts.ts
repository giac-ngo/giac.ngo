import { pool } from './db.js';

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE ai_configs 
            ADD COLUMN IF NOT EXISTS tts_provider VARCHAR(50) DEFAULT 'gemini',
            ADD COLUMN IF NOT EXISTS tts_model VARCHAR(100) DEFAULT 'gemini-3.1-flash-tts-preview',
            ADD COLUMN IF NOT EXISTS tts_voice VARCHAR(100) DEFAULT '',
            ADD COLUMN IF NOT EXISTS tts_style TEXT DEFAULT '',
            ADD COLUMN IF NOT EXISTS tts_temperature NUMERIC DEFAULT 1.0;
        `);
        console.log("Migration successful.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit();
    }
}

migrate();
