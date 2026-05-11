# Tài Liệu Kiến Trúc Multi-Tenant (Dự án Giác Ngộ VN)

Tài liệu này ghi nhớ toàn bộ kiến trúc đa khách hàng (Multi-Tenant), luồng nghiệp vụ cốt lõi, và giao diện Frontend của hệ thống Giác Ngộ VN.

## I. Kiến Trúc Multi-Tenant (Đa Không Gian - Space)

Hệ thống được thiết kế theo mô hình **Multi-Tenant**, trong đó mỗi Tenant được gọi là một **Không gian (Space)**. Một Space hoạt động như một website cộng đồng hoặc một hệ sinh thái thu nhỏ độc lập.

### 1. Quản lý Space (Tenant)
- **Tên miền tùy chỉnh (Custom Domain)**: Mỗi Space có thể cấu hình một `customDomain`. Hệ thống Express sử dụng Middleware tại `server/index.ts` để chặn các request đến. Nếu `Host` header không phải là domain gốc, hệ thống sẽ tự động tra cứu Space theo domain đó và serve trang tĩnh tương ứng.
- **Tùy biến Giao diện**: Giao diện (Theme, Light/Dark mode), cấu hình tính năng bật/tắt hiển thị (`hasMeditation`, `hasLibrary`, `hasDharmaTalks`, `hasCommunity`) đều được config riêng trên từng Space.
- **Phân quyền và Thành viên (Cross-space)**: Một tài khoản người dùng có thể tham gia nhiều Space khác nhau. Các User được quản lý theo `space_members`, với các quyền khác nhau (Admin, Member). Đăng ký mới có khả năng merge tài khoản xuyên Space.

### 2. Dữ liệu độc lập theo Space
Hầu hết các tài nguyên trong hệ thống đều được gắn thẻ `space_id` để đảm bảo tính cô lập dữ liệu (Data Isolation):
- **Kho Văn Bản (Documents)**: Tài liệu của Space nào chỉ phục vụ RAG cho AI của Space đó.
- **Cấu Hình AI (AiConfig)**: Các bot AI, Prompt, cấu hình Giọng nói (TTS) được setup riêng cho từng Space.
- **Pháp Thoại (Dharma Talks) & Thiền (Meditation)**: Dữ liệu bài giảng và lịch sử thiền được quản lý theo Space.
- **Giao dịch & Cúng Dường (Merits)**: Mỗi Space có cấu hình thanh toán/QR riêng. Merits (điểm công đức) của người dùng được cộng riêng dựa trên giao dịch vào từng Space.

---

## II. Cơ chế Bảo mật và Middleware
- **Xác thực và Phân quyền (JWT)**: Sử dụng JWT tokens quản lý session qua `authMiddleware.js`.
- Phân tách quyền lực rõ ràng: `isAdmin` (Super Admin hệ thống) vs. `isSpaceOwner`/Member (Chỉ quản lý Space của mình).
- **Socket.IO Real-time**: Tham gia các phòng (`room`) thông qua tên gọi `space-{spaceId}` hoặc `user-{userId}` để đẩy (push) log đồng bộ Vector hoặc tiến trình huấn luyện AI.

---

## III. Kiến trúc Frontend (React + Vite)
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
- **`AdminPage.tsx`**: Bảng điều khiển quản trị (Dashboard) cực lớn, quản lý AI Config, CMS, Users, Billing (Thanh toán/Rút tiền) dựa trên quyền `isGlobalAdmin` hoặc `Space Owner`.

### 3. Quản lý Trạng Thái & Giao diện (State & Theming)
- **Theming (Giao diện động)**: Hệ thống sử dụng thuộc tính CSS `data-theme` được tiêm thẳng vào thẻ `<html>` thông qua `document.documentElement.setAttribute('data-theme', themeToApply)`. Việc này cho phép cấu hình màu sắc, Dark/Light mode khác nhau cho từng Space.
- **Đa ngôn ngữ (i18n)**: Sử dụng object dictionary (Tiếng Việt/Tiếng Anh) dạng `translations[language]` được lưu trong biến state và `localStorage`.
- **Favicon & Meta Tags**: Khi người dùng vào 1 Custom Domain, `App.tsx` gọi API lấy thông tin Space để tự động thay đổi Tiêu đề (Document Title) và Favicon của tab trình duyệt.
