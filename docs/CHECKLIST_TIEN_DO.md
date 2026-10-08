# Checklist tiến độ — GiacNgoVN

Bản tách riêng của mục Checklist trong `KE_HOACH_CHUAN_HOA_PHAN_QUYEN_2026-10-06.md`.


Đánh dấu theo code đã đối chiếu đến 07/10, 23:40 (commit `418b04a`). ✓ = đã làm trong code; "đã deploy" chỉ đánh dấu khi chạy trên VPS.

**Vá khẩn cấp (P0)**

- [x] P0-1…P0-9 của kế hoạch 02/10: cấu hình hệ thống, khóa Space, hồ sơ / SQL injection, token người khác, merit / rút tiền, đọc file qua chat, chat tin cấu hình từ client, tài liệu không cần đăng nhập, upload
- [x] Iframe trang tùy chỉnh: chặn `postMessage` giả, bỏ `allow-same-origin`, `allow-top-navigation`
- [x] Reset Weaviate, xuất giao dịch, xem giao dịch người khác chỉ Admin chính
- [x] OAuth CMS ký `state`; Google bỏ `custom_domain` khỏi danh sách chuyển hướng
- [ ] P0-10 đổi khóa bí mật, tạo lại `api_token`, khóa cổng 5432 — chủ dự án quyết định không làm (07/10)

**Phân quyền (Giai đoạn 1)**

- [x] Lớp chính sách `can()` trong `server/utils/policy.ts`; không còn `checkPermission` ở route
- [x] Tài liệu + danh mục, Role, CMS (+ chặn IDOR), Social, Thông báo, Media, Stripe Connect theo đúng Space
- [x] Danh mục quyền chuẩn (`cms_write` / `cms_approve`, `social-moderate`, `notifications`, `space-billing`, `dashboard`)
- [x] Mọi user thuộc ít nhất một Space; `login.bodhilab.io` và `bodhilab.io` chỉ Admin chính đăng nhập, không đăng ký; hỗ trợ subdomain
- [x] Rate limit `/api/v1/login`; gom cấu hình tên miền (`ADMIN_HOST`, `MAIN_DOMAIN`) ở server và client
- [x] Test: 54 ca (theo báo cáo, DB giả lập)

**AI và phiên đăng nhập (Giai đoạn 2)**

- [x] Truy vấn AI công khai không trả system prompt; `getVisibleAiConfigs` dùng `req.user`
- [x] `estimate-context`, `trained-conversations` chỉ người quản lý AI; `latest-conversation` dùng `req.user`
- [x] `voice-key`, `translate` kiểm quyền; gói giá của Space chỉ chứa AI cùng Space
- [ ] `voice-key`: giới hạn tần suất và tính phí
- [ ] Phiên đăng nhập mới: refresh token băm, xoay vòng, cookie `HttpOnly` (giữ `api_token` cũ)

**Tiền và merit (Giai đoạn 3)**

- [x] Trừ merit nguyên tử khi mua gói, tăng lượt
- [x] Danh sách cúng dường công khai: cột an toàn, tối đa 100 dòng
- [x] Xử lý chênh lệch merit cũ — bỏ, giữ nguyên theo quyết định (#301, ~128 nghìn merit, 50.000 merit QR)
- [ ] Sổ cái + đối soát hằng ngày
- [ ] PayOS: số tiền tối thiểu, quy đổi VND → merit một chỗ
- [ ] Chủ Space duyệt cúng dường QR (endpoint + màn duyệt)

**Hiệu năng và cấu trúc (Giai đoạn 4)**

- [x] Cache user 45 giây; pool DB `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`
- [ ] Đưa DDL pgvector vào migration; phân trang SQL; build JS thay `tsx`; `React.lazy`; dọn file thừa; migration nền

**Lỗi còn mở (review + Lark)**

- [x] #136 Toast 401 lặp (P2-6) — refresh lỗi thì reject hàng đợi + sự kiện `auth:expired` đăng xuất
- [x] #111 Lỗi trích xuất trả thông báo chung — các controller khác vẫn còn trả `error.message` (P2-10 chưa xong hết)
- [x] #113 Lưu tài liệu lỗi thì xóa file vừa upload (`DELETE /api/system/upload`, chỉ xóa được file của chính mình, chặn `..`) — còn xóa tay `uploads/space-1/SMK-06-library.png` trên VPS
- [x] #129 Dịch EN→VI hỏi xác nhận trước khi ghi đè kệ tiếng Việt
- [x] #128 Chữ "Không tìm thấy trang"; link reset theo host Space — cần test sau deploy
- [x] #75 Nút "Đổi ảnh đại diện" trong `EditProfileModal`
- [ ] #6 Stripe: xác nhận khóa thật trên VPS, thanh toán thử
- [ ] #126 Index lại bài "Bạch Ngôn" vào pgvector
- [x] Giao diện #91, #138, #139 (cần xem trên trình duyệt)
- [ ] Giao diện #127, #137
- [ ] Bỏ alias `/api/spaces/managed/:userId`
- [ ] Đường "Legacy Token" — chấp nhận rủi ro; tùy chọn tắt sau

**Triển khai**

- [x] Commit code (đến `418b04a`)
- [ ] Chạy migration gỡ `manual-billing`, `finetune` khỏi role của Space (đã duyệt câu SQL ngày 06/10)
- [ ] Chốt và chạy câu đổi quyền `cms` cũ → `cms_write` + `cms_approve`
- [ ] Deploy + `pm2 restart`
- [ ] Kiểm tra Nginx có `proxy_set_header Host $host;` cho mọi tên miền
- [ ] Đăng nhập thử: Admin chính / user thường ở `login.bodhilab.io`; thành viên / người ngoài ở `giac.ngo`
- [ ] Commit thư mục `docs/`

