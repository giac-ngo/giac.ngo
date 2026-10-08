// server/scripts/create_space_admin.cjs
// Script tự động tạo tài khoản và cấp toàn quyền Admin Space cho Space giac.ngo
// Chạy trên VPS: node server/scripts/create_space_admin.cjs [email] [password] [spaceSlug]

const path = require('path');
const crypto = require('crypto');

// Load env từ server/.env
require(path.join(__dirname, '../node_modules/dotenv')).config({ 
    path: path.join(__dirname, '../.env') 
});
const { Pool } = require(path.join(__dirname, '../node_modules/pg'));

// Tham số đầu vào (mặc định: admin@giac.ngo / password / giac-ngo)
const targetEmail = (process.argv[2] || 'admin@giac.ngo').toLowerCase().trim();
const targetPassword = process.argv[3] || 'password';
const targetSlug = (process.argv[4] || 'giac-ngo').trim();

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
    const candidateUrls = [
        process.env.DATABASE_URL,
        'postgres://postgres:root@localhost:5432/giacngo',
        process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/@[^:]+:/, '@127.0.0.1:') : null
    ].filter(Boolean);

    for (const url of candidateUrls) {
        try {
            const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
            await pool.query('SELECT 1');
            return pool;
        } catch (err) {
            // Thử URL tiếp theo
        }
    }
    throw new Error('Không thể kết nối đến PostgreSQL qua các cấu hình DATABASE_URL.');
}

async function run() {
    console.log('========================================================');
    console.log(`🚀 BẮT ĐẦU TẠO TÀI KHOẢN & PHÂN QUYỀN ADMIN SPACE`);
    console.log(`   - Email:      ${targetEmail}`);
    console.log(`   - Mật khẩu:   ${targetPassword}`);
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
        // 1. Tự động chạy migration nếu bảng space_admins chưa tồn tại (chạy ngoài transaction block)
        console.log('1. Kiểm tra cấu trúc bảng space_admins...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS space_admins (
                space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
                user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
                added_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY (space_id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_space_admins_user ON space_admins(user_id);
        `);
        console.log('   ✅ Bảng space_admins đã sẵn sàng.\n');

        await client.query('BEGIN');

        // 2. Tìm Không gian theo slug hoặc domain
        console.log(`2. Tìm Không gian "${targetSlug}"...`);
        const spaceRes = await client.query(
            `SELECT id, name, slug, user_id, custom_domain 
             FROM spaces 
             WHERE slug = $1 OR custom_domain ILIKE $2 OR id = 1 
             ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END, id ASC 
             LIMIT 1`,
            [targetSlug, `%${targetSlug}%`]
        );

        if (spaceRes.rows.length === 0) {
            throw new Error(`Không tìm thấy Không gian "${targetSlug}" trong hệ thống!`);
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
            console.log(`   -> Đang cập nhật mật khẩu mới và kích hoạt tài khoản...`);
            await client.query(
                `UPDATE users 
                 SET password = $1, is_active = true, template = 'giacngo' 
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
                    is_active, template, api_token
                 ) VALUES ($1, $2, $3, $4, 1000, 1000, true, 'giacngo', $5)
                 RETURNING id, email, name`,
                [
                    targetEmail,
                    hashedPassword,
                    'Admin Giác Ngộ',
                    `https://ui-avatars.com/api/?name=${encodeURIComponent('Admin Giác Ngộ')}&background=B45309&color=fff`,
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
             SELECT $1, $2
             WHERE NOT EXISTS (
                 SELECT 1 FROM space_members WHERE space_id = $1 AND user_id = $2
             )`,
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

        // 6. Kích hoạt cờ admin nếu các cột tương ứng có tồn tại
        const hasAdminCol = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin'`);
        if (hasAdminCol.rows.length > 0) {
            await client.query(`UPDATE users SET is_admin = true WHERE id = $1`, [user.id]);
            console.log(`   ✅ Đã kích hoạt cờ is_admin = true.`);
        }

        const hasGlobalAdminCol = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_global_admin'`);
        if (hasGlobalAdminCol.rows.length > 0) {
            await client.query(`UPDATE users SET is_global_admin = true WHERE id = $1`, [user.id]);
            console.log(`   ✅ Đã kích hoạt cờ is_global_admin = true.`);
        }

        // 7. Gán vai trò Admin vào user_roles một cách an toàn
        const superRoleRes = await client.query(`
            SELECT id FROM roles 
            WHERE space_id IS NULL OR name ILIKE '%Owner%' OR name ILIKE '%Admin%' 
            ORDER BY array_length(permissions, 1) DESC NULLS LAST 
            LIMIT 1
        `);
        if (superRoleRes.rows.length > 0) {
            const roleId = superRoleRes.rows[0].id;
            await client.query(`
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, role_id) DO NOTHING
            `, [user.id, roleId]);
            console.log(`   ✅ Đã gán vai trò Super Admin (Role ID: ${roleId}) vào user_roles.`);
        }

        await client.query('COMMIT');

        console.log('\n========================================================');
        console.log('🎉 THÀNH CÔNG RỰC RỠ!');
        console.log('========================================================');
        console.log(`Tài khoản:     ${targetEmail}`);
        console.log(`Mật khẩu:      ${targetPassword}`);
        console.log(`Quyền hạn:     ADMIN SPACE (Toàn quyền quản trị Không gian ${space.name})`);
        console.log(`Đăng nhập tại: https://giac.ngo`);
        console.log('========================================================\n');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('\n❌ GẶP LỖI:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
