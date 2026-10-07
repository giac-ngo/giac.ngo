import { Request, Response, NextFunction } from 'express';
// server/routes/notificationRoutes.js
import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { can } from '../utils/policy.js';

const router = Router();

async function requireNotificationPermission(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    const rawSpaceId = req.query.spaceId || req.body?.spaceId;
    const scope = rawSpaceId ? { spaceId: String(rawSpaceId) } : 'global';
    const allowed = await can(req.user, 'notifications', scope);
    if (!allowed) {
        return res.status(403).json({
            error: rawSpaceId
                ? 'Bạn không có quyền quản lý thông báo trong Không gian này.'
                : 'Chỉ Global Admin mới có quyền quản lý thông báo toàn hệ thống.'
        });
    }
    next();
}

// POST /api/notifications/broadcast — Gửi thông báo hàng loạt
router.post('/broadcast', requireNotificationPermission, notificationController.broadcastNotification);

// GET /api/notifications/logs — Lịch sử thông báo đã gửi
router.get('/logs', requireNotificationPermission, notificationController.getLogs);

// GET /api/notifications/recipients-preview — Preview số lượng người nhận
router.get('/recipients-preview', requireNotificationPermission, notificationController.previewRecipients);

// GET /api/notifications/members-list — Lấy danh sách thành viên để chọn khi gửi thông báo
router.get('/members-list', requireNotificationPermission, notificationController.getMembersList);

export default router;
