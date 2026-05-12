# Nhật ký thay đổi - Giác Ngộ VN

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
