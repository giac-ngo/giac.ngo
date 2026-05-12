# Daily Logs (Nhật Ký Làm Việc Hàng Ngày)

*Thư mục này ghi chú lại những công việc (tasks), quyết định kỹ thuật (decisions) và thay đổi đã thực hiện trong ngày.*

---
## 2026-05-12
- **Hoàn thành**: 
  1. Bảo mật: Thay thế raw Gemini API key bằng Ephemeral Tokens (tạo 30p dùng 1 lần qua `authTokens.create`) tại `VoiceChat.tsx` để sửa lỗi Google ban key do rò rỉ.
  2. Kiến trúc: Di chuyển hệ thống lưu trữ cấu hình AI Keys (Gemini, ChatGPT) và Cài đặt Khách (Guest limits) sang cấp độ `Space`.
     - Mở rộng DB (`spaces` thêm `api_keys` JSONB, `guest_daily_limit`).
     - Refactor UI Admin `SpaceManagement.tsx`: Chia 2 tab (Info/Config), gỡ bỏ Grok, ẩn icon xóa cho non-superadmins.
     - Bảo mật: Thêm cơ chế Sanitization tại `spacesController.ts` để chặn rò rỉ API Keys ra public route.
     - Fix: Chặn browser auto-fill email vào ô tìm kiếm.
  3. Git: Đã Commit và Push toàn bộ thay đổi lên hệ thống.
- **Quyết định**: Chỉ giữ lại 1 ngưỡng duy nhất là "Giới hạn chat mỗi ngày" cho khách (bỏ nấc trung gian) để đơn giản hóa vận hành. 
- **Vấn đề gặp phải**: (Đã giải quyết) Khắc phục nguy cơ lộ API Keys qua Public API bằng cơ chế lọc dữ liệu (Sanitization) cho các request không có quyền Admin.
