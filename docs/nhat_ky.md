# Nhật ký thay đổi - Giác Ngộ VN

## Quá Trình Thay Đổi

## 2026-06-30

### 🔍 Autocomplete Gợi ý Tìm kiếm Thư viện (Tìm kiếm giống Google)
**Vấn đề / Nhu cầu**: Người dùng muốn khi gõ từ khóa vào ô tìm kiếm ở trang Thư viện (`https://giac.ngo/giac-ngo/library`), hệ thống sẽ hiển thị một dropdown chứa các gợi ý tự động (autocomplete suggestions) giống như Google, hiển thị nhanh các tiêu đề kinh sách, kệ pháp hoặc câu chuyện khớp với từ khóa, và hỗ trợ điều hướng bằng bàn phím (phím mũi tên lên/xuống, Enter để chọn).

**Giải pháp & Chi tiết thay đổi**:
- **Frontend (`client/src/components/LibraryView.tsx`)**:
  - Bổ sung state `suggestions` (mảng lưu các tài liệu gợi ý), `showSuggestions` (ẩn/hiện dropdown), `focusedIndex` (dòng đang chọn khi dùng bàn phím) và `isFetchingSuggestions` (trạng thái đang tải gợi ý).
  - Tích hợp một `fetchSuggestions` hook với cơ chế debounce 250ms riêng biệt so với 500ms của bộ lọc tìm kiếm chính. Tự động gọi API `getLibraryDocuments` lấy tối đa 5 kết quả khớp nhất với từ khóa trong Không gian hiện tại.
  - Viết trình xử lý sự kiện `onKeyDown` cho ô input hỗ trợ di chuyển phím `ArrowDown` (xuống), `ArrowUp` (lên), chọn bằng phím `Enter`, và đóng bằng phím `Escape` / click ra ngoài vùng dropdown.
  - Render khung dropdown tuyệt đẹp, có bo góc, đổ bóng nổi bật, tự động hiển thị kiểu tài liệu (Kệ, Câu chuyện...) và tên tác giả bên dưới mỗi tiêu đề gợi ý.
  - Sử dụng CSS inline để định hình giao diện giúp tránh tình trạng bị lưu cache stylesheet cũ trên trình duyệt khách.

---

### 🛠️ Sửa lỗi chọn Album CMS, Ghi đè Kết nối Facebook Page, Tìm kiếm Thư viện Toàn cầu & Ẩn viền ô Tìm kiếm

**Giải pháp & Chi tiết thay đổi**:

1. **Sửa lỗi không chọn được Facebook Album khi viết bài (`client/src/components/admin/CmsManagement.tsx`)**:
   - Khắc phục lỗi logic so sánh falsy `|| 'direct'` tại giao diện biên tập bài viết CMS. Thay thế bằng kiểm tra nghiêm ngặt `!== undefined` để tránh trường hợp chuỗi rỗng `""` (khi người dùng click chọn chế độ đăng Album) bị ghi đè ngược về giá trị mặc định `'direct'`.
   - Kết quả: Nút Radio "Đăng vào Album" hoạt động chính xác, hiển thị đầy đủ danh sách Album động và nút thêm Album mới `+`.

2. **Ghi đè kết nối gốc khi chọn Facebook Page (`server/controllers/cmsController.ts`)**:
   - Cập nhật hàm `updateFacebookConnection` tại backend. Khi người dùng lưu kết nối cho một Facebook Page cụ thể (`platform` dạng `facebook_<pageId>`), hệ thống sẽ tự động tìm và xóa kết nối OAuth gốc (`platform = 'facebook'`) khỏi database.
   - Kết quả: Loại bỏ hoàn toàn tình trạng trùng lặp/hiển thị hai thẻ kết nối cùng lúc trên giao diện.

3. **Hỗ trợ Tìm kiếm toàn bộ Thư viện (`client/src/components/LibraryView.tsx`)**:
   - Thêm hộp chọn (checkbox) *"Tìm kiếm toàn bộ thư viện (không giới hạn theo Chủ đề/Tác giả)"* hiển thị động bên dưới ô tìm kiếm khi có từ khóa.
   - Mặc định checkbox được tích chọn sẵn để cho phép tìm kiếm toàn bộ tài liệu trong Space. Khi người dùng bỏ tích, hệ thống sẽ giới hạn phạm vi tìm kiếm theo đúng bộ lọc của sidebar (Topic/Author/Type).

4. **Ẩn viền ô tìm kiếm Thư viện & Cache Busting (`client/public/themes/giacngo/Library.css` & `client/index.html`)**:
   - Xóa bỏ border mặc định và hiệu ứng viền hồng/đỏ cùng shadow phát sáng khi ô tìm kiếm được focus trong stylesheet của theme `giacngo`.
   - Nâng phiên bản tham chiếu `Library.css` trong `client/index.html` lên `?v=6` để ép trình duyệt người dùng xóa cache và hiển thị giao diện không viền (borderless) mới ngay lập tức.

**File thay đổi**:
- `client/src/components/admin/CmsManagement.tsx`
- `server/controllers/cmsController.ts`
- `client/src/components/LibraryView.tsx`
- `client/public/themes/giacngo/Library.css`
- `client/index.html`

### 📚 Tóm tắt bài viết thư viện & Mở rộng tìm kiếm tài liệu
**Vấn đề**:
1. Thư viện bài viết cần hiển thị tóm tắt bài viết trong danh sách.
2. Khi tìm kiếm tài liệu, cần tìm kiếm cả trong nội dung (content) và tiêu đề (title).

**Giải pháp & Chi tiết thay đổi**:
- **Backend (`document.model.ts`)**: Mở rộng câu lệnh `WHERE` trong hàm `find` của `documentModel` để tìm kiếm từ khóa không phân biệt hoa thường (`ILIKE`) trên cả các trường `title`, `title_en`, `content`, `content_en`, `summary`, `summary_en`.
- **Frontend (`LibraryView.tsx`)**: Hiển thị tóm tắt bài viết trong danh sách thẻ tài liệu. Nếu trường tóm tắt (`summary` / `summaryEn`) trống trong cơ sở dữ liệu, frontend tự động bóc tách thẻ HTML từ nội dung bài viết (`content` / `contentEn`), chuẩn hóa khoảng trắng và cắt ngắn tối đa 150 ký tự làm tóm tắt.

---

### 🔑 Hiển thị Access Token đầy đủ & Định dạng Copy trong CMS Social Connections
**Vấn đề**: Người dùng cần kiểm tra và sao chép đầy đủ Access Token của các kết nối mạng xã hội, tuy nhiên giao diện trước đây đã che bớt/cắt ngắn token.

**Giải pháp & Chi tiết thay đổi**:
- **Backend (`cmsController.ts`)**: Loại bỏ logic che giấu/mã hóa token ở hàm `getConnections`, trả về nguyên bản `accessToken`.
- **Frontend (`CmsManagement.tsx`)**: Loại bỏ class `truncate` trên thẻ paragraph của token, thay bằng class `break-all` để tự động xuống dòng và bọc token trong thẻ `<span>` có class `select-all font-mono` giúp người dùng dễ dàng nhấp đúp chuột để bôi đen/copy toàn bộ token.

---

### 🐛 Giải mã fbAlbumId & Khắc phục lỗi kẹt trạng thái "Đang đăng" khi gọi Callback
**Vấn đề**: 
1. `fbAlbumId` lưu trong DB dưới dạng JSON map tương thích với các Page khác nhau, nhưng webhook PULL của n8n cần Album ID dạng số trực tiếp.
2. Khi n8n hoàn thành đăng bài và gọi callback webhook của server báo kết quả, nó gửi tên nền tảng chung là `"facebook"` thay vì tên page cụ thể dạng `"facebook_..."`. Khiến server tạo một log mới tên `"facebook"`, bỏ quên log Page thực tế ở trạng thái `pending`, làm bài viết bị kẹt trạng thái "Đang gửi đăng" (publishing).

**Giải pháp & Chi tiết thay đổi**:
- **Backend (`cmsController.ts`)**:
  - Tại API lấy danh sách bài viết chờ duyệt cho n8n (`getPendingArticlesForN8n`): Giải mã chuỗi JSON `fbAlbumId` để lấy ra chính xác mã album dạng số tương ứng với Page đích chuẩn bị đăng.
  - Tại webhook nhận kết quả đăng bài (`webhookPublishResult`): Bổ sung logic tự động map nền tảng chung `"facebook"` về đúng mã connection Page cụ thể (dạng `"facebook_..."`) trong DB để cập nhật trạng thái log chính xác.
  - Chạy script migration dọn dẹp các bài viết cũ bị kẹt trạng thái sang "Đã đăng" (published) và "Thất bại" (failed).

---

### 📅 Đặt lịch đăng mặc định (+5 phút) & Đồng bộ múi giờ cục bộ
**Vấn đề**: Ô nhập ngày giờ lên lịch đăng không tự động điền giá trị gợi ý và hiển thị sai lệch múi giờ (UTC so với giờ Việt Nam GMT+7).

**Giải pháp & Chi tiết thay đổi**:
- **Frontend (`CmsManagement.tsx`)**:
  - Khi tạo bài viết mới (`openNewArticle`), tự động gán mặc định thời gian `scheduledAt` là thời điểm hiện tại cộng thêm 5 phút (`new Date(Date.now() + 5 * 60 * 1000).toISOString()`).
  - Viết helper `toLocalISOString` để quy đổi ngày giờ dạng UTC từ DB thành giờ local tương ứng của trình duyệt để hiển thị chính xác trên thẻ `<input type="datetime-local" />`.

---

### 📊 Thêm Combobox số lượng dòng & Sửa lỗi đăng hàng loạt (Mass Publish)
**Vấn đề**:
1. Danh sách bài viết CMS chưa có tùy chọn số lượng dòng hiển thị trên mỗi trang (10, 50, 100).
2. Khi chọn nhiều bài viết và nhấn nút đăng hàng loạt `FB` trên thanh công cụ, hệ thống báo lỗi "Chưa kết nối fb" mặc dù các Page đã kết nối hoạt động tốt.

**Giải pháp & Chi tiết thay đổi**:
- **Frontend (`CmsManagement.tsx`)**:
  - Thêm state `limit` (mặc định 15) và cập nhật API tải danh sách bài viết theo limit được chọn.
  - Tích hợp thêm thẻ `<select>` cho phép chọn hiển thị **10, 15, 50, hoặc 100** dòng ở thanh phân trang dưới cùng.
  - Cập nhật hàm `handlePublishMass` để nếu nền tảng là `facebook`, nó sẽ tìm các kết nối active có platform bắt đầu bằng `"facebook_"` để lấy danh sách Page cụ thể và gọi API đăng bài thay vì tìm kiếm platform tên `"facebook"` gốc.

---

### 🔄 Dọn dẹp lỗi cũ (Clear Failed Logs) khi đăng lại & Sửa lỗi hiển thị trạng thái Facebook Page
**Vấn đề**:
1. Khi một bài viết bị đăng thất bại (`failed` kèm thông báo lỗi) và người dùng bấm Đăng lại hoặc chọn nhiều bài để Đăng lại, hệ thống vẫn hiển thị trạng thái lỗi cũ màu đỏ `failed ⚠️ Lỗi` song song với dòng chữ trạng thái `Đang gửi đăng` màu xanh. Điều này là do backend chỉ insert thêm một log dòng mới `pending` mà không xóa hay cập nhật log lỗi cũ của platform đó.
2. Trên Frontend, hàm kiểm tra status log chỉ so sánh `l.platform === p` (với `p === 'facebook'`), dẫn đến việc nó bỏ qua log mới có platform là `facebook_735328316336956` và tìm thấy log cũ `"facebook"` của kết nối gốc bị lỗi từ trước, hiển thị trạng thái cũ bị sai lệch.

**Giải pháp & Chi tiết thay đổi**:
- **Backend (`cmsController.ts`)**: Trong API `publishArticle`, trước khi thêm log mới có trạng thái `'pending'`, hệ thống sẽ chạy một câu lệnh `DELETE` để xóa sạch toàn bộ log cũ của bài viết đó đối với platform được chọn (nếu là facebook page, sẽ xóa cả log page cụ thể và log generic `"facebook"` cũ). Điều này giúp dọn dẹp cơ sở dữ liệu và xóa bỏ trạng thái lỗi cũ ngay lập tức khi đăng lại.
- **Frontend (`CmsManagement.tsx`)**: Sửa lại hàm tìm kiếm log và trạng thái targeted trong card bài viết. Thay vì so sánh chính xác tên nền tảng `l.platform === p` (bị lệch giữa generic và page specific), hệ thống sẽ gộp chung các connection và log dạng `"facebook_..."` vào platform chính `"facebook"` để hiển thị chính xác trạng thái hoạt động của Page đó (Pending, Success hay Failed).

## 2026-06-29

### ➕ Thêm API lấy bài viết trong thư viện theo Space ID & Lọc thư viện theo Space ID

**Vấn đề / Nhu cầu**: AI cần lấy các bài viết trong thư viện thuộc Space ID truyền vào (ví dụ cho các ứng dụng bên ngoài như n8n hoặc phục vụ RAG). Đồng thời, khi chọn bài viết từ thư viện để huấn luyện AI trên giao diện quản trị, hệ thống cần tự động lọc để chỉ hiển thị các bài viết thuộc Không gian của AI đó, tránh hiển thị chéo dữ liệu của Không gian khác.

**Giải pháp & Chi tiết thay đổi**:

1. **Backend (`server/routes/v1Routes.ts`)**:
   - Thêm endpoint `GET /api/v1/documents` — yêu cầu xác thực qua token Bearer.
   - Nhận query parameters: `spaceId` (bắt buộc), `page`, `limit`, `title`.
   - Kiểm tra Space ID hợp lệ và tồn tại.
   - Kiểm tra quyền truy cập (RBAC): Chỉ cho phép Global Admin, hoặc Owner của Space, hoặc Thành viên (Member) của Space đó truy vấn.
   - Trả về danh sách bài viết/tài liệu thuộc Space tương ứng dạng phân trang thông qua `documentModel.find`.

2. **Frontend UI (`client/src/components/admin/AiManagement.tsx` & `client/src/components/ConversationSidebar.tsx`)**:
   - Cấu hình `SelectDocumentModal` để nhận thêm prop `spaceId`.
   - Cập nhật hàm gọi API trong modal thành `apiService.getDocuments({ spaceId })` để lọc thư viện ngay từ đầu theo đúng Không gian của AI đang cấu hình.
   - Bổ sung **Block số 5 — Library Documents API** (collapsible/accordion) trong tab ENDPOINT để tài liệu hóa API mới này cho cả tiếng Việt và tiếng Anh.
   - Fix lỗi cảnh báo TypeScript biến unused `isSpaceOwner` trong `ConversationSidebar.tsx`.

**File thay đổi**:
- `server/routes/v1Routes.ts`
- `client/src/components/admin/AiManagement.tsx`
- `client/src/components/ConversationSidebar.tsx`
- `docs/cau_truc.md`
- `docs/nhat_ky.md`

## 2026-06-26

### 🔐 Thêm SSO Login API (`POST /api/v1/login`) cho tích hợp hệ thống ngoài (n8n, v.v.)

**Vấn đề / Nhu cầu**: Ông lão (hệ thống n8n bên ngoài) cần đăng nhập người dùng vào một Space cụ thể bằng email/password để lấy JWT Token, từ đó gọi các API Chat/TTS mà không qua trình duyệt (SSO không dùng cookie session).

**Giải pháp & Chi tiết thay đổi**:

1. **Backend (`server/routes/v1Routes.ts`)**:
   - Thêm endpoint `POST /api/v1/login` — **không cần** header `Authorization` trước khi đăng nhập.
   - Nhận body: `{ email, password, spaceId }`.
   - Logic xác thực 3 bước:
     1. Tìm user theo `email`, kiểm tra `isActive`.
     2. Verify `password` bằng bcrypt (`verifyPassword`).
     3. Kiểm tra `spaceId` — user phải là **Owner** hoặc **Member** của Space đó (dùng `spaceModel.findById` + `spaceMemberModel.isMember`).
   - Tự động tạo `apiToken` (static DB token) nếu user chưa có, với null-guard an toàn.
   - Trả về:
     ```json
     {
       "id": 123, "name": "...", "email": "...",
       "apiToken": "eyJ... (JWT 7 ngày)",
       "refreshToken": "abc... (Static token lâu dài)",
       "space": { "id": 1, "name": "Giác Ngộ", "slug": "giacngo" }
     }
     ```
   - Dùng `apiToken` cho header `Authorization: Bearer` với các API Chat/TTS.
   - Dùng `refreshToken` + `POST /api/auth/refresh` để làm mới JWT khi hết hạn.
   - Fix lỗi TypeScript `ts(18047)`: `user is possibly null` tại Ln 106, Ln 116 — thêm null-guard sau `userModel.regenerateApiToken()`.

2. **Frontend UI (`client/src/components/admin/AiManagement.tsx`)**:
   - Thêm `login: false` vào state `openApis`.
   - Thêm translation keys `loginApiTitle`, `loginApiDesc`, `loginApiNotes` cho cả vi/en.
   - Thêm **Block số 4 — SSO Login API** (collapsible/accordion) trong tab ENDPOINT, hiển thị:
     - URL endpoint với nút Copy.
     - Code mẫu Request (có `spaceId` tự điền từ AI đang chọn).
     - Code mẫu Response (JSON với token + thông tin space).
     - Ghi chú hướng dẫn sử dụng song ngữ.

**File thay đổi**:
- `server/routes/v1Routes.ts`
- `client/src/components/admin/AiManagement.tsx`

## 2026-06-24

### ➕ Thêm API lấy danh sách AI Công khai & Thiết kế giao diện API Collapsible (Accordion)
**Tính năng & Thay đổi đã thực hiện**:
1. **Backend (`v1Routes.ts`)**: Bổ sung endpoint `GET /api/v1/public-ais` (có xác thực qua token Bearer) để truy vấn và trả về danh sách cấu hình của tất cả các AI được check "Công khai AI này" (`is_public = true`). Dữ liệu trả về được lọc (sanitize) loại bỏ các trường nhạy cảm như System Prompt để bảo mật thông tin huấn luyện.
2. **Frontend UI (`AiManagement.tsx`)**:
   - Chuyển đổi giao diện hiển thị danh sách các API Endpoint (trong Tab API Endpoint) từ danh sách tĩnh sang dạng collapsible (accordion) đóng/mở.
   - Thêm component `ChevronDownIcon` làm chỉ báo đóng/mở với hiệu ứng xoay 180 độ.
   - Thêm tài liệu hướng dẫn tích hợp chi tiết (URL Endpoint, Yêu cầu Request, Phản hồi Response mẫu) cho API lấy danh sách AI công khai vừa tạo.

---

## 2026-06-23

### 🐛 Khắc phục lỗi không load được API Keys trong tab Cấu hình mở rộng Không gian
**Vấn đề**: Khi truy cập trang quản trị Không gian (`SpaceManagement.tsx`), tab **Cấu hình mở rộng** (Extended Configuration) luôn hiển thị các trường API Keys (Google AI Studio, OpenAI, Groq Cloud) trống trơn mặc dù dữ liệu đã được lưu thành công trong CSDL.
- *Nguyên nhân*: Các API `getSpace`, `getSpaceById`, `getSpaceBySlug` và `getSpaceByDomain` trong `client/src/services/apiService.ts` gọi hàm `fetch` gốc thay vì `authedFetch`, làm thiếu `Authorization` header. Backend không nhận diện được token người dùng (`req.user = undefined`), xem đây là request công khai chưa đăng nhập và kích hoạt hàm `mapAndSanitizeSpace` để ẩn toàn bộ keys.

**Thay đổi đã thực hiện**:
1. **Frontend (`apiService.ts`)**: Thay đổi cả 4 hàm fetch dữ liệu Không gian sang sử dụng `authedFetch` để tự động truyền kèm token JWT khi người dùng đã đăng nhập.
2. **Backend (`spacesRoutes.ts`)**: Bổ sung middleware `optionalAuth` cho các endpoint lấy chi tiết Không gian để cho phép backend phân giải token, kiểm tra quyền và trả về API Keys đã giải mã nếu là Owner/Admin.

---

### 🎙️ Hỗ trợ API v1 (Chat, TTS) & Xưng hô động theo đối tượng (User Persona)
**Tính năng mới**:
1. **API v1 (`v1Routes.ts`)**: Mở rộng hệ thống API ngoài phục vụ các ứng dụng liên kết (như n8n) với endpoint `/api/v1/chat` và `/api/v1/tts`.
2. **Xưng hô động theo đối tượng (`chatController.ts`, `geminiService.ts`)**:
   - Thêm tham số `userPersona` (chứa các thông tin cá nhân như Tên, Tuổi, Giới tính, Phong cách xưng hô mong muốn) vào luồng chat.
   - Backend phân tích `userPersona` này để tạo prompt chỉ dẫn (system instruction) chi tiết cho Gemini, giúp AI tự điều chỉnh ngôi xưng hô phù hợp (ví dụ xưng "Ta" gọi con, xưng hô tôn kính phù hợp tuổi tác).
3. **Tài liệu API trên UI (`AiManagement.tsx`)**: Bổ sung tab tài liệu mô tả Request/Response và hướng dẫn tích hợp cả API Chat (JSON/SSE stream) lẫn API TTS (Sinh giọng nói AI trả về dữ liệu âm thanh dạng Base64).

## 2026-05-30

### 🐛 Khắc phục lỗi model Gemini bị Deprecated & Cập nhật danh sách Model Hoạt động
**Vấn đề**: Google ngưng hỗ trợ (`deprecated`) model `gemini-2.0-flash` trên diện rộng, khiến các chatbot sử dụng cấu hình cũ này (như bot *Giác Ngộ* và *VietGrow AI*) gặp lỗi quota hoặc dừng phản hồi. Bản thử nghiệm cũ của SDK cũng phát sinh cảnh báo không tương thích.

**Giải pháp & Thay đổi đã thực hiện**:
1. **Database Migration**: Chạy script di chuyển cấu hình các AI trong bảng `ai_configs` từ `gemini-2.0-flash` sang **`gemini-2.5-flash`** (mẫu model thế hệ mới cực nhanh và ổn định).
2. **Backend (`systemController.ts`)**: Cập nhật danh sách model Gemini khả dụng trả về từ API chỉ giữ các model được kiểm thử hoạt động thành công thực tế:
   ```ts
   res.json(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview']);
   ```
3. **Backend Services (`geminiService.ts`)**: Di chuyển toàn bộ các model mặc định và fallback phục vụ cho trích xuất ảnh (OCR), định dạng HTML và tóm tắt văn bản sang **`gemini-2.5-flash`**.
4. **Frontend UI (`AiManagement.tsx`)**: 
   - Đồng bộ danh sách fallback model trong dropdown chỉnh sửa AI khi API lỗi khớp chính xác với backend.
   - Làm rõ cơ chế ẩn hiện nút màu cam báo số lượng **Huấn luyện chưa đồng bộ (Unsynced count)**: Nút này sẽ tự động ẩn đi khi toàn bộ dữ liệu (9 mục gồm 7 files + 2 QA) đã được vector hóa thành công và đồng bộ 100% lên Weaviate (số lượng chưa đồng bộ về 0).

## 2026-05-27

### 🔗 Bổ sung Kết Nối MXH (Nhiều Facebook Pages & Albums tự động qua OAuth & Cấu hình Động) ở CMS: Duyệt & Đăng bài
**Mục tiêu**: Tích hợp khả năng liên kết nhiều Facebook Pages đồng thời và cho phép người duyệt bài chọn đăng trực tiếp hoặc đăng vào Album cụ thể của từng Page tại trang quản trị **CMS: Duyệt & Đăng bài (`cms_approve`)**.

**Giải pháp & Thiết kế**:
1. **Thiết kế không thay đổi SQL Schema**: Tận dụng hoàn toàn cột `platform` và `fb_album_id` hiện tại. Mỗi Facebook Page được lưu dưới tên platform `facebook_<pageId>` (ví dụ: `facebook_1029384756`) để vượt qua ràng buộc unique constraint của bảng `cms_social_connections` mà không thay đổi database.
2. **Luồng Facebook OAuth & Callback Tự động**:
   - Khi thêm Facebook Page trong tab Kết Nối MXH, hệ thống sử dụng chính xác callback URL OAuth hiện có để lấy token tự động.
   - Khi đăng nhập thành công và trả về `oauth=success`, frontend tự động mở popup **"Chọn Facebook Page"** (không bắt buộc nhập tay ID hay Token).
   - Nếu tài khoản Facebook cá nhân gốc đã kết nối trước đó, hệ thống cho phép chọn ngay Page từ tài khoản hiện tại mà không cần đăng nhập lại.
3. **Đăng bài & Chọn Album linh hoạt**:
   - Giao diện Editor của bài viết cho phép tích chọn đồng thời nhiều Facebook Page đã liên kết.
   - Với mỗi Facebook Page được tích chọn, người dùng có thể chọn **Đăng trực tiếp** hoặc **Đăng vào Album** (tự động hiển thị hiệu ứng Loading và tải động danh sách album từ Facebook Graph API thời gian thực thông qua backend).
   - Áp dụng cơ chế **State caching động** cho danh sách album của từng Page để tối ưu hóa hiệu năng, giảm thiểu request lặp.
   - Cấu hình album được lưu trữ dưới dạng một chuỗi JSON map (ví dụ: `{"facebook_111": "album_abc", "facebook_222": "direct"}`) trong cột `fb_album_id` của bảng `cms_articles`.
   - Backend phân rã chuỗi JSON này để gửi đúng cấu hình platform riêng biệt sang n8n.

**Chi tiết các file thay đổi**:
* **Backend (`server/controllers/cmsController.ts`)**:
  - `updateFacebookConnection`: Hỗ trợ lưu cấu hình Page Access Token dưới tên platform động `facebook_<pageId>`.
  - `getFbAlbums`: Nhận query `?pageId=xxx` để gọi API Facebook lấy album của Page cụ thể bằng token tương ứng.
  - `publishArticle`: Phân tách chuỗi JSON `fb_album_id` để đính kèm Album ID riêng biệt cho từng Page trước khi gửi sang webhook n8n.
  - `oauthCallback`: Điều hướng đúng về đường dẫn `/admin/cms_approve` để tránh treo trang.
* **Frontend Service (`client/src/services/apiService.ts`)**:
  - Cập nhật hàm `getCmsFbAlbums` để truyền `pageId` tùy chọn làm query parameter.
* **Frontend UI (`client/src/components/admin/CmsManagement.tsx`)**:
  - **Tab Kết Nối MXH**: Hiển thị danh sách kết nối động cùng nút **Cấu hình** (để chỉnh sửa tên/token nhanh) và nút **Ngắt kết nối** riêng biệt cho từng Page.
  - **Card dấu "+" lớn**: Thiết kế Card dấu cộng **"Thêm Kết Nối Mới"** mở ra Modal cho phép chọn loại mạng xã hội (Facebook, Instagram, Threads, LinkedIn).
  - Tự động hóa OAuth và hiển thị popup chọn Page khi nhận được callback đăng nhập thành công.

## 2026-05-22

### 🐛 Khắc phục lỗ hổng Global Admin nghiêm trọng trên toàn bộ Backend
**Vấn đề**: Việc sử dụng `permissions.includes('roles')` làm thước đo cho quyền Super/Global Admin được rải rác ở 11 Controllers khác nhau (bao gồm `authMiddleware.ts`, `notificationController.ts`, `cmsController.ts`, v.v.). Điều này là một lỗ hổng nghiêm trọng vì Space Owners tự động có quyền `roles`, khiến hệ thống lầm tưởng họ là Global Admin và cho phép họ bypass các check bảo mật (VD: `canAccessSpace` cho phép truy cập data của mọi space). Lỗi này cũng làm API `members-list` hiểu nhầm và chạy sai nhánh logic dẫn đến trả về mảng rỗng khi Space Owner mở modal chọn thành viên gửi email.
**Giải pháp**:
- Thay thế toàn bộ `permissions.includes('roles')` bằng cờ `!!user?.isGlobalAdmin` ở tất cả 11 file.
- Sửa hàm `isAdmin()` trong `authMiddleware.ts` chỉ còn `!!user?.isGlobalAdmin`.
- Sửa API `members-list` trong `notificationController.ts` kết hợp `UNION SELECT user_id FROM spaces WHERE id = $1` để trả về cả Space Owner trong danh sách thành viên được chọn.

### 🐛 Fix: Space Admin thấy Dashboard toàn hệ thống (Global Admin Bug)

**Vấn đề**: Các Space Admin hoặc Owner (như `info@thile.ai`) khi vào Dashboard lại thấy toàn bộ số lượng User, Space, AI của cả hệ thống thay vì của riêng không gian họ. 
**Nguyên nhân**: Hàm `isAdmin()` trong `authMiddleware` check theo `permissions.includes('roles')`. Các Space Owner cũng được cấp quyền `roles` để quản lý phân quyền trong không gian của họ. Việc "flatten" (gộp chung) tất cả các quyền lại trong biến `req.user.permissions` đã làm backend hiểu nhầm họ là SuperAdmin ở `systemController.ts`.
**Giải pháp**: 
- Sửa lại file `systemController.ts`: Quản trị viên toàn hệ thống phải có cờ `req.user.isGlobalAdmin === true` HOẶC có quyền `roles` nhưng KHÔNG quản lý bất kỳ space nào.
- Cập nhật tài liệu `rbac_multi_tenant.md` để nhấn mạnh tuyệt đối không dùng `permissions.includes('roles')` độc lập để check Global Admin.

### 🎨 UI: Ẩn/Hiện Nút Cộng Đồng

**Thay đổi**:
- Gỡ bỏ hoàn toàn nút "Cộng Đồng" (màu xanh lá) ở cột menu trái (`ConversationSidebar.tsx`).
- Nút "Cộng Đồng" màu đỏ ở góc trên cùng bên phải màn hình (`PracticeSpaceHeader.tsx`) giờ đây là công cụ duy nhất. Nút này được liên kết trực tiếp với cờ `hasCommunity` trong cài đặt Space (SpaceManagement). Khi admin tắt "Cộng đồng", nút đỏ sẽ tự động bị ẩn đi.

### 🔐 Bảo mật: Chặn Login xuyên Space (Cross-Space Login Prevention)

**Vấn đề**: User của space `thile` (`info@thile.ai`) có thể login được ở `/stillenvc/login` và truy cập admin panel của space `stillenvc`. Nguyên nhân do code login tại `authController.ts` có logic **auto-join**: khi user login ở một space mà chưa phải member → hệ thống tự động `spaceMemberModel.add()` thêm user vào space đó.

**Giải pháp**:
- Xóa bỏ hoàn toàn logic auto-add member khi login.
- Thay bằng kiểm tra nghiêm ngặt: nếu user không phải Owner hoặc Member → trả 403 "Chưa đăng ký tại không gian này".
- Quy tắc: **Login chỉ check membership**, **Register mới được add member**.

**Cleanup**: Xóa 2 entries `space_members` bị add sai:
- `info@thile.ai` khỏi space `stillenvc`
- `stillenvc@gmail.com` khỏi space `thile`

**File**: `server/controllers/authController.ts`

### 🐛 Fix: Custom Page iframe load toàn bộ React app bên trong

**Vấn đề**: URL trình duyệt luôn kẹt ở `/thile`, không bao giờ có `/admin`. Admin panel hiển thị data sai space. Nguyên nhân: custom page của `thile` chứa `window.location.replace("/thile/chat")` → `SpaceCustomPageResolver` render trong iframe → iframe tự load toàn bộ React app bên trong → mọi navigation diễn ra trong iframe → URL cha không thay đổi.

**Giải pháp**:
1. Detect redirect-only pages → dùng React `<Navigate>` thay vì iframe.
2. Inject script override `window.location.replace()` để luôn target `window.top` cho các custom page có nội dung thực.
3. Hướng dẫn sửa custom page: dùng `window.top.location.replace()`.

**File**: `client/src/components/SpaceCustomPageResolver.tsx`

### 🔧 Fix: Express Rate Limit `ERR_ERL_PERMISSIVE_TRUST_PROXY`

**Vấn đề**: `express-rate-limit` cảnh báo `trust proxy = true` không an toàn.
**Giải pháp**: Đổi `app.set('trust proxy', true)` → `app.set('trust proxy', 1)` (tin 1 tầng proxy).

**File**: `server/index.ts`

### 🐛 Fix: TypeScript errors trong FilesAndDocuments

**Vấn đề**: 2 lỗi TS — `handleFilterChange` được gọi với 2 args thay vì 1 event, và `t.all` không tồn tại trong translations.
**Giải pháp**: Thêm `name="spaceId"` vào select để dùng cùng pattern event handler, đổi `t.all` → `t.filterAll`.

**File**: `client/src/components/admin/FilesAndDocuments.tsx`

---

### Cấu trúc lại luồng Đăng nhập Google OAuth cho Multi-Tenant (State Relay)
- **Vấn đề**: Khi người dùng đăng nhập bằng Google trên một Custom Domain (vd: `agent.thile.ai`), sau khi Google xác thực xong luôn bị đẩy về tên miền gốc (`giac.ngo`) do Google chỉ cho phép cấu hình một Callback URL duy nhất. Trình duyệt bị mất dấu trang xuất phát do `sessionStorage` không liên thông giữa các tên miền (Cross-domain).
- **Giải pháp (OAuth State Relay)**: 
  - Tại `LoginPage.tsx` và `RegisterPage.tsx`, đính kèm tên miền gốc qua query `?returnTo=${window.location.origin}` vào link gọi Google Login.
  - Tại `authRoutes.ts`, hứng tham số `returnTo` và chèn vào tham số `state` chuẩn của Google OAuth.
  - Tại `authController.ts` (Callback), bóc tách tên miền từ tham số `state` do Google trả về, và thiết lập lệnh `res.redirect` điều hướng user (cùng với token) thẳng về lại tên miền Custom Domain ban đầu, giải quyết triệt để lỗi "đăng nhập xong bị văng về trang chủ gốc".

### Khắc phục quyền đăng ký mới và bảo mật Route Quản trị (Admin)
- **Đăng ký User Mới (`authController.ts`)**: Sửa lỗi gán quyền mặc định cho user mới khi đăng ký (Email và Google). Thay vì dùng `SELECT id FROM roles WHERE name = 'User'`, hiện tại user mới sẽ có `roleIds: []` (chưa có quyền nào) để đúng chuẩn thiết kế bảo mật ban đầu.
- **Ẩn nút Quản trị (`ConversationSidebar.tsx`)**: Đã bổ sung logic kiểm tra nghiêm ngặt: Nút Quản trị chỉ hiển thị khi user có ít nhất một Role (Kiểm tra mảng Role Động: `user.roleIds.length > 0`) HOẶC user chính là chủ sở hữu Không gian (`currentSpace.userId === user.id`).
- **Chặn truy cập trái phép (`AdminPage.tsx`)**: Khắc phục lỗ hổng bảo mật nghiêm trọng trên giao diện. Trước đây, mọi user (kể cả role null) đều có thể truy cập `/:slug/admin` và nhìn thấy Dashboard vì vòng lặp `useEffect` gặp lỗi logic. Hiện tại, hệ thống kiểm tra logic Dynamic Role: nếu mảng `user.roleIds` trống và người đó không phải là Owner, ứng dụng sẽ ép buộc `navigate(-1)` (quay lại trang trước đó) ngay lập tức.
 - Giác Ngộ VN

## 2026-05-18

### 🧹 Loại bỏ hoàn toàn Personal API Keys (`user.apiKeys`)

**Vấn đề**: Hệ thống trước đây có cơ chế Fallback (Space -> Owner -> System) khiến cho mã nguồn phức tạp và phụ thuộc nhiều vào Key cá nhân (`user.apiKeys`) của người tạo AI (Owner). Điều này gây rắc rối khi phân quyền hoặc khi muốn bắt buộc mọi AI sử dụng Key cấp Không gian (Space).

**Giải pháp & Chi tiết thay đổi**:
1. **Database**: Xóa hoàn toàn cột `api_keys` khỏi bảng `users`.
2. **Backend**:
   - Xóa `apiKeys` khỏi interface `User`.
   - Dọn dẹp logic mã hóa/giải mã và cho phép update `apiKeys` trong `user.model.ts`.
   - Xóa bỏ cơ chế Fallback lấy `owner.apiKeys` trong `getApiKeyForAi.ts`. Hệ thống chỉ còn fallback: `Space Key` -> `System Key` -> `Env Variables`.
   - Xóa bỏ mọi tham chiếu `user?.apiKeys` (ví dụ fallback Google TTS/Translate/Models) trong `systemController.ts` và `aiConfigController.ts`.
3. **Frontend**:
   - Xóa `apiKeys` khỏi interface `User` trong `types.ts`.
   - Gỡ bỏ hoàn toàn việc fallback `(user?.apiKeys as any)` khi cấu hình giọng nói và text-to-speech trong `PracticeSpacePage.tsx` và `VoiceChat.tsx`.

### 🐛 Khắc phục lỗi Đăng ký và Google OAuth Callback (Multi-Tenant)

**Vấn đề**:
1. **Lỗi 404 Google OAuth**: Do khai báo route sai lệch (`/auth/google`) trong khi `authRoutes` đã được mount vào `/api/auth` ở `index.ts`, dẫn đến endpoint thực tế biến thành `/api/auth/auth/google`.
2. **Lỗi Đăng ký / Google Callback dội lỗi CSDL (Foreign Key Constraint)**: Mã nguồn cũ gán cứng quyền `roleIds: [3]` cho mọi tài khoản mới tạo. Trong kiến trúc Multi-Tenant mới, `id = 3` có thể không tồn tại hoặc thuộc về một Space cụ thể nào đó, gây vi phạm ràng buộc khóa ngoại khi INSERT vào bảng `user_roles`.

**Giải pháp & Chi tiết thay đổi**:
1. **Sửa Route (`authRoutes.ts`)**: Sửa `/auth/google` thành `/google` và `/auth/google/callback` thành `/google/callback`.
2. **Sửa Logic cấp quyền mặc định (`authController.ts`)**: 
   - Thay vì hardcode `[3]` gây lỗi Foreign Key, hệ thống gán mảng rỗng `roleIds: []`.
   - Tính năng này được áp dụng cho cả luồng Đăng ký Email thường và Đăng ký qua Google. Mọi user mới đều không có quyền quản trị cho đến khi được duyệt.
   

### 🔐 Phân quyền: Cấp quyền Quản lý AI cho Thành viên (Space Members)

**Vấn đề**: Thành viên trong Space được phân quyền "Quản lý AI" (có quyền `ai` trong role) nhưng không thể thấy hoặc chỉnh sửa AI của Space đó. Nguyên nhân là các Controller và Model trên Backend, cũng như Frontend, đang kiểm tra quyền quản lý bằng cách xem người dùng có phải là **Owner** của Space hay không (`user_id` trong bảng `spaces`), bỏ qua các thành viên được cấp quyền.

**Giải pháp & Chi tiết thay đổi**:
1. **Model (`aiConfig.model.ts`)**: Cập nhật hàm `findManageableForUser`. Thay vì chỉ query `spaces WHERE user_id = $1`, đã sử dụng `UNION` để gộp chung các Không gian mà user làm Owner (`spaces`) VÀ làm Member (`space_members`).
2. **Controller (`aiConfigController.ts`)**: Xóa các dòng query cứng `SELECT user_id FROM spaces WHERE id = $1`. Sử dụng hàm `getUserManagedSpaceIds(req.user.id)` kết hợp với việc kiểm tra quyền `ai` (`req.user.permissions.includes('ai')`) để cấp phép các hành động Create, Update, Delete AI cho cả Space Manager.
3. **Frontend (`AiManagement.tsx`)**: Chỉnh sửa biến `manageableSpaces` (danh sách không gian trong giao diện chọn khi tạo/sửa AI). Đảm bảo rằng nếu người dùng không phải Owner nhưng đang đứng ở `contextSpace` và có quyền `ai`, hệ thống sẽ tự động đưa `contextSpace` vào danh sách cho phép quản lý.

**Commit**: `[Manual Update]` — `fix: allow space members with ai permission to manage ai configs`

### 🐛 Khắc phục lỗi cảnh báo thiếu API Key ảo trên Frontend (Space Members)

**Vấn đề**: Sau khi xử lý cấp quyền thành công cho Space Member quản lý AI, giao diện vẫn hiện thông báo màu vàng "Vui lòng thêm API key cho GEMINI trong Cài đặt" chặn người dùng thao tác. Mặc dù backend đã cấu hình lấy key thông minh qua 3 cấp độ (Space -> Owner -> System) và tính năng Trải nghiệm (Chat) vẫn hoạt động bình thường, Frontend lại hardcode điều kiện kiểm tra chỉ phụ thuộc vào `user.apiKeys` (Key cá nhân của người đang đăng nhập).

**Giải pháp & Chi tiết thay đổi**:
1. **Frontend (`AiManagement.tsx`)**: 
   - Xóa bỏ logic kiểm tra `isApiKeyMissing` chặn vô cớ các quyền chỉnh sửa AI (`isFormDisabled`).
   - Xóa bỏ overlay màu vàng cảnh báo thiếu API Key bị hardcode bằng biểu thức `!user.apiKeys?.[selectedAi.modelType]`.
   - Gỡ bỏ giới hạn vô lý chặn việc hiển thị danh sách Model (trong `useEffect` dòng 1043) nếu User cá nhân không có API Key, giúp Dropdown chọn Model hoạt động bình thường.
   - Phân cấp việc báo lỗi thiếu API Key hoàn toàn cho Backend (khi gọi request chat stream/tạo bot) thay vì giả định sai trên Frontend (vì frontend không thể thấy được System Key hay Owner Key của tài khoản khác).

**Commit**: `[Manual Update]` — `fix: remove flawed frontend api key warning overlay for space members`

---

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
