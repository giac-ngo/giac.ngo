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
    const res = await pool.query("SELECT s.id, s.name, s.slug, (SELECT COUNT(*) FROM space_members WHERE space_id = s.id) as count FROM spaces s WHERE s.slug IN ('thile', 'giac-ngo', 'stillenvc')");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
