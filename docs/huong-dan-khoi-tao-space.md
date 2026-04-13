# Hướng dẫn khởi tạo Space & AI Agent

Để triển khai AI Agent, khách hàng vui lòng cung cấp đầy đủ thông tin theo các mục dưới đây.

---

## 👤 1. Tài khoản quản trị (Owner)

| Thông tin | Bắt buộc | Ghi chú |
|---|:---:|---|
| Email đăng nhập | ✅ | Dùng để đăng nhập & quản lý |
| Mật khẩu | ✅ | Tối thiểu 8 ký tự |

---

## 🏠 2. Thông tin Space (Tổ chức / Đơn vị)

| Thông tin | Bắt buộc | Ghi chú |
|---|:---:|---|
| Tên (tiếng Việt) | ✅ | VD: Chùa Phúc Lâm |
| Tên (tiếng Anh) | | |
| Slug (đường dẫn URL) | ✅ | VD: `chua-phuc-lam` — không dấu, không cách |
| Loại Space | ✅ | Chọn từ danh sách loại có sẵn |
| Mô tả (tiếng Việt) | | Giới thiệu ngắn về tổ chức |
| Mô tả (tiếng Anh) | | |
| Logo / Hình ảnh đại diện | | File ảnh hoặc URL |
| Địa điểm | | VD: Hà Nội, Việt Nam |
| Website | | |
| Số điện thoại | | |
| Email liên hệ | | |
| Màu chủ đạo | | Mã màu HEX, VD: `#1a73e8` |
| Tags / Từ khóa | | Phục vụ tìm kiếm |
| Trạng thái hoạt động | | VD: Đang hoạt động |
| Sự kiện nổi bật | | Nếu có |

---

## 🤖 3. Thông tin AI Agent

| Thông tin | Bắt buộc | Ghi chú |
|---|:---:|---|
| Tên AI Agent (tiếng Việt) | ✅ | VD: Trợ lý Chùa Phúc Lâm |
| Tên AI Agent (tiếng Anh) | | |
| Mô tả (tiếng Việt) | | |
| Mô tả (tiếng Anh) | | |
| Ảnh đại diện AI | | Avatar cho chatbot |
| Loại AI model | ✅ | `gemini` / `gpt` / `vertex` / `grok` |
| Tên model cụ thể | ✅ | VD: `gemini-2.0-flash`, `gpt-4o` |
| API Key của model | ✅ | Google AI Studio Key hoặc OpenAI Key |
| Nội dung huấn luyện | | Văn bản hướng dẫn cách AI trả lời (system prompt) |
| Câu hỏi gợi ý (tiếng Việt) | | Danh sách câu hỏi mẫu cho người dùng |
| Câu hỏi gợi ý (tiếng Anh) | | |
| Tags AI | | Từ khóa tìm kiếm |
| Công khai? | ✅ | Có / Không |
| Cho dùng thử miễn phí? | | Có / Không |

---

## 📂 4. Dữ liệu huấn luyện (Training Data)

Cung cấp một hoặc nhiều nguồn dữ liệu để AI học:

| Loại | Mô tả |
|---|---|
| **Q&A** | Danh sách câu hỏi — câu trả lời (file Excel/Word hoặc nhập trực tiếp) |
| **Tài liệu (File)** | File PDF, Word, TXT chứa nội dung cần AI hiểu |
| **Document** | Bài viết, trang nội dung có cấu trúc |

---

## 🔄 Quy trình triển khai

```
1. Tạo tài khoản Owner
2. Tạo Space
3. Tạo AI Agent (gắn vào Space)
4. Upload dữ liệu huấn luyện
5. Sync dữ liệu lên hệ thống vector (Weaviate)
6. Kiểm tra & chạy thử chatbot
```

---

> 📧 Vui lòng gửi thông tin về: **[email của bạn]**  
> Sau khi nhận đủ thông tin, chúng tôi sẽ hoàn tất cài đặt trong vòng **1–2 ngày làm việc**.
