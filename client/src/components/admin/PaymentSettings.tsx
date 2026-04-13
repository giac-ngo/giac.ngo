// client/src/components/admin/PaymentSettings.tsx
import React, { useState, useEffect } from 'react';
import { Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { SpinnerIcon, EyeIcon, EyeOffIcon } from '../Icons';

const translations = {
    vi: {
        title: 'Cấu hình Thanh toán',
        subtitle: 'Ví điện tử & Ngân hàng',
        payosTitle: 'PayOS Thanh Toán',
        payosDesc: 'Nhập thông tin xác thực PayOS để kích hoạt thanh toán tự động (Webhook).',
        payosClientId: 'Client ID',
        payosApiKey: 'API Key',
        payosChecksumKey: 'Checksum Key',
        venmoTitle: 'Venmo (Người dùng ở Mỹ)',
        venmoDesc: 'Nhập Venmo handle để hiển thị nút quyên góp qua Venmo.',
        venmoHandle: 'Venmo Handle (không có @)',
        venmoExample: 'Ví dụ: GiacNgoVN → venmo.com/u/GiacNgoVN',
        stripeTitle: 'Stripe Thanh Toán Thẻ',
        stripeDesc: 'Liên kết Stripe Account ID để nhận thanh toán quốc tế qua thẻ tín dụng.',
        stripeAccountId: 'Stripe Account ID',
        save: 'Lưu thay đổi',
        saving: 'Đang lưu...',
        success: 'Lưu cấu hình thanh toán thành công!',
        error: 'Lỗi khi lưu cấu hình: {message}',
    },
    en: {
        title: 'Payment Settings',
        subtitle: 'Digital Wallets & Bank Accounts',
        payosTitle: 'PayOS Payment',
        payosDesc: 'Enter PayOS credentials to enable automatic payment processing via Webhook.',
        payosClientId: 'Client ID',
        payosApiKey: 'API Key',
        payosChecksumKey: 'Checksum Key',
        venmoTitle: 'Venmo (US Users)',
        venmoDesc: 'Enter your Venmo handle to show a Venmo donation button.',
        venmoHandle: 'Venmo Handle (without @)',
        venmoExample: 'Example: GiacNgoVN → venmo.com/u/GiacNgoVN',
        stripeTitle: 'Stripe Credit Card',
        stripeDesc: 'Link your Stripe Account ID to receive international credit card payments.',
        stripeAccountId: 'Stripe Account ID',
        save: 'Save Changes',
        saving: 'Saving...',
        success: 'Payment settings saved successfully!',
        error: 'Failed to save settings: {message}',
    }
};

interface PaymentSettingsProps {
    space: Space | null;
    language: 'vi' | 'en';
    onSpaceUpdate: (space: Space) => void;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({ space, language, onSpaceUpdate }) => {
    const t = translations[language];
    const { showToast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        payosClientId: '',
        payosApiKey: '',
        payosChecksumKey: '',
        venmoHandle: '',
        stripeAccountId: ''
    });

    const [showKey, setShowKey] = useState<Record<string, boolean>>({
        payosApiKey: false,
        payosChecksumKey: false
    });

    useEffect(() => {
        if (space) {
            setFormData({
                payosClientId: space.payosClientId || '',
                payosApiKey: space.payosApiKey || '',
                payosChecksumKey: space.payosChecksumKey || '',
                venmoHandle: space.venmoHandle || '',
                stripeAccountId: space.stripeAccountId || ''
            });
        }
    }, [space]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!space || typeof space.id !== 'number') return;
        setIsSaving(true);
        try {
            const updatedSpace = await apiService.updateSpace({ id: space.id, spaceData: formData });
            onSpaceUpdate(updatedSpace);
            showToast(t.success, 'success');
        } catch (error: any) {
            showToast(t.error.replace('{message}', error?.message || 'Unknown error'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!space) {
        return <div className="p-8 text-center text-text-light">Không có không gian nào được chọn.</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold font-serif text-primary">{t.title}</h1>
            <p className="text-text-light mt-2 mb-8">{t.subtitle} — {space.name}</p>

            <div className="space-y-6">
                {/* PayOS Settings */}
                <div className="bg-background-panel border border-border-color rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-1">💸 {t.payosTitle}</h2>
                    <p className="text-sm text-text-light mb-4">{t.payosDesc}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">{t.payosClientId}</label>
                            <input name="payosClientId" value={formData.payosClientId} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-background-light font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">{t.payosApiKey}</label>
                            <div className="relative">
                                <input type={showKey.payosApiKey ? 'text' : 'password'} name="payosApiKey" value={formData.payosApiKey} onChange={handleChange} className="w-full p-2 pr-10 border border-border-color rounded-md bg-background-light font-mono" />
                                <button type="button" onClick={() => setShowKey(p => ({ ...p, payosApiKey: !p.payosApiKey }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary">
                                    {showKey.payosApiKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">{t.payosChecksumKey}</label>
                            <div className="relative">
                                <input type={showKey.payosChecksumKey ? 'text' : 'password'} name="payosChecksumKey" value={formData.payosChecksumKey} onChange={handleChange} className="w-full p-2 pr-10 border border-border-color rounded-md bg-background-light font-mono" />
                                <button type="button" onClick={() => setShowKey(p => ({ ...p, payosChecksumKey: !p.payosChecksumKey }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary">
                                    {showKey.payosChecksumKey ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Venmo */}
                <div className="bg-background-panel border border-border-color rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-1">💵 {t.venmoTitle}</h2>
                    <p className="text-sm text-text-light mb-4">{t.venmoDesc}</p>
                    <div>
                        <label className="block text-sm font-semibold mb-1">{t.venmoHandle}</label>
                        <input name="venmoHandle" value={formData.venmoHandle} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-background-light font-mono" placeholder="GiacNgoVN" />
                        <p className="text-xs text-text-light mt-1">{t.venmoExample}</p>
                    </div>
                </div>

                {/* Stripe Settings */}
                <div className="bg-background-panel border border-border-color rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-1">💳 {t.stripeTitle}</h2>
                    <p className="text-sm text-text-light mb-4">{t.stripeDesc}</p>
                    <div>
                        <label className="block text-sm font-semibold mb-1">{t.stripeAccountId}</label>
                        <input name="stripeAccountId" value={formData.stripeAccountId} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-background-light font-mono" placeholder="acct_1..." />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-text-on-primary rounded-lg font-bold shadow-md hover:bg-primary-hover disabled:opacity-70 transition-colors"
                    >
                        {isSaving ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : null}
                        {isSaving ? t.saving : t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};
