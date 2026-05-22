const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../server/node_modules/pg'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    const r1 = await pool.query(
        `DELETE FROM space_members WHERE space_id=(SELECT id FROM spaces WHERE slug='stillenvc') AND user_id=(SELECT id FROM users WHERE email='info@thile.ai') RETURNING *`
    );
    console.log('Xóa info@thile.ai khỏi stillenvc:', r1.rowCount, 'rows');

    const r2 = await pool.query(
        `DELETE FROM space_members WHERE space_id=(SELECT id FROM spaces WHERE slug='thile') AND user_id=(SELECT id FROM users WHERE email='stillenvc@gmail.com') RETURNING *`
    );
    console.log('Xóa stillenvc@gmail.com khỏi thile:', r2.rowCount, 'rows');

    await pool.end();
})();
