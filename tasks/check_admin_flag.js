import { pool } from './server/db.js';

async function checkAdmins() {
  try {
    const res = await pool.query('SELECT email, is_global_admin FROM users WHERE email IN ($1, $2)', ['admin@giac.ngo', 'info@thile.ai']);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkAdmins();
