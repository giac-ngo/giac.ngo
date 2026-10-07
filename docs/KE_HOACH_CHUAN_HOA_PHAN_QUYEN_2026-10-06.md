# Kế hoạch chuẩn hóa phân quyền & sửa lỗi — GiacNgoVN

Oct 6, 2026 · @Minh Duy · cập nhật 07/10/2026

## Tóm tắt

Mục tiêu: đưa toàn bộ backend về đúng mô hình 4 tầng (Admin chính → Admin Space → Quản lý Space → User) trong khoảng 4 tuần, vá 5 lỗi P0 trong 1–2 ngày đầu.

- **Hiện trạng (07/10):** Giai đoạn 0 và 1 đã sửa xong trong code và qua review; toàn bộ thay đổi (42 file sửa + 8 file mới) **chưa commit**, migration chưa chạy, chưa deploy. Code trên VPS vẫn là commit `d6cdffd`.
- **Gốc lỗi đã xử lý:** `checkPermission()` không còn được dùng ở route nào; `canAccessSpace()` chỉ còn nghĩa "là thành viên"; mọi kiểm tra quyền đi qua một hàm `can()` trong `server/utils/policy.ts`.
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

Quyền `manual-billing` và `finetune` chỉ có ý nghĩa ở tầng 1 và phải gỡ khỏi mọi role của Space (role 12 đang có `manual-billing`). Quyền `pricing` được giữ cho role của Space: Space tự đặt gói giá riêng (chốt 07/10), gói chỉ chứa AI cùng Space. Mọi user trừ Admin chính phải thuộc ít nhất một Space.

## Kết quả review (07/10/2026, 18:00)

Đọc lại toàn bộ code trong thư mục dự án sau 3 đợt sửa ngày 06–07/10. Không còn lỗi P0; còn 1 lỗi P1 (đường "Legacy Token", đã chấp nhận rủi ro) và 4 việc nhỏ. Test và build theo báo cáo: 44/44 test, `tsc` 0 lỗi, `vite build` thành công — chưa được chạy lại độc lập.

### Đã sửa và đã kiểm chứng trong code

| Nhóm | Kết quả | Vị trí |
| --- | --- | --- |
| P0 iframe trang tùy chỉnh | Chỉ nhận tin từ đúng iframe, đường dẫn phải bắt đầu bằng `/`, dùng `navigate()`; bỏ `allow-same-origin` và `allow-top-navigation` | `SpaceCustomPageResolver.tsx`, `CustomDomainPageResolver.tsx` |
| P0 khác (reset Weaviate, xuất giao dịch, OAuth CMS, Google `returnTo`) | Chỉ Admin chính; `state` CMS ký HMAC 15 phút; bỏ `custom_domain` khỏi danh sách chuyển hướng | `systemRoutes.ts`, `billingRoutes.ts`, `oauthState.ts`, `authRoutes.ts` |
| Lớp phân quyền | `can(user, action, scope)` theo 4 tầng; `hasSpacePermission` gọi thẳng `can()`; `isSpaceMember` chỉ cho quyền đọc | `utils/policy.ts`, `authMiddleware.ts` |
| Tài liệu + danh mục | Kiểm theo Space của bản ghi; tài liệu toàn cục chỉ Admin chính; chặn chuyển Space | `documentController.ts` |
| Role | Role hệ thống chỉ Admin chính; chủ Space cấp mọi quyền trong Space; Quản lý chỉ cấp quyền mình có, không sửa role mình giữ, không làm mất quyền ngoài phạm vi | `roleController.ts:60-135` |
| CMS | Hai quyền `cms_write` / `cms_approve`; `findArticleInSpace` / `findConnectionInSpace` chặn IDOR ở mọi hàm theo id | `cmsController.ts:31-42` |
| Social | Đọc, đăng, bình luận, like chỉ thành viên; bài phải thuộc Space trên URL; xóa / ghim bài người khác cần `social-moderate` | `spaceSocialController.ts` |
| Thông báo | Theo quyền `notifications` của Space; toàn nền tảng và email test chỉ Admin chính | `notificationRoutes.ts`, `notificationController.ts:119` |
| Thanh toán | Gói giá: toàn cục chỉ Admin chính, gói của Space chỉ chứa AI cùng Space; Stripe Connect chỉ chủ Space; doanh thu theo `space-billing`; trừ merit nguyên tử; danh sách cúng dường công khai tách riêng (100 dòng, cột an toàn) | `billingController.ts`, `billing.model.ts` |
| AI | `POST /api/ai-configs` dùng `req.user`; truy vấn công khai không trả `training_content`; `estimate-context`, `trained-conversations` chỉ người quản lý AI; `voice-key` kiểm quyền dùng AI; `translate` kiểm quyền Space | `aiConfigController.ts`, `aiConfig.model.ts`, `chatController.ts`, `systemController.ts` |
| User | Danh sách / xóa user chỉ Admin chính; tạo user: Admin Space phải gửi `spaceId`, kiểm quyền `users` trước khi tạo, chỉ gán role của Space đó | `userRoutes.ts`, `userController.ts:147-190` |
| Hiệu năng | Cache user 45 giây, xóa cache ở mọi chỗ đổi merit / gói / lượt AI; pool DB `max` 20, `idleTimeoutMillis`, `connectionTimeoutMillis` | `user.model.ts`, `db.ts` |
| Test | `policy.test.ts` (12 ca) + `routes.rbac.test.ts` (32 ca, gọi route thật qua supertest, DB giả lập) | `server/tests/` |

### Còn lại

| # | Mức | Vấn đề | Vị trí | Cách xử lý |
| --- | --- | --- | --- | --- |
| 1 | P1 (chấp nhận) | Đường "Legacy Token" vẫn chạy: `api_token` không hết hạn dùng thẳng làm bearer; token có thể đã lộ trước khi vá P0-4. Chủ dự án quyết định giữ `api_token` | `authMiddleware.ts:39-44` | Tối thiểu: tắt đường Legacy (token vẫn làm refresh được, người dùng không thấy khác) hoặc chỉ tạo lại token cho tài khoản quyền cao |
| 2 | P2 | Quy tắc "user phải thuộc Space" chưa được bảo đảm: đăng ký chỉ dựa vào header `Host`, không nhận `spaceSlug`/`spaceId` từ form; tên miền chính hoặc không nhận dạng được thì gán cứng Space 1; tên miền riêng không khớp thì không vào Space nào; lỗi gán Space bị bỏ qua; `removeMember` cho xóa Space cuối cùng của user | `authController.ts:120-130, 241-250`; `spacesController.ts:424-437`; `RegisterPage.tsx`, `LoginPage.tsx` | Xem việc 1.7 |
| 3 | P2 | Cúng dường QR ghi giao dịch `pending_verification` nhưng chưa có màn / endpoint để chủ Space duyệt | `space.model.ts:309-324` | Giai đoạn 3, mục 3.6 |
| 4 | P3 | `updateSocialPost` còn kiểm `role === 'admin'` kiểu cũ; alias `/api/spaces/managed/:userId` còn dùng quyền gộp trong `getUserSpaces` | `spaceSocialController.ts:608`; `spacesRoutes.ts:60` | Đổi sang `can(…, 'social-moderate')`; bỏ alias |
| 5 | Vận hành | Mật khẩu DB và các khóa vẫn nằm dạng rõ trong `ecosystem.config.cjs`; cổng 5432 để mở (đã quyết định) | `server/ecosystem.config.cjs` | Đổi mật khẩu DB + khóa, đưa ra khỏi repo; giới hạn IP trong `pg_hba.conf`; bật SSL |

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

- [x] 0.1 Vá `postMessage` ở `SpaceCustomPageResolver.tsx` và `CustomDomainPageResolver.tsx`: kiểm `event.source`, chỉ nhận đường dẫn nội bộ bắt đầu `/`, dùng `navigate()`; bỏ `allow-top-navigation` (P0 số 1). — Xong 06/10.
- [x] 0.2 Sửa 5 lỗi chức năng do guard mới: giao dịch của chính mình; màn Quản lý user của Admin Space chuyển sang API thành viên Space; dashboard lọc theo quyền `dashboard`; so `spaceId` bằng `Number()`; Pháp thoại không cho đổi `spaceId`. — Xong 06/10.
- [ ] 0.3 Gỡ `manual-billing` và `pricing` khỏi mọi role có `space_id` (role 12 trước tiên); chạy `audit_readonly4.cjs` + liệt kê ai đang giữ `files`, `settings`, `roles`, `spaces`. **\[SQL\]** — Cập nhật 07/10: giữ `pricing` (Space tự đặt gói giá); migration `20261006_revoke_global_permissions_from_space_roles.sql` chỉ gỡ `manual-billing`, `finetune`. Chưa chạy.
- [ ] 0.4 `npx tsc --noEmit` sạch → commit → deploy → `pm2 restart`. — Chưa commit.
- [ ] 0.5 Đổi toàn bộ khóa bí mật trong `ecosystem.config.cjs` (JWT, DB, CRYPTO\_KEY, Stripe, Google, SMTP), đưa ra khỏi repo; tạo lại `api_token` của mọi user; chặn cổng 5432 chỉ cho máy chủ app. **\[SQL\]**

Xong khi: không còn P0; 5 màn hình trên chạy đúng với tài khoản Admin Space; khóa cũ hết hiệu lực.

### Giai đoạn 1 — Một lớp chính sách phân quyền duy nhất (tuần 1)

- [x] 1.1 Tạo `server/utils/policy.ts`: `can(user, permission, scope)` với `scope` = `'global'` hoặc `{ spaceId }`; middleware `requireSpaceOf(permission, loader)` — `loader` đọc `space_id` của tài nguyên (tài liệu, role, bài CMS, bài Social, đường dẫn media). Bản ghi không có `space_id` → chỉ Admin chính. — Xong 07/10.
- [x] 1.2 Xóa `checkPermission`, `checkSelfOrPermission`; đổi tên `canAccessSpace` → `isSpaceMember` và chỉ dùng cho quyền đọc. `req.user.permissions` chỉ còn để client ẩn / hiện nút. — Xong 07/10.
- [x] 1.3 Áp dụng cho Tài liệu + danh mục (P1 số 2), Role (số 3), CMS (số 4), Media, Thông báo (số 6), Stripe Connect chỉ chủ Space (số 7). — Xong 07/10.
- [x] 1.4 Social: đọc / đăng chỉ thành viên; quyền `social-moderate` cho xóa, ghim bài người khác; kiểm `postId` thuộc đúng Space trên URL (số 5). — Xong 07/10.
- [x] 1.5 Danh mục quyền chuẩn: một file hằng số dùng chung server + client; thống nhất `cms` / `cms_write` / `cms_approve`; thêm `social-moderate`, `notifications`, `space-billing`, `dashboard`; cập nhật các role hiện có theo tên mới. **\[SQL\]** — Xong 07/10.
- [x] 1.6 Khôi phục `server/tests/` (bỏ khỏi `.gitignore`); test ma trận 2 Space × 4 tầng cho mọi route ghi bằng supertest; CI chạy `tsc` + test mỗi lần push. — Xong 07/10 (44 ca; DB trong test là giả lập).
- [x] 1.7 Bảo đảm mọi user (trừ Admin chính) thuộc ít nhất một Space (chốt 07/10, bỏ gán cứng Space 1): — Xong 07/10: Chuẩn hóa toàn bộ server, client, domain helper, chặn server login/register ở login.bodhilab.io, kiểm tra thành viên khi đăng nhập Google/mật khẩu, hỗ trợ subdomain và 54/54 test xanh.
    - Xác định Space khi đăng ký theo thứ tự: (1) tên miền riêng của Space qua `findByCustomDomain(host)`; (2) `spaceSlug` / `spaceId` gửi từ form `/:spaceSlug/register`; (3) không xác định được → `400 "Không xác định được Không gian hợp lệ để đăng ký thành viên"`, không tạo tài khoản.
    - **Tên miền chính (chốt 07/10):** là **`login.bodhilab.io`** — trang đăng nhập riêng của Admin chính, không có đăng ký (chốt 07/10); **không phải** `giac.ngo` — `giac.ngo` là tên miền riêng của Space Giác Ngộ. Lỗi cấu hình cần sửa: `server/ecosystem.config.cjs` (production) đặt `MAIN_DOMAIN=giac.ngo`, trong khi `server/.env` đặt `bodhilab.io` và client viết cứng `login.bodhilab.io` (`App.tsx:49-51`) → trên production, đăng ký ở `giac.ngo` đang bị coi là tên miền chính rồi gán cứng Space 1. Sửa: dùng một biến cấu hình cho đúng host `login.bodhilab.io` (so khớp chính xác, không dùng `endsWith('.bodhilab.io')` vì các subdomain như `tathata.bodhilab.io` là Space); server và client cùng đọc biến này. Không cho đăng ký ở tên miền chính; gốc tên miền chính chỉ dùng để Admin chính đăng nhập. Đăng ký và đăng nhập của mọi người khác phải đi qua Space (tên miền riêng hoặc `/:spaceSlug`). Server chặn cả ở API: `POST /api/auth/register` và Google callback tạo tài khoản mới mà không có Space → 400; đăng nhập (mật khẩu hoặc Google) không có ngữ cảnh Space → chỉ cho Admin chính, người khác 403 kèm hướng dẫn vào trang Space. Client: ẩn nút Đăng ký và form đăng nhập thường ở trang gốc tên miền chính.
    - Google OAuth: đưa `spaceId` vào `state` đã ký HMAC lúc bấm nút ở trang Space; callback giải mã `state`, kiểm tra Space tồn tại; tài khoản mới không có Space hợp lệ → không tạo, chuyển về trang lỗi.
    - Tài khoản đã tồn tại đăng nhập (kể cả Google) ở Space khác: chỉ đăng nhập, không tự thêm vào Space; tham gia bằng thao tác riêng.
    - Tạo user và gán Space trong cùng một giao dịch DB: gán lỗi → hủy tạo user. **\[SQL\]**
    - Chặn xóa membership cuối cùng của user (trừ Admin chính) ở `removeMember`.
    - Client: `RegisterPage.tsx` gửi `spaceSlug` theo URL; nút Google ở `RegisterPage.tsx` / `LoginPage.tsx` thêm `spaceSlug` vào `/api/auth/google`. Màn hình login & register ở Space nào (qua custom domain hoặc slug `/:spaceSlug/login`, `/:spaceSlug/register`) **phải hiển thị ảnh đại diện và màu chủ đạo của Space đó tương ứng ở khung bên phải** (`customSpace?.imageUrl`), chỉ trang admin hệ thống gốc mới dùng logo mặc định.
    - Truy vấn chỉ đọc liệt kê user hiện chưa thuộc Space nào để xử lý tay.

Xong khi: `grep checkPermission\|canAccessSpace` không còn kết quả ở route ghi; test ma trận xanh.

### Giai đoạn 2 — AI, dữ liệu riêng tư và phiên đăng nhập (tuần 2)

- [x] 2.1 Tách truy vấn AI công khai (không có `training_content`) và truy vấn quản trị; `getVisibleAiConfigs` dùng `req.user` (số 8). **\[SQL\]** — Xong 07/10.
- [x] 2.2 `estimate-context` chỉ cho quyền `ai`; `trained-conversations` qua `requireAiPermission('conversations')`; `latest-conversation` dùng `req.user` (số 9, 10). — Xong 07/10.
- [x] 2.3 `voice-key` kiểm `canUserAccessAi` + giới hạn tần suất + tính phí; `translate` / `explain-content` kiểm quyền `files` ở Space truyền vào + rate limit (số 11, 12). — Xong 07/10 (phần kiểm quyền; giới hạn tần suất và tính phí voice-key chưa làm).
- [x] 2.4 Gói giá của Space chỉ được chứa AI cùng Space (số 14). — Xong 07/10.
- [ ] 2.5 Phiên đăng nhập mới: access token 15 phút; refresh token ngẫu nhiên, lưu băm trong bảng riêng, xoay vòng mỗi lần dùng, thu hồi được, đặt trong cookie `HttpOnly; Secure; SameSite`; bỏ “Legacy Token”; Google callback trả mã dùng một lần thay vì token trong URL; `api_token` chỉ còn là API key cho `/api/v1` (số 13). **\[SQL\]** — Chủ dự án giữ `api_token` (07/10); làm phần refresh token mới, không vô hiệu token cũ.

Xong khi: không endpoint công khai nào trả system prompt; đăng xuất thu hồi được phiên; token không còn trong localStorage.

### Giai đoạn 3 — Tiền và merit (tuần 3)

- [x] 3.1 Trừ merit nguyên tử `UPDATE … SET merits = merits - $1 WHERE id = $2 AND merits >= $1` cho mua gói và tăng lượt. **\[SQL\]** — Xong 07/10.
- [ ] 3.2 Sổ cái: mọi thay đổi số dư qua một hàm duy nhất (ghi `transactions` cùng giao dịch DB); job đối soát hằng ngày giữa tổng giao dịch và số dư. **\[SQL\]** — Đối soát lấy số dư hiện tại làm số dư đầu kỳ; giao dịch `pending_verification` của QR không tính vào số dư.
- [x] 3.3 Xử lý chênh lệch hiện có theo quyết định ở mục cuối (#301, \~128 nghìn merit không giao dịch, 50.000 merit QR của Space 1). **\[SQL\]** — Bỏ — chủ dự án giữ nguyên #301, ~128 nghìn merit và 50.000 merit QR (tài khoản test).
- [x] 3.4 Danh sách cúng dường công khai chỉ trả tên, số merit, thời gian, lời nhắn; `limit` tối đa 100. **\[SQL\]** — Xong 07/10.
- [ ] 3.5 PayOS: số tiền tối thiểu, quy đổi VND → merit một chỗ, bỏ quy ước “giá < 1000 là USD”.
- [ ] 3.6 Chủ Space duyệt cúng dường QR: endpoint + màn duyệt; Duyệt → `addMerits` (ghi giao dịch), Từ chối → hủy; Admin chính duyệt được mọi Space. **\[SQL\]** nếu cần thêm cột trạng thái.

Xong khi: gửi 20 request mua song song không làm âm merit; báo cáo đối soát bằng 0 chênh lệch.

### Giai đoạn 4 — Hiệu năng và cấu trúc (tuần 4)

- [x] 4.1 Cache thông tin user + quyền 30–60 giây (hiện mỗi request tốn 5 truy vấn), xóa cache khi đổi role / mua gói. — Xong 07/10.
- [x] 4.2 Pool DB: `max`, `statement_timeout`, `idleTimeoutMillis`. — Xong 07/10 (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`; không đặt `statement_timeout` để không cắt tác vụ dài).
- [ ] 4.3 pgvector làm backend mặc định: index HNSW trên cột embedding, kiểm số chiều khớp model, giữ lớp trừu tượng để bật Weaviate sau. **\[SQL\]**
- [ ] 4.4 Phân trang bằng SQL cho hội thoại, Pháp thoại, tìm kiếm Social; tạo bảng `guest_daily_usage`. **\[SQL\]** — Bảng `guest_daily_usage` đã có migration `20261005_guest_daily_usage.sql`; còn phân trang SQL.
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
  AND permissions && ARRAY['manual-billing','finetune']::text[];

-- Gỡ (đúng nội dung file migration hiện tại)
UPDATE roles
SET permissions = array_remove(array_remove(permissions, 'manual-billing'), 'finetune')
WHERE space_id IS NOT NULL
  AND permissions && ARRAY['manual-billing','finetune']::text[];
```

Đã chốt: Space được tự đặt gói giá, nên giữ `pricing`.

**0.5 — Vô hiệu toàn bộ token cũ sau khi đổi khóa**

```sql
UPDATE users SET api_token = encode(gen_random_bytes(32), 'hex');
```

Cần extension `pgcrypto`; mọi người sẽ phải đăng nhập lại. **Không áp dụng** — chủ dự án quyết định giữ `api_token` (07/10).

**1.5 — Đổi quyền `cms` kiểu cũ thành hai quyền chuẩn** (đã chốt `cms_write` + `cms_approve`; `policy.ts` hiện vẫn coi `cms` là có cả hai)

```sql
UPDATE roles
SET permissions = array_remove(permissions, 'cms')
    || ARRAY(SELECT unnest(ARRAY['cms_write','cms_approve']::text[])
             EXCEPT SELECT unnest(permissions))
WHERE 'cms' = ANY(permissions);
```

Chưa chốt: role cũ có `cms` nhận cả hai quyền (giữ hành vi hiện tại) hay chỉ `cms_write`.

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

**4.4 — Bảng giới hạn lượt chat của khách** (đã có migration `20261005_guest_daily_usage.sql`; câu dưới chỉ để tham khảo)

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

**Rollback:** code → `git revert` commit của giai đoạn rồi `pm2 restart`; dữ liệu → mỗi migration có kèm câu hoàn tác, riêng thao tác xóa / trừ merit chỉ khôi phục được từ bản `pg_dump`. Việc đổi khóa bí mật (0.5) không rollback được.

## Quyết định đã chốt

Chủ dự án đã trả lời đủ 8 câu ngày 06–07/10. Thêm (07/10): giữ nguyên `api_token` và không khóa cổng 5432; không đăng ký ở tên miền chính, mọi đăng ký phải qua Space, tên miền chính `login.bodhilab.io` (không phải `giac.ngo` — đây là một Space) chỉ để Admin chính đăng nhập; không còn gán cứng Space 1.

- [x] 1\. Mỗi Space chỉ có một Admin (chủ Space), nhiều quản lý, user bắt buộc phải thuộc space. trừ admin root
- [x] 2\. Admin Space  được tạo tài khoản user mới 
- [x] 3\. Space  được tự đặt gói giá riêng
- [x] 4\. Tên quyền CMS chuẩn: `cms_write` + `cms_approve`
- [x] 5\. User #301 (100.000 merit, nghi tài khoản QA): giữ nguyên do tôi + tay test app.
- [x] 6\. Khoảng 128 nghìn merit không có giao dịch: giữ nguyên do tôi + tay test app.
- [x] 7\. 50.000 merit QR đã cộng vào Space 1 ngày 17/03:  giữ do tôi + tay để test app; từ nay  duyệt cúng dường QR là chủ space
- [x] 8\. Thông báo hàng loạt: Admin Space chỉ gửi cho thành viên Space mình, còn gửi toàn nền tảng và gửi email test chỉ Admin chính- ok?
