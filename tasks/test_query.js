import { pool } from '../server/db.js';
async function test() {
    try {
        console.log("=== USER ed@stillen.vc ===");
        const userRes = await pool.query("SELECT id, email, username, role, is_global_admin FROM users WHERE email = 'ed@stillen.vc'");
        console.log(userRes.rows);

        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;
            console.log("=== SPACES ed@stillen.vc IS MEMBER OF ===");
            const membersRes = await pool.query(`
                SELECT sm.*, s.name as space_name, s.slug as space_slug 
                FROM space_members sm
                JOIN spaces s ON sm.space_id = s.id
                WHERE sm.user_id = $1
            `, [userId]);
            console.log(membersRes.rows);
        } else {
            console.log("User not found!");
        }

        console.log("=== ALL SPACES ===");
        const spacesRes = await pool.query("SELECT id, name, slug FROM spaces");
        console.log(spacesRes.rows);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
