# Nhật ký thay đổi - Giác Ngộ VN

## 2026-05-12

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
1. API Keys (Gemini, GPT, Grok) lưu ở `users.api_keys` → khi phân quyền nhiều người quản lý AI trong Space, họ không có key → AI không hoạt động
2. Guest message limit lưu ở `system_config` (toàn hệ thống) → mỗi Space không thể cài đặt riêng

**Quyết định**:
- ✅ **Giữ lại** Personal Access Token ở user Settings
- ➡️ **Chuyển sang Space**: API Keys (Gemini/GPT/Grok), Voice config, Cài đặt khách (guest message limit, guest daily limit)
- Key lookup chain: `Space.apiKeys → Owner.apiKeys (fallback) → System.systemKeys`

**Thay đổi đã thực hiện**:
- **DB**: Đã cung cấp SQL query (qua file `db_migration.sql`) để thêm `api_keys JSONB`, `guest_message_limit`, `guest_daily_limit` vào bảng `spaces`.
- **Server**: 
  - Tạo helper mới `server/utils/getApiKeyForAi.ts` để xử lý logic ưu tiên lấy Key.
  - Cập nhật `space.model.ts` và `types/index.ts` để map các fields mới từ DB.
  - Refactor các controller (`chatController.ts`, `trainingDataController.ts`, `systemController.ts`, `documentController.ts`, `weaviateService.ts`) để sử dụng helper mới thay vì đọc trực tiếp từ `userModel`. Sửa lỗi vòng lặp lồng nhau ở weaviate cleanup.
- **Client**: 
  - Cập nhật `client/src/types.ts` với các trường cấu hình Space mới.
  - Cập nhật `SpaceManagement.tsx` thêm 2 sections: "API Keys (AI Services)" và "Cài đặt Khách (Guest)" với input fields đầy đủ, hỗ trợ JSON mutation.

**Commit**: *(chưa commit, cần user push)*
