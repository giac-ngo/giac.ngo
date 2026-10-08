# Kế hoạch: Nhiều Admin Space cho 1 Space + tạo tài khoản admin@giac.ngo

Ngày: 08/10/2026 · Trạng thái: **CHỜ DUYỆT SQL** (theo quy tắc cau_truc.md: mọi SQL mới/sửa phải được chủ dự án đồng ý trước khi code)

## 0. Thay đổi so với quyết định cũ
- Cũ: "mỗi space có 1 admin và nhiều quản lý" (Admin Space = `spaces.user_id`, chỉ 1 người).
- Mới: **1 Space có nhiều Admin Space, thêm được nhiều người cùng lúc.** Quản lý Space (role) và User giữ nguyên.

Mô hình sau khi đổi:
| Cấp | Lưu ở đâu | Quyền |
|---|---|---|
| Admin chính | `users.is_global_admin` | Toàn nền tảng |
| Admin Space **chính** (chủ sở hữu) | `spaces.user_id` (giữ nguyên) | Toàn quyền trong Space + việc chỉ chủ sở hữu được làm (mục 2) |
| Admin Space **phụ** (mới, nhiều người) | bảng mới `space_admins` | Toàn quyền trong Space như chủ, trừ mục 2 |
| Quản lý Space | `user_roles` → `roles.space_id` | Theo permissions của role |
| User | `space_members` | Dùng Space |

Lý do không dùng "role có đủ mọi quyền" thay cho bảng mới: Quản lý có quyền `roles` có thể tự gán role đó cho mình (leo quyền), và không phân biệt được Admin với Quản lý trên UI/thống kê.

## 1. SQL cần duyệt (migration mới, chạy 1 lần)
```sql
-- migrations/2026-10-08_space_admins.sql
CREATE TABLE IF NOT EXISTS space_admins (
  space_id   INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  added_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_space_admins_user ON space_admins(user_id);
```
Truy vấn mới dùng trong code (cũng cần duyệt):
```sql
-- Kiểm tra admin (thay cho "SELECT 1 FROM spaces WHERE id=$1 AND user_id=$2")
SELECT 1 FROM spaces WHERE id = $1 AND user_id = $2
UNION ALL
SELECT 1 FROM space_admins WHERE space_id = $1 AND user_id = $2
LIMIT 1;

-- Danh sách admin của Space (owner + phụ)
SELECT u.id, u.name, u.email, u.avatar_url, (s.user_id = u.id) AS is_owner, sa.created_at
FROM spaces s
JOIN users u ON u.id = s.user_id OR u.id IN (SELECT user_id FROM space_admins WHERE space_id = s.id)
LEFT JOIN space_admins sa ON sa.space_id = s.id AND sa.user_id = u.id
WHERE s.id = $1;

-- Thêm nhiều admin (trong 1 transaction, kèm thêm vào space_members)
INSERT INTO space_admins (space_id, user_id, added_by)
SELECT $1, unnest($2::int[]), $3 ON CONFLICT DO NOTHING;
INSERT INTO space_members (space_id, user_id)
SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING;   -- cột/ràng buộc theo bảng thực tế

-- Gỡ admin phụ (không gỡ được chủ sở hữu)
DELETE FROM space_admins WHERE space_id = $1 AND user_id = $2;

-- Danh sách Space mình quản trị (cho Header/AdminPage)
SELECT id FROM spaces WHERE user_id = $1
UNION SELECT space_id FROM space_admins WHERE user_id = $1;
```

## 2. Quy tắc quyền (cần chủ dự án chốt)
| Việc | Đề xuất |
|---|---|
| Thêm Admin Space phụ | Admin chính + **mọi** Admin Space của Space đó |
| Gỡ Admin Space phụ | Admin chính + Admin Space chính (chủ sở hữu) |
| Gỡ / đổi chủ sở hữu (`spaces.user_id`) | Chỉ Admin chính |
| Tài khoản nhận tiền (Stripe Connect / PayOS / QR của Space) | Chỉ chủ sở hữu + Admin chính |
| Xoá Space | Chỉ Admin chính (hiện route DELETE /api/spaces/:id cho cả ai có quyền `spaces` → nên siết lại) |
| Mọi việc khác trong Space | Admin phụ = chủ sở hữu |
| Admin Space bị gỡ khỏi `space_members` | Chặn, phải gỡ quyền admin trước (giống guard removeMember hiện có) |

## 3. Việc code (agent thực hiện sau khi duyệt SQL)
**Backend**
1. Migration mục 1.
2. `server/utils/policy.ts`: thêm `isSpaceAdmin(userId, spaceId)` (owner OR space_admins); `can()` bước 3 dùng nó; giữ `isSpaceOwner` chỉ cho việc ở mục 2.
3. Thay các chỗ đang tự viết `spaces.user_id = …` / `space.userId === user.id` bằng `isSpaceAdmin` (hoặc `isSpaceOwner` nếu là việc mục 2). Các file đang có kiểm tra chủ sở hữu (đếm 08/10): mediaController (7), spaceSocialController (4), roleController (4), aiConfig.model (3), aiConfigController (3), conversation.model, conversationRoutes, v1Routes, trainingDataController/model, spacesController, billingController (giữ owner-only), user.model, userController, systemController, notificationController, documentController, conversationController, chatController, authController (login: admin phụ được đăng nhập tại domain Space), authMiddleware, spaceMember.model.
4. API mới:
   - `GET    /api/spaces/:id/admins` — Admin chính / Admin Space của Space.
   - `POST   /api/spaces/:id/admins` — body `{ emails: string[] }` hoặc `{ userIds: number[] }`, thêm **nhiều** người 1 lần; email chưa có tài khoản → tuỳ chọn `createIfMissing` (tạo tài khoản, dùng lại luồng createUser của Admin Space đã có). Trả về từng dòng: added / already / created / error.
   - `DELETE /api/spaces/:id/admins/:userId` — theo mục 2; chặn gỡ chủ sở hữu.
5. `/api/spaces/my-spaces`, `/managed/:userId`, `getMySpaceOwnerData`: trả cả Space là admin phụ; thêm trường `isOwner`.
6. Profile `/me`: thêm `adminSpaceIds: number[]` để client không phải so `s.userId === user.id`.
7. Xoá cache user 45s (`invalidateCache`) khi thêm/gỡ admin.
8. Ghi audit log thêm/gỡ admin (nếu đã có bảng log; nếu chưa thì để sau).

**Frontend**
9. `SpaceManagement` / trang cài đặt Space: tab **"Admin Space"** — danh sách (đánh dấu Chủ sở hữu), ô nhập nhiều email (dán danh sách, mỗi dòng/ngăn bằng dấu phẩy), nút Thêm, nút Gỡ.
10. Thay `s.userId === user.id` ở Header, AdminPage (6), AiManagement (6), UserManagement (5), RoleManagement (3), CmsManagement (3), SpaceManagement, FilesAndDocuments, ConversationManagement bằng `adminSpaceIds` / `isOwner`.
11. `types.ts`: thêm `adminSpaceIds`, `Space.isOwner`.

**Kiểm thử**
12. Test: admin phụ làm được việc của chủ trong Space mình; **không** làm được ở Space khác; không gỡ được chủ; Quản lý có quyền `roles` không tự thêm mình làm admin; thêm 5 email cùng lúc (có email trùng, email chưa có tài khoản); gỡ admin → mất quyền ngay (cache).

## 4. Tạo tài khoản admin@giac.ngo (sau khi mục 3 xong và deploy)
1. Trên VPS, kiểm tra (chỉ đọc):
   ```sql
   SELECT id, slug, user_id, custom_domain FROM spaces WHERE slug = 'giac-ngo' OR custom_domain ILIKE '%giac.ngo%';
   SELECT id, is_global_admin, is_active FROM users WHERE lower(email) = 'admin@giac.ngo';
   ```
2. Admin chính đăng nhập login.bodhilab.io → Space giac.ngo → tab Admin Space → nhập `admin@giac.ngo`, chọn "tạo tài khoản nếu chưa có", đặt mật khẩu chủ dự án đã cung cấp. (Không tạo bằng INSERT tay vào DB: mật khẩu phải được bcrypt qua luồng createUser.)
3. Đăng nhập **tại https://giac.ngo** (không phải login.bodhilab.io — đó chỉ cho Admin chính) → thấy avatar + menu "Quản trị".
4. Thêm các admin khác bằng cùng tab (dán nhiều email).

⚠️ Mật khẩu đang đặt là chuỗi rất phổ biến (đúng 8 ký tự, vừa đủ qua kiểm tra độ dài). Tài khoản này có toàn quyền Space giac.ngo, nên **đổi mật khẩu mạnh ngay sau lần đăng nhập đầu**. Không ghi mật khẩu vào repo/tài liệu.

## 5. Checklist
- [ ] Chủ dự án duyệt SQL mục 1
- [ ] Chủ dự án chốt quy tắc mục 2
- [ ] Migration + policy `isSpaceAdmin`
- [ ] Thay các kiểm tra chủ sở hữu (backend)
- [ ] API /admins (thêm nhiều, gỡ)
- [ ] `adminSpaceIds` trong profile + cache
- [ ] UI tab Admin Space + thay kiểm tra ở client
- [ ] Test (mục 3.12)
- [ ] Deploy + chạy migration trên VPS
- [ ] Tạo admin@giac.ngo, đăng nhập giac.ngo, đổi mật khẩu
