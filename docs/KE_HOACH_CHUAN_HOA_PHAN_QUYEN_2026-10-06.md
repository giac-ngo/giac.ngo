# Kế hoạch chuẩn hóa phân quyền & sửa lỗi — GiacNgoVN

Oct 6, 2026 · @Minh Duy

## Tóm tắt

Mục tiêu: đưa toàn bộ backend về đúng mô hình 4 tầng (Admin chính → Admin Space → Quản lý Space → User) trong khoảng 4 tuần, vá 5 lỗi P0 trong 1–2 ngày đầu.

- **Hiện trạng:** code đang chạy = commit `d6cdffd`. Các bản vá trước (cấu hình hệ thống, khóa Space, hồ sơ, chat, upload, PayOS, rút tiền, `hasSpacePermission`, `findManageableForUser`) đều đúng.
- **Gốc lỗi còn lại:** 30 route dùng `checkPermission()` — quyền gộp từ mọi Space; khoảng 25 chỗ dùng `canAccessSpace()` để cho phép **ghi** — coi thành viên như quản lý.
- **Dữ liệu DB khớp sẵn mô hình** (`is_global_admin`, `spaces.user_id`, `roles.space_id`, `space_members`), nên phần lớn việc là sửa middleware và controller, ít thay đổi schema.

Nguyên tắc làm việc:

1. Mọi câu SQL mới hoặc sửa ở backend phải được chủ dự án duyệt trước (quy tắc trong `cau_truc.md`). Kế hoạch đánh dấu **\[SQL\]** cho các việc đó.
2. Vá theo gốc: một hàm chính sách dùng chung, không vá từng route riêng lẻ.
3. Mỗi giai đoạn có test hồi quy và tiêu chí xong trước khi deploy.

## Mô hình phân quyền đích

Mỗi quyền chỉ có hiệu lực trong đúng một Space; chỉ Admin chính đụng được tài nguyên toàn cục.

| Tầng | Nhận biết trong DB | Phạm vi |
| --- | --- | --- |
| 1. Admin chính | `users.is_global_admin = true` | Toàn nền tảng |
| 2. Admin Space | `spaces.user_id` (chủ Space); tùy chọn thêm role "Admin Space" | Mọi quyền trong Space của mình |
| 3. Quản lý Space | `user_roles` → `roles.space_id = X` + danh sách `permissions` | Đúng các quyền được giao, chỉ trong Space X |
| 4. User | `space_members` | Đọc nội dung Space; tạo và sửa đồ của chính mình |

Ma trận quyền (✓ = được, “quyền X” = chỉ khi role của Space đó có quyền X):

| Việc | Admin chính | Admin Space | Quản lý Space | User |
| --- | --- | --- | --- | --- |
| Cấu hình hệ thống, khóa AI hệ thống, reset Weaviate | ✓ | — | — | — |
| Tạo / xóa Space, loại Space | ✓ | — | — | — |
| Gói giá toàn cục, nạp merit thủ công, duyệt rút tiền | ✓ | — | — | — |
| Role hệ thống, danh sách toàn bộ user, xóa user | ✓ | — | — | — |
| Tài liệu / danh mục / thư viện toàn cục | ✓ | — | — | — |
| Cài đặt Space, PayOS, Stripe, tên miền | ✓ | ✓ | — | — |
| Yêu cầu rút tiền của Space | — | ✓ | — | — |
| Tạo / sửa role của Space, gán role cho thành viên | ✓ | ✓ | quyền `roles` (không vượt quyền mình có) | — |
| Quản lý thành viên Space | ✓ | ✓ | quyền `users` | — |
| AI, tài liệu huấn luyện của Space | ✓ | ✓ | quyền `ai` | — |
| Tài liệu, Thiền, Pháp thoại, CMS, Media của Space | ✓ | ✓ | quyền tương ứng | — |
| Kiểm duyệt Social (xóa, ghim bài người khác) | ✓ | ✓ | quyền `social-moderate` (mới) | — |
| Gửi thông báo hàng loạt cho thành viên Space | ✓ | ✓ | quyền `notifications` (mới) | — |
| Xem giao dịch, thống kê của Space | ✓ | ✓ | quyền `space-billing` | — |
| Xem hội thoại của user với AI của Space | ✓ | ✓ | quyền `conversations` | — |
| Đọc nội dung, chat AI được phép, đăng bài, bình luận | ✓ | ✓ | ✓ | ✓ (thành viên) |
| Sửa / xóa bài, bình luận, hội thoại của chính mình | ✓ | ✓ | ✓ | ✓ |

Hai quyền `manual-billing` và `pricing` chỉ còn ý nghĩa ở tầng 1 và phải gỡ khỏi mọi role của Space (role 12 đang có `manual-billing`).

## Kết quả review (bản đang sửa, 20:58 ngày 06/10)

Bạn đã vá 4/5 lỗi P0 và phần lớn route dùng quyền gộp; còn 1 P0 (vượt qua bản vá iframe), 13 nhóm P1 và 5 lỗi chức năng mới do guard chặt hơn. Code chưa commit, đang thay đổi từng phút, nên mục này cần đối chiếu lại trước khi commit.

### Đã vá trong lượt sửa hiện tại (đã đọc lại, đúng)

- Reset Weaviate, xuất giao dịch, xem giao dịch theo user, danh sách user, tạo / xóa user, tạo Space, loại Space, bình luận quản trị, xuất dữ liệu finetune → chỉ Admin chính.
- `state` OAuth của CMS được ký HMAC, hết hạn 15 phút, gắn `userId` (`utils/oauthState.ts`).
- Đăng nhập Google không còn chấp nhận `custom_domain` làm đích chuyển hướng.
- Gói giá: gói toàn cục chỉ Admin chính; gói của Space kiểm tra `hasSpacePermission(…, 'pricing')`.
- Thiền và Pháp thoại: kiểm tra quyền theo Space của bản ghi hiện có; bài toàn cục chỉ Admin chính.
- Iframe trang tùy chỉnh bỏ `allow-same-origin`; thống kê dashboard chỉ coi `isGlobalAdmin` là super admin.

### P0 còn lại

| # | Lỗi | Vị trí | Cách sửa |
| --- | --- | --- | --- |
| 1 | Trang tùy chỉnh vẫn chiếm được tài khoản: script trong iframe gửi `postMessage({type:'NAVIGATE', path:'javascript:…'})`, trang cha gán thẳng `window.location.href = data.path` → chạy mã trên origin của ứng dụng, đọc token trong localStorage. Không kiểm tra `event.source`. | `SpaceCustomPageResolver.tsx:29-38`; `CustomDomainPageResolver.tsx` (handler tương tự) | Chỉ nhận tin từ `iframeRef.current.contentWindow`; `path` phải bắt đầu bằng `/` và không phải `//`; dùng `navigate()`; bỏ `allow-top-navigation` (cho phép trang đổi hướng cả tab sang trang lừa đảo) |

### P1 còn lại

| # | Lỗi | Vị trí |
| --- | --- | --- |
| 2 | Tài liệu: 13 route còn `checkPermission('files')`; tạo / sửa / xóa tài liệu toàn cục, chuyển tài liệu sang Space khác, sửa cấu hình chung; thành viên thường được sửa qua `canAccessSpace` | `documentRoutes.ts:11-36`; `documentController.ts:173-300` |
| 3 | Role: `checkPermission('roles')`; sửa / xóa role của Space khác, tạo role trong Space khác; Admin chính là thành viên Space thì không sửa được role hệ thống | `roleRoutes.ts:8`; `roleController.ts:44-118` |
| 4 | CMS: 14 chỗ còn `canAccessSpace` → mọi thành viên tạo, sửa, xóa, đăng bài lên fanpage. `getOAuthUrl` giờ đòi quyền `cms`, trong khi chỗ khác dùng `cms_write`/`cms_approve` — cần thống nhất tên quyền | `cmsController.ts` (đầu mỗi hàm), `:623`, `:773` |
| 5 | Social: không kiểm tra thành viên khi đọc / đăng; ai có role bất kỳ cũng ghim bài ở mọi Space; Admin Space không kiểm duyệt được | `spaceSocialRoutes.ts:28-62`; `spaceSocialController.ts:270, 451, 525, 836` |
| 6 | Gửi thông báo: quyền gộp `users`/`settings` + `spaceId` tùy ý → gửi email cho thành viên Space khác; `testEmails` gửi tới địa chỉ bất kỳ qua SMTP hệ thống | `notificationRoutes.ts:12-46`; `notificationController.ts:42-51, 109` |
| 7 | Stripe Connect: người có quyền `settings` ngắt Stripe của chủ Space rồi nối tài khoản mới → tiền rút của Space về tài khoản họ | `billingController.ts` `getAuthorizedConnectSpace`, `disconnectConnectAccount` |
| 8 | `POST /api/ai-configs` không cần đăng nhập, lấy `userId` từ body → trả AI riêng tư của người khác; truy vấn công khai trả `training_content` (system prompt) | `aiConfigController.ts:17`; `aiConfig.model.ts:6-9` |
| 9 | `estimate-context` trả system prompt + đoạn RAG thô cho mọi người chat được với AI | `chatController.ts:541-564` |
| 10 | `trained-conversations` cho mọi người đăng nhập đọc chat thật; `latest-conversation` lấy `userId` từ body | `aiConfigRoutes.ts:17, 19`; `conversationController.ts:72` |
| 11 | `voice-key`: mọi người đăng nhập tạo phiên Gemini Live bằng khóa của chủ AI, không kiểm quyền, không trừ phí | `aiConfigController.ts:234` |
| 12 | `translate`, `explain-content`: truyền `spaceId` bất kỳ để dùng khóa AI của Space đó với prompt tùy ý | `systemController.ts:459-530` |
| 13 | “Legacy Token” còn chạy; refresh token = `api_token` không hết hạn, nằm trong localStorage và URL callback Google | `authMiddleware.ts:37-46`; `authController.ts:24-31, 191-208, 265-270` |
| 14 | Cần kiểm: gói giá của Space có thể đưa `aiConfigIds` của AI thuộc Space khác vào gói | `billing.model.ts:101, 142, 281-286` |

### P2 và lỗi chức năng mới do guard chặt hơn

- **Lịch sử giao dịch của chính user bị chặn:** `UserBillingManagement.tsx:59` gọi `/api/billing/transactions/user/<id mình>`, route giờ chỉ Admin chính → 403. Cho phép chính chủ.
- **Admin Space không còn quản lý user được:** `UserManagement.tsx:190, 230, 290` gọi `getAllUsers`, `getUserSpaces`, `createUser` → 403. Cần chuyển màn này sang `/api/spaces/:id/members` (đã có guard đúng).
- **Dashboard lộ thống kê cho thành viên thường:** route giờ chỉ `isAuthenticated`, controller lọc theo `getUserManagedSpaceIds` (gồm cả thành viên). Lọc theo Space có quyền `dashboard`.
- **Sửa gói giá báo 403 oan:** `req.body.spaceId !== plan.spaceId` so chuỗi với số. Ép `Number()` trước khi so.
- **Pháp thoại:** sửa bài có thể đổi `spaceId` sang Space khác (`talkData` còn `spaceId`).
- **Còn từ trước:** mua gói / tăng lượt bằng merit bị race → âm merit (`billingController.ts` `purchaseAiLimitWithMerits`, `billing.model.ts` `purchaseSubscription`); danh sách cúng dường công khai trả `t.*`, không giới hạn `limit`; chủ Space xóa được file `uploads/global/`; alias `/api/spaces/owners` vẫn mở cho mọi người đăng nhập.

### Bản đồ guard theo module

| Module | Guard hiện tại | Guard đích |
| --- | --- | --- |
| Hệ thống, loại Space, bình luận quản trị, finetune, xuất giao dịch | `requireGlobalAdmin` | Giữ |
| Space (sửa, xóa, thành viên, QR), trang Space | `requireSpacePermission` | Giữ; xóa Space → Admin chính hoặc chủ |
| AI, training data, Koii | `requireAiPermission` / `requireTrainingDataPermission` | Giữ |
| Gói giá, Thiền, Pháp thoại | Kiểm trong controller bằng `hasSpacePermission` | Giữ; chuyển vào hàm chính sách chung |
| Tài liệu | `checkPermission('files')` + `canAccessSpace` | `hasSpacePermission(space của tài liệu, 'files')`; toàn cục → Admin chính |
| Role | `checkPermission('roles')` | `hasSpacePermission(space của role, 'roles')`; role hệ thống → Admin chính |
| CMS | `canAccessSpace` | `hasSpacePermission(…, 'cms_write' / 'cms_approve')` |
| Social | Chỉ đăng nhập | Thành viên Space; kiểm duyệt → `social-moderate` |
| Thông báo | Quyền gộp `users`/`settings` | `hasSpacePermission(spaceId, 'notifications')`; gửi toàn nền tảng → Admin chính |
| Media | `canAccessSpace` + quyền Space | `hasSpacePermission(…, 'files')`; `global/` → Admin chính |
| Stripe Connect | Chủ hoặc `settings` | Chỉ chủ Space hoặc Admin chính |
| AI công khai, estimate, voice-key, translate | Không / chỉ đăng nhập | Dùng `req.user`; `canUserAccessAi`; trừ phí; prompt chỉ cho quyền `ai` |
| Sửa user, tạo lại token | `checkSelfOrPermission('users')` (gộp) | Giữ tạm (controller đã kiểm theo Space); thay bằng hàm chung ở Giai đoạn 1 |

Vector: pgvector là backend chính; Weaviate giữ làm tùy chọn sau này khi có ngân sách, không cần sửa thêm ngoài việc route reset chỉ cho Admin chính (đã làm).

## Kế hoạch theo giai đoạn

Năm giai đoạn trong khoảng 4 tuần; Giai đoạn 0 phải xong và deploy trước khi làm tiếp. **\[SQL\]** = cần chủ dự án duyệt câu lệnh trước.

| Giai đoạn | Thời gian | Trọng tâm | Xong khi |
| --- | --- | --- | --- |
| GĐ0 Chặn nốt | Ngày 1–2 | Vá postMessage, đổi khóa, commit | 0 lỗi P0 |
| GĐ1 Phân quyền | Tuần 1 | Lớp policy chung, test ma trận | Test xanh |
| GĐ2 AI, phiên | Tuần 2 | Ẩn system prompt, refresh token | Không lộ prompt |
| GĐ3 Tiền | Tuần 3 | Sổ cái merit, đối soát | Lệch = 0 |
| GĐ4 Hiệu năng | Tuần 4 | Cache, pgvector, lazy-load | Đo trước / sau |

### Giai đoạn 0 — Chặn nốt và commit (ngày 1–2)

- [ ] 0.1 Vá `postMessage` ở `SpaceCustomPageResolver.tsx` và `CustomDomainPageResolver.tsx`: kiểm `event.source`, chỉ nhận đường dẫn nội bộ bắt đầu `/`, dùng `navigate()`; bỏ `allow-top-navigation` (P0 số 1).
- [ ] 0.2 Sửa 5 lỗi chức năng do guard mới: giao dịch của chính mình; màn Quản lý user của Admin Space chuyển sang API thành viên Space; dashboard lọc theo quyền `dashboard`; so `spaceId` bằng `Number()`; Pháp thoại không cho đổi `spaceId`.
- [ ] 0.3 Gỡ `manual-billing` và `pricing` khỏi mọi role có `space_id` (role 12 trước tiên); chạy `audit_readonly4.cjs` + liệt kê ai đang giữ `files`, `settings`, `roles`, `spaces`. **\[SQL\]**
- [ ] 0.4 `npx tsc --noEmit` sạch → commit → deploy → `pm2 restart`.
- [ ] 0.5 Đổi toàn bộ khóa bí mật trong `ecosystem.config.cjs` (JWT, DB, CRYPTO\_KEY, Stripe, Google, SMTP), đưa ra khỏi repo; tạo lại `api_token` của mọi user; chặn cổng 5432 chỉ cho máy chủ app. **\[SQL\]**

Xong khi: không còn P0; 5 màn hình trên chạy đúng với tài khoản Admin Space; khóa cũ hết hiệu lực.

### Giai đoạn 1 — Một lớp chính sách phân quyền duy nhất (tuần 1)

- [ ] 1.1 Tạo `server/utils/policy.ts`: `can(user, permission, scope)` với `scope` = `'global'` hoặc `{ spaceId }`; middleware `requireSpaceOf(permission, loader)` — `loader` đọc `space_id` của tài nguyên (tài liệu, role, bài CMS, bài Social, đường dẫn media). Bản ghi không có `space_id` → chỉ Admin chính.
- [ ] 1.2 Xóa `checkPermission`, `checkSelfOrPermission`; đổi tên `canAccessSpace` → `isSpaceMember` và chỉ dùng cho quyền đọc. `req.user.permissions` chỉ còn để client ẩn / hiện nút.
- [ ] 1.3 Áp dụng cho Tài liệu + danh mục (P1 số 2), Role (số 3), CMS (số 4), Media, Thông báo (số 6), Stripe Connect chỉ chủ Space (số 7).
- [ ] 1.4 Social: đọc / đăng chỉ thành viên; quyền `social-moderate` cho xóa, ghim bài người khác; kiểm `postId` thuộc đúng Space trên URL (số 5).
- [ ] 1.5 Danh mục quyền chuẩn: một file hằng số dùng chung server + client; thống nhất `cms` / `cms_write` / `cms_approve`; thêm `social-moderate`, `notifications`, `space-billing`, `dashboard`; cập nhật các role hiện có theo tên mới. **\[SQL\]**
- [ ] 1.6 Khôi phục `server/tests/` (bỏ khỏi `.gitignore`); test ma trận 2 Space × 4 tầng cho mọi route ghi bằng supertest; CI chạy `tsc` + test mỗi lần push.

Xong khi: `grep checkPermission\|canAccessSpace` không còn kết quả ở route ghi; test ma trận xanh.

### Giai đoạn 2 — AI, dữ liệu riêng tư và phiên đăng nhập (tuần 2)

- [ ] 2.1 Tách truy vấn AI công khai (không có `training_content`) và truy vấn quản trị; `getVisibleAiConfigs` dùng `req.user` (số 8). **\[SQL\]**
- [ ] 2.2 `estimate-context` chỉ cho quyền `ai`; `trained-conversations` qua `requireAiPermission('conversations')`; `latest-conversation` dùng `req.user` (số 9, 10).
- [ ] 2.3 `voice-key` kiểm `canUserAccessAi` + giới hạn tần suất + tính phí; `translate` / `explain-content` kiểm quyền `files` ở Space truyền vào + rate limit (số 11, 12).
- [ ] 2.4 Gói giá của Space chỉ được chứa AI cùng Space (số 14).
- [ ] 2.5 Phiên đăng nhập mới: access token 15 phút; refresh token ngẫu nhiên, lưu băm trong bảng riêng, xoay vòng mỗi lần dùng, thu hồi được, đặt trong cookie `HttpOnly; Secure; SameSite`; bỏ “Legacy Token”; Google callback trả mã dùng một lần thay vì token trong URL; `api_token` chỉ còn là API key cho `/api/v1` (số 13). **\[SQL\]**

Xong khi: không endpoint công khai nào trả system prompt; đăng xuất thu hồi được phiên; token không còn trong localStorage.

### Giai đoạn 3 — Tiền và merit (tuần 3)

- [ ] 3.1 Trừ merit nguyên tử `UPDATE … SET merits = merits - $1 WHERE id = $2 AND merits >= $1` cho mua gói và tăng lượt. **\[SQL\]**
- [ ] 3.2 Sổ cái: mọi thay đổi số dư qua một hàm duy nhất (ghi `transactions` cùng giao dịch DB); job đối soát hằng ngày giữa tổng giao dịch và số dư. **\[SQL\]**
- [ ] 3.3 Xử lý chênh lệch hiện có theo quyết định ở mục cuối (#301, \~128 nghìn merit không giao dịch, 50.000 merit QR của Space 1). **\[SQL\]**
- [ ] 3.4 Danh sách cúng dường công khai chỉ trả tên, số merit, thời gian, lời nhắn; `limit` tối đa 100. **\[SQL\]**
- [ ] 3.5 PayOS: số tiền tối thiểu, quy đổi VND → merit một chỗ, bỏ quy ước “giá < 1000 là USD”.

Xong khi: gửi 20 request mua song song không làm âm merit; báo cáo đối soát bằng 0 chênh lệch.

### Giai đoạn 4 — Hiệu năng và cấu trúc (tuần 4)

- [ ] 4.1 Cache thông tin user + quyền 30–60 giây (hiện mỗi request tốn 5 truy vấn), xóa cache khi đổi role / mua gói.
- [ ] 4.2 Pool DB: `max`, `statement_timeout`, `idleTimeoutMillis`.
- [ ] 4.3 pgvector làm backend mặc định: index HNSW trên cột embedding, kiểm số chiều khớp model, giữ lớp trừu tượng để bật Weaviate sau. **\[SQL\]**
- [ ] 4.4 Phân trang bằng SQL cho hội thoại, Pháp thoại, tìm kiếm Social; tạo bảng `guest_daily_usage`. **\[SQL\]**
- [ ] 4.5 Production chạy JS đã build thay `tsx`; bật nén; cache header cho `/uploads`; thoát tiến trình khi `uncaughtException`.
- [ ] 4.6 Client: `React.lazy` cho các trang quản trị; xóa \~120 file và \~40 dependency không dùng.
- [ ] 4.7 Migration nền (dump schema hiện tại), tách thao tác dữ liệu khỏi migration schema; thêm `.gitattributes`. **\[SQL\]**

Xong khi: thời gian phản hồi API và dung lượng tải lần đầu đo trước / sau; dựng được DB mới từ migration.

## Thay đổi DB cần duyệt

Các câu dưới đây là bản đề xuất, chưa chạy và chưa đưa vào code; mỗi câu cần bạn duyệt, nên chạy `SELECT` kiểm tra trước trong giao dịch.

**0.3 — Gỡ quyền chỉ dành cho Admin chính khỏi role của Space**

```sql
-- Xem trước
SELECT id, name, space_id, permissions FROM roles
WHERE space_id IS NOT NULL
  AND permissions && ARRAY['manual-billing','pricing','finetune']::text[];

-- Gỡ
UPDATE roles
SET permissions = array_remove(array_remove(array_remove(permissions,
      'manual-billing'), 'pricing'), 'finetune')
WHERE space_id IS NOT NULL
  AND permissions && ARRAY['manual-billing','pricing','finetune']::text[];
```

Nếu Space được tự đặt gói giá riêng thì giữ `pricing` (xem quyết định ở mục cuối).

**0.5 — Vô hiệu toàn bộ token cũ sau khi đổi khóa**

```sql
UPDATE users SET api_token = encode(gen_random_bytes(32), 'hex');
```

Cần extension `pgcrypto`; mọi người sẽ phải đăng nhập lại.

**1.5 — Đổi tên quyền CMS về một chuẩn** (ví dụ gộp `cms` vào `cms_write`, sau khi chốt tên)

```sql
UPDATE roles SET permissions = array_replace(permissions, 'cms', 'cms_write')
WHERE 'cms' = ANY(permissions);
```

**2.5 — Bảng refresh token**

```sql
CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by BIGINT REFERENCES refresh_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip INET
);
CREATE INDEX ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
```

**3.1 — Trừ merit nguyên tử** (thay cặp “kiểm tra rồi trừ”)

```sql
UPDATE users SET merits = merits - $1
WHERE id = $2 AND merits >= $1
RETURNING merits;   -- không trả dòng nào = không đủ merit
```

**3.2 — Đối soát số dư với sổ giao dịch** (chỉ đọc, chạy hằng ngày)

```sql
SELECT u.id, u.merits, COALESCE(SUM(t.merits), 0) AS ledger,
       u.merits - COALESCE(SUM(t.merits), 0) AS diff
FROM users u LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id
HAVING u.merits <> COALESCE(SUM(t.merits), 0)
ORDER BY abs(u.merits - COALESCE(SUM(t.merits), 0)) DESC;
```

**3.4 — Danh sách cúng dường công khai** (thay `SELECT t.*`)

```sql
SELECT t.id, t.merits, t.timestamp, t.details->>'message' AS message,
       u.name AS user_name
FROM transactions t LEFT JOIN users u ON u.id = t.user_id
WHERE t.destination_space_id = $1
ORDER BY t.timestamp DESC
LIMIT LEAST($2, 100) OFFSET $3;
```

**4.3 — pgvector**

Index HNSW (`vector_cosine_ops`) và index `ai_config_id` đã được tạo lúc chạy trong `pgVectorService.ts:228-252`; việc cần làm là chuyển DDL này vào migration. Cột `embedding vector(768)` cố định 768 chiều, nên chỉ dùng được model embedding 768 chiều; cần chặn chọn model khác ở giao diện AI. Truy vấn lọc theo `ai_config_id` trên index HNSW có thể thiếu kết quả khi dữ liệu lớn; với pgvector ≥ 0.8 bật:

```sql
SET hnsw.iterative_scan = relaxed_order;
```

**4.4 — Bảng giới hạn lượt chat của khách** (code đã dùng sẵn, bảng chưa có)

```sql
CREATE TABLE IF NOT EXISTS guest_daily_usage (
  ip TEXT NOT NULL,
  date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, date)
);
```

## Kiểm thử, triển khai, rollback

Mỗi giai đoạn deploy riêng, sau khi test ma trận quyền xanh và đã có bản sao DB.

**Tài khoản test** (tạo trên DB staging hoặc bản sao, không trên production):

| Tài khoản | Vai trò |
| --- | --- |
| `admin` | Admin chính |
| `ownerA`, `ownerB` | Chủ Space A, chủ Space B |
| `managerA` | Role của Space A có `files`, `ai`, `meditation`, `cms_write` |
| `memberA` | Thành viên Space A, không role |
| `outsider` | Đăng nhập, không thuộc Space nào |

**Ca test bắt buộc cho mỗi route ghi:** `managerA` thao tác trên tài nguyên của Space B → 403; `memberA` thao tác quản trị trong Space A → 403; `ownerA` trên tài nguyên toàn cục → 403; `admin` → 200. Thêm ca riêng cho: `postMessage` với `javascript:`, mua gói song song, webhook PayOS gửi lại hai lần.

**Quy trình deploy:**

1. `pg_dump` production trước mỗi lần deploy có **\[SQL\]**.
2. Chạy migration đã duyệt trong giao dịch; kiểm tra bằng `SELECT` trước `COMMIT`.
3. `git pull` → `npx tsc --noEmit` → `pm2 restart` → xem log 15 phút đầu (401/403/500 tăng bất thường).
4. Đăng nhập lại bằng 3 tài khoản thật (Admin chính, một chủ Space, một user) và đi qua màn hình chính.

**Rollback:** code → `git revert` commit của giai đoạn rồi `pm2 restart`; dữ liệu → mỗi migration có kèm câu hoàn tác, riêng thao tác xóa / trừ merit chỉ khôi phục được từ bản `pg_dump`. Việc đổi khóa bí mật và vô hiệu token (0.5) không rollback — báo trước cho người dùng rằng sẽ phải đăng nhập lại.



- [ ] 1\. Mỗi Space chỉ có một Admin (chủ Space), nhiều quản lý, user bắt buộc phải thuộc space. trừ admin root
- [ ] 2\. Admin Space  được tạo tài khoản user mới 
- [ ] 3\. Space  được tự đặt gói giá riêng
- [ ] 4\. Tên quyền CMS chuẩn: `cms_write` + `cms_approve`
- [ ] 5\. User #301 (100.000 merit, nghi tài khoản QA): giữ nguyên do tôi + tay test app.
- [ ] 6\. Khoảng 128 nghìn merit không có giao dịch: giữ nguyên do tôi + tay test app.
- [ ] 7\. 50.000 merit QR đã cộng vào Space 1 ngày 17/03:  giữ do tôi + tay để test app; từ nay  duyệt cúng dường QR là chủ space
- [ ] 8\. Thông báo hàng loạt: Admin Space chỉ gửi cho thành viên Space mình, còn gửi toàn nền tảng và gửi email test chỉ Admin chính- ok?
