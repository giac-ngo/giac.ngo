// client/src/components/admin/PaymentSettings.tsx
import React, { useState, useEffect } from 'react';
import { Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { SpinnerIcon, EyeIcon, EyeOffIcon } from '../Icons';

const translations = {
    vi: {
        title: 'Cài đặt Thanh toán',
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
        success: 'Lưu cài đặt thanh toán thành công!',
        error: 'Lỗi khi lưu cài đặt: {message}',
        stripeConnected: 'Đã liên kết Stripe',
        chargesEnabled: 'Có thể nhận thanh toán (Charges)',
        payoutsEnabled: 'Có quyền rút tiền (Payouts)',
        yes: 'Có',
        no: 'Chưa',
        needsMoreInfo: '⚠️ Tài khoản của bạn cần bổ sung thêm thông tin định danh. Vui lòng nhấn "Hoàn tất cài đặt" bên dưới.',
        completeSetup: 'Hoàn tất cài đặt Stripe Connect',
        openDashboard: 'Mở Stripe Dashboard',
        disconnect: 'Hủy liên kết',
        connectStripe: '🔗 Kết nối tự động qua Stripe Connect',
        connectStripeDesc: 'Tạo tài khoản phụ qua Stripe Connect để nhận tiền tự động rút về ngân hàng. Chọn cách này để tự động hóa toàn bộ quy trình.',
        manual: '(Thủ công)',
        manualDesc: 'Hoặc nhập thủ công ID liên kết nếu bạn đã có (Nhớ phải ấn nút Lưu thay đổi ở dưới cùng nhé).',
        disconnectConfirm: 'Bạn có chắc chắn muốn hủy liên kết tài khoản Stripe này không?',
        disconnectSuccess: 'Hủy liên kết thành công',
        connectError: 'Lỗi khi kết nối Stripe',
        openError: 'Lỗi khi mở dashboard',
        disconnectError: 'Lỗi khi hủy liên kết',
        checkingStats: 'Đang kiểm tra trạng thái...',
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
        stripeConnected: 'Stripe Connected',
        chargesEnabled: 'Charges Enabled',
        payoutsEnabled: 'Payouts Enabled',
        yes: 'Yes',
        no: 'No',
        needsMoreInfo: '⚠️ Your account needs more information. Please click "Complete Setup" below.',
        completeSetup: 'Complete Stripe Setup',
        openDashboard: 'Open Stripe Dashboard',
        disconnect: 'Disconnect',
        connectStripe: '🔗 Connect with Stripe',
        connectStripeDesc: 'Create a connected Stripe account to automatically receive payouts to your bank. Recommended for full automation.',
        manual: '(Manual)',
        manualDesc: 'Or enter your Stripe Account ID manually (Remember to click Save Changes below).',
        disconnectConfirm: 'Are you sure you want to disconnect this Stripe account?',
        disconnectSuccess: 'Successfully disconnected',
        connectError: 'Error connecting Stripe',
        openError: 'Error opening dashboard',
        disconnectError: 'Error disconnecting Stripe',
        checkingStats: 'Checking status...',
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

    const [stripeStatus, setStripeStatus] = useState<any>(null);
    const [isCheckingStripe, setIsCheckingStripe] = useState(false);
    const [isConnectingStripe, setIsConnectingStripe] = useState(false);

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

            if (space.stripeAccountId) {
                setIsCheckingStripe(true);
                apiService.getStripeConnectAccountStatus(space.stripeAccountId)
                    .then(status => setStripeStatus(status))
                    .catch(err => {
                        console.error('Failed to get stripe status', err);
                        setStripeStatus(null);
                    })
                    .finally(() => setIsCheckingStripe(false));
            } else {
                setStripeStatus(null);
            }
        }
    }, [space]);

    const handleConnectStripe = async () => {
        if (!space || typeof space.id !== 'number') return;
        setIsConnectingStripe(true);
        try {
            let accountId = space.stripeAccountId;
            if (!accountId) {
                const res = await apiService.createStripeConnectAccount(space.id);
                accountId = res.accountId;
                setFormData(prev => ({ ...prev, stripeAccountId: accountId }));
                onSpaceUpdate({ ...space, stripeAccountId: accountId });
            }
            const linkRes = await apiService.createStripeAccountLink(accountId, space.id);
            window.location.href = linkRes.url;
        } catch (error: any) {
            showToast(error.message || t.connectError, 'error');
            setIsConnectingStripe(false);
        }
    };

    const handleOpenStripeDashboard = async () => {
        if (!space?.stripeAccountId) return;
        setIsConnectingStripe(true);
        try {
            const res = await apiService.createStripeLoginLink(space.stripeAccountId);
            window.open(res.url, '_blank');
        } catch (error: any) {
            showToast(error.message || t.openError, 'error');
        } finally {
            setIsConnectingStripe(false);
        }
    };

    const handleDisconnectStripe = async () => {
        if (!space || typeof space.id !== 'number') return;
        if (!window.confirm(t.disconnectConfirm)) return;
        
        setIsConnectingStripe(true);
        try {
            await apiService.disconnectStripeConnect(space.id);
            setFormData(prev => ({ ...prev, stripeAccountId: '' }));
            onSpaceUpdate({ ...space, stripeAccountId: undefined });
            setStripeStatus(null);
            showToast(t.disconnectSuccess, 'success');
        } catch (error: any) {
            showToast(error.message || t.disconnectError, 'error');
        } finally {
            setIsConnectingStripe(false);
        }
    };

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
                    <h2 className="text-lg font-bold mb-1">💳 {t.stripeTitle} / Stripe Connect</h2>
                    <p className="text-sm text-text-light mb-4 text-balance">{t.stripeDesc}</p>
                    
                    {space.stripeAccountId ? (
                        <div className="mb-6 p-4 border border-green-500/30 rounded-lg bg-green-500/5">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                                <div className="w-full">
                                    <h3 className="font-bold text-green-500 flex items-center gap-2">
                                        ✅ {t.stripeConnected}
                                    </h3>
                                    <p className="text-sm mt-1 mb-2 font-mono text-text-light">{space.stripeAccountId}</p>
                                    
                                    {isCheckingStripe ? (
                                        <div className="flex items-center gap-2 text-sm text-text-light">
                                            <SpinnerIcon className="w-4 h-4 animate-spin" /> {t.checkingStats}
                                        </div>
                                    ) : stripeStatus ? (
                                        <div className="space-y-1 bg-background-main p-3 rounded-md border border-border-color mt-2">
                                            <p className="text-sm">
                                                - {t.chargesEnabled}: <span className={stripeStatus.chargesEnabled ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{stripeStatus.chargesEnabled ? t.yes : t.no}</span>
                                            </p>
                                            <p className="text-sm">
                                                - {t.payoutsEnabled}: <span className={stripeStatus.payoutsEnabled ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{stripeStatus.payoutsEnabled ? t.yes : t.no}</span>
                                            </p>
                                            {(!stripeStatus.chargesEnabled || !stripeStatus.payoutsEnabled) && (
                                                <p className="text-sm font-semibold text-orange-600 mt-3 flex items-center gap-1">
                                                    {t.needsMoreInfo}
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={(!stripeStatus?.chargesEnabled || !stripeStatus?.payoutsEnabled) ? handleConnectStripe : handleOpenStripeDashboard}
                                    disabled={isConnectingStripe}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-text-on-primary rounded-md text-sm font-bold shadow hover:bg-primary-hover disabled:opacity-70 transition-colors"
                                >
                                    {isConnectingStripe && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                                    {(!stripeStatus?.chargesEnabled || !stripeStatus?.payoutsEnabled) ? t.completeSetup : t.openDashboard}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDisconnectStripe}
                                    disabled={isConnectingStripe}
                                    className="flex items-center gap-2 px-4 py-2 bg-transparent border border-red-500/30 text-red-500 rounded-md text-sm font-bold hover:bg-red-500/10 disabled:opacity-70 transition-colors"
                                >
                                    {t.disconnect}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <button
                                type="button"
                                onClick={handleConnectStripe}
                                disabled={isConnectingStripe}
                                className="flex items-center gap-2 px-6 py-3 bg-[#635BFF] text-white rounded-lg font-bold shadow hover:bg-[#4d45d8] disabled:opacity-70 transition-colors"
                            >
                                {isConnectingStripe && <SpinnerIcon className="w-4 h-4 animate-spin text-white" />}
                                {t.connectStripe}
                            </button>
                            <p className="text-xs text-text-light mt-2">{t.connectStripeDesc}</p>
                        </div>
                    )}

                    <div className="border-t border-border-color pt-4 border-dashed">
                        <label className="block text-sm font-semibold mb-1">{t.stripeAccountId} {t.manual}</label>
                        <input name="stripeAccountId" value={formData.stripeAccountId} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-background-light font-mono" placeholder="acct_1..." />
                        <p className="text-xs text-text-light mt-1">{t.manualDesc}</p>
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
