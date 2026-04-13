import React, { useState, useEffect } from 'react';
import { User, Transaction } from '../../types';
import { apiService } from '../../services/apiService';
import { MeritPaymentModal } from '../MeritPaymentModal';


// Translations
const translations = {
    vi: {
        title: "Quản lý Giao dịch & Nạp Merit",
        balanceTitle: "Số dư hiện tại",
        unlimited: "Không giới hạn",
        merits: "Merits",
        donationButton: "Cúng dường",
        historyTitle: "Lịch sử Giao dịch của bạn",
        loading: 'Đang tải...',
        noTransactions: 'Bạn chưa có giao dịch nào.',
        date: 'Thời gian',
        meritsColumn: 'Số Merits',
        type: 'Loại',
        details: 'Ghi chú / Lời nhắn',
        admin: 'Admin',
        typeManual: 'Thủ công',
        typeSubscription: 'Gói tháng',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
    },
    en: {
        title: "Transactions & Merit Top-up",
        balanceTitle: "Current Balance",
        unlimited: "Unlimited",
        merits: "Merits",
        donationButton: "Donation",
        historyTitle: "Your Transaction History",
        loading: 'Loading...',
        noTransactions: 'You have no transactions yet.',
        date: 'Date',
        meritsColumn: 'Merits',
        type: 'Type',
        details: 'Details / Message',
        admin: 'Admin',
        typeManual: 'Manual',
        typeSubscription: 'Subscription',
        typeCrypto: 'Crypto',
        typeStripe: 'Stripe',
    }
};

const UserTransactionHistory: React.FC<{ user: User, language: 'vi' | 'en' }> = ({ user, language }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const t = translations[language];

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                if (typeof user.id === 'number') {
                    const data = await apiService.getTransactionsForUser(user.id);
                    setTransactions(data);
                }
            } catch (error) {
                console.error("Failed to fetch user transaction history", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [user.id]);

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'manual': return t.typeManual;
            case 'subscription': return t.typeSubscription;
            case 'crypto': return t.typeCrypto;
            case 'stripe': return t.typeStripe;
            case 'offering': return t.donationButton;
            case 'manual-billing': return t.typeManual;
            default: return type;
        }
    };

    if (isLoading) return <div className="text-center p-4 bg-white shadow-md rounded-lg">{t.loading}</div>;

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background-light">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">{t.date}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">{t.meritsColumn}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">{t.type}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">Space</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">{t.details}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-light uppercase">{t.admin}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-background-panel divide-y divide-border-color">
                        {transactions.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-text-light">{t.noTransactions}</td></tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{new Date(tx.timestamp).toLocaleString(language)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${tx.merits >= 0 ? 'text-green-600' : 'text-red-600'}`}>{tx.merits >= 0 ? `+${tx.merits}` : tx.merits}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'crypto' ? 'bg-yellow-100 text-yellow-800' : tx.type === 'stripe' ? 'bg-indigo-100 text-indigo-800' : tx.type === 'subscription' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{getTypeLabel(tx.type)}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{tx.spaceName || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-text-main max-w-xs truncate" title={tx.details?.message}>
                                        {tx.details?.message || (tx.details?.aiConfigId ? `AI ID: ${tx.details.aiConfigId}` : (tx.details?.withdrawalRequestId ? `Withdrawal ID: ${tx.details.withdrawalRequestId}` : '-'))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">{tx.adminName || 'System'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface UserBillingManagementProps {
    user: User;
    language: 'vi' | 'en';
    onUserUpdate: (data: Partial<User>) => void;
    spaceId?: number;
}

export const UserBillingManagement: React.FC<UserBillingManagementProps> = ({ user, language, onUserUpdate, spaceId }) => {
    const [isMeritModalOpen, setIsMeritModalOpen] = useState(false);
    const t = translations[language];

    const handlePaymentSuccess = (updatedUser: User) => {
        onUserUpdate(updatedUser);
        setIsMeritModalOpen(false);
    };

    // Numeric types from PG are often returned as strings in JS.
    const meritsValue = (typeof user.merits === 'string') ? parseFloat(user.merits) : user.merits;

    const meritsDisplay = (typeof meritsValue === 'number' && !isNaN(meritsValue))
        ? `${meritsValue.toLocaleString(language)} ${t.merits}`
        : `0 ${t.merits}`;

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold text-text-main">{t.title}</h1>

            <div className="bg-white shadow-md rounded-lg p-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-lg font-medium text-text-light">{t.balanceTitle}</h2>
                    <p className="text-4xl font-bold text-primary mt-1">
                        {meritsDisplay}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsMeritModalOpen(true)}
                        className="px-5 py-3 bg-primary text-text-on-primary rounded-md font-semibold hover:bg-primary-hover transition-colors flex items-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{t.donationButton}</span>
                    </button>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4 text-text-main">{t.historyTitle}</h2>
                <UserTransactionHistory user={user} language={language} />
            </div>

            <MeritPaymentModal
                isOpen={isMeritModalOpen}
                onClose={() => setIsMeritModalOpen(false)}
                user={user}
                onPaymentSuccess={handlePaymentSuccess}
                language={language}
                showIncenseOption={true}
                spaceId={spaceId}
            />
        </div>
    );
};