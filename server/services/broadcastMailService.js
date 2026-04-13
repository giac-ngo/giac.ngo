// server/services/broadcastMailService.js
// Dịch vụ gửi email hàng loạt đến thành viên (throttled để không bị SMTP block)
import { mailService } from './mailService.js';

/**
 * Tạo HTML template mặc định (fallback khi Space chưa cấu hình template)
 */
function buildDefaultEmailHtml(title, bodyHtml, recipientName = 'Thành viên') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c4f2f 0%,#a0522d 50%,#6b3922 100%);padding:40px 40px 30px;text-align:center;">
              <h2 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;line-height:1.3;">${title}</h2>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#6b5b4e;margin:0 0 20px;font-size:15px;line-height:1.5;">
                Kính gửi <strong>${recipientName}</strong>,
              </p>
              <div style="color:#3d2c20;font-size:15px;line-height:1.8;">
                ${bodyHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;border-top:1px solid #e8ddd6;">
              <p style="color:#a89080;font-size:12px;margin:0;line-height:1.6;">
                Đây là email tự động từ hệ thống.<br>
                Vui lòng không trả lời trực tiếp email này.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Tạo HTML email — ưu tiên dùng custom emailTemplate từ Space nếu có
 * @param {string} title - Tiêu đề email
 * @param {string} body - Nội dung (text thuần, \n cho xuống dòng)
 * @param {string} recipientName - Tên người nhận
 * @param {string|null} emailTemplate - Custom HTML template có placeholder {{content}}
 */
function buildEmailHtml(title, body, recipientName = 'Thành viên', emailTemplate = null) {
    const bodyHtml = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    if (emailTemplate && emailTemplate.includes('{{content}}')) {
        // Dùng ĐÚNG template đã cấu hình — chỉ thay {{content}} bằng nội dung thông báo
        // Không thêm bất kỳ wrapper hay lời chào nào để giữ 100% layout của template
        return emailTemplate.replace('{{content}}', bodyHtml);
    }

    // Fallback: template mặc định
    return buildDefaultEmailHtml(title, bodyHtml, recipientName);
}

/**
 * Gửi email hàng loạt đến danh sách thành viên
 * @param {object} opts
 * @param {Array<{email: string, name: string, spaceId?: number}>} opts.recipients
 * @param {string} opts.subject - Tiêu đề email (subject line)
 * @param {string} opts.title - Tiêu đề hiển thị bên trong email
 * @param {string} opts.body - Nội dung thông báo (text thuần)
 * @param {string|null} [opts.emailTemplate] - Custom HTML template từ Space
 * @param {number} [opts.delayMs=200] - Thời gian chờ giữa mỗi email (ms)
 * @returns {Promise<{sent: number, failed: number, errors: Array}>}
 */
export async function sendBulkEmail({ recipients, subject, title, body, emailTemplate = null, delayMs = 200 }) {
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const recipient of recipients) {
        try {
            const htmlBody = buildEmailHtml(title || subject, body, recipient.name || 'Thành viên', emailTemplate);
            const textBody = `Kính gửi ${recipient.name || 'Thành viên'},\n\n${body}`;

            await mailService.sendBroadcastEmail({
                to: recipient.email,
                toName: recipient.name || '',
                subject,
                htmlBody,
                textBody,
                options: { spaceId: recipient.spaceId }
            });

            sent++;
            console.log(`[Broadcast] Sent (${sent}/${recipients.length}): ${recipient.email}`);
        } catch (err) {
            failed++;
            errors.push({ email: recipient.email, error: err.message });
            console.error(`[Broadcast] Failed: ${recipient.email} — ${err.message}`);
        }

        // Throttle: tránh spam SMTP server
        if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return { sent, failed, errors };
}
