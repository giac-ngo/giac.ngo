const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '1',
  host: '127.0.0.1',
  port: 5432,
  database: 'postgres',
});

async function check() {
  try {
    const res = await pool.query("SELECT email, is_global_admin FROM users WHERE email IN ('admin@giac.ngo', 'info@thile.ai')");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
check();
