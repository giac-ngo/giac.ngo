# Daily Logs (Nhật Ký Làm Việc Hàng Ngày)

*Thư mục này ghi chú lại những công việc (tasks), quyết định kỹ thuật (decisions) và thay đổi đã thực hiện trong ngày.*

---
## 2026-05-12
- **Hoàn thành**: 
  1. Bảo mật: Thay thế raw Gemini API key bằng Ephemeral Tokens (tạo 30p dùng 1 lần qua `authTokens.create`) tại `VoiceChat.tsx` để sửa lỗi Google ban key do rò rỉ.
  2. Kiến trúc: Di chuyển hệ thống lưu trữ cấu hình AI Keys (Gemini, ChatGPT, Grok) và Cài đặt Khách (Guest message limits) từ Global User Settings sang cấp độ `Space`. 
     - Mở rộng DB (`spaces` thêm `api_keys`, `guest_message_limit`, `guest_daily_limit`).
     - Áp dụng helper ưu tiên lấy key mới (`getApiKeyForAi`).
     - Refactor UI Admin `SpaceManagement.tsx` để nhập key cho từng Space (Xóa bỏ nhập Grok key, và ẩn Icon thùng rác đối với tài khoản không phải SuperAdmin).
- **Quyết định**: Áp dụng Fallback Hierarchy cho Key: `Space.apiKeys -> Owner.apiKeys -> System.systemKeys`. Giữ lại Personal Access Token ở settings cá nhân. Xóa quyền xóa Space của Admin thông thường.
- **Vấn đề gặp phải**: (Đã giải quyết) API key bị vô hiệu hóa liên tục do Voice Live chạy client-side; Weaviate class vectorizer config (stale text2vec-palm) gây crash trong lúc sync data.
