// shared/permissions.js
// Fallback export to ensure compatibility with ESM loaders looking for permissions.js

export const SYSTEM_PERMISSIONS = [
    'system',          // Quản trị toàn hệ thống, database, reset weaviate schema
    'manual-billing',   // Xuất toàn bộ giao dịch của toàn bộ nền tảng
    'finetune',        // Xuất dữ liệu finetune toàn hệ thống
    'mail-server',     // Cấu hình SMTP mail server hệ thống
];

export const SPACE_PERMISSIONS = [
    'dashboard',        // Xem thống kê & báo cáo Không gian
    'spaces',           // Cấu hình thông tin Không gian
    'roles',            // Quản lý vai trò & phân quyền thành viên trong Không gian
    'users',            // Quản lý danh sách thành viên trong Không gian
    'pricing',          // Quản lý bảng giá & gói cúng dường Không gian
    'files',            // Quản lý tệp, tài liệu & danh mục tài liệu của Không gian
    'media-library',    // Quản lý thư viện hình ảnh, video, âm thanh của Không gian
    'cms_write',        // Soạn thảo và gửi duyệt bài viết CMS
    'cms_approve',      // Phê duyệt, xuất bản bài viết CMS & kết nối fanpage
    'social',           // Tham gia mạng xã hội nội bộ Không gian (đọc, đăng, tương tác)
    'social-moderate',  // Kiểm duyệt bài viết, ghim bài & xóa bài/bình luận của người khác
    'notifications',    // Gửi thông báo & email đến thành viên của Không gian
    'space-billing',    // Quản lý ví & tài chính của Không gian
    'payment-settings', // Cấu hình tài khoản thanh toán / Stripe Connect của Không gian
    'withdrawals',      // Yêu cầu rút tiền từ ví Không gian
    'dharma-talks',     // Quản lý bài Pháp Thoại của Không gian
    'meditation',       // Quản lý các bài Thiền của Không gian
    'ai',               // Cấu hình & quản lý trợ lý AI của Không gian
    'conversations',    // Quản lý các phiên hội thoại AI trong Không gian
    'comments',         // Quản lý bình luận
    'templates',        // Quản lý giao diện & trang tùy chỉnh của Không gian
    'domain',           // Cấu hình tên miền riêng cho Không gian
];

export const GLOBAL_ONLY_PERMISSIONS = new Set(SYSTEM_PERMISSIONS);

export function isGlobalOnlyPermission(permission) {
    return GLOBAL_ONLY_PERMISSIONS.has(permission);
}
