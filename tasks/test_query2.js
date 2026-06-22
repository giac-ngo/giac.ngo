import { pool } from '../server/db.js';
async function test() {
    const res = await pool.query('SELECT DISTINCT unnest(permissions) as p FROM roles');
    console.log(res.rows);
    process.exit(0);
}
test();
