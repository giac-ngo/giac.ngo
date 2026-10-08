// server/scripts/create_space_admin.cjs
// Script gán quyền Admin Space cho một người dùng trong Không gian cụ thể
// Sử dụng: node server/scripts/create_space_admin.cjs <email> <password> <spaceSlug>

const path = require('path');
const crypto = require('crypto');

// Load env từ server/.env
require(path.join(__dirname, '../node_modules/dotenv')).config({ 
    path: path.join(__dirname, '../.env') 
});
const { Pool } = require(path.join(__dirname, '../node_modules/pg'));

const targetEmail = process.argv[2] ? process.argv[2].toLowerCase().trim() : null;
const targetPassword = process.argv[3] ? process.argv[3].trim() : null;
const targetSlug = process.argv[4] ? process.argv[4].trim() : null;

if (!targetEmail || !targetPassword || !targetSlug) {
    console.error('❌ Thiếu tham số!');
    console.error('Cách dùng: node server/scripts/create_space_admin.cjs <email> <password> <spaceSlug>');
    process.exit(1);
}

// Hàm băm mật khẩu chuẩn scrypt (khớp 100% với hệ thống Bodhi/GiacNgo)
async function hashPassword(plainPassword) {
    const N = 8192, r = 8, p = 1, keylen = 64;
    const salt = crypto.randomBytes(8).toString('hex');
    const derivedKey = await new Promise((resolve, reject) => {
        crypto.scrypt(plainPassword, salt, keylen, { N, r, p }, (err, dk) => {
            if (err) return reject(err);
            resolve(dk);
        });
    });
    return `scrypt:${N}:${r}:${p}$${salt}$${derivedKey.toString('hex')}`;
}

async function getDbPool() {
    if (!process.env.DATABASE_URL) {
        throw new Error('Biến môi trường DATABASE_URL không tồn tại trong server/.env.');
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    await pool.query('SELECT 1');
    return pool;
}

async function run() {
    console.log('========================================================');
    console.log(`🚀 BẮT ĐẦU GÁN QUYỀN ADMIN SPACE`);
    console.log(`   - Email:      ${targetEmail}`);
    console.log(`   - Không gian: ${targetSlug}`);
    console.log('========================================================\n');

    let pool;
    try {
        pool = await getDbPool();
        console.log('✅ Đã kết nối cơ sở dữ liệu PostgreSQL thành công.\n');
    } catch (e) {
        console.error('❌ Lỗi kết nối CSDL:', e.message);
        process.exit(1);
    }

    const client = await pool.connect();

    try {
        // 1. Kiểm tra bảng space_admins đã được tạo qua migration chưa
        const tableCheck = await client.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'space_admins'
        `);
        if (tableCheck.rows.length === 0) {
            throw new Error('Bảng space_admins chưa tồn tại. Vui lòng chạy file migration supabase/migrations/20261008_space_admins.sql trước.');
        }
        console.log('1. Bảng space_admins đã sẵn sàng.');

        await client.query('BEGIN');

        // 2. Tìm Không gian theo đúng slug hoặc custom domain (không fallback id = 1)
        console.log(`2. Tìm Không gian "${targetSlug}"...`);
        const spaceRes = await client.query(
            `SELECT id, name, slug, user_id, custom_domain 
             FROM spaces 
             WHERE slug = $1 OR custom_domain = $1 
             LIMIT 1`,
            [targetSlug]
        );

        if (spaceRes.rows.length === 0) {
            throw new Error(`Không tìm thấy Không gian có slug hoặc custom_domain là "${targetSlug}" trong hệ thống!`);
        }
        const space = spaceRes.rows[0];
        console.log(`   ✅ Đã tìm thấy Không gian: [ID: ${space.id}] "${space.name}" (slug: ${space.slug})\n`);

        // 3. Tìm hoặc Tạo người dùng
        console.log(`3. Kiểm tra tài khoản "${targetEmail}"...`);
        const userCheck = await client.query(
            `SELECT id, email, name, is_active FROM users WHERE lower(email) = $1`,
            [targetEmail]
        );

        let user;
        const hashedPassword = await hashPassword(targetPassword);

        if (userCheck.rows.length > 0) {
            user = userCheck.rows[0];
            console.log(`   ℹ️ Tài khoản đã tồn tại: [User ID: ${user.id}] "${user.name}".`);
            console.log(`   -> Cập nhật mật khẩu và kích hoạt tài khoản...`);
            await client.query(
                `UPDATE users 
                 SET password = $1, is_active = true 
                 WHERE id = $2`,
                [hashedPassword, user.id]
            );
            console.log(`   ✅ Cập nhật mật khẩu thành công.`);
        } else {
            console.log(`   ℹ️ Tài khoản chưa tồn tại. Đang tạo tài khoản mới...`);
            const apiToken = crypto.randomBytes(24).toString('hex');
            const insertUserRes = await client.query(
                `INSERT INTO users (
                    email, password, name, avatar_url, merits, requests_remaining, 
                    is_active, api_token
                 ) VALUES ($1, $2, $3, $4, 0, 0, true, $5)
                 RETURNING id, email, name`,
                [
                    targetEmail,
                    hashedPassword,
                    'Admin ' + space.name,
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(space.name)}&background=B45309&color=fff`,
                    apiToken
                ]
            );
            user = insertUserRes.rows[0];
            console.log(`   ✅ Đã tạo tài khoản mới thành công: [User ID: ${user.id}].`);
        }
        console.log('');

        // 4. Thêm người dùng vào space_members
        console.log(`4. Gán quyền Thành viên (space_members) vào Không gian ${space.name}...`);
        await client.query(
            `INSERT INTO space_members (space_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT (space_id, user_id) DO NOTHING`,
            [space.id, user.id]
        );
        console.log(`   ✅ Đã gán vào space_members.`);

        // 5. Thêm người dùng vào space_admins
        console.log(`5. Cấp quyền Quản trị viên (space_admins) cho Không gian ${space.name}...`);
        await client.query(
            `INSERT INTO space_admins (space_id, user_id, added_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (space_id, user_id) DO NOTHING`,
            [space.id, user.id, space.user_id]
        );
        console.log(`   ✅ Đã gán vào space_admins.`);

        await client.query('COMMIT');

        console.log('\n========================================================');
        console.log('🎉 THÀNH CÔNG!');
        console.log('========================================================');
        console.log(`Tài khoản:     ${targetEmail}`);
        console.log(`Quyền hạn:     ADMIN SPACE cho "${space.name}" (Slug: ${space.slug})`);
        console.log('========================================================\n');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('\n❌ GẶP LỖI:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
