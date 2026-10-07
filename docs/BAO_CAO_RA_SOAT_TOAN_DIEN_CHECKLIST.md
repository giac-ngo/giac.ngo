# Rà soát toàn diện GiacNgoVN — checklist thực hiện

**Ngày rà soát:** 27/09/2026  
**Phạm vi:** rà mã nguồn + build/test sẵn có + kiểm tra giao diện cô lập với API giả lập.  
**Môi trường:** source gốc tại workspace; frontend Vite cục bộ. Không đăng nhập bằng tài khoản thật.  
**Giới hạn đã thống nhất:** không kết nối/đọc/ghi DB, không chạy thanh toán, không gọi nhà cung cấp AI/TTS/email/OAuth thật, không sửa mã sản phẩm; không Git/đối chiếu/commit/push/GitHub. Chỉ tạo báo cáo này và ảnh bằng chứng trong thư mục kết quả Codex.

## Cách đọc trạng thái

- `[x] Đã rà` — đã kiểm tra mã nguồn/tài liệu; **không đồng nghĩa** đã chạy luồng.
- `[x] Đã chạy (mock)` — giao diện/API phía client chạy với phản hồi giả lập, không chạm backend/DB thật.
- `[ ] Chưa chạy` — chưa có kết quả thực thi đáng tin cậy.
- `[!] Phát hiện` — có vấn đề hoặc rủi ro cần ưu tiên xác minh.
- **Bị chặn** — cần môi trường/dữ liệu/tài khoản/provider phù hợp; không tự suy diễn kết quả.

## Kết quả tổng quan

- [x] Đã rà cấu trúc frontend/backend, danh sách route API chính, middleware xác thực và các nhóm tính năng nêu trong bảng yêu cầu.
- [x] Đã thực hiện một số kiểm tra frontend cô lập: đăng nhập/đăng ký/quên mật khẩu (mock), tìm “Bạch Ngôn” (mock), chat streaming (mock) và gửi yêu cầu TTS (mock).
- [x] Đã dùng kết quả build/test/lint có sẵn trong lượt rà soát trước: build server đạt; build client đạt; Vitest client 5/5 đạt; lint không có error (53 warning); server Vitest không có test; E2E hiện chỉ có một smoke test tiêu đề. Các lệnh này không xác minh tích hợp thật hoặc quyền dữ liệu.
- [x] **Cập nhật sau kế hoạch GN-SEC-01/GN-QA-01:** đã thêm guard permission theo Space/AI/training data, ràng buộc SQL cho page/assets; thêm test server và E2E auth. Kết quả mới nhất: server 17/17 tests, client 5/5, Playwright 4/4; build server/client đều đạt.
- [x] Quy tắc ngôn ngữ Chat AI & TTS ép theo giao diện: Đã xác nhận là **đúng thiết kế nghiệp vụ** (UI language = System language = Response language), không cần điều chỉnh.
- [x] GN-SEC-01 đã được xử lý tại các route trang Space, cập nhật/thành viên/QR Space, quản trị AI, training data và đồng bộ Koii; thao tác page/asset ràng buộc `space_id` trong SQL. Server mock tests xác nhận quyền Space A không qua guard Space B. Chưa kiểm chứng với DB/role triển khai thật.
- [x] GN-QA-01 đã được xử lý bước nền: thêm unit/router/controller security tests và Playwright auth; kết quả cuối xem mục 17. Coverage chưa bao trùm mọi chức năng trong app.
- [ ] Chưa thể xác nhận ranh giới dữ liệu, trạng thái lưu DB, quyền admin thật, thanh toán, nội dung “Bạch Ngôn” thật, âm thanh thực tế hoặc hành vi provider do không truy cập DB/backend/tài khoản và dịch vụ thật theo giới hạn trên.

## Bằng chứng đã tạo

- [x] Ảnh giao diện thư viện với dữ liệu giả lập: `C:\Users\lam duc\.codex\visualizations\2026\09\27\01a0e0a3-98da-7cb0-9419-92dfa4f763fe\library-bach-ngon.png`
- [x] Ảnh chat streaming giả lập: `C:\Users\lam duc\.codex\visualizations\2026\09\27\01a0e0a3-98da-7cb0-9419-92dfa4f763fe\chat-stream-mock.png`
- [x] Ảnh smoke test màn login: `C:\Users\lam duc\.codex\visualizations\2026\09\27\01a0e0a3-98da-7cb0-9419-92dfa4f763fe\login-smoke.png`
- Các ảnh trên không chứa kết quả từ DB/provider thật. Mock “Bạch Ngôn” chỉ kiểm tra ô tìm kiếm, request query và cách hiển thị fixture.

## 1. Mục tiêu, mô hình nghiệp vụ và nguyên tắc

- [x] Đã ghi nhận mô hình cần bảo toàn: mỗi chùa là một Space; PracticeSpace gắn với Space; thành viên thuộc Space; từng Space có thể có domain riêng; admin chung quản lý toàn hệ thống.
- [x] Đã giới hạn thao tác theo yêu cầu hiện tại: không DB, thanh toán thật, không dịch vụ ngoài thật, không mã nguồn/GitHub.
- [ ] Chưa xác nhận dữ liệu/thực thể thật có tuân thủ mô hình trên trong DB.
- [ ] Chưa xác nhận bản backup/khả năng phục hồi; không phải điều kiện thực hiện vì không chạy thao tác DB ghi/xóa.

## 2. Chuẩn bị và lập bản đồ tính năng

- [x] Đã lập bản đồ nhóm giao diện/mã nguồn: xác thực, Space/domain, PracticeSpace, thư viện/tài liệu, hội thoại AI, TTS/dịch, billing/PayOS, CMS, media, comments/community, meditation, notifications, roles, system/admin.
- [x] Đã lập bản đồ route API chính từ `server/routes` và điểm gắn route tại `server/index.ts`.
- [x] Đã nhận diện trong mã các tích hợp/nhà cung cấp: Gemini/GPT/Groq/Grok/Ollama/Vertex; PayOS; OAuth/CMS/mạng xã hội; mail; lưu tệp; vector search (Weaviate/pgvector).
- [ ] Chưa xác nhận dịch vụ nào đang bật trong cấu hình triển khai; không đọc `.env` hoặc bí mật.
- [ ] Chưa có ma trận domain Space thật được phép thử; chưa thử domain gốc/Space A/Space B.
- [ ] Chưa có fixture DB cho hai Space, tài khoản theo vai trò, dữ liệu giao dịch hoặc test tenant.
- [x] Đã ghi rõ vai trò cần thiết theo bảng yêu cầu: khách, thành viên Space A/B, admin Space, admin chung, người không có quyền.
- [ ] Chưa chạy kiểm tra bằng các vai trò/tài khoản đó.

## 3. Đăng nhập, đăng ký và quản lý tài khoản

### Đã thực hiện

- [x] Đã rà giao diện luồng login/register/forgot/reset và API liên quan ở mức mã nguồn.
- [x] Đã chạy smoke UI với API giả lập: form login, form đăng ký, modal quên mật khẩu, trang reset thiếu token và kiểm tra hai mật khẩu không khớp.
- [x] Đã chạy kiểm tra cục bộ trước đó cho các bước UI nói trên; không gửi email và không đổi mật khẩu thật.

### Checklist còn lại

- [ ] Đăng ký hợp lệ; thiếu trường; email sai; email trùng.
- [ ] Đăng nhập đúng/sai; user khóa/vô hiệu hóa; logout; refresh và trạng thái phiên.
- [ ] JWT hết hạn/sai chữ ký; token/API key legacy; truy cập API anonymous.
- [ ] Google OAuth nếu bật: khởi tạo/callback thành công, lỗi, user trùng.
- [ ] Xem/cập nhật hồ sơ, ảnh, trường tùy chọn; đổi mật khẩu có xác minh phiên/mật khẩu cũ.
- [ ] Quên/đặt lại mật khẩu đầu-cuối bằng email thật trong môi trường thử; token hết hạn/tái sử dụng; login lại và deep link không 404.
- [ ] Tạo lại API token; kiểm tra token cũ và chính sách hiển thị.
- [ ] Thành viên nhiều Space; gỡ thành viên; quyền có thu hồi đúng trên API/socket.
- [ ] Kiểm tra phản hồi forgot-password không tiết lộ email có tồn tại.
- [ ] **Hồi quy bắt buộc:** login → reset/đổi mật khẩu → login lại → mở trang đích; ghi URL cuối.

## 4. Space, domain và ranh giới dữ liệu

- [x] Đã rà các route quản lý Space, thành viên, page, AI config và helper `canAccessSpace` / `hasSpacePermission`.
- [x] Đã thêm `requireSpacePermission`: kiểm tra đăng nhập, Space ID, quyền đúng Space; global admin được phép toàn hệ thống; chủ Space được quản lý Space mình sở hữu.
- [x] Đã thay guard union tại endpoint pages/assets, update/delete Space, members/role, QR, AI/document/training/access và Koii; page GET/UPDATE/DELETE cùng asset DELETE ràng buộc resource ID với Space ID trong SQL.
- [x] Test mock: route cho Space 1 trả đạt với role Space 1 và trả 403 khi đổi sang Space 2; controller không đọc/xóa page/asset khác Space.
- [x] Đã rà cấu hình custom domain/CORS và middleware phân luồng domain trong `server/index.ts` ở mức mã nguồn.
- [x] GN-SEC-01: các route thuộc phạm vi kế hoạch đã chuyển sang guard scoped; route test thay Space ID trả 403. Các API ngoài phạm vi sửa vẫn cần audit riêng trước khi coi toàn hệ thống đã hết IDOR.
- [ ] Tạo/sửa/xóa Space; slug/domain trùng, sai, chưa gắn, không phân giải.
- [ ] Mở domain gốc/A/B cùng phiên; theme/logo/favicon/page/config đúng Space; chuyển Space và logout/login không giữ nhầm trạng thái.
- [ ] Trang public/published/unpublished/not found.
- [ ] Thành viên A đọc/sửa/xóa tài nguyên B qua giao diện/API/URL/body/query.
- [ ] Admin Space A quản lý thành viên, AI, tài liệu, billing, CMS, cấu hình B.
- [ ] Kiểm tra dashboard, search, suggestions, notifications, export không trộn dữ liệu.
- [ ] Admin chung có quyền toàn cục; thao tác nhạy cảm được giới hạn/log.
- [ ] Socket `join-space`/`join-user` thử đúng/sai Space/user; thu hồi quyền thành viên.

## 5. Thư viện, bài viết, tìm kiếm và phân loại

- [x] Đã rà code client API và trang thư viện/chi tiết ở mức tĩnh.
- [x] Đã chạy tìm kiếm bằng fixture giả lập: chuỗi “Bạch Ngôn” có gửi query sau debounce và fixture xuất hiện trên UI; đã chụp ảnh.
- [x] Đã kiểm tra bằng fixture phần chọn nội dung tiếng Anh và URL audio tiếng Anh khi dữ liệu có trường tương ứng.
- [ ] Tìm “Bạch Ngôn” thật có dấu/không dấu/một phần; xác nhận bài, tác giả, Space và trạng thái xuất bản từ nguồn thật.
- [ ] Mở bài thật, refresh, back, tìm từ Space khác; xác nhận không lọc nhầm tác giả/chủ đề/quyền.
- [ ] Phân trang, sắp xếp, filters, chủ đề, tác giả, loại bài, tags.
- [ ] Từ không dấu, tiếng Anh, viết tắt, cụm từ, dấu câu, không có kết quả, lỗi API, kết quả trùng/ẩn/gỡ.
- [ ] Nội dung dài, hình/link/nhúng/ký tự đặc biệt; lượt xem/thích/recommendations.
- [ ] Phân biệt nội dung toàn cục và nội dung riêng Space; CRUD và quyền.

## 6. Dịch thư viện Anh ↔ Việt

- [x] Đã xác định API dịch và chỗ dùng trong màn quản trị tài liệu; trang đọc ưu tiên trường dịch đã lưu nếu có.
- [ ] Dịch Anh→Việt và Việt→Anh bằng provider thật; tiêu đề, nhiều đoạn, trích dẫn, danh sách, thuật ngữ, tên riêng, chú thích, link.
- [ ] Nội dung ngắn/dài, HTML/Markdown, viết tắt; giữ cấu trúc và ngữ nghĩa.
- [ ] Xác minh bản dịch không ghi đè bản gốc, gắn đúng bài, giữ sau reload/đổi ngôn ngữ.
- [ ] Dịch liên tiếp/đổi chiều/dịch lại; trạng thái pending/success/error/retry; không hiển thị bản một phần là hoàn tất.
- [ ] Provider lỗi/timeout; quyền lưu và phạm vi Space; kiểm tra nghĩa, không chỉ văn phong.

## 7. Audio, TTS và giọng đọc

- [x] Đã rà lựa chọn TTS ở PracticeSpace: cấu hình giọng AI/Space và fallback giọng mặc định.
- [x] Đã chạy request TTS giả lập từ chat English với giao diện Việt: request thực tế trong mock có `text` tiếng Anh nhưng `lang: "vi"`, voice `Kore`, model Gemini TTS; không phát audio của provider.
- [x] Đã rà fallback Web Speech trong PracticeSpace: locale gắn theo ngôn ngữ giao diện (`vi-VN`/`en-US`). Đây là rủi ro đọc sai ngôn ngữ khi câu trả lời khác ngôn ngữ UI.
- [ ] Xác định danh sách giọng thực tế, giọng mặc định và hỗ trợ theo provider/model.
- [ ] Nghe mẫu giọng Việt/Anh, tên riêng/Hán Việt, chữ viết tắt, số/ngày/giờ/tiền/ký hiệu/URL; ghi âm thanh thực tế và giọng chọn.
- [ ] Đổi giọng trước/đang/sau phát; lưu theo user/Space/session; Space A không tác động B.
- [ ] Play/pause/resume/stop/replay/seek/chuyển đoạn; double-click không phát chồng.
- [ ] Điều hướng/đổi bài/đổi bản dịch/đóng modal/reload/background/offline; trạng thái loading/error/retry.
- [ ] Kiểm tra audio bài thư viện, bản dịch, câu trả lời AI, PracticeSpace và các vị trí đọc khác.
- [x] **Xác nhận thiết kế:** Ngôn ngữ TTS lấy theo locale/ngôn ngữ UI là đúng thiết kế nghiệp vụ đồng bộ UI, đảm bảo đồng nhất với ngôn ngữ AI xuất ra.

## 8. Chat AI và yêu cầu trả lời bằng ngôn ngữ khác

- [x] Đã rà đường truyền ngôn ngữ: PracticeSpace truyền ngôn ngữ UI; backend nhận mặc định `vi`; prompt Gemini hiện ra chỉ thị bắt buộc trả lời tiếng Việt khi `language === "vi"`.
- [x] **Đính chính phát hiện trước:** PracticeSpace **có truyền** tham số ngôn ngữ. Nhận định trước của mình rằng thiếu tham số là sai.
- [x] Đã chạy mock chat: UI tiếng Việt gửi câu hỏi “Please reply in English: What is mindfulness?”; request mang `language: "vi"`; UI render câu trả lời tiếng Anh do fixture chủ động trả như vậy. Kết quả này không chứng minh model thật bỏ qua chỉ thị hệ thống.
- [x] **Xác nhận thiết kế nghiệp vụ:** Quy tắc ép ngôn ngữ đầu ra theo ngôn ngữ UI (UI Việt -> câu trả lời tiếng Việt, UI Anh -> câu trả lời tiếng Anh) là hành vi mong muốn theo đúng thiết kế của hệ thống; không cần sửa đổi logic hay tách tham số.
- [ ] Chạy sáu tổ hợp trong bảng yêu cầu: UI Việt/Việt/Anh; Việt/Anh/Việt; Anh/Anh/Việt; prompt trộn; nguồn tiếng Anh trả lời Việt; nguồn tiếng Việt explain English.
- [ ] Chỉ dẫn đầu/cuối/giữa prompt; hội thoại nhiều lượt đổi ngôn ngữ; ngôn ngữ đầu ra nhất quán.
- [ ] Câu dài, bảng/list/Markdown/trích dẫn; viết tắt/Phật học/tên riêng; prompt mơ hồ/sai chính tả/không dấu/trộn ngôn ngữ.
- [ ] Kiểm tra nêu giả định/hỏi lại; hạn chế bịa thông tin/nguồn.
- [ ] Hội thoại mới/cũ, reload, đổi tên, xóa, feedback; đổi conversation ID để thử đọc hội thoại khác.
- [ ] AI config theo Space, quota/permission; không dùng config/keys của Space khác.

## 9. AI streaming, audio trong lúc stream và giọng đọc

- [x] Đã chạy một luồng SSE giả lập tới UI: nội dung cuối render, request được gửi, không có lỗi JavaScript trên trang.
- [x] Ảnh bằng chứng: `chat-stream-mock.png`; câu trả lời và provider đều là fixture.
- [ ] Xác minh token xuất hiện dần, đúng thứ tự, không lặp/mất/đảo.
- [ ] Kết thúc stream và lỗi giữa chừng; lỗi không bị hiển thị thành câu trả lời hoàn chỉnh.
- [ ] Hủy, gửi mới, đổi hội thoại, reload, mất mạng, timeout/provider lỗi, retry không nhân đôi.
- [ ] Đầu ra đa ngôn ngữ xuyên suốt một stream.
- [ ] TTS trong khi stream: thời điểm đọc, chunk sentence, hủy/stop thật, không đọc đoạn cũ/trùng; hoặc đợi stream kết thúc và đọc đúng bản cuối.
- [ ] Viết tắt/thuật ngữ tách token; không phát âm lặp khi stream cập nhật.

## 10. PracticeSpace và hoạt động tu tập

- [x] Đã rà mã trang và xác định lời gọi streaming, cấu hình voice, locale SpeechSynthesis.
- [ ] Mở PracticeSpace khách/thành viên Space A/thành viên B/admin; xác nhận quyền.
- [ ] Danh sách bài/hướng dẫn, tiến độ/lịch sử/nội dung cá nhân; lưu đúng user+Space; reload không mất/trùng.
- [ ] TTS/giọng/ngôn ngữ và phát nền.
- [ ] Timer start/pause/resume/end; đổi trang/app background.
- [ ] Microphone nếu có: cấp/từ chối quyền, không thiết bị, mất thiết bị, lỗi thu.
- [ ] A không đọc/sửa tiến độ B bằng URL/API ID.

## 11. Thanh toán, quyên góp và quyền lợi

- [x] Đã nhận diện route PayOS/billing và các handler chính ở mức route inventory.
- [ ] Không chạy tiền thật; hiện chưa chạy sandbox vì không có cấu hình/môi trường xác nhận.
- [ ] Tạo đơn thành công/hủy/thất bại/hết hạn/quay về; PayOS/Stripe tách cấu hình Space và bí mật.
- [ ] Webhook chữ ký sai/đúng, duplicate, sai thứ tự, retry, idempotency.
- [ ] Sửa amount/userId/spaceId/orderId từ client; kiểm chứng server với giao dịch provider.
- [ ] Subscription, AI quota, expiry, top-up, donations/QR/manual, refund, withdrawal approve/reject.
- [ ] Lịch sử/export/stats/public donation list chỉ hiện dữ liệu được phép; giao dịch A không lộ ở B.

## 12. Admin chung và admin Space

- [x] Đã lập bản đồ nhóm API/admin trong route inventory: dashboard, users/roles/Space, AI, tài liệu, CMS, media, system/mail, notifications, billing.
- [!] Đã phát hiện điểm cần rà sâu về dùng `checkPermission` tổng hợp trên route có Space ID (mục 4). Cần xác minh phân quyền thực tế ở từng handler và không coi UI ẩn nút là kiểm soát bảo mật.
- [ ] Với từng nhóm: role xem/tạo/sửa/xóa/export; tài khoản thiếu quyền gọi API trực tiếp.
- [ ] Thay ID thành tài nguyên Space khác; kiểm tra status, dữ liệu sau reload.
- [ ] Dashboard; thành viên/user/owner/role; AI/model/training/conversation; thư viện/tài liệu/comments/meditation.
- [ ] Media/files/pages/templates/system config/mail/notifications/payment/packages/withdrawal.
- [ ] CMS/OAuth/webhook/social publishing.
- [ ] Thao tác nguy hiểm có phạm vi, audit log và khôi phục phù hợp.

## 13. Tệp, media, tài liệu và nhập/xuất

- [x] Đã nhận diện routes upload/media/documents/extract-text/import/export trong mã nguồn.
- [ ] Upload ảnh/audio/video/PDF/Word; loại sai/rỗng/quá lớn/nhiều tệp/tên đặc biệt.
- [ ] Quyền upload/delete theo Space; URL riêng không đoán được; thử IDOR.
- [ ] Xóa document xử lý liên kết, training data và storage đúng.
- [ ] Import/export rỗng/lớn/Unicode/trùng/lỗi định dạng/quyền download.
- [ ] Lỗi giữa chừng không để dữ liệu nửa hoàn tất hoặc file mồ côi.

## 14. Cộng đồng, bình luận, thông báo và email

- [x] Đã lập bản đồ route comments/space-social/notifications/mail/CMS.
- [ ] Post CRUD, ảnh, comment, like, follow, bookmark, pin/saved; sửa/xóa của mình so với người khác.
- [ ] Feed/notification đúng Space và audience; unread count/multi-tab.
- [ ] Broadcast preview recipient/scope, safe test send, lỗi gửi.
- [ ] Email template/ngôn ngữ/reset link hết hạn; không lộ tài khoản qua phản hồi công khai.

## 15. Giao diện, trình duyệt và phục hồi

- [x] Đã chạy UI headless cục bộ với mock cho một số màn auth/library/chat; chưa ghi nhận lỗi JavaScript trong chat run.
- [x] Đã có ảnh chụp màn hình smoke login, kết quả tìm kiếm fixture, chat fixture.
- [ ] Desktop/tablet/mobile; tiếng Việt/Anh; màn nhỏ/nội dung dài.
- [ ] Menu/back/forward/deep link/refresh/mở URL trực tiếp; 401/403/404 sau reset.
- [ ] Loading/empty/error/success/retry; API chậm/treo/mất mạng/500/session hết hạn khi nhập.
- [ ] Console/network toàn ứng dụng, request trùng, lỗi nhạy cảm, danh sách lớn, chat/audio dài.
- [ ] Accessibility cơ bản: bàn phím/focus/label/contrast/screen-reader state.

## 16. API, bảo mật và nhất quán dữ liệu

- [x] Đã rà vị trí `authenticateToken` toàn cục: middleware xác thực token có thể đặt `req.user = null`; do đó từng route/controller phải yêu cầu đăng nhập hoặc chủ động cho phép public.
- [x] Đã rà một số guard quan trọng: conversation CRUD có kiểm tra owner/admin; message streaming và một số route public cần rà permission/chi phí độc lập.
- [x] GN-SEC-01 đã sửa và có test tự động cho Space pages, member management, AI config/training access; **chưa** đồng nghĩa audit mọi API nhạy cảm toàn ứng dụng.
- [ ] Kiểm tra các API nhạy cảm còn lại có `isAuthenticated`/permission guard và ràng buộc đúng owner + Space; CMS/finance/media/social cần đánh giá riêng.
- [ ] Thử unauthenticated/invalid/expired JWT và forged token trên endpoints nhạy cảm.
- [ ] IDOR user/space/document/conversation/transaction; xác nhận 401/403/404 và không rò dữ liệu.
- [ ] Input validation, payload quá lớn, HTML/script XSS, upload, SQL injection; chỉ bằng payload an toàn trên test env.
- [x] Đã thấy limiter trong source cho login/register, forgot/reset, chat và TTS.
- [ ] Đo rate-limit thực tế, kiểm tra upload/API tốn tiền/provider khác.
- [ ] Rà log để chắc chắn không ghi token/password/API key/PII; kiểm tra log runtime đã loại bí mật.
- [ ] Thao tác đồng thời/double submit/retry và đối chiếu UI/API/DB test.

## 17. Nhật ký kiểm tra và phân loại ưu tiên

| ID | Mức | Phát hiện / ca | Trạng thái | Bằng chứng / bước tiếp |
|---|---|---|---|---|
| GN-SEC-01 | P1 | Guard union tại các endpoint Space/AI trong kế hoạch đã chuyển sang scoped checks; SQL page/assets buộc resource thuộc Space đó. | Đã sửa; server mock tests đạt; chưa thử DB thật. | Mở rộng nguyên tắc sang route nhạy cảm khác; xác minh staging với hai Space. |
| GN-QA-01 | P1 | Đã thêm auth middleware, route security, controller scope và Playwright auth tests. | Đã xử lý phần nền: server 17/17, client 5/5, Playwright 4/4. Chưa bao phủ toàn bộ 18 nhóm. | Bổ sung ma trận AI/TTS, thư viện, billing sandbox, uploads và admin. |
| GN-AI-01 | Đã đóng | Ép ngôn ngữ AI theo ngôn ngữ UI. | Đúng thiết kế nghiệp vụ (As Designed). | UI language = System directive language; không cần điều chỉnh logic. |
| GN-TTS-01 | Đã đóng | Đồng bộ ngôn ngữ TTS theo UI. | Đúng thiết kế nghiệp vụ (As Designed). | Đồng bộ với câu trả lời của AI vốn đã được ép theo UI language; không cần sửa. |
| GN-SEARCH-01 | Thông tin | Yêu cầu tìm “Bạch Ngôn” trên dữ liệu thật. | Mock đạt; dữ liệu thật chờ môi trường DB. | Chạy kiểm tra khi có môi trường DB test. |

GN-SEC-01 và GN-QA-01 đã có thay đổi code/test cục bộ; không có phát hiện P0 đã được chứng minh. Các test hiện dùng mock, không phải xác nhận trên dữ liệu production.

## 18. Thứ tự thực hiện và trạng thái hiện tại

| Bước | Hạng mục | Trạng thái |
|---:|---|---|
| 1 | Lập bản đồ tính năng, vai trò, domain, tích hợp | **Đã rà source sơ bộ**; thiếu cấu hình runtime/domain và tài khoản. |
| 2 | Môi trường thử nghiệm, backup, dữ liệu có thể khôi phục | **Không thực hiện** theo giới hạn không kiểm tra DB; không có ghi/xóa DB trong báo cáo này. |
| 3 | Đăng nhập, phân quyền, ranh giới Space | **Một phần đã test mock:** auth E2E 3 ca; server middleware/router/controller tests; chưa thử DB/tài khoản hai Space thật. |
| 4 | Thư viện, tìm kiếm, dịch, TTS, “Bạch Ngôn” | **Một phần**: search mock; source review; provider/audio/dữ liệu thật chưa kiểm tra. |
| 5 | Chat AI, đầu ra ngôn ngữ, viết tắt, streaming | **Một phần**: stream mock; tìm thấy rủi ro ngôn ngữ source; provider thật chưa kiểm tra. |
| 6 | PracticeSpace, tiến độ, audio | **Source review**; luồng lưu tiến độ và quyền chưa chạy. |
| 7 | Admin, CMS, tệp, cộng đồng, thông báo | **Route/source inventory**; CRUD, role và cross-space chưa chạy. |
| 8 | Thanh toán sandbox | **Chưa chạy**; chưa có sandbox xác thực. |
| 9 | Lỗi, hiệu năng, trình duyệt, phục hồi | **Chưa chạy toàn diện**; chỉ smoke UI/build/lint đã nêu. |
| 10 | Tổng hợp P0/P1 và hồi quy | GN-SEC-01/GN-QA-01 đã xử lý ở bước code + test cục bộ; các P1 còn lại cần xác minh trên môi trường phù hợp. |

## Để tiếp tục kiểm tra được các mục còn trống

Không cần gửi mật khẩu, token hoặc secret vào chat. Khi muốn chạy runtime tests, cần chọn cách cấp môi trường thử an toàn (ví dụ test deployment với tài khoản theo vai trò và dữ liệu hai Space). Để kiểm tra dịch vụ ngoài cần provider sandbox/test credentials được cấu hình trực tiếp trong môi trường đó. Đến khi có môi trường thích hợp, các mục đánh dấu `[ ]` vẫn là chưa kiểm tra, không được hiểu là đạt.
