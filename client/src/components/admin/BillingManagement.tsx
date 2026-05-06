// client/src/components/admin/BillingManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { User, Transaction, Space } from '../../types';
import { apiService } from '../../services/apiService';
// useToast removed — component uses console.error for error handling

interface BillingManagementProps {
    user: User;
    language: 'vi' | 'en';
    onUserUpdate: (updatedData: Partial<User>) => void;
    isGlobalAdmin?: boolean;
    space?: Space | null;
}

const translations = {
    vi: {
        historyTitle: 'Lịch sử Giao dịch',
        loading: 'Đang tải...',
        user: 'Người dùng',
        admin: 'Admin',
        merits: 'Số Merits',
        type: 'Loại',
        date: 'Thời gian',
        noTransactions: 'Không có giao dịch nào.',
        typeManual: 'Thủ công',
        typeSubscription: 'Gói tháng',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
        typeOffering: 'Cúng dường',
        typeWithdrawal: 'Rút tiền',
        filterBySpace: 'Lọc theo Space',
        allSpaces: 'Tất cả Space',
        space: 'Space',
    },
    en: {
        historyTitle: 'Transaction History',
        loading: 'Loading...',
        user: 'User',
        admin: 'Admin',
        merits: 'Merits',
        type: 'Type',
        date: 'Date',
        noTransactions: 'No transactions found.',
        typeManual: 'Manual',
        typeSubscription: 'Subscription',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
        typeOffering: 'Offering',
        typeWithdrawal: 'Withdrawal',
        filterBySpace: 'Filter by Space',
        allSpaces: 'All Spaces',
        space: 'Space',
    }
};

const getTypeLabel = (type: string, t: typeof translations['vi']) => {
    switch (type) {
        case 'manual': return t.typeManual;
        case 'subscription': return t.typeSubscription;
        case 'crypto': return t.typeCrypto;
        case 'stripe': return t.typeStripe;
        case 'offering': return t.typeOffering;
        case 'withdrawal': return t.typeWithdrawal;
        default: return type;
    }
};

const getTypeBadge = (type: string) => {
    switch (type) {
        case 'crypto': return 'bg-yellow-100 text-yellow-800';
        case 'stripe': return 'bg-indigo-100 text-indigo-800';
        case 'subscription': return 'bg-blue-100 text-blue-800';
        case 'offering': return 'bg-purple-100 text-purple-800';
        case 'withdrawal': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const BillingManagement: React.FC<BillingManagementProps> = ({ user: _user, language, isGlobalAdmin, space }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
    const t = translations[language];

    // Root Admin: load danh sách spaces để filter
    useEffect(() => {
        if (isGlobalAdmin) {
            apiService.getSpaces().then(setSpaces).catch(console.error);
        }
    }, [isGlobalAdmin]);

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        try {
            // Root Admin: filter theo dropdown (selectedSpaceId hoặc tất cả)
            // Space Owner: tự động truyền space.id để backend scope đúng
            // User thường: không truyền gì → backend trả về của chính họ
            let spaceIdParam: number | undefined;
            if (isGlobalAdmin) {
                spaceIdParam = selectedSpaceId ? Number(selectedSpaceId) : undefined;
            } else if (space?.id) {
                spaceIdParam = space.id as number;
            }
            const data = await apiService.getAllTransactions(spaceIdParam);
            setTransactions(data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSpaceId, isGlobalAdmin, space?.id]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return (
        <div className="p-8 space-y-6">
            {/* Header + filter */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-text-main">{t.historyTitle}</h2>

                {/* Chỉ Root Admin mới thấy filter space */}
                {isGlobalAdmin && spaces.length > 0 && (
                    <select
                        value={selectedSpaceId}
                        onChange={e => setSelectedSpaceId(e.target.value)}
                        className="px-3 py-2 border rounded-md border-border-color bg-background-panel text-sm"
                    >
                        <option value="">{t.allSpaces}</option>
                        {spaces.map((s: Space) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Transaction table */}
            <div className="bg-background-panel shadow-md rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-text-light">{t.loading}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-color">
                            <thead className="bg-background-light">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.date}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.user}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.merits}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.type}</th>
                                    {isGlobalAdmin && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.space}</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase tracking-wider">{t.admin}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-background-panel divide-y divide-border-color">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={isGlobalAdmin ? 6 : 5} className="text-center py-8 text-text-light">
                                            {t.noTransactions}
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx: Transaction) => (
                                        <tr key={tx.id} className="hover:bg-background-light transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {new Date(tx.timestamp).toLocaleString(language)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">
                                                {tx.userName}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${tx.merits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.merits >= 0 ? `+${tx.merits}` : tx.merits}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(tx.type)}`}>
                                                    {getTypeLabel(tx.type, t)}
                                                </span>
                                            </td>
                                            {isGlobalAdmin && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                    {tx.spaceName || '-'}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {tx.adminName || 'System'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};