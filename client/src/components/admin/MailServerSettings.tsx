import React, { useState, useEffect } from 'react';
import { Space } from '../../types';

const translations = {
    vi: {
        title: 'Cấu hình Mail Server',
        description: 'Cấu hình SMTP gửi mail riêng cho Không gian này. Nếu để trống, hệ thống sẽ cố gắng dùng mail mặc định.',
        smtpHost: 'SMTP Host (vd: smtp.gmail.com)',
        smtpPort: 'SMTP Port (vd: 465)',
        smtpUser: 'SMTP Email (Tài khoản gửi)',
        smtpPass: 'SMTP Password (Mật khẩu ứng dụng)',
        smtpFromName: 'Tên người gửi (vd: Thiền Viện ABC)',
        save: 'Lưu cấu hình',
        saving: 'Đang lưu...',
        success: 'Cấu hình Mail Server đã được lưu!',
        error: 'Lưu thất bại: {message}',
    },
    en: {
        title: 'Mail Server Settings',
        description: 'SMTP config for this specific space. Leave blank to fallback to a default system mail.',
        smtpHost: 'SMTP Host (e.g. smtp.gmail.com)',
        smtpPort: 'SMTP Port (e.g. 465)',
        smtpUser: 'SMTP Email Address',
        smtpPass: 'SMTP Password (App Password)',
        smtpFromName: 'Sender Name (e.g. The Monastery)',
        save: 'Save Configuration',
        saving: 'Saving...',
        success: 'Mail Server settings saved!',
        error: 'Failed to save: {message}',
    }
};

interface MailServerSettingsProps {
    space: Space | null;
    language: 'vi' | 'en';
    onChange: (data: Partial<Space>) => void;
}

export const MailServerSettings: React.FC<MailServerSettingsProps> = ({ space, language, onChange }) => {
    const t = translations[language];
    const [formData, setFormData] = useState<Partial<Space>>({});

    useEffect(() => {
        if (space) {
            setFormData({
                smtpHost: space.smtpHost || '',
                smtpPort: space.smtpPort || undefined,
                smtpUser: space.smtpUser || '',
                smtpPass: space.smtpPass || '',
                smtpFromName: space.smtpFromName || ''
            });
        }
    }, [space]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const newFormData = {
            ...formData,
            [name]: type === 'number' ? (value ? parseInt(value) : undefined) : value
        };
        setFormData(newFormData);
        onChange(newFormData);
    };

    if (!space) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text-main">{t.title}</h1>
                <p className="text-text-light mt-1 text-sm">{t.description}</p>
            </div>

            <div className="bg-background-panel space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm font-bold text-text-main mb-1.5">{t.smtpHost}</label>
                        <input
                            type="text"
                            name="smtpHost"
                            value={formData.smtpHost || ''}
                            onChange={handleInputChange}
                            className="mt-auto w-full p-2.5 bg-background-light border border-border-color rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm font-bold text-text-main mb-1.5">{t.smtpPort}</label>
                        <input
                            type="number"
                            name="smtpPort"
                            value={formData.smtpPort || ''}
                            onChange={handleInputChange}
                            className="mt-auto w-full p-2.5 bg-background-light border border-border-color rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm font-bold text-text-main mb-1.5">{t.smtpUser}</label>
                        <input
                            type="text"
                            name="smtpUser"
                            value={formData.smtpUser || ''}
                            onChange={handleInputChange}
                            className="mt-auto w-full p-2.5 bg-background-light border border-border-color rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex flex-col flex-1">
                        <label className="block text-sm font-bold text-text-main mb-1.5">{t.smtpPass}</label>
                        <input
                            type="password"
                            name="smtpPass"
                            autoComplete="new-password"
                            value={formData.smtpPass || ''}
                            onChange={handleInputChange}
                            className="mt-auto w-full p-2.5 bg-background-light border border-border-color rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div className="md:col-span-2 flex flex-col flex-1">
                        <label className="block text-sm font-bold text-text-main mb-1.5">{t.smtpFromName}</label>
                        <input
                            type="text"
                            name="smtpFromName"
                            value={formData.smtpFromName || ''}
                            onChange={handleInputChange}
                            className="mt-auto w-full p-2.5 bg-background-light border border-border-color rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
