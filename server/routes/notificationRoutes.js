// server/routes/notificationRoutes.js
import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';

const router = Router();

// Tất cả routes notification đều yêu cầu đăng nhập và quyền admin
// Middleware xác thực đã được mount ở cấp routes/index.js (authenticateToken)

// POST /api/notifications/broadcast — Gửi thông báo hàng loạt (chỉ admin)
router.post('/broadcast', async (req, res) => {
    // Kiểm tra quyền admin/superadmin
    const user = req.user;
    if (!user || (!user.permissions?.includes('users') && !user.permissions?.includes('settings'))) {
        return res.status(403).json({ error: 'Bạn không có quyền gửi thông báo hàng loạt.' });
    }
    return notificationController.broadcastNotification(req, res);
});

// GET /api/notifications/logs — Lịch sử thông báo đã gửi (chỉ admin)
router.get('/logs', async (req, res) => {
    const user = req.user;
    if (!user || (!user.permissions?.includes('users') && !user.permissions?.includes('settings'))) {
        return res.status(403).json({ error: 'Bạn không có quyền xem lịch sử thông báo.' });
    }
    return notificationController.getLogs(req, res);
});

// GET /api/notifications/recipients-preview — Preview số lượng người nhận
router.get('/recipients-preview', async (req, res) => {
    const user = req.user;
    if (!user || (!user.permissions?.includes('users') && !user.permissions?.includes('settings'))) {
        return res.status(403).json({ error: 'Không có quyền truy cập.' });
    }
    return notificationController.previewRecipients(req, res);
});

// GET /api/notifications/members-list — Lấy danh sách thành viên để chọn khi gửi thông báo
router.get('/members-list', async (req, res) => {
    const user = req.user;
    if (!user || (!user.permissions?.includes('users') && !user.permissions?.includes('settings'))) {
        return res.status(403).json({ error: 'Không có quyền truy cập.' });
    }
    return notificationController.getMembersList(req, res);
});

export default router;
