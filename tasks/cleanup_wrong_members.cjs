// Script: Liệt kê và xóa các space_members bị auto-add sai
// Chạy: node tasks/cleanup_wrong_members.cjs

const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../server/node_modules/pg'));
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({ path: path.resolve(__dirname, '../server/.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        // 1. Liệt kê tất cả space_members (không phải owner)
        const res = await pool.query(`
            SELECT sm.space_id, s.slug, s.name as space_name, 
                   sm.user_id, u.email, u.name as user_name,
                   CASE WHEN s.user_id = sm.user_id THEN 'OWNER' ELSE 'MEMBER' END as role
            FROM space_members sm
            JOIN spaces s ON sm.space_id = s.id
            JOIN users u ON sm.user_id = u.id
            ORDER BY s.slug
        `);

        console.log('\n=== TẤT CẢ SPACE MEMBERS ===\n');
        console.log('Space Slug'.padEnd(15), 'Space Name'.padEnd(20), 'User Email'.padEnd(30), 'User Name'.padEnd(20), 'Role'.padEnd(8), 'Added At');
        console.log('-'.repeat(130));
        
        for (const row of res.rows) {
            console.log(
                row.slug.padEnd(15),
                row.space_name.padEnd(20),
                row.email.padEnd(30),
                row.user_name.padEnd(20),
                row.role.padEnd(8),
                row.created_at
            );
        }

        console.log(`\nTổng: ${res.rows.length} entries`);

        // 2. Tìm members đáng ngờ: user có email domain khác với space
        // Ví dụ: info@thile.ai trong space stillenvc
        console.log('\n=== MEMBERS ĐÁNG NGỜ (email domain khác space) ===\n');
        
        const suspicious = res.rows.filter(row => {
            if (row.role === 'OWNER') return false;
            const emailDomain = row.email.split('@')[1];
            const slug = row.slug.toLowerCase();
            // Nếu email domain chứa slug name → thuộc space đó
            // Nếu không → đáng ngờ
            return !emailDomain.includes(slug) && !slug.includes(emailDomain.split('.')[0]);
        });

        if (suspicious.length === 0) {
            console.log('Không tìm thấy member đáng ngờ.');
        } else {
            for (const row of suspicious) {
                console.log(`  [?] ${row.email} trong space "${row.slug}" (added ${row.created_at})`);
            }
            console.log(`\n${suspicious.length} entries đáng ngờ.`);
            console.log('\nĐể xóa, chạy lại với flag --delete');
        }

        // 3. Nếu có flag --delete, xóa các entries đáng ngờ
        if (process.argv.includes('--delete')) {
            console.log('\n=== XÓA MEMBERS ĐÁNG NGỜ ===\n');
            for (const row of suspicious) {
                await pool.query('DELETE FROM space_members WHERE space_id = $1 AND user_id = $2', [row.space_id, row.user_id]);
                console.log(`  ✓ Đã xóa ${row.email} khỏi space "${row.slug}"`);
            }
            console.log(`\nĐã xóa ${suspicious.length} entries.`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

main();
