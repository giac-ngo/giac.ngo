# Tài Liệu Kiến Trúc Multi-Tenant & Danh Sách API (Dự án Giác Ngộ VN)

Tài liệu này ghi nhớ toàn bộ kiến trúc đa khách hàng (Multi-Tenant), luồng nghiệp vụ cốt lõi, và danh sách các API/Tính năng đã được xây dựng trong hệ thống Giác Ngộ VN (GiacNgoVN).

## I. Kiến Trúc Multi-Tenant (Đa Không Gian - Space)

Hệ thống được thiết kế theo mô hình **Multi-Tenant**, trong đó mỗi Tenant được gọi là một **Không gian (Space)**. Một Space hoạt động như một website cộng đồng hoặc một hệ sinh thái thu nhỏ độc lập.

### 1. Quản lý Space (Tenant)
- **Tên miền tùy chỉnh (Custom Domain)**: Mỗi Space có thể cấu hình một `customDomain`. Hệ thống Express sử dụng Middleware tại `server/index.ts` để chặn các request đến. Nếu `Host` header không phải là domain gốc, hệ thống sẽ tự động tra cứu Space theo domain đó và serve trang tĩnh tương ứng.
- **Tùy biến Giao diện**: Giao diện (Theme, Light/Dark mode), cấu hình tính năng bật/tắt hiển thị (`hasMeditation`, `hasLibrary`, `hasDharmaTalks`, `hasCommunity`) đều được config riêng trên từng Space.
- **Phân quyền và Thành viên (Cross-space)**: Một tài khoản người dùng có thể tham gia nhiều Space khác nhau. Các User được quản lý theo `space_members`, với các quyền khác nhau (Admin, Member). Đăng ký mới có khả năng merge tài khoản xuyên Space.

### 2. Dữ liệu độc lập theo Space
Hầu hết các tài nguyên trong hệ thống đều được gắn thẻ `space_id` để đảm bảo tính cô lập dữ liệu (Data Isolation):
- **API Keys (AI Studio, ChatGPT)**: Mỗi Space lưu trữ bộ API key riêng (`spaces.api_keys` JSONB). Khi AI cần key, hệ thống tra theo thứ tự: `Space.apiKeys → Owner.apiKeys (fallback)`. Personal Access Token vẫn giữ ở user settings.
- **Cài đặt Khách**: Giới hạn chat hàng ngày cho khách (`guest_daily_limit`). Khi đạt giới hạn, người dùng bắt buộc phải đăng nhập để tiếp tục. Không còn dùng nấc gợi ý đăng nhập (nudge) trung gian.
- **Kho Văn Bản (Documents)**: Tài liệu của Space nào chỉ phục vụ RAG cho AI của Space đó.
- **Cấu Hình AI (AiConfig)**: Các bot AI, Prompt, cấu hình Giọng nói (TTS) được setup riêng cho từng Space.
- **Voice Live (Gemini Live)**: Sử dụng ephemeral token (ngắn hạn 30 phút, 1 lần dùng) thay vì trả raw API key cho client. Backend tạo token qua `authTokens.create()` rồi gửi cho frontend.
- **Pháp Thoại (Dharma Talks) & Thiền (Meditation)**: Dữ liệu bài giảng và lịch sử thiền được quản lý theo Space.
- **Giao dịch & Cúng Dường (Merits)**: Mỗi Space có cấu hình thanh toán/QR riêng. Merits (điểm công đức) của người dùng được cộng riêng dựa trên giao dịch vào từng Space.

---

## II. Danh sách Toàn Bộ API (API Endpoints & Features)

Dưới đây là danh sách chi tiết và đầy đủ nhất mọi endpoint API đang hoạt động trong toàn bộ hệ thống (được trích xuất từ cấu trúc Routes & `apiService.ts`):

### 1. Phân hệ User & Authentication (`/api/auth`, `/api/users`)
* **Auth**:
  - `POST /api/auth/login`: Đăng nhập (hỗ trợ context spaceSlug).
  - `POST /api/auth/register`: Đăng ký tài khoản (Tích hợp Cross-space registration).
  - `GET /api/auth/me`: Lấy profile của người dùng hiện tại (bằng JWT).
  - `POST /api/auth/forgot-password`: Quên mật khẩu.
  - `POST /api/auth/reset-password`: Đổi mật khẩu qua token.
  - `PUT /api/auth/profile`: Cập nhật thông tin profile cá nhân.
* **Users**:
  - `GET /api/users`: Lấy danh sách toàn bộ người dùng (phân trang/tìm kiếm).
  - `POST /api/users`: Admin tạo người dùng mới.
  - `PUT /api/users/:id`: Chỉnh sửa thông tin user (quản trị).
  - `DELETE /api/users/:id`: Xoá user.
  - `POST /api/users/:id/regenerate-token`: Tạo lại ApiToken cho tài khoản.
  - `POST /api/users/change-password`: Đổi mật khẩu.
  - `GET /api/users/:id/spaces`: Lấy danh sách các không gian (Space) mà user đã tham gia.

### 2. Phân hệ Đa Không Gian - Multi-Tenant Spaces (`/api/spaces`, `/api/space-types`)
* **Spaces**:
  - `GET /api/spaces`: Lấy danh sách tất cả Spaces.
  - `GET /api/spaces/:id`: Chi tiết một Space theo ID.
  - `GET /api/spaces/slug/:slug`: Chi tiết một Space theo Slug (URL).
  - `GET /api/spaces/domain/:domain`: Lấy thông tin Space thông qua Custom Domain.
  - `GET /api/spaces/managed/:userId`: Lấy các Space do user làm chủ / quản lý.
  - `GET /api/spaces/owners`: Lấy danh sách các User là chủ Space.
  - `GET /api/spaces/owner-data`: Lấy tổng hợp dữ liệu riêng cho Space Owner.
  - `POST /api/spaces`: Tạo Không gian mới (Chỉ Admin).
  - `PUT /api/spaces/:id`: Cập nhật cấu hình Không gian (Admin/Space Owner).
  - `DELETE /api/spaces/:id`: Xoá Không gian.
  - `POST /api/spaces/:id/view`: Tăng lượt xem (increment views).
  - `POST /api/spaces/:id/like`: Thả tim/thích một không gian.
* **Space Types** (Danh mục Không gian: Phật giáo, Công ty,...):
  - Lệnh `GET`, `POST`, `PUT`, `DELETE` tương ứng tại endpoint `/api/space-types`.
* **Space Members**:
  - `GET /api/spaces/:id/members`: Danh sách thành viên trong Space.
  - `POST /api/spaces/:id/join`: Người dùng xin gia nhập Space.
  - `POST /api/spaces/:id/members`: Thêm thành viên vào Space.
  - `PUT /api/spaces/:id/members/:userId/role`: Đổi Role cho thành viên.
  - `DELETE /api/spaces/:id/members/:userId`: Kick thành viên.

### 3. Phân hệ Phân Quyền (`/api/roles`)
  - `GET /api/roles`, `POST`, `PUT /:id`, `DELETE /:id`: Quản lý danh sách vai trò (Roles).
  - `GET /api/roles/space/:spaceId`: Lấy danh sách role nội bộ áp dụng trong một Space cụ thể.

### 4. Phân hệ Trang Không Gian Tuỳ Biến (`/api/space-pages`)
  - `GET /api/space-pages/space/:spaceId`, `GET /api/space-pages/:id`, `POST`, `PUT /:id`, `DELETE /:id`: Quản lý các trang đích tuỳ chỉnh (Landing Pages) cho từng Space.
  - `POST /api/space-pages/1/contact`: Endpoint xử lý form liên hệ.

### 5. Phân hệ AI Config & Voice (`/api/ai-configs`, `/api/system`)
* **AI Configuration**:
  - `POST /api/ai-configs`: Lấy cấu hình AI theo user.
  - `GET /api/ai-configs/space/:spaceId`: Lấy tất cả cấu hình AI thuộc 1 Space.
  - `POST /api/ai-configs/manageable`: AI mà người dùng được quản lý.
  - `POST /api/ai-configs/create`, `PUT /:id`, `DELETE /:id`: CRUD AI Config.
  - `GET /api/ai-configs/:id/access` & `POST /api/ai-configs/:id/access`: Quản lý whitelist các Email được dùng con AI này.
  - `PUT /api/ai-configs/:id/active`: Bật/tắt AI.
  - `POST /api/ai-configs/:id/purchase` & `POST /api/ai-configs/:id/claim`: Chức năng mua / nhận miễn phí Bot AI.
* **Tích Hợp Voice & TTS**:
  - `GET /api/ai-configs/:id/voice-key`: Lấy key config (Giọng đọc đặc thù, nhiệt độ, kiểu kể chuyện...).
  - `POST /api/system/tts/generate`: API tạo giọng nói từ Text (Gemini/OpenAI TTS) - Áp dụng Rate Limit 50 req/giờ.
  - `POST /api/system/translate`: Dịch thuật văn bản.
  - `GET /api/system/models/:provider`: Lấy danh sách mô hình (GPT, Gemini, Vertex, Grok).

### 6. Phân hệ RAG, Tài liệu & Kho Văn Bản (`/api/documents`, `/api/library`)
* **Thư viện & Bộ lọc**:
  - `GET /api/library/documents`: Lấy danh sách tài liệu công khai trong Thư viện Space.
  - `GET /api/library/topics`, `GET /api/library/filters`: Lấy hệ thống phân loại tài liệu (Tag, Topic, Author).
* **Tài liệu (Documents)**:
  - `GET /api/documents`, `POST`, `PUT /:id`, `DELETE /:id`: Quản lý tài liệu RAG.
  - `GET /api/documents/recommended`: Gợi ý tài liệu.
  - `POST /api/documents/:id/like`: Thả tim tài liệu.
  - `POST /api/documents/extract-text`: Dùng AI bóc tách nội dung Text từ File đính kèm.
* **Liên kết RAG (Knowledge Base)**:
  - `POST /api/ai-configs/:aiId/documents`: Nạp tài liệu vào Context Window của AI.
  - `DELETE /api/ai-configs/:aiId/documents/:docId`: Huỷ nạp tài liệu.
* **Danh mục bổ trợ (Type, Topic, Author)**:
  - Cung cấp toàn bộ các lệnh CRUD ở `/api/documents/authors`, `/api/documents/types`, `/api/documents/topics`, và cấu hình UI `/api/documents/config`.

### 7. Phân hệ Huấn Luyện AI (Training Data & Koii Vector Sync)
* **Training Data**:
  - `GET /api/ai-configs/:id/training-data`: Lấy dữ liệu huấn luyện (QA/Tài liệu) của Bot.
  - `POST /api/ai-configs/:id/training-data`: Thêm bộ QA hoặc upload file huấn luyện.
  - `DELETE /api/training-data/:id` & `DELETE /api/training-data/qa`: Xoá dữ liệu.
  - `POST /api/training-data/:id/summarize`: Tóm tắt tài liệu nạp vào bằng AI.
  - `GET /api/training-data/qa/all` & `POST /api/training-data/qa/export`: Export QA để fine-tune (JSONL).
* **Koii & Weaviate**:
  - `POST /api/koii/submit-task`: Gửi lệnh đồng bộ Vector embeddings vào Weaviate.
  - `GET /api/koii/progress/:aiId` & `GET /api/koii/task-status/:aiId`: Check tiến trình Vectorization (Realtime trả về frontend).

### 8. Phân hệ Hội Thoại (Chat) & Streaming (`/api/conversations`)
* **Core Chat**:
  - `GET /api/conversations` (Lọc theo user/aiConfig, phân trang) & `GET /api/conversations/all`.
  - `GET /api/conversations/:id`, `POST /`, `DELETE /:id`: CRUD log chat.
  - `PUT /api/conversations/:id/rename`: Đổi tên session chat.
  - `POST /api/conversations/chat/stream`: **Endpoint cực kì quan trọng** dùng kỹ thuật HTTP SSE (Server-Sent Events) để trả về luồng AI sinh văn bản từng chữ một (kết hợp Gemini Live / Voice Chat), hỗ trợ Rate Limit 100 req/15 phút.
  - `POST /api/conversations/:conversationId/messages/:messageId/feedback`: Like/Dislike (Feedback) phản hồi của AI.
* **Training Utils**:
  - `PUT /api/conversations/:id/train-status`: Mark là đã train.
  - `POST /api/ai-configs/:id/latest-conversation`, `GET /api/ai-configs/:id/trained-conversations`, `POST /api/ai-configs/:id/test-conversations`: Các API lấy log chat dành cho UI test bot.

### 9. Phân hệ Cộng Đồng & Bảng Tin - Social (`/api/space-social`, `/api/comments`)
* **Social Feed**:
  - `GET /api/space-social/:spaceId/social`: Lấy News Feed của Space.
  - `POST`, `PUT /:postId`, `DELETE /:postId`: Đăng status/sửa/xoá.
  - `POST /api/space-social/:spaceId/social/:postId/like`: Like status.
  - `GET /api/space-social/:spaceId/social/:postId/likes`: Xem ai đã like.
* **Comments**:
  - `GET`, `POST`, `DELETE /:commentId` tại `/api/space-social/:spaceId/social/:postId/comments`.
  - `POST /.../comments/:commentId/like`: Like một bình luận.
* **Social Interactions**:
  - `POST /api/space-social/:spaceId/social/follow/:userId`: Theo dõi người dùng khác.
  - `GET /api/space-social/:spaceId/social/users/:userId/stats`: Số người follow/following.
  - `POST /api/space-social/:spaceId/social/:postId/bookmark`: Lưu bài viết (Bookmark).
  - `GET /api/space-social/:spaceId/social/saved`: Xem bài đã lưu.
  - `POST /api/space-social/:spaceId/social/:postId/pin`: Ghim bài lên đầu Space.
* **Notifications (Thông báo)**:
  - `GET /api/space-social/:spaceId/social/notifications`: Lấy danh sách thông báo.
  - `POST /api/space-social/:spaceId/social/notifications/read`: Đánh dấu đã đọc.
  - `GET /api/space-social/:spaceId/social/notifications/count`: Số thông báo mới.

### 10. Phân hệ Pháp Thoại & Thiền (`/api/dharma-talks`, `/api/meditation`)
* **Dharma Talks (Pháp Thoại)**:
  - `GET /api/dharma-talks` & `GET /api/spaces/:id/dharma-talks`: Lấy danh sách bài giảng.
  - `POST`, `PUT /:id`, `DELETE /:id`: Quản lý nội dung.
  - `POST /:id/view` & `POST /:id/like`: Tăng view và like.
* **Meditation (Thiền)**:
  - `GET /api/meditation/space/:spaceId` & `GET /api/meditation`: Theo dõi lịch sử thực hành thiền.
  - `POST`, `PUT /:id`, `DELETE /:id`: Ghi nhận dữ liệu thời gian thiền (Timer).

### 11. Phân hệ CMS N8N & Webhook Đăng Bài (`/api/cms`)
* **Articles (Bài viết)**:
  - `GET /api/cms/:spaceId/articles`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`: Quản lý bài đăng đa kênh.
  - `DELETE /api/cms/:spaceId/articles/:id/permanent`: Xoá vĩnh viễn (Hard delete).
  - `POST /api/cms/:spaceId/articles/:id/publish`: Endpoint kích hoạt Webhook N8N đăng lên nền tảng chỉ định.
  - `POST /api/cms/:spaceId/articles/import-document`: Import bài từ Kho Văn Bản sang bài đăng CMS.
  - `POST /api/cms/:spaceId/articles/:id/share-to-feed`: Share bài viết CMS vào Bảng tin Cộng Đồng nội bộ của Space.
* **Social Connections**:
  - `GET /api/cms/:spaceId/connections`, `DELETE /:id`: Quản lý Token nối tới mạng xã hội.
  - `GET /api/cms/:spaceId/oauth/:platform/url`: Nhận URL uỷ quyền (OAuth).
  - `GET /api/cms/:spaceId/connections/facebook/pages` & `PUT /.../facebook`: Swap Page Access Token của Fanpage hoặc Profile Cá Nhân.
  - Cấu hình quản lý `fb-albums`.

### 12. Phân hệ Thanh Toán, Cúng Dường & Lịch Sử Giao Dịch (`/api/billing`, `/api/payos`)
* **Billing (Trực tiếp bằng thẻ via Stripe)**:
  - `GET`, `POST`, `PUT`, `DELETE /api/billing/pricing-plans`: Quản lý các gói thanh toán định kỳ.
  - `GET /api/billing/transactions`: Lịch sử giao dịch (có thể lọc qua `user/:id` hoặc `spaces/:id`).
  - `GET /api/billing/stats/space-earnings`: Thống kê doanh thu 30 ngày.
  - `POST /api/billing/stripe/create-checkout-session` & `POST /verify-checkout-session`: Luồng charge tiền tự động.
  - Tích hợp **Stripe Connect** (`/api/billing/stripe/connect/account`, `account-link`, `login-link`, `disconnect`) cho phép Space Owner có tài khoản nhận tiền độc lập.
* **PayOS (Chuyển khoản QR tại Việt Nam)**:
  - `POST /api/payos/create-donation-link` & `POST /api/payos/create-payment-link`: Khởi tạo lệnh cúng dường / thanh toán qua App Ngân Hàng (Mã VietQR).
  - `GET /api/payos/verify-order`: Xác thực trạng thái giao dịch (Webhook).
* **Rút tiền (Withdrawals)**:
  - `GET`, `POST`, `PUT /process` tại `/api/billing/admin/withdrawals`: Xử lý lệnh yêu cầu rút tiền của chủ Space.

### 13. Phân hệ Hệ Thống & Lưu trữ Media (`/api/system`, `/api/media`)
* **Dashboard & Cấu hình máy chủ**:
  - `GET /api/system/dashboard/stats`: Số liệu quản trị (Người dùng, Space, Tin nhắn AI).
  - `GET /api/system/config`, `PUT /api/system/config`: Thông số core platform.
* **Media / Uploads**:
  - `POST /api/system/upload`: Tải file tổng hợp.
  - `GET /api/media/:spaceId`, `POST /upload`, `DELETE`: Quản lý kho Media riêng cho từng Space.
* **Cúng dường tại Space API (Bypass Billing)**:
  - `POST /api/spaces/:id/qr-donation` & `POST /api/spaces/:id/offer`: Cơ chế ghi nhận bằng tay luồng cúng dường QR, có tích hợp cúng dường ẩn danh (Guest).

---

## III. Cơ chế Bảo mật và Middleware
- **Xác thực và Phân quyền (JWT)**: Sử dụng JWT tokens quản lý session qua `authMiddleware.js`.
- Phân tách quyền lực rõ ràng: `isGlobalAdmin` (Super Admin hệ thống — chỉ `true` khi truy cập từ Root Domain `/admin`) vs. `isSpaceOwner`/Manager (Quản lý Space của mình qua `/:slug/admin`).
- **QUY TẮC QUAN TRỌNG**: KHÔNG dùng `user.permissions?.includes('roles')` để xác định SuperAdmin. Thay vào đó, `AdminPage.tsx` truyền prop `isGlobalAdmin` xuống tất cả các component con. Việc dùng `permissions.includes('roles')` sẽ gây lỗi bảo mật vì Space Owner cũng có thể có quyền `roles`.
- **Socket.IO Real-time**: Tham gia các phòng (`room`) thông qua tên gọi `space-{spaceId}` hoặc `user-{userId}` để đẩy (push) log đồng bộ Vector hoặc tiến trình huấn luyện AI.
- **Bảo mật dữ liệu nhạy cảm (Sanitization)**: 
  - Tại `spacesController.ts`, hệ thống sử dụng hàm `mapAndSanitizeSpace` để lọc bỏ các trường nhạy cảm (`apiKeys`, `smtpPass`, `payosApiKey`, `payosChecksumKey`) trước khi gửi dữ liệu về Client.
  - **Quyền hạn**: Chỉ có SuperAdmin hoặc Space Owner (được xác thực qua `canAccessSpace`) mới nhận được dữ liệu thô (Raw) chứa các Key này.
- **Cơ chế Kế thừa Quyền hạn (Inherited Role Allocation)**:
  - Khi Space Owner tạo mới hoặc cấp phát Quyền (Role) cho người dùng, hệ thống giới hạn danh sách quyền được phép cấp phát **chỉ trong phạm vi những quyền mà Space Owner đang sở hữu**.
  - Kiểm soát ở giao diện (ẩn checkbox) và API (`roleController.ts` lọc quyền vượt cấp).
- **Space-Scoped Roles**: Bảng `roles` có cột `space_id`.
  - `space_id IS NULL` → Role hệ thống (Global Admin quản lý, read-only cho Space Owner).
  - `space_id = X` → Role do Space Owner tạo (chỉnh sửa được bởi Space Owner/Manager).
  - UNIQUE constraint: `(name, COALESCE(space_id, 0))` — cho phép trùng tên giữa các Space.
  - *Lưu ý Hiển thị*: Khi Root Admin (Global Admin) truy cập Quản lý Quyền từ ngoài Space, API chỉ trả về các Role hệ thống (`space_id IS NULL`) để tránh lỗi hiển thị trùng lặp (duplicate) các quyền cùng tên do nhiều Không gian khác nhau tạo ra.

---

## IV. Kiến trúc Frontend (React + Vite)
Hệ thống Frontend được xây dựng bằng **React + TypeScript + Vite**, sử dụng Tailwind CSS để định hình giao diện (UI) và tuân thủ chặt chẽ cấu trúc Multi-Tenant.

### 1. Routing & Domain Resolver (`App.tsx`)
- Sử dụng `react-router-dom` để điều hướng.
- **Root Domain (`login.bodhilab.io` / `localhost`)**: Được tự động nhận diện bằng hàm `isRootDomain()`. Ở domain này, người dùng sẽ được điều hướng tới trang Đăng nhập Quản trị (`AdminLoginPage`) hoặc Trang Quản trị Tổng (`AdminPage`).
- **Custom Domains & Subdomains**: Các domain riêng của Space (VD: `tathata.bodhilab.io`, `giac.ngo`) sẽ được chặn bởi `CustomDomainPageResolver` hoặc `SpaceCustomPageResolver` để map chính xác giao diện của Space đó.

### 2. Thành phần Giao diện cốt lõi (Core Pages)
- **`PracticeSpacePage.tsx`**: Đây là giao diện chính (App Interface) của một Không gian (Space). Nó đóng gói toàn bộ tính năng người dùng:
  - **Chat (Trò chuyện)**: Màn hình nhắn tin với bot AI, lưu trữ Log chat (kể cả Guest/Khách chưa đăng nhập cũng lưu qua `localStorage`).
  - **Library (Thư viện RAG)**: Xem danh mục, tài liệu công khai trong không gian.
  - **DharmaTalks (Pháp thoại)**: Nơi hiển thị Video/Audio pháp thoại.
  - **MeditationTimer (Đồng hồ thiền)**: Tính thời gian và ghi lại lịch sử thực hành.
  - **Community (Bảng tin MXH)**: Nơi post bài, đăng ảnh, tương tác thả tim và bình luận nội bộ.
  - Tích hợp **Voice Chat (Gemini Live)**: Chức năng Live Stream bằng giọng nói `window.SpeechRecognition`.
- **`AdminPage.tsx`**: Bảng điều khiển quản trị (Dashboard) cực lớn, quản lý AI Config, CMS, Users, Billing dựa trên `isGlobalAdmin` (từ Root Domain) hoặc Space context (từ `/:slug/admin`).
  - **Quy tắc truyền prop**: Tất cả component con (`SpaceManagement`, `RoleManagement`, `AiManagement`, `UserManagement`) nhận `isGlobalAdmin` và `currentSpace` từ `AdminPage`.
  - **SpaceManagement**: Non-admin chỉ thấy space mình thuộc về, sửa được nhưng không xóa. Tab "Cấu hình mở rộng" chỉ hiện cho Owner/SuperAdmin.
  - **AiManagement**: Non-admin chỉ thấy AI thuộc space, có thể sửa nếu có quyền `ai` (`isSpaceManager`).

### 3. Quản lý Trạng Thái & Giao diện (State & Theming)
- **Theming (Giao diện động)**: Hệ thống sử dụng thuộc tính CSS `data-theme` được tiêm thẳng vào thẻ `<html>` thông qua `document.documentElement.setAttribute('data-theme', themeToApply)`. Việc này cho phép cấu hình màu sắc, Dark/Light mode khác nhau cho từng Space.
- **Đa ngôn ngữ (i18n)**: Sử dụng object dictionary (Tiếng Việt/Tiếng Anh) dạng `translations[language]` được lưu trong biến state và `localStorage`.
- **Favicon & Meta Tags**: Khi người dùng vào 1 Custom Domain, `App.tsx` gọi API lấy thông tin Space để tự động thay đổi Tiêu đề (Document Title) và Favicon của tab trình duyệt.

*Tài liệu này là Bộ nhớ Chi tiết Hệ thống. Cấu trúc Multi-Tenant này đảm bảo mỗi Không gian (Space) như một ứng dụng SaaS thu nhỏ chạy trên nền tảng chung của Giác Ngộ VN.*
