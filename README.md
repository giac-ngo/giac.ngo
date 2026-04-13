# Giác Ngộ — Nền Tảng Tu Tập Tâm Linh AI

**Giác Ngộ** là nền tảng web toàn diện kết hợp thực hành tâm linh truyền thống với Trí tuệ Nhân tạo. Mỗi "Không gian" (Space) là một cộng đồng tu tập độc lập, nơi hành giả có thể tiếp cận kinh sách, pháp thoại, thiền dẫn, trợ lý AI chuyên sâu và kết nối với cộng đồng.

🌐 **Live:** [giac.ngo](https://giac.ngo)  
📦 **GitHub:** [github.com/giac-ngo/giac.ngo](https://github.com/giac-ngo/giac.ngo)

---

## 🚀 Tính Năng Dành Cho Người Dùng

### 🧘 Không Gian Thực Hành (Practice Spaces)
- Mỗi Space là cộng đồng tu tập riêng (Giác Ngộ, Làng Mai, Tathata...)
- Giao diện, logo, màu sắc, custom domain riêng cho từng Space
- Chuyển đổi mượt mà giữa các chế độ: Chat, Thư viện, Cộng đồng

### 🤖 Trợ Lý AI (AI Companion)
- **Chat theo ngữ cảnh (RAG):** AI học từ kinh sách, bài giảng của từng Space
- **Đa mô hình:** Google Gemini Flash/Pro, OpenAI GPT-4o, Grok
- **Nhận dạng giọng nói (STT):** Nói chuyện bằng tiếng Việt & tiếng Anh
- **Đọc câu trả lời (TTS):** Nhiều giọng đọc tự nhiên (Kore, Puck, Echo...)
- **Xử lý hình ảnh & OCR:** Gửi ảnh để AI phân tích, trích xuất văn bản
- **Upload tài liệu:** PDF, DOCX → AI tóm tắt & lưu vào bộ nhớ RAG
- **Lịch sử hội thoại:** Lưu trữ, đổi tên, xem lại mọi cuộc trò chuyện
- **Phản hồi chất lượng:** Like/Dislike từng câu trả lời AI

### 🎙️ Voice Chat (Live AI Conversation)
- Hội thoại trực tiếp bằng giọng nói với AI theo thời gian thực
- Tự động ghi âm toàn bộ phiên chat
- Tải xuống file ghi âm sau khi kết thúc
- AI phản hồi bằng ngôn ngữ tương ứng (Tiếng Việt / Tiếng Anh)

### 📚 Thư Viện Pháp Bảo
- **Pháp Thoại:** Phát audio/YouTube, lưu tiến độ nghe
- **Thiền Dẫn:** Bộ đếm giờ + nhạc nền + bài dẫn thiền
- **Kinh Sách:** Trình đọc tích hợp, mục lục tự động, tìm kiếm nội dung
- **Phân loại:** Tác giả, thể loại, chủ đề, tags

### 🌐 Cộng Đồng (Social Feed)
- **Đăng bài:** Chia sẻ cảm nghĩ, kèm ảnh, cảm xúc
- **Repost:** Chia sẻ lại bài viết của người khác kèm bình luận
- **Chia sẻ AI:** Đăng bài viết chia sẻ đoạn hội thoại với AI lên feed
- **Like & Comment:** Tương tác, thảo luận theo dạng thread phân cấp
- **Trang cá nhân:** Xem tường (wall) của từng người dùng
- **Theo dõi / Hủy theo dõi:** Theo dõi người khác, cập nhật số liệu tức thì
- **Thống kê người dùng:** Số bài viết, người theo dõi, đang theo dõi
- **URL Slug:** Link riêng mỗi profile (`?profile=123`), F5 vẫn giữ nguyên trang
- **Tìm kiếm bài viết:** Lọc nhanh theo nội dung, tên người dùng
- **Thông báo:** Nhận thông báo khi có like, comment, repost

### 💰 Hệ Thống Merit & Marketplace
- **Merit Token:** Đơn vị dùng tính năng AI cao cấp
- **AI Marketplace:** Khám phá & kích hoạt các AI chuyên biệt
- **Cúng dường:** Tích hợp Stripe (thẻ, Apple Pay, Google Pay)
- **Lịch sử tài chính:** Xem lịch sử nạp Merit, cúng dường tại `/finance`

---

## 🛠 Hệ Thống Quản Trị (Admin)

### 📊 Dashboard & Thống Kê
- Tổng quan người dùng, doanh thu, mức dùng AI
- Biểu đồ hoạt động theo thời gian thực
- Thống kê token / billing theo từng người dùng

### 🧠 Quản Lý AI
- Cấu hình LLM (model, temperature, max tokens, thinking budget)
- **RAG Training:** Upload tài liệu, liên kết kinh sách từ thư viện
- **Q&A Pairs:** Dữ liệu hỏi-đáp thủ công (Few-shot + Thought chain)
- **Koii Network:** Gửi tác vụ huấn luyện phi tập trung
- **Test Chat:** Kiểm tra AI nội bộ trước khi public
- **Add to Training:** Chuyển đoạn test thành dữ liệu huấn luyện ngay lập tức
- **Fine-tuning:** Tạo job fine-tune Gemini/GPT từ dữ liệu Q&A
- Phân quyền AI: Public / Private / Contact for Access

### 📂 CMS Nội Dung
- Rich Text Editor với Auto-Translate Việt ↔ Anh (Gemini/GPT)
- TTS: Tạo file audio từ nội dung (nhiều giọng đọc)
- OCR & Extraction từ PDF / ảnh scan
- Quản lý Pháp Thoại, Thiền Dẫn, Kinh Sách
- Quản lý Space: Tên, Slug, màu sắc, ảnh bìa, custom domain

### 👥 Quản Lý Người Dùng & Phân Quyền (RBAC)
- Danh sách, tìm kiếm, lọc, chỉnh sửa người dùng
- Các vai trò: Admin / Space Owner / Editor / Moderator / User / Guest
- **Granular Permissions:** Phân quyền chi tiết theo từng module
- Reset / đổi mật khẩu người dùng (Admin)
- Tạo người dùng mới thủ công

### 💳 Tài Chính & Billing
- Theo dõi dòng tiền toàn hệ thống
- **Stripe Connect Express:** Space Owner kết nối ví, nhận cúng dường
- Quy trình duyệt rút tiền: Pending → Approved / Rejected
- Tự động chuyển tiền (Transfer) sau khi duyệt
- Space Owner Dashboard: xem doanh thu & View Payout (Stripe)

### ⚙️ Cài Đặt Hệ Thống
- Cấu hình logo, tên hiển thị theo template
- Quản lý API Keys cá nhân (Gemini, Vertex, GPT, Grok)
- Guest Control — giới hạn tin nhắn cho người vãng lai
- Personal Access Token để tích hợp API bên thứ 3

---

## 💻 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | React.js (Vite) + TypeScript, Tailwind CSS, Vanilla CSS |
| **Backend** | Node.js (Express.js) |
| **Database** | PostgreSQL |
| **Vector DB** | Weaviate (RAG search) |
| **AI Models** | Google Gemini Flash/Pro, OpenAI GPT-4o, Grok |
| **Payment** | Stripe API + Stripe Connect Express |
| **Auth** | JWT, Role-based Access Control (RBAC) |
| **Storage** | Local uploads + Library media |
| **Blockchain** | Koii Network (decentralized AI tasks) |

---

## 📡 API Endpoints (Tóm tắt)

### Xác Thực (`/auth`)
- `POST /login` — Đăng nhập
- `POST /register` — Đăng ký
- `POST /forgot-password` / `POST /reset-password`
- `GET /auth/google` — Google OAuth

### Người Dùng (`/users`)
- `GET /` — Danh sách người dùng (Admin)
- `PUT /:id` — Cập nhật profile
- `POST /change-password`

### Không Gian (`/spaces`)
- `GET /` / `GET /:slug` — Danh sách / chi tiết Space
- `POST /` / `PUT /:id` — Tạo / Cập nhật Space
- `POST /:id/offer` — Cúng dường

### Cộng Đồng (`/spaces/:id/social`)
- `GET /` — Tải danh sách bài viết (phân trang)
- `POST /` — Đăng bài (kèm ảnh)
- `DELETE /:postId` — Xóa bài
- `POST /:postId/like` — Toggle Like
- `GET /:postId/comments` — Tải comments
- `POST /:postId/comments` — Thêm comment
- `DELETE /:postId/comments/:commentId` — Xóa comment
- `GET /notifications` — Thông báo
- `POST /follow/:targetUserId` — Theo dõi / Hủy theo dõi
- `GET /users/:userId/stats` — Thống kê người dùng (bài viết, followers, following)

### AI & Chat (`/conversations`)
- `POST /chat/stream` — Chat stream
- `GET /` — Lịch sử hội thoại
- `POST /:conversationId/messages/:messageId/feedback` — Like/Dislike

### Thư Viện
- `GET /library/documents` / `GET /library/documents/:id`
- `POST /documents` / `PUT /:id` / `DELETE /:id`
- `POST /documents/extract-text` — OCR

### Pháp Thoại & Thiền
- `GET /dharma-talks` / `POST /`
- `GET /meditations/space/:spaceId` / `POST /`

### Tiện Ích
- `POST /upload` — Upload file
- `POST /translate` — Dịch thuật
- `POST /tts/generate` — Text-to-Speech

### Thanh Toán
- `GET /pricing-plans`
- `POST /stripe/create-checkout-session`
- `POST /withdrawals` — Yêu cầu rút tiền

---

## ✅ Checklist Tính Năng

### 🏛️ Space & Cộng Đồng
- ✅ Không gian số riêng (logo, màu sắc, custom domain)
- ✅ Slug URL riêng (`giac.ngo/tathata`)
- ✅ Social Feed (đăng bài, ảnh, cảm xúc)
- ✅ Repost (chia sẻ lại bài của người khác)
- ✅ Like, Comment (thread phân cấp)
- ✅ Chia sẻ AI lên Feed
- ✅ Trang cá nhân (Wall view)
- ✅ Follow / Unfollow với cập nhật realtime
- ✅ Thống kê: Bài viết / Người theo dõi / Đang theo dõi
- ✅ URL Slug profile (F5 giữ nguyên trang)
- ✅ Thông báo (Like, Comment, Repost)
- ✅ Tìm kiếm bài viết
- 🔲 Push notification (mobile)
- 🔲 Forum / Hỏi-đáp cộng đồng

### 🤖 AI
- ✅ RAG Chatbot (upload tài liệu → AI học)
- ✅ Gemini Flash/Pro, GPT-4o, Grok
- ✅ STT (nói → text) — tiếng Việt & Anh
- ✅ TTS (text → giọng đọc, nhiều giọng)
- ✅ Voice Chat (hội thoại trực tiếp, ghi âm)
- ✅ Xử lý ảnh & OCR
- ✅ Upload PDF/DOCX → RAG
- ✅ Lịch sử hội thoại, Like/Dislike AI
- ✅ System Prompt, Q&A, Fine-tuning
- ✅ Test Chat + Add to Training
- 🔲 Multi-agent
- 🔲 Memory dài hạn

### 💰 Thanh Toán
- ✅ Stripe (thẻ, Apple Pay, Google Pay)
- ✅ Stripe Connect Express
- ✅ Merit Token hệ thống
- ✅ AI Marketplace
- ✅ Quy trình rút tiền (Pending → Approved)
- 🔲 QR Code / VietQR cúng dường nội địa
- 🔲 Mua Merit bằng chuyển khoản ngân hàng

### 👥 Thành Viên
- ✅ Đăng ký / Đăng nhập (Email + Password)
- ✅ Quên & đặt lại mật khẩu
- ✅ Upload avatar, chỉnh sửa profile
- ✅ RBAC phân quyền chi tiết
- ✅ Guest Control
- 🔲 Google OAuth
- 🔲 2FA

### 📚 CMS
- ✅ Rich Text Editor + Auto-Translate
- ✅ TTS tạo audio từ nội dung
- ✅ OCR & Extraction
- ✅ Pháp Thoại (audio/YouTube)
- ✅ Thiền Dẫn + bộ đếm giờ + nhạc nền
- ✅ Trình đọc sách tích hợp

### ⚙️ Hệ Thống
- ✅ JWT Authentication
- ✅ RBAC phân quyền
- ✅ Stripe Webhook
- ✅ Custom domain per Space
- 🔲 2FA
- 🔲 Audit Log

---

## ⚡ Cài Đặt & Chạy Local

```bash
# 1. Clone repo
git clone https://github.com/giac-ngo/giac.ngo.git
cd giac.ngo

# 2. Cài dependencies frontend
npm install

# 3. Cài dependencies backend
cd server && npm install && cd ..

# 4. Cấu hình biến môi trường
cp server/.env.example server/.env
# Điền các key: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, STRIPE_SECRET_KEY...

# 5. Chạy dev server
npm run dev        # Frontend (Vite) — http://localhost:5173
cd server && node index.js  # Backend — http://localhost:3002
```

---

## 📄 License

© 2024–2025 Giác Ngộ. All rights reserved.
