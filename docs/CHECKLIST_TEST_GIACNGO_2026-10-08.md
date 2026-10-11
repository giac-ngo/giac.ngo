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

