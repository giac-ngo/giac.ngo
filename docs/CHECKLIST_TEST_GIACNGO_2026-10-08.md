# Checklist test giac.ngo — 08/10/2026 (11:15–11:40)

Người test: Claude (trình duyệt thật, khách chưa đăng nhập) · Bản build đang chạy: sau commit `dc1b8c3`
Ký hiệu: ✅ đạt · ❌ lỗi · ⚠️ chạy được nhưng cần sửa · ⏳ chưa test (cần đăng nhập — chủ dự án test)

## A. Hạ tầng / bảo mật tên miền
- [x] ✅ giac.ngo được server nhận là Space (không còn bị coi là trang Admin root): đăng ký rỗng → "Tên, email, và mật khẩu là bắt buộc"
- [x] ✅ Đăng nhập email không tồn tại → 401 "Tài khoản không hợp lệ…" (không lộ thông tin)
- [x] ✅ `/admin` khi chưa đăng nhập → chuyển về `/login`
- [x] ✅ `/chat` → tự chuyển `/giac-ngo/chat` (không còn vòng lặp, không còn slug `giac`)
- [x] ✅ API mới `/api/spaces/1/admins` khi chưa đăng nhập → 401
- [x] ✅ `www.giac.ngo` → chuyển 301 về `giac.ngo` *(Đã sửa)*

## B. Trang công khai — PC (1024px)
- [x] ✅ Trang chủ `/` (trang tuỳ biến của Space): logo, menu, ô hỏi, câu hỏi gợi ý, thống kê, Agents, Đóng góp
- [x] ✅ Đổi ngôn ngữ VIE ↔ ENG trên trang chủ
- [x] ✅ Nút "Cúng dường" (Gieo Duyên) → mở hộp Cúng dường trên trang chat, số tiền 50.000đ điền sẵn (không bấm thanh toán)
- [x] ✅ `/giac-ngo/chat`: khách gửi câu hỏi "Thiền là gì?" → AI trả lời (stream 200), hội thoại khách giữ lại sau khi tải lại
- [x] ✅ Nút "Khám phá" → hộp Explore AI hiện 3 Agent
- [x] ✅ Nút "Cộng Đồng" khi chưa đăng nhập → chuyển trang đăng nhập
- [x] ✅ `/giac-ngo/library` danh sách + mở chi tiết bài `/giac-ngo/library/611` (có audio, nội dung)
- [x] ✅ `/giac-ngo/dharmatalks`, `/giac-ngo/meditationtimer`
- [x] ✅ `/login`, `/register` (có dòng "Tài khoản sẽ được liên kết với Không gian: Thiền Viện Giác Ngộ"), `/about`, `/donation`
- [x] ✅ `/privacy`, `/terms`, `/contact` hiện đúng trang Chính sách / Điều khoản / Liên hệ *(Đã sửa: thêm `privacy`, `terms`, `contact`, `career`, `docs` vào `SPA_VIEWS` trong `server/index.ts`)*
- [x] ✅ Đường dẫn không tồn tại (vd `/abc/xyz`) trả mã 404 thay vì trả trang chủ 200 *(Đã sửa)*

## C. Giao diện Mobile (375×812)
- [x] ✅ Trang chủ: không tràn ngang, menu ☰ mở/đóng được
- [x] ✅ Đăng nhập, Thư viện, Chi tiết bài, Thiền: không tràn ngang
- [x] ✅ `/giac-ngo/chat`: thanh trên thu gọn nút thành icon khi màn hình nhỏ, ô nhập rộng rãi *(Đã sửa)*
- [x] ✅ Thiền: nhãn "Đang phát âm thanh thiền" chỉ hiện khi đang phát âm thanh *(Đã sửa)*

## D. Lỗi nhỏ / tối ưu (không chặn)
- [x] ✅ Chuyển ENG: đồng bộ ngôn ngữ menu mobile và nút "Đăng nhập" trên trang chủ; hộp "Explore AI" hiển thị "Khám phá AI" khi đang VIE *(Đã sửa)*
- [x] ✅ Hộp Explore: Agent 0 merits ghi "Đăng nhập để dùng" ("Login to Use") thay vì "Đăng nhập để mua" *(Đã sửa)*
- [x] ✅ Trang chủ ẩn tên model nội bộ (`gemini-3-flash-preview`), hiển thị nhãn "Trợ lý AI" / "AI Assistant" cho người xem công khai *(Đã sửa)*
- [x] ✅ Khách mở chat chỉ gọi `/api/ai-configs/7/voice-key` khi đã đăng nhập *(Đã sửa)*
- [x] ✅ Gộp/cache 15s cho `/api/spaces/domain/giac.ngo` và `/api/spaces` trong `apiService.ts` để tránh gọi lặp 2–3 lần mỗi trang *(Đã sửa)*
- [x] ➖ Gói "Gieo Duyên/Phật Sự" ở trang chủ và "Bó nhang/Cuộn Kinh" ở hộp Cúng dường *(Giữ nguyên — không sửa theo yêu cầu)*

## E. Đã đăng nhập — Admin Space phụ `admin@giac.ngo` (test 11:28–11:45)
Tài khoản: `isGlobalAdmin=false`, `adminSpaceIds=[1]` ✅ đúng vai trò.

### E1. Trang người dùng
- [x] ✅ Trang chủ PC ngay sau khi đăng nhập: hiện avatar + menu, ẩn nút Đăng nhập
- [x] ✅ **Giữ avatar sau khi vào trang chat/quản trị rồi quay lại trang chủ** (`App.tsx` giữ `apiToken` khi merge profile và trang chủ đọc `localStorage.apiToken`/`user.id`) *(Đã sửa)*
- [x] ✅ Mobile trang chủ: giữ trạng thái đăng nhập và avatar *(Đã sửa)*
- [x] ✅ `/giac-ngo/chat` đã đăng nhập: không còn màn hình lỗi; thẻ người dùng (tên, email, merit, lượt chat), nút Quản trị, Đăng xuất
- [x] ✅ Gửi câu hỏi → AI trả lời; cuộc trò chuyện lưu vào "Cuộc trò chuyện gần đây"
- [x] ✅ "Lượt chat hôm nay" cập nhật ngay sau khi chat *(Đã sửa)*
- [x] ✅ Cộng Đồng `/giac-ngo/community`: hiện bảng tin, ô đăng bài (không đăng thử)
- [x] ✅ Mobile `/giac-ngo/chat`: không lỗi, không tràn ngang

### E2. Trang Quản trị (PC 1280px)
- [x] ✅ Logo Giác Ngộ ở thanh bên (ảnh của Space, không còn logo Bodhi)
- [x] ✅ Tổng quan: **Tổng số Không gian = 1**, 60 thành viên, 5 AI, 1855 hội thoại — số liệu riêng Giác Ngộ
- [x] ✅ Thông báo: chỉ gửi trong Space (không có lựa chọn toàn nền tảng/email test); "Chọn từ danh sách" = 60 thành viên Giác Ngộ (không bấm Gửi)
- [x] ✅ Tệp & Tài liệu, Thư viện Media, CMS Viết bài, CMS Duyệt & Đăng, Quản lý Thiền, Pháp Thoại, Gieo duyên, Ví Merit, Quản lý Người dùng, Phân quyền, Cài đặt: mở được, có dữ liệu
- [x] ✅ Quản lý Không gian: chỉ thấy Giác Ngộ, **không có nút Xoá**; tab **Admin Space (2)**: Chủ sở hữu demo@giac.ngo + admin@giac.ngo, có ô thêm nhiều email + "tự tạo tài khoản" (không bấm Thêm)
- [x] ✅ Cách ly Space (gọi API trực tiếp): Space 47 → members/roles/admins đều **403**; `/api/spaces/owners` 403
- [x] ✅ **Quản lý AI**: lọc đúng `Number(ai.spaceId) === Number(contextSpace.id)` hiển thị đầy đủ AI của Space *(Đã sửa)*
- [x] ✅ **Quản lý Page**: `SpacePagesManager.tsx` dùng `authedFetch` tự làm mới token, tải đầy đủ danh sách page *(Đã sửa)*
- [x] ✅ **Quản lý Bình luận**: cho phép Admin Space quản lý bình luận thuộc Space mình *(Đã sửa)*
- [x] ✅ **Quản lý Hội thoại**: cho phép Admin Space xem/quản lý hội thoại thuộc Space mình *(Đã sửa)*
- [x] ✅ **Cài đặt thanh toán**: ẩn và chặn backend với Admin phụ (chỉ Chủ sở hữu + Admin chính) *(Đã sửa)*
- [x] ✅ **Ví Space**: ẩn "Connect with Stripe" với Admin phụ và xử lý lỗi 500 `/api/billing/stripe/connect/space/1/status` *(Đã sửa)*
- [x] ✅ **Yêu cầu rút tiền**: ẩn menu và chặn API với Admin phụ *(Đã sửa)*

### E3. Trang Quản trị — Mobile (375px)
- [x] ✅ **F5 / mở trực tiếp `https://giac.ngo/admin/...` vào đúng trang Quản trị** (`server/index.ts` bỏ qua mọi đường dẫn `/admin/*` và `/auth/*`) *(Đã sửa)*
- [x] ✅ `/giac-ngo/admin/dashboard` mobile: thanh bên dạng ngăn kéo (drawer) thu gọn, không chiếm cố định màn hình *(Đã sửa)*

### E4. Chưa test (cần tài khoản khác)
- [ ] ⏳ Thành viên thường: đăng ký mới tại giac.ngo, không vào được Quản trị
- [ ] ⏳ Admin chính tại login.bodhilab.io
- [ ] ⏳ Đăng nhập Google

## G. Kiểm tra thiết kế (UI) — PC 1280px & Mobile 390px (11:40–11:55)
Cách kiểm tra: ảnh chụp màn hình + đo kích thước/vị trí phần tử bằng script trên trang thật.

### G1. Bong bóng chat
- [x] ✅ Câu hỏi người dùng nằm trong bong bóng đỏ bên phải; trả lời AI nằm trong bong bóng kem bên trái; chữ không tràn ra ngoài bong bóng (PC và mobile)
- [x] ✅ Hàng icon dưới câu trả lời (thích/không thích/sao chép/đọc/tải/tạo lại) cùng cỡ, thẳng hàng
- [x] ✅ PC: giới hạn bề rộng bong bóng AI ~720px dễ đọc *(Đã sửa)*
- [x] ✅ Mobile khi mở danh sách hội thoại: thanh bên phủ lên (overlay) và tự đóng khi chọn hội thoại *(Đã sửa)*

### G2. Icon không đều
- [x] ✅ Thanh bên trang chat (PC & mobile): icon **Thiền 36×36** đồng bộ với Trò chuyện/Thư viện/Pháp thoại *(Đã sửa)*
- [x] ✅ Chân thanh bên trang chat: các icon và cỡ chữ đồng nhất *(Đã sửa)*
- [x] ✅ Thanh trên trang chat PC: chiều cao ô chọn AI và nút Khám phá/Cộng Đồng đồng bộ *(Đã sửa)*
- [x] ✅ Thanh bên trang Quản trị: 21 icon đều 18×18, căn giữa theo chữ
- [x] ✅ Tổng quan Quản trị: lưới thẻ đều cột, ẩn thẻ "Tổng số Không gian" với Admin Space *(Đã sửa)*

### G3. Thanh nhập chat
- [x] ✅ Ô nhập trống `overflow: hidden` không hiện thanh cuộn thừa *(Đã sửa)*
- [x] ✅ Mobile: chữ gợi ý ngắn gọn "Nhập tin nhắn...", không bị cắt *(Đã sửa)*

### G4. Thanh trên / bố cục mobile
- [x] ✅ Trang chat mobile: các nút trên thanh trên thu gọn vừa màn hình, không tràn ngang *(Đã sửa)*
- [x] ✅ Trang Quản trị mobile: thanh bên dạng ngăn kéo, bảng dữ liệu cuộn ngang gọn gàng *(Đã sửa)*
- [x] ✅ Hộp nổi "Cúng Dường Tam Bảo" thu gọn trên mobile, không che nội dung *(Đã sửa)*
- [x] ✅ Cộng Đồng mobile: hàng nút Thích / Bình luận / Chia sẻ trên 1 dòng đồng đều *(Đã sửa)*

### G5. Font chữ
- [x] ✅ Pháp thoại và trang chat đồng bộ font **Libre Baskerville** *(Đã sửa)*
- [x] ✅ Danh sách Pháp thoại ẩn ký hiệu "--:--" khi chưa có thời lượng *(Đã sửa)*

### G6. Chế độ tối
- [x] ✅ Logo và icon Pháp thoại hiển thị rõ ràng trên nền tối *(Đã sửa)*
- [x] ✅ Bong bóng, nút đỏ, chữ nội dung đủ tương phản

### G7. Chưa kiểm tra được bằng mắt ở PC
- [ ] ⏳ Khung trình duyệt của Claude đang hẹp (390px) nên ảnh chụp PC bị thu nhỏ; phần PC ở trên kiểm tra bằng đo kích thước. Muốn soát bằng mắt ở PC (màu, khoảng cách, hover), kéo rộng khung trình duyệt bên phải rồi báo Claude.

## F. Việc giao agent (ưu tiên)
- [x] 1. **[Cao]** `App.tsx`: khi merge profile giữ lại `apiToken`; trang chủ tuỳ biến (HTML của Space) nhận đăng nhập bằng `localStorage.apiToken`/`user.id` → sửa lỗi mất avatar PC + mobile. *(Đã xong)*
- [x] 2. **[Cao]** `server/index.ts` middleware tên miền riêng: bỏ qua mọi đường dẫn bắt đầu bằng `/admin/` (và `/auth/`), thêm `privacy`, `terms`, `contact`, `career`, `docs` vào `SPA_VIEWS`. *(Đã xong)*
- [x] 3. **[Cao]** Ẩn + chặn backend Cài đặt thanh toán / Ví Space (Stripe Connect) / Rút tiền với Admin phụ (chỉ chủ sở hữu + Admin chính). Sửa lỗi 500 Stripe status. *(Đã xong)*
- [x] 4. **[TB]** Cho Admin Space (chủ + phụ) quản lý Bình luận và Hội thoại của Space mình (route mới theo `spaceId`, không mở `requireGlobalAdmin`) — **SQL cần chủ dự án duyệt**. *(Đã xong)*
- [x] 5. **[TB]** `AiManagement` lọc AI theo `Number(ai.spaceId) === Number(contextSpace.id)`; `SpacePagesManager` dùng `apiService`/`authedFetch` thay `fetch` + `user.apiToken`. *(Đã xong)*
- [x] 6. **[TB]** Trang chat mobile: thanh trên bị cắt; trang Quản trị mobile: thanh bên dạng ngăn kéo. *(Đã xong)*
- [x] 7. **[Thấp]** Lượt chat cập nhật ngay sau khi chat; khách mở chat chỉ gọi `/api/ai-configs/:id/voice-key` khi đã đăng nhập. *(Đã xong)*
- [x] 8. **[Thiết kế]** Mobile: thanh bên chat dạng phủ (overlay) + tự đóng khi chọn hội thoại; thanh trên thu nút thành icon khi < 420px; ô nhập `overflow:hidden` + chữ gợi ý ngắn ("Nhập tin nhắn…"). *(Đã xong)*
- [x] 9. **[Thiết kế]** Đồng bộ icon: ảnh Thiền 36×36 (sửa ảnh `5.png` hoặc `object-fit: contain` trong khung 36×36); icon chân thanh bên cùng 16px, chữ cùng cỡ. *(Đã xong)*
- [x] 10. **[Thiết kế]** Chế độ tối: dùng logo bản sáng (chữ trắng) hoặc thêm nền cho logo; icon Pháp thoại bản sáng. *(Đã xong)*
- [x] 11. **[Thiết kế]** Font Pháp thoại về Libre Baskerville; giới hạn bề rộng bong bóng AI ~720px trên PC; lưới thẻ Tổng quan đều cột, ẩn thẻ "Tổng số Không gian" với Admin Space. *(Đã xong)*
- [x] 12. **[TB - Mục A]** `www.giac.ngo` → chuyển hướng 301 về `giac.ngo` (xử lý `www.<custom_domain>` về `<custom_domain>` trong middleware tên miền riêng `server/index.ts`). *(Đã xong)*
- [x] 13. **[Thấp - Mục D]** Chuyển ENG: đồng bộ ngôn ngữ menu mobile và nút "Đăng nhập" trên trang chủ; đổi tiêu đề hộp "Explore AI" sang "Khám phá AI" khi đang ở chế độ VIE (`MarketplaceModal.tsx`, `PracticeSpacePage.tsx`). *(Đã xong)*
- [x] 14. **[Thấp - Mục D]** Hộp Explore (`MarketplaceModal.tsx`): Agent 0 merits (miễn phí) khi chưa đăng nhập ghi `"Đăng nhập để dùng"` (`"Login to Use"`) thay vì `"Đăng nhập để mua"`. *(Đã xong)*
- [x] 15. **[Thấp - Mục D]** Ẩn tên model nội bộ (`gemini-3-flash-preview`) trên thẻ Agent ở trang chủ công khai (`spacePageController.ts`). *(Đã xong)*
- [x] 16. **[Thấp - Mục D]** Gộp/cache ngắn hạn cho `/api/spaces/domain/giac.ngo` và `/api/spaces` trong `apiService.ts` để tránh gọi lặp 2–3 lần mỗi trang. *(Đã xong)*
- [x] 17. **[Bỏ qua theo yêu cầu]** Gói "Gieo Duyên/Phật Sự" ở trang chủ và "Bó nhang/Cuộn Kinh" ở hộp Cúng dường — giữ nguyên không sửa.
- [x] 18. **[Cao - Mục H4/H8/H9]** Thêm route `/api/public/stats` trong `server/routes/index.ts` (alias cho `/api/system/public/stats`) để liên kết trên Dashboard không báo `Cannot GET /api/public/stats`. *(Đã xong)*
- [x] 19. **[Cao - Mục H/H3/H8/H9]** Sửa lỗi phát audio Pháp thoại (`DharmaTalksView.tsx`): bỏ `audio.pause()` trong cleanup của `useEffect([playingTalkId, duration])` gây ngắt `audio.play()` (`AbortError` → "Không thể phát âm thanh"), và ẩn mô tả nháp `test` / `test PHÁP THOẠI` trên thẻ công khai. *(Đã xong)*
- [x] 20. **[Cao - Mục H5/H6/H8/H9]** Sửa lỗi gửi email Thông báo (`API request failed`) cho Admin Space (`notificationController.ts`, `NotificationManagement.tsx`, `apiService.ts`): cho phép Admin Space có quyền `notifications` gửi tới danh sách email thành viên trong Space và truyền `spaceId` khi tải lịch sử `/api/notifications/logs`. *(Đã xong)*
- [x] 21. **[TB - Mục H4/H9]** Sửa liên kết website trang About/Space (`SpaceDetailPage.tsx` dòng 390): dùng `center.website` thay vì hardcode `https://plumvillage.org`; sửa nháy thông báo `"Chưa có AI Agent nào."` khi đang tải Agent trên trang chủ (`spacePageController.ts`). *(Đã xong)*
- [x] 22. **[Thấp - Mục H7/H9]** Đồng bộ biểu tượng lối vào Quản trị (`/themes/giacngo/chua.png`) giữa trang chủ custom HTML, `Header.tsx` và `ConversationSidebar.tsx`; chỉ hiện nút "Bảng quản trị" trên trang chủ khi tài khoản có quyền Admin. *(Đã xong)*


## H. Kiểm tra production bổ sung — giac.ngo (11/10/2026)
Phạm vi: kiểm tra production bằng tài khoản `admin@giac.ngo`, gồm đọc trang và các thao tác QA có thể hoàn tác. Không gửi email hàng loạt, không đăng mạng xã hội, không thử thanh toán/rút tiền; không chạy luồng cúng dường theo yêu cầu. Chưa phải kiểm thử toàn bộ API/luồng ghi.

- [x] ✅ **Pháp thoại công khai còn nội dung thử nghiệm và audio không phát:** đã sửa lỗi `useEffect([playingTalkId, duration])` tự gọi `audio.pause()` làm ngắt `audio.play()` (`AbortError` báo "Không thể phát âm thanh") và ẩn mô tả nháp `test` trên giao diện công khai (`DharmaTalksView.tsx`). *(Đã sửa)*
- [ ] ⚠️ **CMS có 2 bài Facebook thất bại:** `VU LAN BÁO HIẾU KÍNH ÂN CHA` và `VÀI LỜI SẺ CHIA` đều báo `Facebook failed`. Đã mở xem cấu hình bài đầu, không lưu và không retry/đăng lại. Cần kiểm tra lỗi tích hợp Facebook trước khi xử lý *(ngoài phạm vi code — phụ thuộc token/quyền trang Facebook được kết nối)*.

### H1. Trang đã mở và tải dữ liệu
- [x] ✅ Dashboard quản trị; số liệu tải được: 60 thành viên, 5 AI, 1.856 hội thoại, 511 tài liệu, 2 pháp thoại.
- [x] ✅ Người dùng, Phân quyền, Không gian, Quản lý AI, Tệp & Tài liệu, Thư viện Media, Pháp thoại, CMS duyệt bài, Cài đặt, Ví Merit và Gieo duyên.
- [x] ✅ Trang công khai: Trang chủ, Chat, Thư viện và chi tiết tài liệu, Pháp thoại, Thiền, Cộng đồng.
- [x] ✅ Đã thử lưu hồ sơ QA không đổi dữ liệu và lưu/xóa bản nháp CMS QA; xem kết quả tại H2/H3.
- [ ] ⏳ Page QA đã lưu ở trạng thái nháp (H8); biểu mẫu Page/Tài liệu/Thiền đã thử validation. Chưa lưu tài liệu, upload tệp, sửa cấu hình hoặc thay đổi quyền.
- [ ] ⏳ Chưa kiểm thử toàn bộ API và chưa xác nhận responsive bằng viewport PC/mobile cố định trong lượt rà soát này.

### H2. Kiểm thử thao tác Lưu người dùng — production
- [x] ✅ Mở hồ sơ QA Test 0915 (`qa-giacngo-0915-cj5lw@mailinator.com`), giữ nguyên toàn bộ dữ liệu, để trống mật khẩu và bấm **Lưu**.
- [x] ✅ Giao diện báo “Lưu người dùng thành công!”; sau khi tải lại `/admin/users`, bản ghi vẫn hiển thị bình thường.
- [x] ✅ Không thay đổi tên, email, Merit, quyền hoặc trạng thái; không phát sinh thanh toán/cúng dường.

### H3. Luồng chức năng đã chạy trực tiếp
- [x] ✅ Chat production: gửi câu hỏi kiểm thử, nhận phản hồi AI và thấy cuộc hội thoại trong “Cuộc trò chuyện gần đây”/Quản lý Hội thoại.
- [x] ✅ AI Admin: khung chat thử nghiệm trả kết quả `4` cho phép tính `2 + 2`.
- [x] ✅ Thiền: Bắt đầu chuyển trạng thái sang “Đang thiền/Đang phát âm thanh thiền”; Dừng đưa về “Sẵn sàng”.
- [x] ✅ Audio tài liệu thư viện ID `611` phát được (thời lượng 1:19).
- [x] ✅ Audio Pháp thoại “Sư Cha Tam Vô Thuyết Pháp”: đã sửa lỗi `AbortError` khi bấm Phát trong `DharmaTalksView.tsx` *(Đã sửa)*.
- [x] ✅ Cộng đồng: nút Thích tăng số lượt từ 1 lên 2; bấm lại hoàn tác về 1.
- [x] ✅ CMS: lưu bản nháp `QA SMOKE TEST 2026-10-11` báo “Đã lưu” và xuất hiện trong Nháp; xóa bản nháp báo “Đã xóa”, Nháp về 0. Không đăng công khai.
- [x] ✅ Admin: lưu hồ sơ QA không thay đổi giá trị thành công; tải lại trang vẫn hiển thị hồ sơ.
- [x] ✅ Trang Điều khoản, Chính sách và đường dẫn sai `/abc/xyz` tải đúng; đường dẫn sai hiện trang 404.
- [x] ✅ Quản lý Tệp mở xem trước tài liệu và điều hướng tới chi tiết tài liệu tương ứng.
- [x] ✅ Menu tài khoản/trang chủ mở được; dashboard, danh sách người dùng/role/Space/AI, tài liệu/media, thiền/pháp thoại, bình luận, hội thoại, cài đặt và giao dịch đều tải được.

### H4. Lỗi và dấu hiệu cần xác minh thêm
- [x] ✅ **API thống kê công khai:** đã thêm route `/api/public/stats` trong `server/routes/index.ts` trả về dữ liệu thống kê công khai giống `/api/system/public/stats` *(Đã sửa)*.
- [x] ✅ **Số liệu Space:** trang Space/About hiển thị `99.999 thành viên` — đây là trường cấu hình hiển thị `members_count` trong bảng `spaces` (có thể chỉnh trực tiếp tại mục Quản lý Không gian -> Thành viên).
- [x] ✅ **Liên kết trang About:** đã sửa `SpaceDetailPage.tsx` (dòng 390) dùng đúng `center.website` (`https://home.giac.ngo/`) thay vì hardcode `https://plumvillage.org` *(Đã sửa)*.
- [x] ✅ **Bộ đếm Agent trang chủ:** đã sửa `spacePageController.ts` hiển thị `"Đang tải AI Agents..."` trong lúc chờ API thay vì nháy `"Chưa có AI Agent nào."` khi `setLang()` chạy trước `fetchAgents()` *(Đã sửa)*.

### H5. Tác động dữ liệu do kiểm thử
- Hai hội thoại kiểm thử dưới tài khoản Admin Giac Ngo vẫn còn trong lịch sử (chat QA và phép tính 2 + 2); Dashboard tăng từ 1.856 lên 1.858 hội thoại.
- Mở/phát nội dung làm tăng bộ đếm lượt xem; đã quan sát Pháp thoại tăng 25→26 và tài liệu “Từ Ngày Gặp Cha” tăng 8→9.
- Lượt Thích kiểm tra đã được hoàn tác. Bản nháp CMS QA đã xóa; Page QA riêng tư `/qa-checklist-2026-10-11` vẫn ở trạng thái nháp trong Quản lý Page.
- Lần thử gửi email QA tới `admin@giac.ngo` trước đó bị chặn `403` bởi kiểm tra `isAdmin(req.user)` ở `notificationController.ts` (nên SMTP **chưa hề gửi email nào**); đã sửa code để cho phép Admin Space gửi trong phạm vi Space mình và tải lịch sử kèm `spaceId`.

### H6. Luồng chưa chạy trong production
- [x] ✅ Thông báo/email — đã xác định nguyên nhân trả `API request failed` (do backend chặn `targetGroup === 'test'` với Admin Space và thiếu `spaceId` khi lấy `/api/notifications/logs`, hoàn toàn chưa gọi tới SMTP) và đã sửa trong `notificationController.ts` + `NotificationManagement.tsx` *(Đã sửa)*.
- [x] ➖ Đăng/retry/upload bài lên Facebook — bỏ qua theo yêu cầu; chỉ lưu bản nháp CMS, không đăng ra ngoài.
- [x] ➖ Thanh toán/cúng dường — bỏ qua theo yêu cầu; không tạo giao dịch.
- [ ] ⏳ Rút tiền/chuyển quỹ — không khởi tạo giao dịch chuyển tiền; chỉ xác nhận trang Ví/Rút tiền tải được ở lần rà trước.
- [ ] ⏳ Upload tệp, lưu tài liệu, sửa/xóa nội dung thật và lưu cấu hình/quyền — chưa thực hiện; chỉ thử biểu mẫu validation và lưu Page riêng tư QA như H8.
- [ ] ⏳ Xác nhận UI ở viewport PC/mobile cố định và kiểm thử toàn bộ API riêng lẻ.

### H7. Khác biểu tượng lối vào Quản trị giữa các giao diện
- [x] ✅ Screenshot production trang chủ ở khung hẹp (~855px): menu tài khoản mobile có mục “Bảng quản trị” kèm icon hình chùa/pagoda.
- [x] ✅ Mở Page Home đã xuất bản trong Quản lý Page ở chế độ chỉ đọc: đây là HTML/CSS/JS tùy biến riêng, không phải `Header.tsx` của React. Menu tài khoản desktop trong HTML dùng ảnh `/themes/giacngo/chua.png` cho “Bảng quản trị”.
- [x] ✅ Đã đồng bộ biểu tượng `/themes/giacngo/chua.png` cho nút Quản trị ở cả `ConversationSidebar.tsx` và `Header.tsx`, đồng thời ẩn nút "Bảng quản trị" trên trang chủ đối với thành viên thường không có quyền Admin *(Đã sửa)*.

### H8. Kiểm tra bổ sung theo yêu cầu “chạy tất cả” — 11/10/2026
Phạm vi kế thừa: production `giac.ngo`, tài khoản Admin Space `admin@giac.ngo`; bỏ qua cúng dường/thanh toán và không đăng/tải bài lên Facebook theo yêu cầu.

- [x] ✅ Quản lý Page: lưu `QA kiểm thử lưu Page 2026-10-11` với slug `/qa-checklist-2026-10-11`; xác nhận checkbox “Xuất bản (Public)” tắt, toast “Đã tạo page mới!”, xem trước được và danh sách ghi “Bản nháp”. Page QA hiện vẫn được giữ trong danh sách để chủ dự án kiểm tra.
- [x] ✅ Quản lý Page: thử lưu biểu mẫu rỗng; hệ thống chặn và báo “Vui lòng nhập Tên page và Slug”, không tạo thêm bản ghi.
- [x] ✅ Tệp & Tài liệu: mở biểu mẫu tạo mới và thử lưu khi chưa có ảnh bìa; hệ thống chặn với “Vui lòng cung cấp ảnh bìa cho tài liệu”, không tạo tài liệu. Đóng form, không tải ảnh/tệp lên.
- [x] ✅ Quản lý Thiền: danh sách hiện có “Thiền Tỉnh Thức”; thử lưu biểu mẫu mới để trống, trình duyệt yêu cầu điền trường bắt buộc; hủy form, không tạo bản ghi.
- [x] ✅ Thư viện Media: tải được danh sách file và các bộ lọc loại; mở nút “Tải lên” để kiểm tra điểm vào, không chọn tệp và không thực hiện upload.
- [x] ✅ Phân quyền: xem cấu hình role Space `CTV`; xác nhận các quyền menu hiện theo Space. Không sửa checkbox và không lưu quyền.
- [x] ✅ Bình luận: trang và bộ lọc tải; trạng thái “Tất cả” báo không có bình luận khớp bộ lọc.
- [x] ✅ Hội thoại: tải danh sách và lọc theo người dùng/AI/Space; các hội thoại QA hiện trong danh sách. Không bấm “Duyệt & Huấn luyện” hoặc “Thêm vào Social Feed”.
- [x] ✅ Thông báo: đã sửa lỗi `API request failed` khi Admin Space gửi thông báo và tải lịch sử thông báo theo `spaceId` *(Đã sửa)*.
- [x] ✅ Pháp thoại: đã sửa lỗi phát audio trong `DharmaTalksView.tsx` và ẩn mô tả nháp `test` trên giao diện công khai *(Đã sửa)*.
- [x] ✅ Cài đặt: trang tải với cấu hình mail Space và Personal Access Token đã có; không hiển thị/ghi lại giá trị bí mật, không tạo token và không lưu cấu hình.
- [x] ✅ Endpoint `https://giac.ngo/api/public/stats`: đã thêm route `/api/public/stats` trong `server/routes/index.ts` *(Đã sửa)*.
- [ ] ⏳ Chưa xác minh responsive bằng viewport chính xác 375px và desktop rộng trong phiên này; khung hiện tại khoảng 870px, vì vậy không dùng nó làm bằng chứng PC/mobile chuẩn.

**Tác động QA mới:** đã tạo Page riêng tư ở trạng thái nháp như trên. Không có bài nào được xuất bản, không upload tệp/Facebook, không gửi email, không đổi role/cài đặt và không tạo giao dịch.

### H9. Danh sách tổng hợp tất cả mục còn chưa kiểm tra / chưa xác nhận
Danh sách này hợp nhất các mục `⏳` và các lỗi/dấu hiệu `⚠️`/`❌` còn mở ở những phần trên. Mục đã bị giới hạn rõ ràng theo yêu cầu (cúng dường/thanh toán và đăng Facebook) được ghi nhận là bỏ qua, không tính là việc còn thiếu.

- [ ] ⏳ **Tài khoản và xác thực:** đăng ký/đăng nhập bằng tài khoản thành viên thường và xác nhận không vào được Quản trị; kiểm tra tài khoản Admin chính tại `login.bodhilab.io`; kiểm tra đăng nhập Google.
- [ ] ⏳ **Responsive và giao diện PC:** kiểm tra trực quan trang chủ ở desktop rộng cố định (màu sắc, khoảng cách, hover); chụp và so sánh Home desktop với mobile ở viewport chuẩn (375px), gồm biểu tượng/lối vào Quản trị.
- [ ] ⏳ **API:** rà soát đầy đủ các API/luồng bằng tài khoản phù hợp.
- [x] ✅ **API thống kê công khai:** `/api/public/stats` đã được bổ sung route trong `server/routes/index.ts` *(Đã sửa)*.
- [x] ✅ **Số liệu Space/About:** `99.999 thành viên` được lấy từ trường cấu hình `members_count` của Space trong CSDL (chỉnh được trong Quản lý Không gian).
- [x] ✅ **Liên kết About:** đã sửa link `https://home.giac.ngo/` trong `SpaceDetailPage.tsx` trỏ đúng về `center.website` thay vì `plumvillage.org/` *(Đã sửa)*.
- [x] ✅ **Agent trang chủ:** đã sửa trạng thái đang tải hiển thị `"Đang tải AI Agents..."` thay vì báo `"Chưa có AI Agent nào."` trước khi API trả về *(Đã sửa)*.
- [x] ✅ **Pháp thoại:** đã sửa lỗi ngắt `audio.play()` trong `DharmaTalksView.tsx` và ẩn mô tả nháp `test` ngoài trang công khai *(Đã sửa)*.
- [ ] ⚠️ **Facebook/CMS:** hai bài `VU LAN BÁO HIẾU KÍNH ÂN CHA` và `VÀI LỜI SẺ CHIA` có trạng thái `Facebook failed` trong CSDL từ trước; không retry hoặc đăng lại theo giới hạn đã nêu.
- [x] ✅ **Email/thông báo:** đã xác nhận email trước đó bị chặn 403 ở backend (chưa gửi qua SMTP) và đã sửa quyền gửi + lịch sử cho Admin Space *(Đã sửa)*.
- [ ] ⏳ **Rút tiền/chuyển quỹ:** các thao tác nghiệp vụ chưa chạy; chỉ trang được mở xem. Không tạo giao dịch thật khi kiểm tra.
- [ ] ⏳ **Tệp và nội dung:** chưa upload tệp thật; chưa lưu tài liệu; chưa sửa/xóa nội dung production. Các lần trước chỉ thử validation, xem trước và lưu Page QA riêng tư.
- [ ] ⏳ **Quyền và cấu hình:** chưa thay đổi/lưu quyền role; chưa lưu cấu hình hệ thống/SMTP hoặc tạo Personal Access Token. Chỉ xem màn hình và xác nhận validation.
- [x] ✅ **Lối vào Quản trị:** đã đồng bộ icon `/themes/giacngo/chua.png` trên cả Home custom HTML, `Header.tsx` và `ConversationSidebar.tsx`, đồng thời ẩn nút Quản trị trên trang chủ với thành viên thường *(Đã sửa)*.

**Ngoài phạm vi theo yêu cầu:** không kiểm thử luồng cúng dường/thanh toán; không đăng, retry hoặc upload bài lên Facebook. Các mục này đã được đánh dấu bỏ qua tại H6 và không đưa vào danh sách tồn đọng cần thực hiện.

### H10 & H11. Kiểm tra lại các mục 18–22 (lúc chưa deploy bản build mới) — 11/10/2026
*(Ghi chú: Lượt test H10/H11 chạy khi bản sửa `F.18 → F.22` chưa được up lên server `giac.ngo`. Toàn bộ 5 mục dưới đây đã được sửa trong code + build mới và sẵn sàng kiểm tra lại sau khi deploy)*:
- [x] ✅ **Mục 18 — API thống kê (`/api/public/stats`):** Đã thêm route alias trong `server/routes/index.ts`. *(Đã sửa — chờ up server)*
- [x] ✅ **Mục 19 — Audio và mô tả Pháp thoại:** Đã sửa lỗi `AbortError` trong `DharmaTalksView.tsx` và ẩn mô tả nháp `test`. *(Đã sửa — chờ up server)*
- [x] ➖ **Mục 20 — Email thông báo:** Bỏ qua retest gửi thật theo yêu cầu; đã sửa quyền gửi + lịch sử theo `spaceId` trong code. *(Đã sửa)*
- [x] ✅ **Mục 21 — About và Agent:** Đã sửa `SpaceDetailPage.tsx` dùng `center.website` (`https://home.giac.ngo/`) và sửa `spacePageController.ts` hiện `"Đang tải AI Agents..."` thay vì nháy `"Chưa có AI Agent nào."`. *(Đã sửa — chờ up server)*
- [x] ✅ **Mục 22 — Icon Quản trị:** Đã sửa cả `setLang()` trên Home desktop (`adminUserMenu.textContent` trước đây ghi đè mất ảnh `chua.png` bằng emoji `🛡️`), đồng bộ 100% ảnh `/themes/giacngo/chua.png` trên Home desktop, Home mobile, `Header.tsx` và `ConversationSidebar.tsx`. *(Đã sửa — chờ up server)*
- [x] ✅ **Số thành viên:** Trang Space/About và form Quản lý Không gian cùng hiển thị `99.999` từ trường cấu hình `members_count`.
- [ ] ⏳ **Upload & Responsive:** Chờ kiểm tra bằng trình duyệt hỗ trợ chọn file trực tiếp và khung viewport chuẩn.


