// server/services/mailService.js
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import 'dotenv/config';

async function getTransportAndFrom(options = {}) {
    const { host, spaceId } = options;
    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';
    let space = null;

    if (spaceId) {
        const res = await pool.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, name FROM spaces WHERE id = $1', [spaceId]);
        space = res.rows[0];
    } else if (host && host !== mainDomain && !host.endsWith('.' + mainDomain) && host !== 'localhost') {
        const res = await pool.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, name FROM spaces WHERE custom_domain = $1', [host]);
        space = res.rows[0];
    }
    
    // Fallback to main space (ID=1)
    if (!space || !space.smtp_host) {
        const res = await pool.query('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, name FROM spaces WHERE id = 1');
        space = res.rows[0];
    }
    
    if (!space || !space.smtp_host || !space.smtp_user) {
        console.error("No SMTP config found for Space 1 or host:", host);
        throw new Error('Chưa cấu hình Mail Server trong quản lý Space.');
    }

    const transport = nodemailer.createTransport({
        host: space.smtp_host,
        port: parseInt(space.smtp_port || '465', 10),
        secure: String(space.smtp_port || '465') === '465',
        auth: {
            user: space.smtp_user,
            pass: space.smtp_pass,
        },
    });

    const fromName = space.smtp_from_name || space.name || 'Giác Ngộ AI';
    const fromString = `${fromName} <${space.smtp_user}>`;

    return { transport, fromString, adminEmail: space.smtp_user };
}

const translations = {
    vi: {
        resetSubject: 'Yêu cầu Đặt lại Mật khẩu Giác Ngộ AI',
        resetBody: (url) => `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nVui lòng nhấp vào liên kết sau, hoặc dán vào trình duyệt của bạn để hoàn tất quá trình:\n\n${url}\n\nNếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.\n`,
        contactSubject: (spaceName) => `[Giác Ngộ Contact] Yêu cầu từ: ${spaceName}`
    },
    en: {
        resetSubject: 'Giác Ngộ AI Password Reset Request',
        resetBody: (url) => `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${url}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`,
        contactSubject: (spaceName) => `[Giác Ngộ Contact] Inquiry from: ${spaceName}`,
        welcomeSubject: 'Chào mừng bạn đến với Giác Ngộ AI',
        welcomeBody: (name) => `Xin chào ${name},\n\nCảm ơn bạn đã đăng ký tài khoản tại Giác Ngộ AI. Chúng tôi rất vui mừng khi bạn tham gia cộng đồng.\n\nNếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.\n\nTrân trọng,\nĐội ngũ Giác Ngộ AI`
    }
};

export const mailService = {
    async sendPasswordResetEmail(to, token, language = 'vi', options = {}) {
        const t = translations[language];
        const resetUrl = `${process.env.BASE_URL}/reset-password?token=${token}`;
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            const mailOptions = {
                from: fromString,
                to,
                subject: t.resetSubject,
                text: t.resetBody(resetUrl),
            };
            await transport.sendMail(mailOptions);
            console.log('Password reset email sent to:', to);
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Could not send password reset email.');
        }
    },

    async sendContactFormEmail(formData, options = {}) {
        const { name, email, spaceName, message } = formData;
        try {
            const { transport, fromString, adminEmail } = await getTransportAndFrom(options);
            const mailOptions = {
                from: fromString,
                to: adminEmail,
                replyTo: email,
                subject: translations.vi.contactSubject(spaceName || name),
                text: `Name: ${name}\nEmail: ${email}\n---\n${message}\n`,
                html: `<p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p><hr><pre style="white-space: pre-wrap; font-family: sans-serif;">${message}</pre>`
            };
            await transport.sendMail(mailOptions);
            console.log('Contact form email sent successfully from:', email);
        } catch (error) {
            console.error('Error sending contact form email:', error);
            throw new Error('Could not send contact form email.');
        }
    },

    async sendWelcomeEmail(to, name, language = 'vi', options = {}) {
        const t = translations[language === 'vi' ? 'vi' : 'en'];
        const subject = translations.vi.welcomeSubject;
        const text = translations.vi.welcomeBody(name);
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            const mailOptions = {
                from: fromString,
                to,
                subject,
                text
            };
            await transport.sendMail(mailOptions);
            console.log('Welcome email sent to:', to);
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    },

    async sendDonationSuccessEmail(to, userName, amount, spaceName, transactionId, options = {}) {
        const subject = `[Giác Ngộ AI] Cảm ơn bạn đã cúng dường cho ${spaceName}`;
        const text = `Xin chào ${userName},\n\nThay mặt ${spaceName}, xin chân thành cảm ơn tâm cúng dường của bạn.\n\nChi tiết giao dịch:\n- Số tiền (Merits): ${amount}\n- Gửi tới: ${spaceName}\n- Mã giao dịch: ${transactionId}\n\nCông đức vô lượng!\n`;
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            await transport.sendMail({
                from: fromString,
                to,
                subject,
                text
            });
            console.log('Donation success email sent to:', to);
        } catch (error) {
            console.error('Error sending donation success email:', error);
        }
    },

    async sendDonationReceivedEmail(to, ownerName, amount, donorName, spaceName, note, options = {}) {
        const subject = `[Giác Ngộ AI] Bạn vừa nhận được cúng dường mới!`;
        const text = `Xin chào ${ownerName},\n\nKhông gian "${spaceName}" vừa nhận được một khoản cúng dường mới.\n\nChi tiết:\n- Người gửi: ${donorName}\n- Số tiền: ${amount} Merits\n- Lời nhắn: ${note || 'Không có'}\n\nVui lòng truy cập Dashboard để xem chi tiết.\n`;
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            await transport.sendMail({
                from: fromString,
                to,
                subject,
                text
            });
            console.log('Donation received email sent to owner:', to);
        } catch (error) {
            console.error('Error sending donation received email:', error);
        }
    },

    async sendWithdrawalStatusEmail(to, ownerName, amount, status, reason = '', options = {}) {
        const isApproved = status === 'approved';
        const subject = isApproved ? `[Giác Ngộ AI] Yêu cầu rút tiền ĐƯỢC DUYỆT` : `[Giác Ngộ AI] Yêu cầu rút tiền BỊ TỪ CHỐI`;
        const text = `Xin chào ${ownerName},\n\nYêu cầu rút ${amount} Merits của bạn đã được cập nhật trạng thái: ${isApproved ? 'ĐÃ DUYỆT (APPROVED)' : 'BỊ TỪ CHỐI (REJECTED)'}.\n\n${isApproved ? 'Tiền đang được chuyển về tài khoản ngân hàng liên kết của bạn (qua Stripe Express). Thời gian nhận tiền phụ thuộc vào ngân hàng.' : `Lý do từ chối: ${reason}\nSố tiền đã được hoàn lại vào ví Merit của Space.`}\n\nTrân trọng,\nBQT Giác Ngộ AI.\n`;
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            await transport.sendMail({
                from: fromString,
                to,
                subject,
                text
            });
            console.log(`Withdrawal status (${status}) email sent to:`, to);
        } catch (error) {
            console.error('Error sending withdrawal status email:', error);
        }
    },

    async sendBroadcastEmail({ to, toName, subject, htmlBody, textBody, options = {} }) {
        try {
            const { transport, fromString } = await getTransportAndFrom(options);
            const mailOptions = {
                from: fromString,
                to: toName ? `${toName} <${to}>` : to,
                subject,
                text: textBody || '',
                html: htmlBody || '',
            };
            await transport.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending broadcast email:', error);
            throw error;
        }
    }
};
