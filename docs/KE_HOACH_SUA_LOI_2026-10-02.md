# Kế hoạch sửa lỗi & chỗ chưa hợp lý — GiacNgoVN

**Ngày rà soát:** 02/10/2026 · **Phạm vi:** toàn bộ `server/`, `client/src/`, cấu hình, tài liệu `docs/`
**Đối chiếu:** báo cáo `docs/BAO_CAO_RA_SOAT_TOAN_DIEN_CHECKLIST.md` (27/09/2026)

> [!CAUTION]
> **Tài liệu này mô tả các lỗ hổng CHƯA ĐƯỢC VÁ trên bản đang chạy.** Không đưa file này lên repo công khai, không gửi ra ngoài nhóm cho tới khi xong **Giai đoạn 0**.
> Theo quy định trong `docs/cau_truc.md`: mọi thay đổi câu SQL ở backend phải được chủ dự án duyệt trước. Các hạng mục có đánh dấu **[SQL]** cần duyệt trước khi sửa.

---

## 1. Tóm tắt

- Dự án có nền tảng tốt (multi-tenant theo Space, PayOS webhook có xác minh chữ ký và chống xử lý trùng, Socket.IO có xác thực, OAuth state có ký, Voice Live dùng ephemeral token), nhưng **phân quyền ở backend còn nhiều lỗ hổng nghiêm trọng**. Báo cáo 27/09 kết luận "không có P0" — kết luận đó không còn đúng.
- Tổng số phát hiện: **10 P0 · 15 P1 · 13 P2 · 9 P3** (chi tiết ở mục 4).
- **Ba nguyên nhân gốc** tạo ra phần lớn lỗi:
  1. `canAccessSpace` / `getUserManagedSpaceIds` coi **thành viên = người quản lý**, trong khi **mọi tài khoản đăng ký đều tự động thành thành viên Space 1** (hoặc Space theo tên miền). Kết quả: hầu như mọi người dùng đều "quản lý" Space 1.
  2. Server **tin dữ liệu từ client**: `userId`, `aiConfig`, `isTestChat`, `guestTurnCount`, `conversationId`, `metadata`, `fileAttachment.url`, `spaceId`.
  3. Trả **nguyên bản ghi DB** (`SELECT *`) rồi lọc kiểu "bỏ vài trường", mỗi controller một kiểu → lộ `api_token`, `reset_token`, khóa API.
- **Việc phải làm ngay (Giai đoạn 0, 1–3 ngày):** vá 10 lỗi P0, sau đó **đổi (rotate) toàn bộ khóa bí mật**, vì không thể chắc chúng chưa bị lấy.
- **Thiền ↔ Social Feed:** **không nên nhúng/gộp** bộ hẹn giờ thiền vào Feed; nên giữ Thiền là không gian riêng, yên tĩnh, và chỉ thêm "cầu nối" **tự nguyện**: thiền xong có thể chia sẻ một bài `meditation_share` lên Cộng đồng. Làm ở Giai đoạn 3, sau khi vá bảo mật Feed và có lưu lịch sử thiền (mục 5).

### Giới hạn của lần rà soát này
- Rà soát tĩnh mã nguồn (đọc code). **Chưa chạy được build/test**: registry npm bị chặn ở môi trường rà soát, và shell trên máy dự án không khởi động được. Đã chạy `tsc` với khai báo giả cho thư viện ngoài để kiểm tra phần server: không thấy lỗi kiểu nội bộ.
- Không truy cập DB, server production hay tài khoản thật. Mỗi phát hiện ghi kèm file:dòng để đội tự kiểm chứng.
- 10 lỗi P0 và 2 lỗi P1 trọng yếu (P1-11, P1-13) đã được **kiểm chứng lại độc lập** bằng một lượt đọc mã thứ hai: tất cả đều xác nhận, không có kết luận nào bị bác bỏ.

---

## 2. Điểm làm tốt (giữ nguyên khi sửa)

- PayOS: webhook xác minh chữ ký, so khớp `orderCode` và `amount`, "claim" đơn bằng `UPDATE ... WHERE status='pending'` để chống cộng trùng (`payosController.ts:13-37, 190-213`).
- Socket.IO bắt buộc JWT và kiểm tra quyền khi `join-space` (`server/index.ts:194-219`).
- `JWT_SECRET` bắt buộc ≥ 32 ký tự (`utils/jwtSecret.ts`); OAuth state có HMAC + hạn 10 phút (`utils/oauthState.ts`).
- Voice Live dùng ephemeral token thay vì trả raw key (`aiConfigController.ts:269-290`).
- `requireSpacePermission` / `requireAiPermission` (thêm ngày 27/09) đi đúng hướng — cần mở rộng ra toàn bộ API.

---

## 3. Nguyên nhân gốc (sửa tận gốc thay vì vá từng chỗ)

| Mã | Nguyên nhân | Hệ quả | Hướng sửa chung |
|---|---|---|---|
| R1 | `getUserManagedSpaceIds` gộp cả Space **sở hữu** và Space **là thành viên** (`authMiddleware.ts:120-143`); đăng ký tự thêm vào Space 1 (`authController.ts:119, 150, 272`) | Mọi user được coi là quản lý Space 1 ở khoảng 60 chỗ dùng `canAccessSpace`/`getUserManagedSpaceIds` | Chỉ dùng `canAccessSpace` để kiểm tra "là thành viên" khi **đọc**; mọi thao tác **ghi** dùng `requireSpacePermission(spaceId, quyền)` |
| R2 | `checkPermission(p)` kiểm tra trên **hợp quyền của mọi Space** (`req.user.permissions`) (`authMiddleware.ts:87-97`) | Admin Space A thao tác được dữ liệu toàn hệ thống / Space B | Tài nguyên thuộc Space → `requireSpacePermission`; tài nguyên toàn cục → chỉ `isGlobalAdmin` |
| R3 | Tin tham số client: `userId`, `aiConfig`, `isTestChat`, `metadata`, `fileAttachment.url`, `conversationId`, `guestTurnCount` | Chuyển merit của người khác, dùng AI miễn phí, đọc file server, ghi đè hội thoại | Danh tính luôn lấy từ `req.user`; cấu hình luôn nạp từ DB theo id rồi kiểm quyền |
| R4 | `SELECT *` + `mapAndSanitizeUser` chỉ bỏ `password` (ít nhất 5 bản khác nhau) | Lộ `api_token` (= refresh token vĩnh viễn + Bearer token), `reset_token`, khóa API của Space | Một hàm `toPublicUser()` / `toPublicSpace()` dạng **whitelist** dùng chung |
| R5 | Upload giữ **tên file gốc**, thư mục đích lấy từ client, `/uploads` phục vụ công khai **cùng origin** | Ghi đè file Space khác (ví dụ ảnh QR cúng dường), XSS lưu trữ qua SVG/HTML | Một module lưu file: tên ngẫu nhiên, kiểm tra nội dung, kiểm quyền Space, tách tên miền phục vụ file |

---

## 4. Danh sách phát hiện

Quy ước: **P0** khai thác từ xa được, ảnh hưởng tiền/khóa bí mật/chiếm tài khoản → vá trong 1–3 ngày. **P1** lỗ hổng phân quyền/lộ dữ liệu cao → 1–2 tuần. **P2** lỗi chức năng, trải nghiệm, hiệu năng. **P3** kiến trúc, dọn dẹp ("bất hợp lý").

### 4.1. P0 — Khẩn cấp

#### P0-1 · Khóa AI của hệ thống bị lộ công khai
- **Vị trí:** `server/routes/systemRoutes.ts:12-13`; `server/controllers/systemController.ts:97-107`; `server/models/system.model.ts:55-65`.
- **Vấn đề:** `GET /api/system/config` (và `/system-config`) **không cần đăng nhập** nhưng trả `systemKeys` **đã giải mã**. Client admin lại phụ thuộc vào việc lấy trọn config để lưu lại (`client/src/components/admin/WithdrawalManagement.tsx:99-106`).
- **Tác động:** ai cũng lấy được khóa Gemini/GPT/Groq dùng chung của hệ thống.
- **Cách sửa:** endpoint công khai chỉ trả trường công khai (`guestMessageLimit`, `template`, `templateSettings`); tạo `GET /api/system/admin-config` chỉ Global Admin, khóa hiển thị dạng che (`••••1234`); `PUT` cập nhật **từng phần**, không gửi lại khóa nếu không đổi (xem P1-9). **[SQL]**
- **Kiểm thử chấp nhận:** gọi ẩn danh không có `systemKeys` trong response.

#### P0-2 · Khóa bí mật của Space lộ cho mọi thành viên
- **Vị trí:** `server/controllers/spacesController.ts:26-47` (nhánh người đã đăng nhập trả nguyên bản ghi, dòng 36-41), `:64`, `:81`, `:98`; `server/models/space.model.ts:8-52` (`s.*` + giải mã `apiKeys`).
- **Vấn đề:** `GET /api/spaces`, `/:id`, `/slug/:slug`, `/domain/:domain` trả `apiKeys`, `smtpPass`, `payosApiKey`, `payosChecksumKey` cho bất kỳ ai `canAccessSpace` → thực tế là **mọi thành viên** (R1). Tài liệu `cau_truc.md` mục III.5 ghi "chỉ SuperAdmin/Owner" — mã nguồn không khớp. Tệ hơn: khi đăng ký (kể cả đăng ký lại bằng tài khoản đã có), Space được chọn theo header `Host` do client gửi (`authController.ts:112-120, 142-150`) → ai cũng tự thêm mình làm thành viên của **bất kỳ Space có tên miền riêng** rồi đọc khóa của Space đó.
- **Tác động:** lộ khóa AI của Space; lộ mật khẩu SMTP (gửi email mạo danh chùa); lộ **checksum PayOS** → có thể làm giả webhook để cộng merit mà không trả tiền (webhook được xác minh bằng chính khóa này, `payosController.ts:197-202`).
- **Cách sửa:** không bao giờ trả các trường bí mật ở API chung; endpoint riêng cho người có quyền `settings`/`payment-settings` **trong đúng Space**, khóa dạng che; khi lưu, chỉ ghi khóa nếu người dùng nhập giá trị mới.

#### P0-3 · Người dùng thường tự cấp quyền admin, tự cộng merit, và SQL injection
- **Vị trí:** `server/routes/authRoutes.ts:27-30` (`PUT /api/auth/profile`), `server/routes/userRoutes.ts:14`; `server/controllers/userController.ts:122-170`; `server/models/user.model.ts:47-53, 207-212`.
- **Vấn đề:**
  - `updateUser` tính `isSpaceManagerForUser` bằng `getUserManagedSpaceIds` (dòng 130-137). Vì người dùng là thành viên của chính Space mình đang ở, khi **tự sửa hồ sơ** họ được coi là "quản lý" → `canManage = true` → giữ lại `roleIds`, `merits`, `isActive`, `password` trong payload (dòng 152-161).
  - Ai có quyền `users` ở **bất kỳ** Space nào được coi là admin toàn cục (dòng 128) → được đặt `isGlobalAdmin`.
  - `updateRolesForUser` **nối chuỗi** `roleIds` vào câu SQL (`user.model.ts:50`) → SQL injection (node-postgres cho phép nhiều câu lệnh khi không truyền tham số).
  - `ALLOWED_FIELDS` cho phép `merits`, `isGlobalAdmin`, `apiToken`, `resetToken` (dòng 207-212). Ngay cả khi không được coi là "quản lý", người dùng vẫn tự đặt được `subscriptionPlanId` (tự nâng gói trả phí), `requestsRemaining`, `stripeAccountId`, `apiToken`, `resetToken` vì các trường này không bị loại khỏi payload.
  - Đổi mật khẩu qua hồ sơ **không cần mật khẩu cũ**.
  - Dòng 163 ghi log toàn bộ payload, **gồm mật khẩu mới dạng rõ** (production vẫn in mức INFO, `utils/logger.ts:11`).
- **Tác động:** chiếm quyền quản trị, tạo merit vô hạn, đọc/sửa toàn bộ DB.
- **Cách sửa:** tách `PUT /api/auth/profile` thành endpoint riêng chỉ nhận `name`, `avatarUrl`, `bio`; gán role chỉ qua endpoint quản trị có `requireSpacePermission('users')` + kiểm tra role thuộc đúng Space; `updateRolesForUser` dùng tham số `$1,$2` và ép `Number.isInteger`; bỏ `merits`/`isGlobalAdmin`/`apiToken`/`resetToken` khỏi whitelist chung; bỏ log payload. **[SQL]**
- **Kiểm thử:** user thường gửi `roleIds`/`merits`/`isGlobalAdmin` → bị bỏ qua; `roleIds: ["1); ..."]` → 400.

#### P0-4 · Lộ token đăng nhập vĩnh viễn của người khác → chiếm tài khoản bất kỳ
- **Vị trí:** `server/routes/spacesRoutes.ts:61` (`GET /api/spaces/owners`, chỉ cần đăng nhập); `server/controllers/userController.ts:10-14, 24-58`; `server/models/user.model.ts:91-123` (`SELECT *`, `u.*`); `aiConfigController.ts:14-18, 174-205`; `spacesController.ts:12-16, 306-320`; `userRoutes.ts:15-16`.
- **Vấn đề:** các response trên trả bản ghi user chỉ bỏ `password` → còn `api_token`, `reset_token`. `api_token` vừa là **refresh token không hết hạn** (`authController.ts:24-33, 214-231`) vừa được chấp nhận làm **Bearer token** ("Legacy Token", `authMiddleware.ts:37-46`). Ngoài ra `DELETE /api/users/:id` và `POST /api/users/:id/regenerate-token` chỉ cần quyền `users` ở bất kỳ Space nào → xóa/lấy token của **mọi** user.
- **Tác động:** chiếm tài khoản chủ Space, Global Admin.
- **Cách sửa:** `toPublicUser()` whitelist dùng ở mọi controller; `/spaces/owners` và `/users/space-owners` chỉ Global Admin, chỉ trả `id,name,email,avatarUrl`; xóa/regenerate token user khác chỉ Global Admin; bỏ cơ chế "Legacy Token" ở middleware (hoặc lưu token dạng băm); sau khi vá: **tạo lại api_token cho toàn bộ user**. **[SQL]**

#### P0-5 · Tiêu merit của người khác, thổi phồng số dư Space, duyệt rút tiền xuyên Space
- **Vị trí & vấn đề:**
  - `POST /api/spaces/:id/offer` lấy `userId` **từ body** → trừ merit của người khác, cộng vào Space bất kỳ (`spacesController.ts:306-320`, `space.model.ts:314-349`; kiểm tra số dư không khóa hàng → có thể tiêu trùng khi gửi đồng thời).
  - `POST /api/ai-configs/:id/purchase` và `/claim` lấy `userId` từ body (`aiConfigController.ts:174-205`, `billing.model.ts:451+`).
  - `POST /api/spaces/:id/qr-donation` (**khách cũng gọi được**) cộng thẳng `amount` vào `spaces.merits`, không đối soát ngân hàng, không duyệt (`spacesRoutes.ts:98`, `spacesController.ts:377-409`, `space.model.ts:282-312`).
  - `POST /api/billing/transactions/manual` chỉ cần quyền `manual-billing` ở bất kỳ Space (`billingRoutes.ts:19`, `billingController.ts:139-148`).
  - `PUT /api/billing/admin/withdrawals/:id/process` chỉ cần quyền `withdrawals` ở bất kỳ Space; đọc yêu cầu **không khóa** (`SELECT ... WHERE id`, dòng 498), chuyển Stripe **trước** khi cập nhật trạng thái, **không có idempotency key** (`billingController.ts:484-576`) → hai lần duyệt đồng thời có thể chuyển tiền hai lần (DB chỉ cập nhật một lần nhờ `AND status='pending'`, nhưng tiền đã chuyển). `GET /api/billing/admin/withdrawals` trả yêu cầu rút tiền của **mọi** Space.
- **Tác động:** gian lận merit và — nếu người duyệt không phát hiện — rút tiền thật qua Stripe Connect.
- **Cách sửa:** luôn dùng `req.user.id`; QR donation lưu trạng thái **chờ duyệt**, chỉ cộng khi admin Space xác nhận (không cộng vào số dư có thể rút); merit thủ công và duyệt rút tiền chỉ Global Admin; xử lý rút tiền trong transaction với `SELECT ... FOR UPDATE`, đổi trạng thái sang `processing` trước khi gọi Stripe, truyền `idempotencyKey: withdrawal_<id>`; khóa hàng user khi trừ merit. **[SQL]**

#### P0-6 · Đọc file tùy ý trên máy chủ qua chat (không cần đăng nhập)
- **Vị trí:** `server/routes/conversationRoutes.ts:11`; `server/controllers/chatController.ts:93-97, 313-317`; `server/services/fileParserService.ts:45-69`.
- **Vấn đề:** `fileAttachment.url` do client gửi được đưa thẳng vào `extractText`; hàm này chấp nhận **đường dẫn tuyệt đối** (thêm ngày 24/09 theo `nhat_ky.md`) và cả `..`; nội dung file được ghép vào prompt nên AI có thể trả lại. Phần mở rộng lấy từ `name` do client đặt.
- **Tác động:** đọc `server/.env`, `ecosystem.config.cjs`, file hệ thống → lộ mật khẩu DB, JWT secret…
- **Cách sửa:** chỉ nhận file đã upload, tham chiếu bằng id thuộc chính user; resolve đường dẫn và bắt buộc nằm trong `uploads/space-<id>/user-<uid>/` (`path.resolve` + kiểm tra tiền tố); từ chối đường dẫn tuyệt đối; bỏ fallback quét toàn thư mục uploads theo tên; file tạm OCR dùng hàm nội bộ riêng, không đi qua tham số client.

#### P0-7 · Chat tin cấu hình AI từ client (dùng AI miễn phí, đọc RAG của Space khác, ghi đè hội thoại)
- **Vị trí:** `chatController.ts:45-66` (`aiConfig` trong body được dùng thay cho DB), `:103` (`isTestChat` từ body bỏ qua mọi giới hạn và tính phí), `:171` (`guestTurnCount` do client tự khai), `:206` (`conversationId` từ body → ghi đè hội thoại của người khác), `:256-284` + `conversationRoutes.ts:12` (`estimate-context` ẩn danh trả nguyên đoạn RAG); `v1Routes.ts:29-71` (kiểm `aiConfigId` nhưng `sendMessageStream` vẫn ưu tiên `body.aiConfig`).
- **Tác động:** người ngoài chọn model đắt nhất, system prompt tùy ý, dùng key của hệ thống/Space; đọc tài liệu huấn luyện riêng của AI bất kỳ theo id; sửa/xóa lịch sử chat của người khác.
- **Cách sửa:** luôn nạp `aiConfig` từ DB theo `aiConfigId` và kiểm tra quyền dùng (public/đã mua/danh sách truy cập); `isTestChat` chỉ khi người dùng có quyền `ai` trong Space của AI; `estimate-context` yêu cầu quyền đó; kiểm `conversationId` thuộc `req.user`; đếm lượt khách phía server (IP + cookie thiết bị + DB).

#### P0-8 · Module Tài liệu cho phép xóa/sửa không cần đăng nhập
- **Vị trí:** `server/routes/documentRoutes.ts:9, 19, 24-36`; `server/controllers/documentController.ts:24-31, 33-94, 97-127`.
- **Vấn đề:** `DELETE /api/documents/authors|types|topics/:id` **không có kiểm tra nào**; `POST/PUT` tạo/sửa danh mục toàn cục khi không gửi `spaceId` (ẩn danh cũng được); `POST /api/documents/extract-text` ẩn danh, dùng khóa **hệ thống**, `multer.memoryStorage()` **không giới hạn dung lượng**; `like` không giới hạn.
- **Tác động:** phá dữ liệu thư viện; tốn chi phí AI; làm sập server bằng file lớn.
- **Cách sửa:** `isAuthenticated` + `requireSpacePermission('files')` cho mọi route ghi; danh mục toàn cục chỉ Global Admin; `extract-text` yêu cầu đăng nhập, giới hạn 10 MB, rate limit, dùng khóa của Space người dùng đang quản lý.

#### P0-9 · Upload file: ghi đè file của Space khác và XSS lưu trữ
- **Vị trí:** `systemRoutes.ts:16-17`; `systemController.ts:25-54` (thư mục theo `spaceId` client gửi, **giữ tên gốc**), `:56-80` (cho phép `image/svg+xml`, tin `mimetype` do client khai); `server/index.ts:134` (tắt CSP), `:138` (`/uploads` công khai cùng origin). Cùng kiểu giữ tên gốc: `dharmaTalksRoutes.ts:31-35`, `meditationRoutes.ts:31-35`, `spacesRoutes.ts:31-35`, `spacePageRoutes.ts:21-25`.
- **Tác động:** bất kỳ tài khoản nào cũng có thể **thay ảnh QR cúng dường** hay logo của Space khác bằng file trùng tên; không kiểm tra phần mở rộng nên file `.html` khai báo là `text/plain` vẫn được lưu và phục vụ như HTML (tương tự SVG có script) trên tên miền chính → đánh cắp token trong `localStorage`.
- **Cách sửa:** tên file ngẫu nhiên (UUID); whitelist phần mở rộng **và** kiểm tra magic bytes; cấm SVG/HTML (hoặc ép `Content-Disposition: attachment`); kiểm quyền với `spaceId`; thêm `X-Content-Type-Options: nosniff`; về lâu dài phục vụ file từ tên miền riêng (ví dụ `files.giac.ngo`).

#### P0-10 · Khóa bí mật production lưu dạng rõ và có thể đã bị lộ
- **Vị trí:** `server/ecosystem.config.cjs` (JWT_SECRET, DATABASE_URL kèm mật khẩu và IP public cổng 5432, khóa Weaviate, Google OAuth secret, mật khẩu SMTP yếu, CRYPTO_KEY). File đang nằm trong `.gitignore` và không có trong index git hiện tại.
- **Vấn đề:** các lỗ hổng P0-1/2/4/6 có thể đã làm lộ các khóa này; DB mở cổng ra internet.
- **Cách sửa (sau khi deploy bản vá):** kiểm tra lịch sử git (`git log --all -- server/ecosystem.config.cjs server/.env`); đổi toàn bộ: JWT_SECRET (buộc đăng nhập lại), mật khẩu DB, CRYPTO_KEY (giải mã bằng khóa cũ rồi mã hóa lại), khóa AI hệ thống và của từng Space, PayOS checksum/API key, SMTP, Google OAuth secret, Weaviate key; firewall chỉ cho máy chủ app kết nối 5432; chuyển bí mật sang `.env` trên server/secret manager, `ecosystem.config.cjs` chỉ còn tên biến.

### 4.2. P1 — Cao

#### P1-1 · Phân quyền đa Space chưa chuẩn hóa (R1 + R2)
- Còn **khoảng 60 chỗ** dùng `canAccessSpace`/`getUserManagedSpaceIds` để quyết định quyền ghi: `cmsController.ts` (17), `documentController.ts` (15), `spacesController.ts` (8), `dharmaTalksController.ts` (5), `roleController.ts` (4), `meditationController.ts` (4), `mediaController.ts` (4), `aiConfigController.ts` (3), `userController.ts`, `systemController.ts`, `conversationController.ts`, `billingController.ts`.
- Các route dùng `checkPermission` (hợp quyền) cho tài nguyên thuộc Space: `meditationRoutes.ts:56`, `dharmaTalksRoutes.ts:56`, `documentRoutes.ts:11,16-18`, `roleRoutes.ts:8`, `billingRoutes.ts:11-13,19,51-52`, `commentRoutes.ts:12`, `trainingDataRoutes.ts:10-11`, `systemRoutes.ts:14-15,35,56`, `notificationRoutes.ts`.
- **Cách sửa:** thay bằng `requireSpacePermission`; mọi truy vấn theo id phải kèm điều kiện `space_id` (`WHERE id=$1 AND space_id=$2`). **[SQL]** Giữ lại các test của GN-SEC-01 và mở rộng.

#### P1-2 · Thiền & Pháp thoại: sửa/xóa nội dung của Space khác
- `meditationController.ts:174-218`: chỉ kiểm tra khi body có `spaceId`, và kiểm tra `spaceId` **do client gửi** chứ không phải Space của bản ghi → bỏ `spaceId` là sửa được bài của Space khác. `:220-233`: xóa **không kiểm tra** gì ngoài quyền `meditation` ở bất kỳ Space. `dharmaTalksController.ts`: kiểm tra mức "thành viên".
- **Cách sửa:** nạp bản ghi theo id → lấy `space_id` → `hasSpacePermission(space_id, 'meditation'|'dharma-talks')`. **[SQL]**

#### P1-3 · Quản lý vai trò (Role) xuyên Space
- `roleController.ts:40-62`: người không phải Global Admin tạo role với **`spaceId` bất kỳ**; `:64-123`: sửa/xóa role của Space khác theo id; `:49, 86`: lọc quyền theo hợp quyền. Ngược lại `:71, 104`: Global Admin mà là thành viên của một Space (mọi user đều vậy) **không sửa được role hệ thống** — lỗi chức năng.
- **Cách sửa:** role thuộc Space → `requireSpacePermission('roles', spaceId)` và chỉ cấp quyền mà người tạo có **trong Space đó**; role hệ thống → chỉ `isGlobalAdmin` (bỏ điều kiện `managedSpaceIds.length === 0`).

#### P1-4 · CMS
- `cmsController.ts:146-174`: xóa bài theo id **không kiểm tra bài thuộc Space** → thành viên Space A xóa được bài Space B. `:640-653`: xóa kết nối mạng xã hội tương tự. `:655-678`: thành viên bất kỳ lấy được danh sách Page kèm **page access token** Facebook. `:680-720`: thành viên ghi đè kết nối. `:722-765`: OAuth callback dùng `state=space_<id>_<platform>` **không ký** → kẻ xấu ghi đè kết nối Facebook của Space khác.
- **Cách sửa:** quyền `cms_write`/`cms_approve` trong đúng Space; truy vấn kèm `space_id` **[SQL]**; state OAuth ký HMAC + nonce lưu server, dùng `signOAuthState` sẵn có.

#### P1-5 · Social Feed: đọc/đăng chéo Space, không có kiểm duyệt
- `spaceSocialRoutes.ts:28` chỉ `isAuthenticated`; `spaceSocialController.ts:48-121` đọc feed **bất kỳ Space**; `:134-170` đăng bài vào Space bất kỳ; `quotedPostId` không kiểm tra cùng Space (repost làm lộ bài Space riêng); `metadata` lấy nguyên từ client (`JSON.parse` không bắt lỗi, dòng 164) → có thể **giả mạo câu trả lời AI** của chùa (`ai_share`).
- Kiểm duyệt: chỉ chủ bài hoặc Global Admin xóa được bài/bình luận (`:270, :451`) → **admin Space không gỡ được bài vi phạm**. Ghim bài (`:825-850`): chủ bài **tự ghim bài mình**; "admin" = có bất kỳ role nào.
- Hiệu năng/độ đúng: chạy `CREATE TABLE`/`ALTER TABLE` **mỗi lần** tải bình luận và like (`:355-363, :476-483`) — `ALTER TABLE` lấy khóa độc quyền bảng; đếm like/comment kiểu đọc-rồi-ghi dễ lệch số.
- **Cách sửa:** kiểm tra thành viên Space cho mọi route; quyền `moderate` cho admin Space (xóa, ghim, khóa bình luận); `ai_share`/`library_share` do server dựng từ id tin nhắn/tài liệu đã kiểm quyền; chuyển DDL thành migration; đếm bằng `INSERT ... ON CONFLICT ... RETURNING` trong transaction. **[SQL]**

#### P1-6 · Hội thoại AI: lộ chat riêng tư
- `conversationController.ts:71-82`: `latest-conversation` lấy `userId` từ body → đọc cuộc chat gần nhất của người khác; `:48-56`: mọi user đọc được các hội thoại "đã huấn luyện" (chat thật của người dùng) của AI bất kỳ; `:84-120`: tải **toàn bộ** hội thoại vào RAM rồi mới lọc. Thêm `chatController.ts:206` (P0-7).
- **Cách sửa:** dùng `req.user.id`; trained conversations chỉ cho người có quyền `ai` trong Space của AI; phân trang ở SQL. **[SQL]**

#### P1-7 · Cấu hình AI
- System prompt (`training_content`) nằm trong truy vấn trả cho **API công khai** (`aiConfig.model.ts:6-20, 91-93`; `aiConfigRoutes.ts:12, 15`; `spacesRoutes.ts:92`) → ai cũng xem được prompt. Client VoiceChat đang dùng prompt này phía trình duyệt (`VoiceChat.tsx:326`).
- `aiConfigController.ts:21-33`: danh sách AI hiển thị theo `userId` trong body. `:239-299`: mọi user đã đăng nhập tạo được ephemeral token Gemini Live cho **AI bất kỳ** (kể cả AI riêng/trả phí), không hạn mức → tốn tiền key của Space. `:106-113`: nhánh xóa `isPublic` là code chết → quản lý Space đặt được AI public, trái quy tắc lúc tạo. `documentController.ts:288-300`: liên kết tài liệu **của Space khác** vào AI của mình → đọc trộm qua RAG.
- **Cách sửa:** tách truy vấn công khai (không có `training_content`); đưa system instruction vào cấu hình ephemeral token (`liveConnectConstraints`) thay vì gửi xuống client; voice-key kiểm tra quyền dùng AI + hạn mức/ngày; link tài liệu kiểm tra cùng Space. **[SQL]**

#### P1-8 · Xác thực & phiên đăng nhập
- JWT sống 7 ngày (`authController.ts:16-22`) + refresh token = `api_token` **không bao giờ hết hạn**, lưu rõ trong DB (`:24-33`); đổi mật khẩu không thu hồi phiên (`userController.ts:199-220`); Google callback đưa **token vào URL** (`authController.ts:288-293`) → lọt vào lịch sử trình duyệt/log; thông báo lỗi khác nhau giữa "không có tài khoản" và "sai mật khẩu" (`:40-46`) → dò email; `POST /api/v1/login` **không rate limit** (`v1Routes.ts:130`); `POST /api/users` (quyền `users` bất kỳ Space) tạo user với `roleIds` tùy ý.
- **Cách sửa:** access token 15–60 phút; refresh token riêng, lưu băm, xoay vòng mỗi lần dùng, thu hồi khi đổi/đặt lại mật khẩu; Google callback trả mã dùng-một-lần rồi đổi token qua POST; gộp thông báo lỗi đăng nhập; rate limit cho `/api/v1/login`. **[SQL]**

#### P1-9 · Cấu hình hệ thống bị ghi đè
- `systemRoutes.ts:14-15`: admin của **bất kỳ Space** (quyền `settings`) sửa cấu hình toàn hệ thống (phí nền tảng, quy tắc rút tiền, khóa hệ thống). `system.model.ts:70-96`: `UPDATE` ghi **tất cả cột** — thiếu trường nào là thành `NULL` (ví dụ lưu cài đặt rút tiền mà thiếu `systemKeys` là xóa sạch khóa).
- **Cách sửa:** chỉ Global Admin; cập nhật từng phần (`COALESCE`/chỉ cột có gửi). **[SQL]**

#### P1-10 · Gửi thông báo hàng loạt xuyên Space
- `notificationController.ts:17-80`: tham số `spaceId` không được kiểm quyền → admin Space A gửi email tới toàn bộ thành viên Space B (hoặc Space 1 = gần như mọi user); `:105-110`: chế độ `test` gửi tới email tùy ý bằng SMTP của nền tảng.
- **Cách sửa:** `requireSpacePermission('users', spaceId)`; `test` chỉ gửi tới email của chính người gửi.

#### P1-11 · Frontend: XSS và nơi lưu token
- Trang tùy biến của Space chạy trong `iframe srcDoc` với `sandbox="allow-scripts allow-same-origin ..."` (`CustomDomainPageResolver.tsx:136`, `SpaceCustomPageResolver.tsx:157-178`) → script trong trang có **cùng origin** với app, đọc được token; `servePublicPage` phục vụ HTML/JS do admin Space viết **trên tên miền chính** (`spacePageController.ts:690-735`; asset cho phép `.js`, `.svg` — `spacePageRoutes.ts:32`).
- HTML thô không lọc: `DocumentDetailPage.tsx:226, 231`, `SpaceDetailPage.tsx:274`; `innerHTML` trên phần tử tạm (`LibraryView.tsx:85`, `FilesAndDocuments.tsx:262, 558`) vẫn kích hoạt `<img onerror>`.
- Token (access + refresh) lưu trong `localStorage` (`App.tsx:110-117, 225-231`) → mọi XSS là chiếm tài khoản.
- **Cách sửa:** bỏ `allow-same-origin` hoặc phục vụ trang tùy biến từ origin riêng; lọc HTML bằng DOMPurify trước khi render; bật CSP (bắt đầu ở chế độ report-only); về lâu dài chuyển refresh token sang cookie `httpOnly; Secure; SameSite`.

#### P1-12 · Dữ liệu giao dịch
- `billingController.ts:777-836`: xuất Excel giao dịch theo quyền `manual-billing`/`settings` của bất kỳ Space (không gửi `spaceId` → xuất **toàn bộ**). `billingRoutes.ts:18` + `billing.model.ts:264-271`: danh sách cúng dường công khai trả `t.*` (gồm `stripe_charge_id`, `details`, ghi chú, ảnh bill).
- **Cách sửa:** export theo quyền trong Space; danh sách công khai chỉ trả `tên hiển thị (hoặc "Ẩn danh")`, số tiền, ngày. **[SQL]**

#### P1-13 · Đường dẫn lưu file không nhất quán → ảnh/âm thanh có thể 404 hoặc sai file
- Ảnh bìa/QR Space lưu vào `server/uploads` (`spacesRoutes.ts:13-14`), ảnh bài Social lưu theo `process.cwd()` (`spaceSocialController.ts:23`), trong khi server chỉ phục vụ `<gốc dự án>/uploads` (`index.ts:104-105, 138`). Cần kiểm tra trên server thật (thư mục `/www/wwwroot/giac.ngo`).
- Multer chọn thư mục theo `req.body.spaceId` — chỉ có giá trị nếu trường text được gửi **trước** file; nếu không, file Pháp thoại rơi vào `space-1` (`dharmaTalksRoutes.ts:16-19`), file Thiền rơi vào `global` (`meditationRoutes.ts:16`), còn URL lưu DB lại trỏ `space-<id>` → 404. Điều này giải thích hàm "tự chữa URL âm thanh" `meditationController.ts:20-64`, vốn có thể **phát nhầm file lớn nhất trong thư mục** (thường là một bài pháp thoại dài) và gọi `fs.*Sync` ở mỗi request.
- **Cách sửa:** một module lưu file dùng `UPLOADS_ROOT` từ cấu hình; thư mục đích lấy từ `req.params` đã kiểm quyền; sau khi chuyển dữ liệu cũ thì bỏ hàm tự chữa URL. **[SQL]** nếu cần cập nhật URL cũ.

#### P1-14 · File riêng tư bị phục vụ công khai
- Toàn bộ `uploads/` (kể cả `space-*/training/` chứa tài liệu huấn luyện nội bộ) phục vụ công khai (`index.ts:138`, `trainingDataController.ts:105-123`).
- **Cách sửa:** lưu tài liệu huấn luyện ngoài thư mục public; tải về qua endpoint kiểm quyền.

#### P1-15 · Form liên hệ
- `spacePageController.ts:737-787`: chèn `name`/`message` thẳng vào HTML email (giả mạo nội dung email gửi từ SMTP của chùa); `systemRoutes.ts:51` và `spacePageRoutes.ts:57` không có rate limit → có thể bị dùng để spam.
- **Cách sửa:** escape HTML; rate limit theo IP; captcha (đã có stub Turnstile chưa dùng).

### 4.3. P2 — Lỗi chức năng, trải nghiệm, hiệu năng

| Mã | Vấn đề | Vị trí | Cách sửa |
|---|---|---|---|
| P2-1 | **Bộ hẹn giờ thiền:** bấm Tắt/Bật tiếng làm tạo lại audio, gọi lại API và **đặt lại đồng hồ về đầu**; đếm bằng `setInterval` trừ dần → chạy chậm/dừng khi chuyển tab hoặc khóa màn hình; chuông kết thúc phát từ timer, mỗi tiếng chuông tạo một `AudioContext` mới → thường **bị chặn trên điện thoại**; trạng thái "Hoàn thành" không bao giờ hiện; chuông mở đầu kêu lại mỗi lần tiếp tục; không cho chọn thời lượng; không lưu buổi thiền | `MeditationTimer.tsx:154-221` (phụ thuộc `isMuted`), `:233-247`, `:105-151`, `:292-328`, `:336-342`, `:249-276` | Tách hiệu ứng tải dữ liệu khỏi `isMuted`; đếm theo mốc `endAt = Date.now() + duration`; mở khóa một `AudioContext` và preload chuông kết khi người dùng bấm Bắt đầu; Wake Lock API; cho chọn 5/10/15/20/30 phút |
| P2-2 | Mỗi Space chỉ có **1 bài thiền** (ràng buộc unique) → không có thư viện bài thiền dẫn; `update` gọi `findBySpaceId(id)` với id bài thiền | `meditation.model.ts:80`; `meditationController.ts:167-168` | Cho nhiều bài/Space, có thứ tự hiển thị **[SQL]** |
| P2-3 | Pháp thoại: khách thấy bài của **mọi Space**, người đã đăng nhập chỉ thấy Space mình và **mất bài toàn cục**; tải hết rồi lọc trong RAM | `dharmaTalksController.ts:79-101` | Lọc theo Space đang xem + phân trang ở SQL **[SQL]** |
| P2-4 | Social: tìm kiếm, hashtag và tường cá nhân **chỉ lọc trên các bài đã tải** (10 bài/lần) → thiếu kết quả, sai số đếm; `getSpaceMembers` cần quyền admin → @mention không hoạt động với thành viên thường; thông báo follow hiện ở mọi Space; thông báo trùng cho chủ bài đồng thời là người bình luận | `SocialFeed.tsx:2653-2690`; `spacesRoutes.ts:71`; `spaceSocialController.ts:411-424, 613-635` | Tìm kiếm/lọc theo user ở server; endpoint thành viên rút gọn (id, tên, avatar) cho người trong Space **[SQL]** |
| P2-5 | Trang chủ hiển thị **bài đăng, người dùng, thông báo giả** (ảnh Unsplash, "284 ngày trước") như hoạt động cộng đồng thật | `client/src/components/SocialFeed.tsx:63-125` | Thay bằng bài thật công khai gần nhất, hoặc ghi rõ "minh họa" |
| P2-6 | Client: khi refresh token thất bại, các request đang chờ **treo vĩnh viễn**; server không trả 401 cho token hết hạn ở route không bắt buộc đăng nhập → người dùng âm thầm thành khách | `apiService.ts:72-116`; `authMiddleware.ts:37-55` | Reject hàng chờ khi refresh lỗi; trả header báo token hết hạn |
| P2-7 | `isRootDomain()` hardcode `login.bodhilab.io`; slug suy ra từ subdomain (`host.split('.')[0]`) → sai với tên miền gốc như `giac.ngo` | `App.tsx:49-52, 92, 99` | Lấy cấu hình từ biến môi trường/`/api/spaces/domain/:host` |
| P2-8 | PayOS cúng dường: merit = làm tròn số USD → khoản nhỏ thành 0 merit → đơn **kẹt "pending"** dù đã trả tiền; quy ước "giá < 1000 là USD"; số tiền không đảm bảo là số nguyên | `payosController.ts:27-28, 73-82, 136-148` | Validate số tiền tối thiểu ở client & server; quy đổi rõ ràng, `Math.round` |
| P2-9 | Alias hỏng: `GET /api/spaces/managed/:userId` đọc `req.params.id` → luôn 400; `POST /api/auth/regenerate-token` cũng luôn 400 | `spacesRoutes.ts:60`; `authRoutes.ts:32`; `userController.ts:188-197, 222-232` | Sửa tham số hoặc bỏ alias |
| P2-10 | Trả nguyên `error.message` ra client ở nhiều controller (lộ chi tiết nội bộ); chuỗi lỗi tiếng Việt bị hỏng mã hóa trong `conversationController.ts`; comment logger ghi "chỉ WARN+" nhưng code in cả INFO | nhiều file; `utils/logger.ts:3, 11` | Thông báo lỗi chung + mã lỗi; sửa encoding UTF-8 |
| P2-11 | Mã hóa khóa: AES-CBC không có MAC; thiếu `CRYPTO_KEY` thì **dùng khóa mặc định** thay vì dừng; scrypt N=8192 thấp | `cryptoService.ts:7-19`; `user.model.ts:135, 193` | AES-256-GCM; thiếu khóa thì không khởi động; tăng tham số scrypt khi người dùng đăng nhập lại |
| P2-12 | `uncaughtException` chỉ ghi log rồi chạy tiếp ở trạng thái không xác định | `index.ts:49-55` | Log rồi thoát để PM2 khởi động lại |
| P2-13 | Admin Space xóa được file trong `uploads/global/` | `mediaController.ts` (`deleteMedia`) | `global/` chỉ Global Admin |

### 4.4. P3 — Kiến trúc & dọn dẹp ("bất hợp lý")

| Mã | Vấn đề | Đề xuất |
|---|---|---|
| P3-1 | **Không có schema/migration DB trong repo**: `npm run db:init` gọi `initDb.ts` không tồn tại; `server/migrations/` rỗng; `supabase/migrations` chỉ 3 file nhỏ; `shared/schema.ts` là schema Drizzle/Better-Auth **không được dùng**; bảng Social tạo bằng DDL lúc chạy | Dump schema hiện tại → migration có đánh số (node-pg-migrate hoặc Drizzle Kit) **[SQL]** |
| P3-2 | **~120/215 file client không được import** (≈1,2 MB): `Platform.tsx` (135 KB), `Manifesto.tsx` (85 KB), `Landing`, `Process`, `CenterDetail`, `Onboarding`, `Settings`…, bộ `components/ui/*` (shadcn), `translations/*`, các stub `wouter/autumn/turnstile`, `lib/auth-client.ts` (better-auth). **40/49 dependency** của client không dùng | Xóa sau khi xác nhận; bundle nhẹ hơn, review dễ hơn |
| P3-3 | Trùng lặp: `About/AboutPage`, `Career/CareerPage`, `Contact/ContactPage`, `Login/LoginPage`, `Privacy/PrivacyPage`, `Terms/TermsPage`, `ResetPassword/ResetPasswordPage`, `not-found/NotFoundPage`, `pages/*` vs `pages/docs/*`, `components/DocsLayout` vs `layouts/DocsLayout`, `components/SocialFeed` vs `components/social/SocialFeed`, `shared/` ở gốc và `client/src/shared`, `SpaceManagement.tsx.bak` | Giữ một bản |
| P3-4 | Component quá lớn: `SocialFeed.tsx` 3.647 dòng, `AiManagement.tsx` 3.370, `PracticeSpacePage.tsx` 2.362, `FilesAndDocuments.tsx` 120 KB, `CmsManagement.tsx` 90 KB, `SpaceManagement.tsx` 75 KB | Tách theo tính năng (PostCard, Composer, Comments, hooks dữ liệu…) |
| P3-5 | Hai cấu hình Vite trong `client/` (`vite.config.js` được Vite ưu tiên khi build, `vite.config.ts` chỉ Vitest dùng); `vite.config.ts`/`index.html`/`tsconfig.json`/`metadata.json` ở gốc còn sót từ template AI Studio (`vite.config.ts` gốc nhúng `GEMINI_API_KEY` vào bundle nếu lỡ dùng); alias `@` trong tsconfig (`./*`) khác Vite (`./src`) | Một file cấu hình; xóa file gốc thừa |
| P3-6 | `server/package.json` phụ thuộc `"ai-chat-platform": "file:.."` (tự tham chiếu gói gốc); `build` = `tsc --noEmit`, production chạy bằng `tsx` | Bỏ phụ thuộc vòng; CI chạy `tsc` |
| P3-7 | Route tỷ giá khai báo 3 lần (`index.ts:146-153`, `routes/index.ts:30-37`, `systemRoutes.ts:24-32`); ≥5 bản `mapAndSanitizeUser`; README lỗi thời (ghi Stripe, chưa có VietQR/Google OAuth, hướng dẫn `node index.js`, `.env.example` không tồn tại); `cau_truc.md` mô tả "lịch sử thiền", "chỉ Owner nhận khóa" — không khớp code | Gộp; cập nhật tài liệu sau Giai đoạn 1 |
| P3-8 | Thay đổi bảo mật ngày 27/09 **chưa commit** (`server/tests/`, `utils/jwtSecret.ts`, `utils/oauthState.ts` chưa có trong git); `test-results/.last-run.json`, `client/scratch.txt`, `.bak` lại bị track; script xóa dữ liệu `tasks/*.cjs` nằm trong repo | Commit ngay phần đã sửa; dọn file rác; chuyển script vận hành ra ngoài hoặc vào `scripts/` có hướng dẫn |
| P3-9 | Test: 3 file test server (mock), E2E chỉ có luồng đăng nhập; chưa có test cho billing, social, chat, upload | Bộ test hồi quy cho mọi P0/P1 (supertest), ma trận 2 Space × vai trò |

---

## 5. Có nên đưa phần Thiền vào Social Feed?

### Kết luận
**Không nên nhúng/gộp bộ hẹn giờ thiền vào Feed.** Giữ Thiền là một không gian riêng, yên tĩnh. Chỉ nên làm một **cầu nối nhẹ và tự nguyện**: thiền xong, người dùng *có thể chọn* chia sẻ một bài loại `meditation_share` (thời lượng + đôi dòng cảm nhận/hồi hướng) lên Cộng đồng của Space. Làm ở **Giai đoạn 3**, sau khi vá bảo mật Feed và có lưu lịch sử thiền.

### Hiện trạng
- "Thiền" hiện chỉ là **một cấu hình cho mỗi Space**: tiêu đề, mô tả, audio Việt/Anh, chuông kết thúc, thời lượng cố định do admin đặt. **Không lưu buổi thiền nào của người dùng**, không có lịch sử, không cho chọn thời lượng (`meditation.model.ts`, `MeditationTimer.tsx`).
- Feed đã hỗ trợ bài đăng có `metadata.type` (`ai_share`, `library_share`) → thêm `meditation_share` là tự nhiên, ít công.
- Thiền dùng được khi **chưa đăng nhập**; Feed **bắt buộc đăng nhập**. Hai tính năng bật/tắt độc lập bằng `hasMeditation` / `hasCommunity`.

### Vì sao không gộp
1. **Ngược mục đích:** thiền cần tĩnh lặng, ít kích thích; Feed là nơi nhiều kích thích (thông báo, lượt thích, cuộn vô tận). Đặt đồng hồ thiền trong Feed khiến người tập dễ phân tâm, thiền xong là lướt.
2. **Kỹ thuật:** `SocialFeed.tsx` đã 3.647 dòng và re-render liên tục (cuộn vô hạn, bài mới qua socket); bộ hẹn giờ đang có lỗi âm thanh/đếm giờ (P2-1) — nhúng vào chỉ làm lỗi nặng hơn.
3. **Logic sản phẩm:** gộp sẽ buộc khách phải đăng nhập mới thiền được, hoặc phá cơ chế bật/tắt riêng của từng Space.
4. **Bảo mật:** Feed hiện đọc/đăng được chéo Space (P1-5). Thói quen tu tập là dữ liệu cá nhân — không đưa vào trước khi vá.
5. **Tinh thần tu tập:** chuỗi ngày, bảng xếp hạng, "khoe" thành tích dễ thành ganh đua, nuôi ngã mạn. Nên tránh bảng xếp hạng công khai.

### Vì sao vẫn nên có cầu nối
- Tạo động lực nhẹ nhàng và tinh thần "tùy hỷ" trong cộng đồng.
- Mỗi lần chia sẻ là nội dung thật, chất lượng cho Feed (thay cho bài giả ở trang chủ — P2-5).
- Tận dụng hạ tầng `metadata` sẵn có, chi phí nhỏ.

### Thiết kế đề xuất
1. **[SQL]** Bảng `meditation_logs`: `id, user_id, space_id, meditation_id, planned_seconds, actual_seconds, completed, started_at, ended_at, note`.
2. **API:** `POST /api/meditation/sessions` (bắt đầu, server ghi `started_at`) → `POST /api/meditation/sessions/:id/finish` (server tự tính thời lượng từ mốc thời gian, giới hạn trần) → `GET /api/meditation/me/stats` (chỉ chủ tài khoản xem).
3. **Chia sẻ:** client gửi `{ meditationSessionId, content }`; server kiểm tra buổi thiền thuộc người dùng, đã hoàn thành, chưa chia sẻ, rồi **tự dựng** `metadata = { type: 'meditation_share', minutes, title }`. Không nhận `metadata` loại này từ client.
4. **Giao diện:** kết thúc buổi thiền → hộp "Ghi cảm nhận / Hồi hướng" với ô **"Chia sẻ lên Cộng đồng" (mặc định tắt)**. Thẻ bài đăng tĩnh, nhẹ (🪷 *Đã thiền 20 phút · Thiền buổi sáng*), nút "Tùy hỷ" (dùng lại lượt thích).
5. **Nguyên tắc:** không tự động đăng; không bảng xếp hạng công khai; thống kê cá nhân mặc định riêng tư; admin Space có thể tắt tính năng chia sẻ.
6. **Tùy chọn về sau — "Thiền cùng nhau":** admin Space tạo buổi thiền nhóm theo giờ (bài ghim trong Feed, nút "Tham gia", số người đang ngồi theo thời gian thực qua phòng socket `space-{id}`) — hợp với sinh hoạt khóa tu, thiền tập thể của chùa.

### Điều kiện tiên quyết
Vá P0, P1-5 (Feed), P2-1 (bộ hẹn giờ); chủ dự án duyệt SQL cho `meditation_logs`.

---

## 6. Lộ trình thực hiện

### Giai đoạn 0 — Chặn khẩn cấp (1–3 ngày)
Mục tiêu: đóng các đường khai thác từ xa bằng bản vá nhỏ, chưa đổi kiến trúc.

- [ ] 0.1 `GET /api/system/config` chỉ trả trường công khai; `PUT` chỉ Global Admin, cập nhật từng phần (P0-1, P1-9) **[SQL]**
- [ ] 0.2 Bỏ khóa bí mật khỏi mọi API Space chung; endpoint quản trị riêng; đăng ký không tự gán Space theo header `Host` cho tài khoản đã tồn tại (P0-2)
- [ ] 0.3 Tách endpoint hồ sơ cá nhân; `updateRolesForUser` dùng tham số; bỏ log payload (P0-3) **[SQL]**
- [ ] 0.4 `toPublicUser()` whitelist cho mọi response; `/spaces/owners`, xóa user, regenerate token chỉ Global Admin; bỏ "Legacy Token" (P0-4)
- [ ] 0.5 `offer`/`purchase`/`claim` dùng `req.user.id`; QR donation → chờ duyệt; merit thủ công & duyệt rút tiền chỉ Global Admin + khóa hàng + idempotency (P0-5) **[SQL]**
- [ ] 0.6 `fileAttachment` chỉ nhận file của chính user trong thư mục cho phép (P0-6)
- [ ] 0.7 Chat: bỏ `body.aiConfig`; `isTestChat`/`estimate-context` cần quyền; kiểm `conversationId`; đếm khách ở server (P0-7)
- [ ] 0.8 Documents: xác thực + quyền cho mọi route ghi; giới hạn `extract-text` (P0-8)
- [ ] 0.9 Upload: tên ngẫu nhiên, chặn SVG/HTML, kiểm quyền Space, `nosniff` (P0-9)
- [ ] 0.10 Commit ngay các thay đổi bảo mật ngày 27/09 đang nằm ngoài git (P3-8)
- [ ] 0.11 Deploy → **đổi toàn bộ khóa bí mật** và tạo lại `api_token` của mọi user; chặn cổng 5432 (P0-10)
- [ ] 0.12 Điều tra dấu vết khai thác (mục 7)

**Hoàn thành khi:** mỗi P0 có ít nhất một test hồi quy (supertest) chạy xanh; kiểm tra thủ công bằng tài khoản thường không còn tái hiện được lỗi nào trong mục 4.1.

### Giai đoạn 1 — Chuẩn hóa phân quyền đa Space (tuần 1–2)
- [ ] 1.1 Quy tắc chung: route ghi tài nguyên thuộc Space → `requireSpacePermission`; tài nguyên toàn cục → `isGlobalAdmin`; `canAccessSpace` chỉ dùng cho quyền đọc của thành viên (P1-1)
- [ ] 1.2 Mọi truy vấn theo id kèm `space_id` (Thiền, Pháp thoại, CMS, Role, Media, Documents) (P1-2, P1-3, P1-4) **[SQL]**
- [ ] 1.3 Social: kiểm tra thành viên, quyền kiểm duyệt cho admin Space, ghim chỉ moderator, repost cùng Space, `ai_share` do server dựng, chuyển DDL thành migration (P1-5) **[SQL]**
- [ ] 1.4 Hội thoại, cấu hình AI, broadcast, export giao dịch, danh sách cúng dường công khai (P1-6, P1-7, P1-10, P1-12) **[SQL]**
- [ ] 1.5 Phiên đăng nhập: access token ngắn, refresh token băm + xoay vòng + thu hồi; Google callback dùng mã một lần; rate limit `/api/v1/login` (P1-8) **[SQL]**
- [ ] 1.6 Frontend: iframe bỏ `allow-same-origin`/tách origin; DOMPurify; CSP report-only (P1-11)
- [ ] 1.7 Lưu trữ file: thống nhất `UPLOADS_ROOT`, tài liệu huấn luyện ra khỏi thư mục public (P1-13, P1-14)
- [ ] 1.8 Form liên hệ: escape HTML + rate limit + captcha (P1-15)
- [ ] 1.9 Bộ test ma trận: 2 Space × (khách, thành viên A, admin A, admin B, Global Admin) cho mọi route ghi

### Giai đoạn 2 — Sửa lỗi chức năng (tuần 3–4)
- [ ] 2.1 Bộ hẹn giờ thiền: các lỗi P2-1; cho chọn thời lượng; Wake Lock
- [ ] 2.2 Social: tìm kiếm/hashtag/tường cá nhân ở server; @mention cho thành viên thường (P2-4) **[SQL]**
- [ ] 2.3 Bỏ feed giả ở trang chủ (P2-5)
- [ ] 2.4 PayOS số tiền tối thiểu & làm tròn; Pháp thoại lọc/phân trang nhất quán; sửa alias hỏng; xử lý refresh lỗi ở client; cấu hình domain bằng biến môi trường (P2-3, P2-6 … P2-9)
- [ ] 2.5 Chuyển dữ liệu file cũ về đúng thư mục, bỏ hàm "tự chữa URL âm thanh" (P1-13) **[SQL]**
- [ ] 2.6 Thông báo lỗi chung, sửa encoding, AES-GCM, thoát khi `uncaughtException` (P2-10 … P2-13)

### Giai đoạn 3 — Dọn kiến trúc & tính năng mới (tuần 5–8)
- [ ] 3.1 Schema + migration có phiên bản; `db:init` chạy được trên máy mới (P3-1) **[SQL]**
- [ ] 3.2 Xóa ~120 file chết và 40 dependency thừa; gộp file trùng; một cấu hình Vite (P3-2, P3-3, P3-5, P3-6)
- [ ] 3.3 Tách `SocialFeed`, `AiManagement`, `PracticeSpacePage` thành module nhỏ (P3-4)
- [ ] 3.4 Cầu nối Thiền → Feed theo mục 5 **[SQL]**
- [ ] 3.5 CI: `tsc` + lint + test cho cả client/server mỗi lần push; cập nhật README và `cau_truc.md` cho khớp thực tế (P3-7, P3-9)

**Nếu chỉ có 1 ngày:** làm 0.1, 0.3, 0.4, 0.5 (riêng `qr-donation` và `offer`), 0.6, 0.7 rồi deploy và đổi khóa.

---

## 7. Điều tra dấu vết khai thác (sau khi vá)

**Log máy chủ** (Nginx/aaPanel, log PM2) — tìm các request:
- `GET /api/system/config`, `/api/system/system-config` từ IP lạ (đặc biệt không kèm `Authorization`)
- `GET /api/spaces/owners`, `GET /api/users`
- `PUT /api/auth/profile` có `roleIds`/`merits` (log PM2 dòng `UPDATE USER CALLED` chứa payload — **chứa cả mật khẩu rõ, xóa log sau khi xem**)
- `POST /api/conversations/chat/estimate-context`, `chat/stream` có `fileAttachment`
- `POST /api/spaces/*/qr-donation`, `POST /api/spaces/*/offer`, `DELETE /api/documents/(authors|types|topics)/*`

**DB — truy vấn chỉ đọc, chạy tay:**
```sql
-- Merit bất thường
SELECT id, email, merits FROM users ORDER BY merits DESC NULLS LAST LIMIT 30;
-- Cúng dường QR / offering / merit thủ công gần đây
SELECT * FROM transactions WHERE type IN ('qr_offering', 'offering', 'manual') ORDER BY timestamp DESC LIMIT 200;
-- Ai đang giữ role gì (so với danh sách admin thật)
SELECT u.id, u.email, r.id AS role_id, r.name, r.space_id
FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id
ORDER BY u.id;
-- Yêu cầu rút tiền gần đây
SELECT id, user_id, amount, space_id, status, created_at FROM withdrawal_requests ORDER BY created_at DESC LIMIT 50;
```

---

## 8. Đối chiếu với báo cáo 27/09/2026

| Hạng mục báo cáo cũ | Tình trạng hiện tại |
|---|---|
| GN-SEC-01: guard theo Space cho trang Space, thành viên, QR, AI config, training data, Koii | Đã có trong code và có test mock. Các module khác (Social, CMS, Documents, Thiền, Role, Billing, Users, System) **chưa** được áp dụng — xem P1-1 |
| GN-QA-01: thêm test server/E2E | Có 3 file test server + E2E auth, **chưa commit** vào git (P3-8) |
| "Không có phát hiện P0" | **Không còn đúng** — mục 4.1 có 10 P0 |
| GN-AI-01 / GN-TTS-01 (ngôn ngữ theo UI) | Giữ nguyên theo thiết kế; không thuộc phạm vi kế hoạch này |

---

## Phụ lục A — File client không được import từ `src/index.tsx`

`pages/`: About, Admin, AgentModels, AgentsDocs, Career, CenterDetail, Contact, Dashboard, Discovery, ForgotPassword, Landing, Login, MandalaMerit, Manifesto, MeritTokenomics, Onboarding, Overview, PathOfUnraveling, Platform, Pricing, Privacy, Process, QuickStart, ResetPassword, Settings, TechStack, Terms, TokenPricing, not-found.
`components/`: AgentCard, AgentDialog, ApiKeyManager, CommunityView, CompactAgentCard, DocsLayout, LanguageSwitcher, OnboardingChecklist, PricingTable, ProtectedRoute, SubscriptionModal, TempleExternalStats; `admin/`: AdminClientMetrics, AdminExternalTempleStats, AdminOnboarding, AdminTempleApis, MailServerSettings, ManualCoinTopUp, ManualMeritTopUp, SiteMetrics; toàn bộ `ui/*`.
`lib/`: admin-utils, auth-client, autumn-stub, contact-utils, dashboard-utils, queryClient, turnstile-stub, utils, wouter-stub. `contexts/LanguageContext`, `hooks/*`, `translations/*`, `shared/buddhistCenters`.

## Phụ lục B — Dependency client không được code đang chạy sử dụng

`@radix-ui/*` (24 gói), `@tanstack/react-query`, `@tanstack/react-table`, `better-auth`, `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `framer-motion`, `input-otp`, `react-day-picker`, `react-hook-form`, `react-icons`, `react-resizable-panels`, `tailwind-merge`, `vaul`.
Đang dùng: `@google/genai`, `lucide-react`, `react`, `react-dom`, `react-markdown`, `react-router-dom`, `recharts`, `remark-gfm`, `xlsx`.

---

## 9. Kiểm tra lại sau khi sửa (06/10/2026)

Đọc lại mã đã sửa (server; client chưa có thay đổi). Chưa chạy được build/test.

### Đã vá đạt
- **P0-1** cấu hình hệ thống: khách chỉ nhận trường công khai, admin nhận khóa che, cập nhật từng phần bỏ qua khóa che.
- **P0-2** (phần đọc): `GET /api/spaces*` trả `toPublicSpace`; `toAdminSpace` che khóa; model bỏ qua giá trị `••`. Đăng ký lại bằng tài khoản cũ không còn tự vào Space.
- **P0-3**: `PUT /api/auth/profile` chỉ nhận `name/avatarUrl/bio`; `updateRolesForUser` dùng tham số; bỏ `apiToken/resetToken` khỏi whitelist; bỏ log payload.
- **P0-4** (phần lớn): `toPublicUser`/`toMinimalUser`; xóa user chỉ Global Admin; regenerate token chỉ chính mình/Global Admin.
- **P0-5** (phần lớn): `offer`, `purchase`, `claim` dùng `req.user.id`; QR donation không cộng vào số dư; duyệt rút tiền chỉ Global Admin, `FOR UPDATE` + idempotency key.
- **P0-6** đọc file: giới hạn trong `uploads/`, chặn `..`, kiểm tra thư mục `user-<id>`.
- **P0-7** chat: nạp `aiConfig` từ DB, kiểm tra quyền dùng AI, `isTestChat` cần quyền, kiểm tra chủ hội thoại, đếm khách ở server, trừ phí nguyên tử.
- **P0-8** tài liệu: danh mục kiểm quyền theo Space, danh mục chung chỉ Global Admin; `extract-text` cần đăng nhập + 10 MB.
- **P0-9** upload: tên UUID, chặn SVG/HTML/JS…, upload thường vào thư mục của user.

### Còn phải sửa
| Mức | Vấn đề | Vị trí | Cách sửa |
|---|---|---|---|
| P0 | Quyền `users` ở **bất kỳ** Space vẫn sửa được email, mật khẩu, `roleIds`, `isActive` của **mọi** tài khoản (kể cả Global Admin); tạo user với role tùy ý | `userController.ts` `updateUser` (`hasUsersPermission`), `createUser` | Chỉ Global Admin, hoặc `hasSpacePermission(spaceId,'users')` + người bị sửa thuộc Space đó + không được sửa Global Admin + role thuộc đúng Space |
| P0 | Nạp merit thủ công vẫn dùng `checkPermission('manual-billing')` (hợp quyền) | `billingRoutes.ts:19` | `requireGlobalAdmin` |
| P1 – lỗi mới | **Lưu "Cài đặt thanh toán" ở `/:slug/admin` sẽ xóa khóa PayOS**: `getSpaceBySlug` giờ trả `toPublicSpace` nên form nhận chuỗi rỗng và gửi `payosApiKey: ''`, model ghi đè | `spacesController.ts` `getSpaceBySlug`; `PaymentSettings.tsx:118-124, 198-205`; `space.model.ts` `update` | `getSpaceBySlug` trả `toAdminSpace` cho người có quyền (như `getSpaceById`); model bỏ qua chuỗi rỗng ở trường bí mật trừ khi có cờ xóa rõ ràng |
| P1 – lỗi mới | **Trích xuất nội dung PDF/DOCX/TXT trong quản trị tài liệu bị hỏng**: `ocrService` ghi file tạm vào thư mục hệ thống rồi gọi `extractText` bằng đường dẫn tuyệt đối, nay bị ép vào `uploads/` → không tìm thấy | `ocrService.ts:25-31`; `fileParserService.ts` | Tách hàm `extractTextFromBuffer(buffer, name)` cho luồng nội bộ |
| P1 | Người dùng tự đặt `subscriptionPlanId`, `requestsRemaining`, `stripeAccountId` qua `PUT /api/users/:id` (chính mình) | `userController.ts` `updateUser`; `user.model.ts` `ALLOWED_FIELDS` | Self-update chỉ cho trường hồ sơ |
| P1 | System prompt (`training_content`) vẫn trả qua API công khai; `estimate-context` trả prompt + đoạn RAG cho mọi user đăng nhập với AI public | `aiConfig.model.ts:6-20`; `chatController.ts` `estimateContext` | Truy vấn công khai bỏ `training_content`; `estimate-context` chỉ cho quyền `ai` |
| P1 | `userId` từ body: `getVisibleAiConfigs`, `latest-conversation` | `aiConfigController.ts:17`; `conversationController.ts:72` | Dùng `req.user` |
| P1 | "Legacy Token" vẫn được chấp nhận; refresh token = `api_token` không hết hạn | `authMiddleware.ts:38-46`; `authController.ts` | Theo P1-8 |
| Vận hành | Bảng `guest_daily_usage` chưa có migration → rơi về bộ nhớ (mất khi restart); `trust proxy` chỉ tin loopback → nếu có Cloudflare phải đặt `TRUSTED_PROXIES`/real IP ở Nginx, nếu không mọi khách dùng chung IP (giới hạn khách và rate limit đăng nhập sai) | `chatController.ts`; `index.ts:69-84` | Tạo migration **[SQL]**; cấu hình proxy |
| Chưa làm | Social, CMS, Role, Thiền, Broadcast (P1-2…P1-5, P1-10); toàn bộ frontend (P1-11 iframe/DOMPurify); xác nhận đã đổi khóa bí mật và tạo lại `api_token` (P0-10) | — | Theo Giai đoạn 0–1 |
