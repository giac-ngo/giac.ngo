# Nhật ký thay đổi - Giác Ngộ VN

## 2026-05-13

### 📧 Di chuyển Cấu hình SMTP & Cập nhật Luồng Quên Mật Khẩu

**Vấn đề**:
1. **Quản trị phân tán**: Cấu hình SMTP trước đây nằm bên trong màn hình Quản lý Thông báo, khiến việc quản trị cấu hình hệ thống (Settings) bị phân mảnh. Cần gom chung lại để Space Owner dễ dàng thiết lập tại một nơi.
2. **Lỗi Quên Mật Khẩu**: Link khôi phục mật khẩu gửi trong email luôn sử dụng `process.env.BASE_URL` mặc định, khiến người dùng truy cập từ Custom Domain bị chuyển hướng nhầm về domain hệ thống gốc ("ra cái gì đâu không") hoặc link hỏng nếu thiếu cấu hình.

**Giải pháp & Chi tiết thay đổi**:
1. **Di chuyển Cấu hình SMTP (`Settings.tsx` & `NotificationManagement.tsx`)**:
   - Chuyển tab "Cấu hình SMTP" từ `NotificationManagement` sang `Settings`.
   - Update `AdminPage.tsx` để truyền tải dữ liệu Không gian (Space) xuống `Settings.tsx`.
   - Bổ sung UI Card "Cấu hình Mail Server" mới trong `Settings.tsx`, tích hợp logic lưu chung (User Token + SMTP config).
   - Làm rõ logic "Template Email" bên trong `NotificationManagement`.

2. **Cập nhật URL Quên Mật Khẩu (`mailService.ts`)**:
   - Cập nhật hàm `sendPasswordResetEmail` để ưu tiên lấy `options.host` làm domain tạo link khôi phục thay vì `process.env.BASE_URL`.
   - Hỗ trợ chính xác HTTP/HTTPS thông qua check chuỗi `localhost`. Đảm bảo link nhận trong email đúng 100% với tên miền hiện tại của Không gian.

**Commit**: `[Manual Update]` — `feat: migrate smtp settings, fix password reset domain url`

---

## 2026-05-12

### 🔐 Phân quyền Multi-Tenant: Triển khai `isGlobalAdmin` toàn hệ thống & Space-Scoped Roles

**Vấn đề gốc**: Tất cả các component admin (`SpaceManagement`, `RoleManagement`, `AiManagement`, `UserManagement`) sử dụng `user.permissions?.includes('roles')` để xác định SuperAdmin. Nhưng Space Owner/Manager cũng được cấp quyền `roles` → hệ thống hiểu nhầm họ là SuperAdmin → hiển thị toàn bộ dữ liệu hệ thống.

**Giải pháp tổng thể**: Thay thế toàn bộ bằng prop `isGlobalAdmin` do `AdminPage.tsx` truyền xuống. Prop này chỉ `true` khi truy cập từ Root Domain (`/admin`), `false` khi vào từ Space domain (`/:slug/admin`).

**Chi tiết thay đổi**:

1. **AdminPage.tsx** — Truyền `isGlobalAdmin` và `currentSpace` cho tất cả các component: `SpaceManagement`, `RoleManagement`, `UserManagement`, `AiManagement`.

2. **SpaceManagement.tsx** — Nhận `isGlobalAdmin` & `space` prop.
   - `isSuperAdmin` dùng `!!isGlobalAdmin` thay vì `permissions.includes('roles')`.
   - Non-global-admin chỉ thấy space mà mình thuộc về (dùng `contextSpace` từ URL).
   - Tab "Cấu hình mở rộng" chỉ hiện cho Owner/SuperAdmin.

3. **RoleManagement.tsx** — Nhận `isGlobalAdmin` & `space` prop.
   - Non-global-admin: gọi `getSpaceRoles(spaceId)` thay vì `getAllRoles()` → chỉ thấy role hệ thống (read-only) + role do Space tạo (editable).
   - Role hệ thống hiện banner 🔒, không cho sửa/xóa.
   - Space Owner chỉ tạo role mới kế thừa từ quyền mình có.

4. **AiManagement.tsx** — Nhận `isGlobalAdmin` & `space` prop.
   - Thay thế **8 chỗ** `user.permissions?.includes('roles')` bằng `isGlobalAdmin`.
   - Filter `aiList` theo `contextSpace.id` cho non-admin.
   - `canEdit`: cho phép sửa AI nếu user có quyền `ai` + AI thuộc space (`isSpaceManager`).

5. **UserManagement.tsx** — Load space-scoped roles cho Space context.
   - Phần chọn Quyền hiện khi `roles.length > 0` (không chỉ Global Admin).
   - Space Owner/Manager thấy & gán role do mình tạo.

6. **Backend `roleController.ts`** — Import `getUserManagedSpaceIds`.
   - Xác định Global Admin: có quyền `roles` VÀ không sở hữu Space nào.
   - Chặn sửa/xóa role hệ thống (`space_id IS NULL`) nếu không phải Global Admin.
   - Auto-gán `spaceId` khi Space Owner tạo role mới.

7. **Backend `role.model.ts`** — Thêm `spaceId` vào interface & queries.
   - `findBySpaceId(spaceId)`, `findSystemRoles()`, `findById(id)`.

8. **DB Migration** — `server/migrations/add_space_id_to_roles.sql`:
   - `ALTER TABLE roles ADD COLUMN space_id INTEGER REFERENCES spaces(id)`.
   - Thay UNIQUE constraint `roles_name_key` → `(name, COALESCE(space_id, 0))`.

9. **Bug fix: Trạng thái user** — `spaceMember.model.ts`:
   - Thêm `u.is_active` vào query `getMembersBySpace()` → sửa bug hiển thị sai trạng thái.

**Commit**: `[Manual Update]` — `feat: isGlobalAdmin refactor, space-scoped roles, multi-tenant admin enforcement`

---

### 🐛 Sửa lỗi Quản lý Người dùng, Ánh xạ ID và Trùng lặp Quyền (Roles)

**Vấn đề**:
1. **Lỗi "User not found after update"**: Khi Space Manager cập nhật quyền cho thành viên trong Space, hệ thống báo lỗi không tìm thấy người dùng.
2. **Lỗi "Lưu quyền xong edit thì mất"**: Sau khi lưu thành công, mở lại form chỉnh sửa thì các ô chọn Quyền bị bỏ tick (dữ liệu biến mất).
3. **Lỗi "Trùng quyền ở Root Admin"**: Global Admin nhìn thấy danh sách các Quyền lặp lại rất nhiều lần (Manager, Owner AI, User) ở trang Quản lý Quyền hệ thống.

**Giải pháp & Chi tiết thay đổi**:

1. **Khắc phục lỗi "User not found after update" (`spaceMember.model.ts`)**:
   - *Nguyên nhân*: Hàm `getMembersBySpace` dùng lệnh `SELECT sm.*, u.name...` khiến cột `id` trên UI bị ghi đè bởi `id` của bảng quan hệ `space_members`. Khi nhấn "Lưu", UI gửi `PUT /api/users/[space_members.id]`, khiến DB UPDATE sai target và ném lỗi không tìm thấy.
   - *Khắc phục*: Cập nhật lại query SQL thành `SELECT sm.*, sm.id as space_member_id, u.id, u.name...` để chỉ định rõ ID gửi về Client là `u.id` (users ID).

2. **Khắc phục lỗi "Lưu quyền xong edit thì mất" (`spaceMember.model.ts`)**:
   - *Nguyên nhân*: API tải danh sách thành viên Không gian không lấy kèm thông tin `roleIds` của user.
   - *Khắc phục*: Áp dụng hàm `enrichUserWithPermissions` (từ `user.model.ts`) vào danh sách thành viên được truy vấn ra từ DB để đính kèm đầy đủ `roleIds` trước khi trả về client.

3. **Khắc phục lỗi "Trùng quyền Root Admin" (`roleController.ts`)**:
   - *Nguyên nhân*: Hàm `getAllRoles` trả về `roleModel.findAll()` lấy TẤT CẢ quyền trong Database (bao gồm cả các quyền Custom do các Space tạo riêng rẽ). Dẫn đến việc Global Admin nhìn thấy mọi Quyền của mọi Không gian bị mix lại.
   - *Khắc phục*: Điều chỉnh để khi đăng nhập với quyền Global Admin (không có param `spaceId`), hệ thống chỉ truy vấn `roleModel.findSystemRoles()` (lấy những quyền có `space_id IS NULL`).

4. **Cải thiện Debug Alert (`userController.ts`)**:
   - Khôi phục bộ ký tự Unicode tiếng Việt bị lỗi mã hóa (`L?i khi c?p nh?t...`) trong `userController.ts`.
   - Nối thẳng thông báo lỗi thật (`error.message`) vào nội dung JSON trả về mã 500 để người dùng / dev nhìn thấy chính xác DB phàn nàn gì ở Client.

**Commit**: `[Manual Update]` — `fix: correct user id mapping, enrich roles, restrict root admin role view`

---

### 🔧 Sửa lỗi Ephemeral Token, Rate Limit Proxy & Cảnh báo Gemini SDK

**Vấn đề**:
1. **Lỗi `API Key not found` khi tạo Voice Token**: Tính năng tạo Ephemeral Token (`getAiVoiceKey`) bị lỗi do vẫn đang đọc API Key theo cấu trúc cũ (`owner.apiKeys`), trong khi thực tế bộ Key đã được chuyển sang cấp độ Không gian (`spaces.api_keys`).
2. **Lỗi `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`**: Khi chạy trên môi trường thực tế đằng sau Nginx (Reverse Proxy), module `express-rate-limit` không đọc được IP thật của người dùng, dẫn đến việc gộp chung IP của tất cả khách truy cập thành 1 IP của Nginx, gây lỗi chặn Rate Limit sai diện rộng.
3. **Cảnh báo `thoughtSignature` từ Gemini SDK**: Khi dùng các mô hình có tư duy (như Gemini 2.5 Flash Thinking), Google SDK liên tục nhả cảnh báo đỏ rác console nếu ứng dụng chỉ bóc tách `chunk.text` mà bỏ qua chuỗi tư duy của AI.

**Giải pháp**:
1. **Cập nhật luồng lấy API Key (`aiConfigController.ts`)**: Tái cấu trúc hàm tạo Token, tích hợp helper `getApiKeyForAi` để dò tìm API Key chuẩn xác theo cơ chế kế thừa: `Key của Space` ➡️ `Key của Owner` ➡️ `Key Hệ thống`.
2. **Thiết lập Trust Proxy (`server/index.ts`)**: Thêm cấu hình `app.set('trust proxy', 1);` để Express tin tưởng và lấy đúng IP thật từ header `X-Forwarded-For` của Nginx truyền vào.
3. **Tắt cảnh báo `thoughtSignature` (`geminiService.ts`)**: Viết lại vòng lặp đọc Stream Chat của Gemini. Thay vì gọi hàm `chunk.text` gây kích hoạt cảnh báo của SDK, hệ thống tự động duyệt mảng `chunk.candidates[0].content.parts` và ghép nội dung text thủ công, giúp dọn dẹp sạch sẽ Console Log.

**Commit**: 
- `fix: resolve voice key missing and suppress gemini thoughtSignature warning`
- `fix: trust proxy for express-rate-limit behind nginx`

---

### 🔐 Bảo mật: Sửa lỗ hổng lộ Gemini API Key

**Vấn đề**: Endpoint `GET /api/ai-configs/:id/voice-key` trả raw Gemini API key cho client. Client (VoiceChat.tsx) dùng key trực tiếp trên browser để kết nối Gemini Live API → Google phát hiện key bị expose ở client-side → vô hiệu hóa key vĩnh viễn (lỗi 403 "API key was reported as leaked").

**Giải pháp**: Chuyển sang dùng **Ephemeral Tokens** (tính năng chính thức của Google Gemini API).

**Files đã sửa**:
- `server/controllers/aiConfigController.ts` — `getAiVoiceKey()` giờ tạo ephemeral token (30 phút, 1 lần dùng) qua `authTokens.create()`, trả `ephemeralToken` thay vì `geminiKey`
- `client/src/services/apiService.ts` — Cập nhật type return: `geminiKey` → `ephemeralToken`
- `client/src/components/social/VoiceChat.tsx` — Bỏ đọc `user.apiKeys.gemini`; mỗi phiên Voice Live gọi API lấy fresh ephemeral token
- `client/src/pages/PracticeSpacePage.tsx` — Cập nhật `ownerVoiceConfig` type

**Commit**: `1a4402a` — `security: replace raw Gemini API key with ephemeral tokens for Voice Live`

---

### 🏗️ Kiến trúc: Chuyển API Keys + Cài đặt Khách sang Space Level (Hoàn thành)

**Vấn đề**: 
1. API Keys (Gemini, GPT) lưu ở `users.api_keys` → khi phân quyền nhiều người quản lý AI trong Space, họ không có key → AI không hoạt động
2. Guest message limit lưu ở `system_config` (toàn hệ thống) → mỗi Space không thể cài đặt riêng

**Quyết định**:
- ✅ **Giữ lại** Personal Access Token ở user Settings
- ➡️ **Chuyển sang Space**: API Keys (Gemini/GPT), Voice config, Cài đặt khách (guest daily limit)
- Key lookup chain: `Space.apiKeys → Owner.apiKeys (fallback) → System.systemKeys`

**Thay đổi đã thực hiện**:
- **DB**: Đã cung cấp SQL query (qua file `db_migration.sql`) để thêm `api_keys JSONB`, `guest_daily_limit` vào bảng `spaces`.
- **Server**: 
  - Tạo helper mới `server/utils/getApiKeyForAi.ts` để xử lý logic ưu tiên lấy Key.
  - Cập nhật `space.model.ts` và `types/index.ts` để map các fields mới từ DB.
  - Refactor các controller (`chatController.ts`, `trainingDataController.ts`, `systemController.ts`, `documentController.ts`, `weaviateService.ts`) để sử dụng helper mới thay vì đọc trực tiếp từ `userModel`. Sửa lỗi vòng lặp lồng nhau ở weaviate cleanup.
- **Client**: 
  - Cập nhật `client/src/types.ts` với các trường cấu hình Space mới.
  - Cập nhật `SpaceManagement.tsx` thêm 2 sections: "API Keys (AI Services)" và "Cài đặt Khách (Guest)" với input fields đầy đủ, hỗ trợ JSON mutation.
  - Xóa bỏ form nhập Grok API Key khỏi Quản lý không gian.
  - Ẩn chức năng Xóa (icon Thùng rác) đối với các Không gian dành cho những người quản trị bình thường (chỉ có SuperAdmin mới được quyền Xóa không gian).
  - Tách giao diện Quản lý không gian thành 2 tab: "Thông tin chung" và "Cấu hình mở rộng" để tối ưu trải nghiệm.
  - Thêm tính năng **Hiện/Ẩn (View)** và **Sao chép (Copy)** cho các ô nhập API Key để thuận tiện quản lý.
  - Đơn giản hóa cấu hình khách: Chỉ giữ lại một giới hạn duy nhất là "Giới hạn chat mỗi ngày". Khi đạt giới hạn này, khách bắt buộc phải đăng nhập.
  - Sửa lỗi trình duyệt tự động điền email vào ô tìm kiếm Không gian bằng cách thêm `autoComplete="off"`.

**Commit**: `4af048b` — `feat: enhance SpaceManagement UI with tabs, key visibility, and copy functionality`
