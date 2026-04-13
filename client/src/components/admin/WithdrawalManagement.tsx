// client/src/components/admin/WithdrawalManagement.tsx
import React, { useState, useEffect } from 'react';
import { WithdrawalRequest } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';

const translations = {
    vi: {
        title: 'Quản lý Yêu cầu Rút tiền',
        loading: 'Đang tải yêu cầu...',
        noRequests: 'Không có yêu cầu rút tiền nào đang chờ.',
        date: 'Ngày tạo',
        user: 'Người yêu cầu',
        space: 'Không gian',
        amount: 'Số tiền',
        balance: 'Số dư hiện tại',
        stripeAccount: 'Tài khoản Stripe',
        status: 'Trạng thái',
        actions: 'Thao tác',
        approve: 'Duyệt',
        reject: 'Từ chối',
        processing: 'Đang xử lý...',
        approveSuccess: 'Đã duyệt yêu cầu rút tiền!',
        rejectSuccess: 'Đã từ chối yêu cầu.',
        error: 'Lỗi: {message}',
        confirmApprove: 'Bạn có chắc chắn muốn duyệt yêu cầu này? Tiền sẽ được trừ từ ví không gian.',
        confirmReject: 'Bạn có chắc chắn muốn từ chối yêu cầu này?',
    },
    en: {
        title: 'Withdrawal Management',
        loading: 'Loading requests...',
        noRequests: 'No pending withdrawal requests.',
        date: 'Date',
        user: 'Requester',
        space: 'Space',
        amount: 'Amount',
        balance: 'Current Balance',
        stripeAccount: 'Stripe Account',
        status: 'Status',
        actions: 'Actions',
        approve: 'Approve',
        reject: 'Reject',
        processing: 'Processing...',
        approveSuccess: 'Withdrawal approved!',
        rejectSuccess: 'Withdrawal rejected.',
        error: 'Error: {message}',
        confirmApprove: 'Are you sure you want to approve this request? Funds will be deducted from space wallet.',
        confirmReject: 'Are you sure you want to reject this request?',
    }
};

export const WithdrawalManagement: React.FC<{ language: 'vi' | 'en', user: any }> = ({ language, user }) => {
    const t = translations[language];
    const { showToast } = useToast();
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState({ minWithdrawal: 50, holdDays: 5 });
    const [platformFeePercent, setPlatformFeePercent] = useState<number>(10);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getWithdrawalRequests();
            setRequests(data);
        } catch (error) {
            showToast(t.error.replace('{message}', 'Failed to fetch'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSettings = async () => {
        try {
            const config = await apiService.getSystemConfig();
            if (config) {
                if (config.withdrawalSettings) {
                    setSettings(config.withdrawalSettings);
                }
                if (config.platformFeePercent !== undefined) {
                    setPlatformFeePercent(parseFloat(config.platformFeePercent as any));
                }
            }
            setIsSettingsOpen(true);
        } catch (error) {
            showToast('Failed to load settings', 'error');
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            const config = await apiService.getSystemConfig();
            if (!config) throw new Error('System config not found');

            await apiService.updateSystemConfig({
                ...config,
                withdrawalSettings: settings,
                platformFeePercent: platformFeePercent
            });
            showToast('Settings saved successfully', 'success');
            setIsSettingsOpen(false);
        } catch (error: any) {
            showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleAction = async (id: number, action: 'approved' | 'rejected') => {
        const confirmMsg = action === 'approved' ? t.confirmApprove : t.confirmReject;
        if (!window.confirm(confirmMsg)) return;

        setProcessingId(id);
        try {
            await apiService.processWithdrawalRequest(id, action);
            showToast(action === 'approved' ? t.approveSuccess : t.rejectSuccess, 'success');
            fetchRequests();
        } catch (error: any) {
            showToast(t.error.replace('{message}', error.message), 'error');
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <div className="p-8 text-center">{t.loading}</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t.title}</h1>
                {user?.permissions?.includes('settings') && (
                    <button
                        onClick={handleOpenSettings}
                        className="p-2 text-gray-500 hover:text-primary transition-colors"
                        title="Withdrawal Settings"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.date}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.user}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.space}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.amount}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.balance}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.stripeAccount}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">{t.noRequests}</td>
                            </tr>
                        ) : (
                            requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(req.createdAt).toLocaleString(language)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{req.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{req.spaceName || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">{req.amount.toLocaleString(language)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{(req as any).currentSpaceMerits?.toLocaleString(language) || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-xs">{(req as any).stripeAccountId || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                        <button
                                            disabled={processingId !== null}
                                            onClick={() => handleAction(req.id, 'approved')}
                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {processingId === req.id ? t.processing : t.approve}
                                        </button>
                                        <button
                                            disabled={processingId !== null}
                                            onClick={() => handleAction(req.id, 'rejected')}
                                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            {t.reject}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Configuration</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Withdrawal Amount (Merits)</label>
                                <input
                                    type="number"
                                    value={settings.minWithdrawal}
                                    onChange={e => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value) })}
                                    className="w-full border rounded px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hold Period (Days)</label>
                                <input
                                    type="number"
                                    value={settings.holdDays}
                                    onChange={e => setSettings({ ...settings, holdDays: parseInt(e.target.value) })}
                                    className="w-full border rounded px-3 py-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Funds from donations must be held for this many days before they can be withdrawn.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={platformFeePercent}
                                    onChange={e => setPlatformFeePercent(parseFloat(e.target.value))}
                                    className="w-full border rounded px-3 py-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Percentage deducted from withdrawals as platform fee.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                            >
                                {isSavingSettings ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
