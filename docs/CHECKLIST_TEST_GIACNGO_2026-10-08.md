# Checklist test giac.ngo — 08/10/2026 (11:15–11:40)

Người test: Claude (trình duyệt thật, khách chưa đăng nhập) · Bản build đang chạy: sau commit `dc1b8c3`
Ký hiệu: ✅ đạt · ❌ lỗi · ⚠️ chạy được nhưng cần sửa · ⏳ chưa test (cần đăng nhập — chủ dự án test)

## A. Hạ tầng / bảo mật tên miền
- [x] ✅ giac.ngo được server nhận là Space (không còn bị coi là trang Admin root): đăng ký rỗng → "Tên, email, và mật khẩu là bắt buộc"
- [x] ✅ Đăng nhập email không tồn tại → 401 "Tài khoản không hợp lệ…" (không lộ thông tin)
- [x] ✅ `/admin` khi chưa đăng nhập → chuyển về `/login`
- [x] ✅ `/chat` → tự chuyển `/giac-ngo/chat` (không còn vòng lặp, không còn slug `giac`)
- [x] ✅ API mới `/api/spaces/1/admins` khi chưa đăng nhập → 401
- [ ] ⏳ `www.giac.ngo` → nên chuyển 301 về `giac.ngo` (chưa test được)

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
- [x] ❌ `/privacy`, `/terms`, `/contact` hiện **trang chủ** thay vì trang Chính sách / Điều khoản / Liên hệ. Link "Điều khoản Dịch vụ và Chính sách Bảo mật" ở trang Đăng ký/Đăng nhập vì vậy dẫn sai.
      Nguyên nhân: `server/index.ts` danh sách `SPA_VIEWS` thiếu `privacy`, `terms`, `contact`, `career`, `docs`… nên middleware tên miền riêng trả trang tuỳ biến.
- [x] ⚠️ Đường dẫn không tồn tại (vd `/abc/xyz`) trả trang chủ với mã 200, không có trang 404.

## C. Giao diện Mobile (375×812)
- [x] ✅ Trang chủ: không tràn ngang, menu ☰ mở/đóng được
- [x] ✅ Đăng nhập, Thư viện, Chi tiết bài, Thiền: không tràn ngang
- [x] ⚠️ `/giac-ngo/chat`: thanh trên bị cắt — nút "Cộng Đồng" chỉ thấy chữ "C…" ở mép phải; ô nhập bị hẹp (cột icon bên trái chiếm ~75px)
- [x] ⚠️ Thiền: nhãn "Đang phát âm thanh thiền" hiện ngay cả khi chưa bấm Bắt đầu (trạng thái "Sẵn sàng")

## D. Lỗi nhỏ / tối ưu (không chặn)
- [ ] ⚠️ Chuyển ENG: menu mobile và nút "Đăng nhập" trên trang chủ vẫn tiếng Việt; hộp "Explore AI" tiêu đề tiếng Anh khi đang VIE
- [ ] ⚠️ Hộp Explore: Agent 0 merits vẫn ghi "Đăng nhập để mua" — nên ghi "Đăng nhập để dùng"
- [ ] ⚠️ Trang chủ hiện tên model nội bộ (`gemini-3-flash-preview`) cho người xem công khai
- [ ] ⚠️ Khách mở chat gọi `/api/ai-configs/7/voice-key` → 401 (lỗi đỏ trong Console); chỉ nên gọi khi đã đăng nhập
- [ ] ⚠️ Mỗi trang gọi lặp `/api/spaces/domain/giac.ngo` 2–3 lần và tải `/api/spaces` (toàn bộ Space) — nên gộp/cache
- [ ] ⚠️ Gói "Gieo Duyên/Phật Sự" ở trang chủ nhưng hộp Cúng dường ghi "Bó nhang/Cuộn Kinh" — thống nhất tên gọi

## E. Đã đăng nhập — Admin Space phụ `admin@giac.ngo` (test 11:28–11:45)
Tài khoản: `isGlobalAdmin=false`, `adminSpaceIds=[1]` ✅ đúng vai trò.

### E1. Trang người dùng
- [x] ✅ Trang chủ PC ngay sau khi đăng nhập: hiện avatar + menu, ẩn nút Đăng nhập
- [x] ❌ **Avatar mất sau khi vào trang chat/quản trị rồi quay lại trang chủ** (PC và mobile đều hiện lại icon Đăng nhập).
      Nguyên nhân: `App.tsx` (~dòng 270) khi app mở sẽ ghi đè `localStorage.user = { ...freshUser, refreshToken }` → **mất `apiToken`**. Trang chủ tuỳ biến (`initUserMenu`) chỉ coi là đã đăng nhập khi `user.apiToken` có giá trị.
      Sửa: giữ `apiToken` khi merge (`apiToken: currentUser.apiToken`) **và** cho trang chủ đọc `localStorage.apiToken` hoặc `user.id`.
- [x] ❌ Mobile trang chủ: không có avatar trên thanh trên; menu ☰ vẫn hiện "Đăng nhập" (cùng nguyên nhân trên)
- [x] ✅ `/giac-ngo/chat` đã đăng nhập: không còn màn hình lỗi; thẻ người dùng (tên, email, merit, lượt chat), nút Quản trị, Đăng xuất
- [x] ✅ Gửi câu hỏi → AI trả lời; cuộc trò chuyện lưu vào "Cuộc trò chuyện gần đây"
- [x] ✅ "Lượt chat hôm nay" tăng lên 1/25 sau khi tải lại (cập nhật chậm, không cập nhật ngay sau khi chat)
- [x] ✅ Cộng Đồng `/giac-ngo/community`: hiện bảng tin, ô đăng bài (không đăng thử)
- [x] ✅ Mobile `/giac-ngo/chat`: không lỗi, không tràn ngang

### E2. Trang Quản trị (PC 1280px)
- [x] ✅ Logo Giác Ngộ ở thanh bên (ảnh của Space, không còn logo Bodhi)
- [x] ✅ Tổng quan: **Tổng số Không gian = 1**, 60 thành viên, 5 AI, 1855 hội thoại — số liệu riêng Giác Ngộ
- [x] ✅ Thông báo: chỉ gửi trong Space (không có lựa chọn toàn nền tảng/email test); "Chọn từ danh sách" = 60 thành viên Giác Ngộ (không bấm Gửi)
- [x] ✅ Tệp & Tài liệu, Thư viện Media, CMS Viết bài, CMS Duyệt & Đăng, Quản lý Thiền, Pháp Thoại, Gieo duyên, Ví Merit, Quản lý Người dùng, Phân quyền, Cài đặt: mở được, có dữ liệu
- [x] ✅ Quản lý Không gian: chỉ thấy Giác Ngộ, **không có nút Xoá**; tab **Admin Space (2)**: Chủ sở hữu demo@giac.ngo + admin@giac.ngo, có ô thêm nhiều email + "tự tạo tài khoản" (không bấm Thêm)
- [x] ✅ Cách ly Space (gọi API trực tiếp): Space 47 → members/roles/admins đều **403**; `/api/spaces/owners` 403
- [x] ❌ **Quản lý AI: danh sách trống** dù API `/api/ai-configs/manageable` trả về AI của Space (lọc phía giao diện sai — `AiManagement.tsx` ~dòng 903)
- [x] ❌ **Quản lý Page: "Chưa có page nào"** — API trả **401** vì `SpacePagesManager.tsx` lấy token từ `user.apiToken` (đã bị mất, xem E1) và gọi `fetch` thẳng, không qua cơ chế làm mới token
- [x] ❌ **Quản lý Bình luận** trống: `/api/comments/admin/comments` → **403** (route chỉ cho Admin chính — `commentRoutes.ts` `requireGlobalAdmin`)
- [x] ❌ **Quản lý Hội thoại** trống ("Không có hội thoại nào" dù có 1855): `/api/conversations/all` → **403** (`requireGlobalAdmin`)
- [x] ❌ **Cài đặt thanh toán** hiện và cho sửa PayOS Client ID/API Key/Checksum, Venmo, Stripe Account ID — theo thiết kế chỉ **Chủ sở hữu** được làm
- [x] ⚠️ **Ví Space** hiện "Connect with Stripe" cho Admin phụ (nên chỉ chủ sở hữu); `/api/billing/stripe/connect/space/1/status` → **500**
- [x] ⚠️ **Yêu cầu rút tiền**: menu hiện nhưng API → 403 (nên ẩn menu với Admin phụ)

### E3. Trang Quản trị — Mobile (375px)
- [x] ❌ **F5 / mở trực tiếp `https://giac.ngo/admin/...` ra trang chủ** thay vì trang Quản trị. Server (`server/index.ts`, middleware tên miền riêng) chỉ bỏ qua `/admin` 1 cấp, còn `/admin/dashboard` (2 cấp) bị coi là trang tuỳ biến. Ảnh hưởng cả PC. `/giac-ngo/admin/...` thì chạy.
- [x] ⚠️ `/giac-ngo/admin/dashboard` mobile: thanh bên cố định 192px chiếm hơn nửa màn hình, nội dung chỉ còn ~183px; không tự thu gọn

### E4. Chưa test (cần tài khoản khác)
- [ ] ⏳ Thành viên thường: đăng ký mới tại giac.ngo, không vào được Quản trị
- [ ] ⏳ Admin chính tại login.bodhilab.io
- [ ] ⏳ Đăng nhập Google

## G. Kiểm tra thiết kế (UI) — PC 1280px & Mobile 390px (11:40–11:55)
Cách kiểm tra: ảnh chụp màn hình + đo kích thước/vị trí phần tử bằng script trên trang thật.

### G1. Bong bóng chat
- [x] ✅ Câu hỏi người dùng nằm trong bong bóng đỏ bên phải; trả lời AI nằm trong bong bóng kem bên trái; chữ không tràn ra ngoài bong bóng (PC và mobile)
- [x] ✅ Hàng icon dưới câu trả lời (thích/không thích/sao chép/đọc/tải/tạo lại) cùng cỡ, thẳng hàng
- [x] ⚠️ PC: bong bóng AI rộng ~800px (77% khung) — dòng chữ quá dài, khó đọc; nên giới hạn ~680–720px
- [x] ❌ Mobile khi mở danh sách hội thoại: thanh bên **đẩy** nội dung chứ không phủ lên → bong bóng AI bị cắt ở mép phải, thẻ gợi ý bị bóp còn 1 chữ/dòng, xuất hiện thanh cuộn ngang. Chọn hội thoại xong thanh bên không tự đóng

### G2. Icon không đều
- [x] ❌ Thanh bên trang chat (PC & mobile): icon **Thiền 28×36** trong khi Trò chuyện/Thư viện/Pháp thoại **36×36** → Thiền nhìn nhỏ và lệch
- [x] ❌ Chân thanh bên trang chat: icon **Cúng dường 16px, Quản trị 9px, Đăng xuất 12px**; chữ 10.5px/11px/10.5px — không đồng nhất
- [x] ⚠️ Thanh trên trang chat PC: ô chọn AI cao 35px, nút Khám phá/Cộng Đồng cao 44px
- [x] ✅ Thanh bên trang Quản trị: 21 icon đều 18×18, căn giữa theo chữ
- [x] ⚠️ Tổng quan Quản trị: hàng 1 có 4 thẻ rộng 245px, hàng 2 có 3 thẻ rộng 333px — lưới không đều; thẻ "Tổng số Không gian" vô nghĩa với Admin Space (luôn = 1)

### G3. Thanh nhập chat
- [x] ❌ Ô nhập trống hiện **một vạch tối** cạnh nút mic: đó là thanh cuộn của ô nhập vì chữ gợi ý "Nhập tin nhắn của bạn..." xuống 2 dòng trong ô cao 24px (mobile; PC hẹp cũng bị)
- [x] ⚠️ Mobile: chữ gợi ý bị cắt "Nhập tin nhắn của"

### G4. Thanh trên / bố cục mobile
- [x] ❌ Trang chat mobile: nút "Cộng Đồng" tràn ra ngoài màn hình (mép phải 427px > 390px)
- [x] ❌ Trang Quản trị mobile: thanh bên cố định 192px, nội dung còn ~183px; bảng Người dùng chỉ còn cột Tên, email bị cắt; "Sửa thông tin/Đổi mật khẩu" xuống 2 dòng
- [x] ⚠️ Hộp nổi "Cúng Dường Tam Bảo" che nội dung Thư viện/Pháp thoại trên mobile
- [x] ⚠️ Cộng Đồng mobile: nút "Bình luận" xuống 2 dòng trong khi "Thích", "Chia sẻ" 1 dòng → hàng nút lệch

### G5. Font chữ
- [x] ⚠️ Pháp thoại dùng chủ yếu font **Inter** (11 phần tử), các trang khác dùng **Libre Baskerville**; trang chat có 1 chỗ **EB Garamond** → không đồng bộ
- [x] ⚠️ Danh sách Pháp thoại hiện thời lượng "--:--"

### G6. Chế độ tối
- [x] ❌ Logo: chữ "giac.ngo" màu tối gần như **không đọc được** trên nền tối (thanh bên + giữa trang chat)
- [x] ❌ Icon Pháp thoại (bánh xe pháp màu đen) chìm trên nền tối
- [x] ✅ Bong bóng, nút đỏ, chữ nội dung đủ tương phản

### G7. Chưa kiểm tra được bằng mắt ở PC
- [ ] ⏳ Khung trình duyệt của Claude đang hẹp (390px) nên ảnh chụp PC bị thu nhỏ; phần PC ở trên kiểm tra bằng đo kích thước. Muốn soát bằng mắt ở PC (màu, khoảng cách, hover), kéo rộng khung trình duyệt bên phải rồi báo Claude.

## F. Việc giao agent (ưu tiên)
1. **[Cao]** `App.tsx`: khi merge profile giữ lại `apiToken`; trang chủ tuỳ biến (HTML của Space) nhận đăng nhập bằng `localStorage.apiToken`/`user.id` → sửa lỗi mất avatar PC + mobile.
2. **[Cao]** `server/index.ts` middleware tên miền riêng: bỏ qua mọi đường dẫn bắt đầu bằng `/admin/` (và `/auth/`), thêm `privacy`, `terms`, `contact`, `career`, `docs` vào `SPA_VIEWS`.
3. **[Cao]** Ẩn + chặn backend Cài đặt thanh toán / Ví Space (Stripe Connect) / Rút tiền với Admin phụ (chỉ chủ sở hữu + Admin chính). Sửa lỗi 500 Stripe status.
4. **[TB]** Cho Admin Space (chủ + phụ) quản lý Bình luận và Hội thoại của Space mình (route mới theo `spaceId`, không mở `requireGlobalAdmin`) — **SQL cần chủ dự án duyệt**.
5. **[TB]** `AiManagement` lọc AI theo `Number(ai.spaceId) === Number(contextSpace.id)`; `SpacePagesManager` dùng `apiService`/`authedFetch` thay `fetch` + `user.apiToken`.
6. **[TB]** Trang chat mobile: thanh trên bị cắt; trang Quản trị mobile: thanh bên dạng ngăn kéo.
7. **[Thấp]** Lượt chat không tăng; các mục ⚠️ ở phần D.
8. **[Thiết kế]** Mobile: thanh bên chat dạng phủ (overlay) + tự đóng khi chọn hội thoại; thanh trên thu nút thành icon khi < 420px; ô nhập `overflow:hidden` + chữ gợi ý ngắn ("Nhập tin nhắn…").
9. **[Thiết kế]** Đồng bộ icon: ảnh Thiền 36×36 (sửa ảnh `5.png` hoặc `object-fit: contain` trong khung 36×36); icon chân thanh bên cùng 16px, chữ cùng cỡ.
10. **[Thiết kế]** Chế độ tối: dùng logo bản sáng (chữ trắng) hoặc thêm nền cho logo; icon Pháp thoại bản sáng.
11. **[Thiết kế]** Font Pháp thoại về Libre Baskerville; giới hạn bề rộng bong bóng AI ~720px trên PC; lưới thẻ Tổng quan đều cột, ẩn thẻ "Tổng số Không gian" với Admin Space.
