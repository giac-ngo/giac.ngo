
// client/src/components/admin/SpaceOwnerBilling.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User, SpaceOwnerData } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


const translations = {
    vi: {
        title: 'Ví Space',
        loading: 'Đang tải dữ liệu...',
        fetchError: 'Không thể tải dữ liệu ví của bạn.',
        totalEarnings: 'Tổng Cúng Dường',
        merits: 'Merits',
        payoutAccount: 'Tài khoản Nhận Cúng Dường',
        stripeAccountId: 'Stripe Account ID',
        stripeAccountIdDesc: 'ID tài khoản Stripe của bạn để nhận cúng dường.',
        save: 'Lưu',
        saving: 'Đang lưu...',
        saveSuccess: 'Đã cập nhật Stripe Account ID!',
        saveError: 'Lưu thất bại: {message}',
        withdrawal: 'Rút Tịnh Tài',
        amountToWithdraw: 'Số Merit muốn rút',
        requestWithdrawal: 'Gửi yêu cầu',
        requesting: 'Đang gửi...',
        requestSuccess: 'Yêu cầu rút tịnh tài đã được gửi!',
        requestError: 'Yêu cầu thất bại: {message}',
        revenueHistory: 'Lịch sử Cúng Dường',
        date: 'Ngày',
        fromUser: 'Từ Người dùng',
        amount: 'Số lượng',
        type: 'Loại',
        space: 'Không gian',
        withdrawalHistory: 'Lịch sử Rút Tịnh Tài',
        status: 'Trạng thái',
        noRevenue: 'Chưa có khoản cúng dường nào.',
        noWithdrawals: 'Chưa có yêu cầu rút nào.',
        details: 'Ghi chú / Lời nhắn',
        typeManual: 'Thủ công',
        typeSubscription: 'Gói tháng',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
        donationButton: 'Cúng dường',
        dailyRevenue: 'Cúng Dường 30 ngày qua',
    },
    en: {
        title: 'Space Wallet',
        loading: 'Loading data...',
        fetchError: 'Could not load your wallet data.',
        totalEarnings: 'Total Earnings',
        merits: 'Merits',
        payoutAccount: 'Payout Account',
        stripeAccountId: 'Stripe Account ID',
        stripeAccountIdDesc: 'Your Stripe Account ID for receiving payments.',
        save: 'Save',
        saving: 'Saving...',
        saveSuccess: 'Stripe Account ID updated!',
        saveError: 'Save failed: {message}',
        withdrawal: 'Withdrawal',
        amountToWithdraw: 'Amount of Merits to withdraw',
        requestWithdrawal: 'Request Withdrawal',
        requesting: 'Requesting...',
        requestSuccess: 'Withdrawal request sent!',
        requestError: 'Request failed: {message}',
        revenueHistory: 'Revenue History',
        date: 'Date',
        fromUser: 'From User',
        amount: 'Amount',
        type: 'Type',
        space: 'Space',
        withdrawalHistory: 'Withdrawal History',
        status: 'Status',
        noRevenue: 'No revenue yet.',
        noWithdrawals: 'No withdrawal requests yet.',
        details: 'Details / Message',
        typeManual: 'Manual',
        typeSubscription: 'Subscription',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
        donationButton: 'Donation',
        dailyRevenue: 'Revenue (Last 30 Days)',
    }
};

export const SpaceOwnerBilling: React.FC<{ user: User; language: 'vi' | 'en' }> = ({ user, language }) => {
    const t = translations[language];
    const { showToast } = useToast();
    const [data, setData] = useState<SpaceOwnerData | null>(null);
    const [stats, setStats] = useState<{ date: string; earnings: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
    const [stripeAccountId, setStripeAccountId] = useState('');
    const [withdrawalAmount, setWithdrawalAmount] = useState<number | ''>('');
    const [isSavingStripe, setIsSavingStripe] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    const selectedSpace = data?.ownedSpaces.find((s: any) => s.id === selectedSpaceId);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiService.getMySpaceOwnerData();
            setData(result);

            let currentSpaceId = selectedSpaceId;
            if (result.ownedSpaces.length > 0 && selectedSpaceId === null) {
                currentSpaceId = result.ownedSpaces[0].id;
                setSelectedSpaceId(currentSpaceId);
                setStripeAccountId((result.ownedSpaces[0] as any).stripeAccountId || '');
            } else if (selectedSpaceId !== null) {
                const updatedSelected = result.ownedSpaces.find((s: any) => s.id === selectedSpaceId);
                if (updatedSelected) {
                    setStripeAccountId((updatedSelected as any).stripeAccountId || '');
                }
            }

            if (currentSpaceId) {
                const statsData = await apiService.getSpaceEarningsStats(currentSpaceId);
                setStats(statsData);
            }

        } catch (error) {
            showToast(t.fetchError, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, t.fetchError, selectedSpaceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Cleanup: Removed unused handleSaveStripeId and effects related only to it if any.
    // However, existing useEffect for selectedSpaceId -> stripeAccountId syncing is valid.
    useEffect(() => {
        if (selectedSpace) {
            setStripeAccountId((selectedSpace as any).stripeAccountId || '');
            // Also fetch stats when space changes
            apiService.getSpaceEarningsStats(selectedSpace.id).then(setStats).catch(console.error);
        }
    }, [selectedSpaceId, selectedSpace]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        if (status === 'return') {
            showToast('Stripe connection process completed.', 'success');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchData();
        } else if (status === 'refresh') {
            showToast('Stripe connection was not completed. Please try again.', 'info');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [showToast, fetchData]);

    const handleRequestWithdrawal = async () => {
        if (!withdrawalAmount || withdrawalAmount <= 0 || !selectedSpaceId) return;
        setIsRequesting(true);
        try {
            await apiService.createWithdrawalRequest(user.id as number, withdrawalAmount, selectedSpaceId);
            showToast(t.requestSuccess, 'success');
            setWithdrawalAmount('');
            fetchData(); // Refresh data after request
        } catch (error: any) {
            showToast(t.requestError.replace('{message}', error.message), 'error');
        } finally {
            setIsRequesting(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">{t.loading}</div>;
    if (!data) return <div className="p-8 text-center">{t.fetchError}</div>;

    const getSpaceName = (spaceId?: number) => data.ownedSpaces.find(s => s.id === spaceId)?.name || 'N/A';

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'manual': return t.typeManual;
            case 'subscription': return t.typeSubscription;
            case 'crypto': return t.typeCrypto;
            case 'stripe': return t.typeStripe;
            case 'manual-billing': return t.typeManual;
            case 'offering': return t.donationButton;
            default: return type;
        }
    };



    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t.title}</h1>
                <select
                    value={selectedSpaceId || ''}
                    onChange={e => setSelectedSpaceId(Number(e.target.value))}
                    className="p-2 border rounded-md bg-white text-sm font-medium"
                >
                    {data.ownedSpaces.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-lg font-medium text-text-light">{t.totalEarnings}</h2>
                    <p className="text-4xl font-bold text-primary mt-1">{(selectedSpace as any)?.merits?.toLocaleString(language) || 0} <span className="text-2xl">{t.merits}</span></p>
                </div>
                <div className="md:col-span-2 bg-white shadow-md rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-semibold">{t.payoutAccount}</h2>
                    <div>
                        <label className="block text-sm font-medium">{t.stripeAccountId}</label>
                        {stripeAccountId ? (
                            <div className="mt-2 space-y-2">
                                <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span className="font-medium">Connected ({stripeAccountId})</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await apiService.createStripeLoginLink(stripeAccountId);
                                            if (res.url) window.open(res.url, '_blank');
                                        } catch (e: any) {
                                            showToast(e.message, 'error');
                                        }
                                    }}
                                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 flex items-center justify-center gap-2"
                                >
                                    View Payout Dashboard
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                </button>
                                <p className="text-xs text-text-light">{t.stripeAccountIdDesc}</p>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to disconnect this Stripe account?')) {
                                            try {
                                                if (selectedSpaceId) {
                                                    await apiService.disconnectStripeConnect(selectedSpaceId);
                                                    showToast('Disconnected successfully', 'success');
                                                    fetchData();
                                                }
                                            } catch (e: any) {
                                                showToast(e.message, 'error');
                                            }
                                        }
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 underline mt-1"
                                >
                                    Disconnect / Reset Connection
                                </button>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <button
                                    onClick={async () => {
                                        if (!selectedSpaceId) return;
                                        setIsSavingStripe(true);
                                        try {
                                            // 1. Create Account
                                            const accRes = await apiService.createStripeConnectAccount(selectedSpaceId);
                                            const accountId = accRes.accountId;

                                            // 2. Create Onboarding Link
                                            const linkRes = await apiService.createStripeAccountLink(accountId, selectedSpaceId);
                                            if (linkRes.url) {
                                                window.location.href = linkRes.url;
                                            }
                                        } catch (e: any) {
                                            showToast('Connect failed: ' + e.message, 'error');
                                            setIsSavingStripe(false);
                                        }
                                    }}
                                    disabled={!selectedSpaceId || isSavingStripe}
                                    className="w-full px-4 py-2 bg-[#635BFF] text-white rounded-md font-medium hover:bg-[#4B44CC] transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSavingStripe ? (
                                        <><span>Processing...</span></>
                                    ) : (
                                        <><span>Connect with Stripe</span></>
                                    )}
                                </button>
                                <p className="text-xs text-text-light mt-2">
                                    {language === 'vi'
                                        ? 'Bạn sẽ được chuyển hướng sang Stripe để hoàn tất thông tin ngân hàng.'
                                        : 'You will be redirected to Stripe to complete your banking details.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CHART SECTION */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">{t.dailyRevenue}</h2>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip formatter={(value: any) => [(value || 0) + ' Merits', 'Earnings']} />
                            <Bar dataKey="earnings" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>


            <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">{t.withdrawal}</h2>
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium">{t.amountToWithdraw}</label>
                        <input type="number" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <button onClick={handleRequestWithdrawal} disabled={isRequesting || !withdrawalAmount} className="px-4 py-2 bg-primary text-white rounded-md h-10">{isRequesting ? t.requesting : t.requestWithdrawal}</button>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{t.revenueHistory}</h2>
                        <button
                            onClick={async () => {
                                if (!selectedSpaceId) return;
                                try {
                                    await apiService.exportSpaceTransactions(selectedSpaceId);
                                    showToast('Export success!', 'success');
                                } catch (error) {
                                    showToast('Export failed', 'error');
                                }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Export Excel
                        </button>
                    </div>
                    <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y">
                            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.date}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.fromUser}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.amount}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.type}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.details}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.space}</th></tr></thead>
                            <tbody className="bg-white divide-y">{data.revenueHistory.filter(tx => selectedSpaceId === null || tx.destinationSpaceId === selectedSpaceId).length === 0 ? (<tr><td colSpan={6} className="text-center py-4">{t.noRevenue}</td></tr>) : data.revenueHistory.filter(tx => selectedSpaceId === null || tx.destinationSpaceId === selectedSpaceId).map(tx => (<tr key={tx.id}><td className="px-6 py-4">{new Date(tx.timestamp).toLocaleString(language)}</td><td className="px-6 py-4">{tx.userName}</td><td className="px-6 py-4 font-semibold text-green-600">+{Math.abs(tx.merits)}</td><td className="px-6 py-4"><span className={`px - 2 inline - flex text - xs leading - 5 font - semibold rounded - full ${tx.type === 'crypto' ? 'bg-yellow-100 text-yellow-800' : tx.type === 'stripe' ? 'bg-indigo-100 text-indigo-800' : tx.type === 'subscription' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'} `}>{getTypeLabel(tx.type)}</span></td><td className="px-6 py-4 text-sm max-w-xs truncate" title={tx.details?.message}>{tx.details?.message || '-'}</td><td className="px-6 py-4">{getSpaceName(tx.destinationSpaceId)}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-4">{t.withdrawalHistory}</h2>
                    <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y">
                            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.date}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.amount}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.status}</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">{t.space}</th></tr></thead>
                            <tbody className="bg-white divide-y">{data.withdrawalHistory.filter(req => selectedSpaceId === null || req.spaceId === selectedSpaceId).length === 0 ? (<tr><td colSpan={4} className="text-center py-4">{t.noWithdrawals}</td></tr>) : data.withdrawalHistory.filter(req => selectedSpaceId === null || req.spaceId === selectedSpaceId).map(req => (<tr key={req.id}><td className="px-6 py-4">{new Date(req.createdAt).toLocaleString(language)}</td><td className="px-6 py-4 font-semibold text-red-600">{req.amount}</td><td className="px-6 py-4 capitalize">{req.status}</td><td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">{req.spaceName || 'N/A'}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};