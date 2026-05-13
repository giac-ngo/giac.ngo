import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='space_members'");
  console.log(res.rows);
  process.exit(0);
}
main();
