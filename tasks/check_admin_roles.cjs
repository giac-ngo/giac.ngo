const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../server/node_modules/pg'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        console.log('=== ADMIN ROLES IN DB ===');
        const res = await pool.query(`
            SELECT ur.*, r.name as role_name, r.permissions 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = 1
        `);
        console.log(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
