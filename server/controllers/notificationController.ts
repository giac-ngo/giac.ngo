import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
// server/controllers/notificationController.ts
// Controller xử lý gửi thông báo hàng loạt đến thành viên qua Email
import { pool, mapRowToCamelCase } from '../db.js';
import { sendBulkEmail } from '../services/broadcastMailService.js';
import { User } from '../types/index.js';

interface Recipient {
    id: number;
    name: string;
    email: string;
    spaceId: number;
}

// ─── Helper: lấy danh sách recipient theo targetGroup ────────────────────────
async function getRecipients(targetGroup: string, user: User | null | undefined, req: Request): Promise<Recipient[]> {
    const isSuperAdmin = user?.permissions?.includes('users') || user?.permissions?.includes('roles');
    let query;
    let params: any[] = [];

    if (!isSuperAdmin && targetGroup === 'space_owners') {
        return [];
    }

    switch (targetGroup) {
        case 'space_owners':
            // Chỉ những user có ít nhất 1 Space
            query = `
                SELECT DISTINCT u.id, u.name, u.email, (
                    SELECT MIN(id) FROM spaces WHERE user_id = u.id
                ) as space_id
                FROM users u
                JOIN spaces s ON u.id = s.user_id
                WHERE u.is_active = true AND u.email IS NOT NULL
                ORDER BY u.name ASC
            `;
            break;
            // Tất cả user active
        case 'all':
        default: {
            if (req?.query?.spaceId || req?.body?.spaceId) {
                const spaceId = req.query?.spaceId || req.body?.spaceId;
                query = `
                    SELECT u.id, u.name, u.email, $1::int as space_id
                    FROM users u 
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    AND u.id IN (SELECT user_id FROM space_members WHERE space_id = $1)
                    ORDER BY u.id ASC
                `;
                params.push(parseInt(spaceId as string, 10));
            } else if (!isSuperAdmin && user) {
                query = `
                    SELECT u.id, u.name, u.email, COALESCE((
                        SELECT MIN(space_id) FROM space_members WHERE user_id = u.id AND space_id IN (SELECT id FROM spaces WHERE user_id = $1)
                    ), 1) as space_id
                    FROM users u 
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    AND u.id IN (SELECT user_id FROM space_members WHERE space_id IN (SELECT id FROM spaces WHERE user_id = $1))
                    ORDER BY u.id ASC
                `;
                params.push(user.id);
            } else {
                query = `
                    SELECT u.id, u.name, u.email, COALESCE((
                        SELECT MIN(space_id) FROM space_members WHERE user_id = u.id
                    ), 1) as space_id
                    FROM users u 
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    ORDER BY u.id ASC
                `;
            }
            break;
        }
    }
    const res = await pool.query(query, params);
    return res.rows.map((r: any) => ({ id: r.id, name: r.name, email: r.email, spaceId: r.space_id }));
}

// ─── Controller methods ───────────────────────────────────────────────────────
export const notificationController = {

    /**
     * POST /api/notifications/broadcast
     * Gửi thông báo hàng loạt (chỉ admin)
     * Body: { title, body, channel, targetGroup }
     */
    async broadcastNotification(req: Request, res: Response) {
        const { title, body, channel = 'email', targetGroup = 'all', testEmails = [] } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Tiêu đề và nội dung không được để trống.' });
        }

        if (!['email', 'both'].includes(channel)) {
            return res.status(400).json({ error: 'Kênh gửi không hợp lệ. Dùng: email, both.' });
        }

        if (!['all', 'space_owners', 'test'].includes(targetGroup)) {
            return res.status(400).json({ error: 'Nhóm đối tượng không hợp lệ.' });
        }

        try {
            let recipients: Recipient[] = [];
            if (targetGroup === 'test') {
                if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
                    return res.status(400).json({ error: 'Vui lòng cung cấp danh sách email gửi test.' });
                }
                recipients = testEmails.map(email => ({ id: 0, name: 'Test User', email: String(email).trim(), spaceId: 1 })).filter((r: Recipient) => r.email);
            } else {
                recipients = await getRecipients(targetGroup, req.user, req);
            }

            if (recipients.length === 0) {
                return res.status(400).json({ error: 'Không tìm thấy thành viên nào phù hợp.' });
            }

            let sent = 0, failed = 0;

            // Lấy emailTemplate từ space
            let emailTemplate = null;
            const spaceId = req.body?.spaceId;
            if (spaceId) {
                const spaceRes = await pool.query('SELECT email_template FROM spaces WHERE id = $1', [parseInt(spaceId, 10)]);
                emailTemplate = spaceRes.rows[0]?.email_template || null;
                logger.info(`[Broadcast] spaceId=${spaceId}, emailTemplate=${emailTemplate ? 'FOUND ('+emailTemplate.length+' chars)' : 'NULL'}`);
            } else {
                // Fallback: lấy template từ space đầu tiên của user hiện tại
                const userSpaceRes = await pool.query(
                    'SELECT email_template FROM spaces WHERE user_id = $1 AND email_template IS NOT NULL ORDER BY id ASC LIMIT 1',
                    [req.user?.id]
                );
                emailTemplate = userSpaceRes.rows[0]?.email_template || null;
                logger.info(`[Broadcast] No spaceId provided. Fallback template from user spaces: ${emailTemplate ? 'FOUND' : 'NULL'}`);
            }

            // Gửi Email
            if (channel === 'email' || channel === 'both') {
                const result = await sendBulkEmail({
                    recipients: recipients as any[],
                    subject: title,
                    title,
                    body,
                    emailTemplate, // template đã cấu hình từ Space
                    delayMs: 250, // 4 emails/giây — an toàn với LarkSuite
                });
                sent = result.sent;
                failed = result.failed;
            }

            // Ghi log vào DB
            await pool.query(
                `INSERT INTO notification_logs (title, body, channel, target_group, sent_count, failed_count, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [title, body, channel, targetGroup, sent, failed, req.user?.id || null]
            );

            return res.json({
                success: true,
                message: `Đã gửi xong. Thành công: ${sent}, Thất bại: ${failed}.`,
                sent,
                failed,
                totalRecipients: recipients.length,
            });

        } catch (err: unknown) {
            logger.error('[Broadcast] Unexpected error:', err);
            return res.status(500).json({ error: 'Lỗi server khi gửi thông báo.', details: (err instanceof Error ? err.message : String(err)) });
        }
    },

    /**
     * GET /api/notifications/logs
     * Lịch sử thông báo đã gửi (chỉ admin)
     */
    async getLogs(req: Request, res: Response) {
        try {
            const { limit = '20', page = '1' } = req.query;
            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);
            const offset = (pageNum - 1) * limitNum;

            const [logsRes, countRes] = await Promise.all([
                pool.query(`
                    SELECT nl.*, u.name as created_by_name
                    FROM notification_logs nl
                    LEFT JOIN users u ON nl.created_by = u.id
                    ORDER BY nl.created_at DESC
                    LIMIT $1 OFFSET $2
                `, [limitNum, offset]),
                pool.query('SELECT COUNT(*) FROM notification_logs')
            ]);

            const logs = logsRes.rows.map(mapRowToCamelCase);
            const total = parseInt(countRes.rows[0].count);

            return res.json({
                logs,
                total,
                page: pageNum,
                totalPages: Math.ceil(total / limitNum),
            });
        } catch (err: unknown) {
            logger.error('[Notification Logs] Error:', err);
            res.status(500).json({ error: 'Không thể tải lịch sử thông báo.' });
        }
    },

    /**
     * GET /api/notifications/members-list
     * Lấy danh sách thành viên để chọn khi soạn thông báo
     * Query: spaceId (optional), search (optional)
     */
    async getMembersList(req: Request, res: Response) {
        const { spaceId, search = '' } = req.query;
        const user = req.user;
        const isSuperAdmin = user?.permissions?.includes('users') || user?.permissions?.includes('roles');
        try {
            let query;
            let params: any[] = [];
            const searchPattern = search ? `%${search}%` : '%';

            if (spaceId) {
                query = `
                    SELECT u.id, u.name, u.email
                    FROM users u
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    AND u.id IN (SELECT user_id FROM space_members WHERE space_id = $1)
                    AND (u.name ILIKE $2 OR u.email ILIKE $2)
                    ORDER BY u.name ASC
                    LIMIT 200
                `;
                params = [parseInt(spaceId as string, 10), searchPattern];
            } else if (!isSuperAdmin && user) {
                query = `
                    SELECT u.id, u.name, u.email
                    FROM users u
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    AND u.id IN (SELECT user_id FROM space_members WHERE space_id IN (SELECT id FROM spaces WHERE user_id = $1))
                    AND (u.name ILIKE $2 OR u.email ILIKE $2)
                    ORDER BY u.name ASC
                    LIMIT 200
                `;
                params = [user.id, searchPattern];
            } else {
                query = `
                    SELECT u.id, u.name, u.email
                    FROM users u
                    WHERE u.is_active = true AND u.email IS NOT NULL
                    AND (u.name ILIKE $1 OR u.email ILIKE $1)
                    ORDER BY u.name ASC
                    LIMIT 200
                `;
                params = [searchPattern];
            }

            const result = await pool.query(query, params);
            return res.json({ members: result.rows });
        } catch (err: unknown) {
            logger.error('[getMembersList] Error:', err);
            return res.status(500).json({ error: 'Không thể tải danh sách thành viên.' });
        }
    },

    /**
     * GET /api/notifications/recipients-preview
     * Xem trước danh sách người nhận theo targetGroup (để admin tham khảo trước khi gửi)
     */
    async previewRecipients(req: Request, res: Response) {
        const { targetGroup = 'all', testEmails } = req.query;
        try {
            if (targetGroup === 'test') {
                let emails: string[] = [];
                try { emails = JSON.parse(testEmails as string || '[]'); } catch (e: unknown) {}
                const validEmails = emails.map(e => ({ name: 'Test User', email: String(e).trim() })).filter((r: any) => r.email);
                return res.json({
                    count: validEmails.length,
                    preview: validEmails.slice(0, 10),
                });
            }
            const recipients = await getRecipients(targetGroup as string, req.user, req);
            return res.json({
                count: recipients.length,
                // Trả về tối đa 10 email đầu để preview (không lộ hết danh sách)
                preview: recipients.slice(0, 10).map((r: Recipient) => ({ name: r.name, email: r.email })),
            });
        } catch (err: unknown) {
            return res.status(500).json({ error: 'Không thể tải danh sách người nhận.' });
        }
    },
};

