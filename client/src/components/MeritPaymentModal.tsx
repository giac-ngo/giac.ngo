// client/src/components/MeritPaymentModal.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from './ToastProvider';
import { XIcon, HeartIcon } from './Icons';
import { useEscapeKey } from '../hooks/useEscapeKey';

const translations = {
    vi: {
        defaultTitle: "Cúng Dường Tuỳ Tâm",
        subtitle: "Nếu những chia sẻ trên đã gieo vào lòng bạn một hạt mầm an lạc, và bạn mong muốn lan tỏa những giá trị này để chạm đến nhiều cuộc đời hơn, bạn có thể hoan hỷ tùy tâm cúng dường tại:",
        custom: "Tuỳ tâm",
        customSub: "CUSTOM",
        incense: "Bó nhang",
        incenseSub: "INCENSE",
        selected: "ĐÃ CHỌN",
        complete: "Hoàn tất cúng dường",
        redirecting: "Đang chuyển hướng...",
        footerText: "Bằng việc đóng góp, bạn đang giúp hàng ngàn người khác được tiếp tục đặt câu hỏi miễn phí mỗi ngày. ($1 = 25 câu hỏi)",
        errorAmount: "Vui lòng nhập số tiền hợp lệ.",
        errorGeneric: "Có lỗi xảy ra, vui lòng thử lại.",
        customPlaceholder: "Nhập số tiền ($)",
        loginRequired: "Vui lòng đăng nhập để cúng dường.",
        offeringFor: "Hạng mục: ",
        messageLabel: "Lời nhắn (tùy chọn)",
        messagePlaceholder: "Gửi lời chúc, hồi hướng công đức,...",
        contactUs: "Liên hệ chúng tôi tại info@giac.ngo",
    },
    en: {
        defaultTitle: "Custom Offering",
        subtitle: "If the sharing above has planted a seed of peace in your life, and you wish to help spread this message to touch more lives, you are welcome to offer your support here:",
        custom: "Custom",
        customSub: "CUSTOM",
        incense: "Incense",
        incenseSub: "INCENSE",
        selected: "SELECTED",
        complete: "Complete Offering",
        redirecting: "Redirecting...",
        footerText: "By contributing, you're helping thousands of others continue asking questions for free every day. ($1 = 25 questions)",
        errorAmount: "Please enter a valid amount.",
        errorGeneric: "An error occurred, please try again.",
        customPlaceholder: "Enter amount ($)",
        loginRequired: "Please login to make an offering.",
        offeringFor: "Category: ",
        messageLabel: "Message (optional)",
        messagePlaceholder: "Send good wishes, dedicate merit,...",
        contactUs: "Contact us at info@giac.ngo",
    }
};

interface MeritPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onPaymentSuccess: (updatedUser: User) => void;
    language: 'vi' | 'en';
    // Props for contextualization
    offeringTitle?: string;
    suggestedAmount?: number;
    // New prop to trigger the specific "Practice Space" UI
    showIncenseOption?: boolean;
    embedded?: boolean;
    spaceId?: number;
    spaceName?: string;
}

export const MeritPaymentModal: React.FC<MeritPaymentModalProps> = ({
    isOpen,
    onClose,
    user,
    language,
    offeringTitle,
    suggestedAmount,
    showIncenseOption = false, // Default to false (HomePage behavior)
    embedded = false,
    spaceId,
}) => {
    const t = translations[language];
    const { showToast } = useToast();
    // ESC chỉ đóng modal khi không phải embedded mode
    useEscapeKey(onClose, isOpen && !embedded);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [selection, setSelection] = useState<'custom' | 'incense' | 'book'>('custom');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [paymentTab, setPaymentTab] = useState<'payos' | 'stripe' | 'venmo'>('payos');

    // Space payment config — determines which tabs to show
    const [spaceConfig, setSpaceConfig] = useState<{
        hasPayos: boolean;
        hasStripe: boolean;
        hasVenmo: boolean;
        venmoHandle: string;
    }>({ hasPayos: true, hasStripe: false, hasVenmo: false, venmoHandle: '' });

    useEffect(() => {
        if (!isOpen) return;
        const targetSpaceId = spaceId || 1;
        Promise.all([
            apiService.getSpaceById(targetSpaceId).catch(() => null),
            apiService.getStripeConfig().catch(() => null)
        ]).then(([space, stripeCfg]) => {
            if (!space) return;
            const hasPayos = !!(space.payosClientId);
            const isStripeConfigured = !!(stripeCfg && (stripeCfg.configured || stripeCfg.enabled));
            const hasStripe = !!(space.stripeAccountId) && isStripeConfigured;
            const hasVenmo = !!(space.venmoHandle);
            setSpaceConfig({ hasPayos, hasStripe, hasVenmo, venmoHandle: space.venmoHandle || '' });
            // Set default tab to first available
            if (hasPayos) setPaymentTab('payos');
            else if (hasStripe) setPaymentTab('stripe');
            else if (hasVenmo) setPaymentTab('venmo');
        });
    }, [spaceId, isOpen]);

    // Donation List State
    // Donation List State
    const [transactions, setTransactions] = useState<any[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [listPage, setListPage] = useState(1);
    const [listTotal, setListTotal] = useState(0);
    const [dateFilter, setDateFilter] = useState<{ from?: string, to?: string }>({});
    const listRef = React.useRef<HTMLDivElement>(null);

    const fetchTransactions = async (page: number, from?: string, to?: string) => {
        setListLoading(true);
        try {
            // Default to spaceId 1 (Giác Ngộ) if not provided, for homepage context
            const targetSpaceId = spaceId || 1;
            const res = await apiService.getSpaceTransactions(targetSpaceId, {
                page,
                limit: 5,
                fromDate: from || dateFilter.from,
                toDate: to || dateFilter.to
            });
            setTransactions((res as any).data);
            setListTotal((res as any).total);
            setListPage(page);
        } catch (error) {
            console.error("Failed to load donations", error);
        } finally {
            setListLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > Math.ceil(listTotal / 5)) return;
        fetchTransactions(newPage);
    };

    const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'from' | 'to') => {
        const val = e.target.value;
        const newFilter = { ...dateFilter, [type]: val };
        setDateFilter(newFilter);
        // Auto fetch on filter change
        fetchTransactions(1, newFilter.from, newFilter.to);
    };

    useEffect(() => {
        // Initial fetch since list is open by default
        // fetchTransactions(1);
    }, []);

    const [usdVndRate, setUsdVndRate] = useState<number>(25000);

    useEffect(() => {
        if (!isOpen) return;
        let isMounted = true;
        apiService.getExchangeRate()
            .then(data => {
                if (isMounted && data && data.rate) setUsdVndRate(data.rate);
            })
            .catch(() => {
                // Fallback fetch if apiService failed
                fetch('/api/exchange-rate')
                    .then(res => res.json())
                    .then(data => {
                        if (isMounted && data && data.rate) setUsdVndRate(data.rate);
                    })
                    .catch(() => { /* silent — keep fallback 25000 */ });
            });
        return () => { isMounted = false; };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (suggestedAmount) {
            const isVnd = suggestedAmount > 100;
            if (paymentTab === 'stripe') {
                const usd = isVnd ? Math.round(suggestedAmount / usdVndRate) || 1 : suggestedAmount;
                setCustomAmount(String(usd));
            } else {
                const vnd = isVnd ? suggestedAmount : Math.round(suggestedAmount * usdVndRate);
                setCustomAmount(String(vnd));
            }
        }
    }, [suggestedAmount, isOpen, paymentTab, usdVndRate]);

    const handleSwitchTab = (newTab: 'payos' | 'stripe' | 'venmo') => {
        if (newTab === paymentTab) return;
        const currentNum = parseFloat(customAmount.replace(/[^0-9.]/g, ''));
        if (!isNaN(currentNum) && currentNum > 0) {
            if (paymentTab === 'payos' && newTab === 'stripe') {
                // Chuyển từ VNĐ sang USD
                setCustomAmount(String(Math.round(currentNum / usdVndRate) || 1));
            } else if (paymentTab === 'stripe' && newTab === 'payos') {
                // Chuyển từ USD sang VNĐ
                setCustomAmount(String(Math.round(currentNum * usdVndRate)));
            }
        }
        setPaymentTab(newTab);
    };

    const handleSelectOption = (option: 'custom' | 'incense' | 'book') => {
        setSelection(option);
        const isUsd = paymentTab === 'stripe';
        if (option === 'incense') {
            setCustomAmount(isUsd ? '2' : '50000');
        } else if (option === 'book') {
            setCustomAmount(isUsd ? '8' : '200000');
        } else {
            setCustomAmount('');
        }
    };

    const handlePayment = async () => {
        if (!user) {
            showToast(t.loginRequired, 'error');
            return;
        }

        const rawNum = parseFloat(customAmount.replace(/[^0-9.]/g, ''));
        if (isNaN(rawNum) || rawNum <= 0) {
            showToast(t.errorAmount, 'error');
            return;
        }

        let amountUSD: number;
        if (paymentTab === 'stripe') {
            if (rawNum < 1) {
                showToast(language === 'vi' ? 'Mức cúng dường tối thiểu qua thẻ quốc tế là $1 USD.' : 'Minimum donation is $1 USD.', 'error');
                return;
            }
            amountUSD = rawNum;
        } else {
            if (rawNum < 10000) {
                showToast(language === 'vi' ? 'Mức cúng dường tối thiểu qua hệ thống là 10.000 VNĐ.' : 'Minimum donation is 10,000 VND.', 'error');
                return;
            }
            amountUSD = rawNum / usdVndRate;
        }

        setIsLoading(true);
        try {
            showToast(t.redirecting, 'info');
            const returnPath = window.location.pathname + window.location.search;
            let res: any;
            if (paymentTab === 'stripe') {
                res = await apiService.createStripeCheckoutSession(amountUSD, message, spaceId || 1, returnPath);
            } else {
                res = await apiService.createPayOSDonationLink(amountUSD, message, spaceId || 1, returnPath);
            }
            
            if (res && (res.checkoutUrl || res.url)) {
                window.location.href = res.checkoutUrl || res.url;
            } else {
                showToast(t.errorGeneric, 'error');
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            const rawMsg = error.message || '';
            if (rawMsg.includes('Stripe') || rawMsg.includes('Secret Key') || rawMsg.includes('STRIPE_') || rawMsg.includes('bảo trì')) {
                showToast('Cổng thanh toán Stripe hiện chưa sẵn sàng hoặc đang bảo trì. Đang chuyển sang hình thức Quét mã QR VN...', 'error');
                handleSwitchTab('payos');
            } else {
                showToast(rawMsg || t.errorGeneric, 'error');
            }
            setIsLoading(false);
        }
    };



    const handleScrollToList = () => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };



    const content = (
        <div
            className={`${embedded ? 'w-full h-full' : 'bg-[#e8d9b9] rounded-[24px] shadow-2xl w-full max-w-[420px] relative overflow-hidden flex flex-col border-4 border-[#e8d9b9] max-h-[90vh] overflow-y-auto custom-scrollbar'}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Close Button - only if not embedded */}
            {!embedded && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#8c7b75] hover:text-[#5d4a3a] transition-colors z-10"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            )}

            {/* Header Section */}
            <div className={`pt-8 pb-4 px-6 text-center ${embedded ? 'bg-transparent' : 'bg-[#e8d9b9]'}`}>
                <h2 className="text-3xl font-bold text-[#991b1b] mb-2 font-sans">
                    {(!showIncenseOption && offeringTitle) ? offeringTitle : t.defaultTitle}
                </h2>
                {(!showIncenseOption && offeringTitle) && (
                    <p className="text-xs font-bold text-[#991b1b] uppercase tracking-widest mb-3 opacity-80 font-sans">
                        {t.offeringFor}{offeringTitle}
                    </p>
                )}
                <p className="text-[#6D605A] text-sm italic leading-relaxed px-2 font-sans">
                    {t.subtitle}
                </p>
                <button
                    onClick={handleScrollToList}
                    className="hidden text-[#991b1b] text-xs mt-2 hover:text-[#7f1d1d] transition-colors font-sans underline opacity-80 hover:opacity-100"
                >
                    Danh Sách Cùng Dường
                </button>
            </div>

            {/* Body Section */}
            <div className={`px-6 py-6 ${embedded ? 'bg-transparent' : 'bg-[#f2eadb]'}`}>

                {/* Payment method tab — only show configured methods */}
                <div className="flex rounded-xl overflow-hidden border border-[#dcd5bc] mb-5 text-sm font-semibold font-sans">
                    {spaceConfig.hasPayos && (
                        <button
                            onClick={() => handleSwitchTab('payos')}
                            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${paymentTab === 'payos'
                                ? 'bg-[#991b1b] text-white'
                                : 'bg-white text-[#5d4a3a] hover:bg-[#f5ede0]'
                                }`}
                        >
                            <span>🇻🇳</span>
                            {language === 'vi' ? 'Qr Code VN' : 'Qr Code VN'}
                        </button>
                    )}
                    {spaceConfig.hasStripe && (
                        <button
                            onClick={() => handleSwitchTab('stripe')}
                            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${paymentTab === 'stripe'
                                ? 'bg-[#991b1b] text-white'
                                : 'bg-white text-[#5d4a3a] hover:bg-[#f5ede0]'
                                }`}
                        >
                            <span>🌍</span>
                            Stripe (USD)
                        </button>
                    )}
                    {spaceConfig.hasVenmo && (
                        <button
                            onClick={() => handleSwitchTab('venmo')}
                            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${paymentTab === 'venmo'
                                ? 'bg-[#991b1b] text-white'
                                : 'bg-white text-[#5d4a3a] hover:bg-[#f5ede0]'
                                }`}
                        >
                            <span>💵</span>
                            Venmo
                        </button>
                    )}
                </div>

                {/* PayOS / Stripe / Venmo Tab Content */}
                {(paymentTab === 'payos' || paymentTab === 'stripe') && (<>

                    {/* Practice Space Mode: Show Three Cards */}
                    {showIncenseOption && (
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {/* Incense Card */}
                            <button
                                onClick={() => handleSelectOption('incense')}
                                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 bg-white shadow-sm ${selection === 'incense' ? 'border-[#991b1b] ring-1 ring-[#991b1b] bg-[#fffbf0]' : 'border-transparent hover:border-[#dcd5bc]'}`}
                            >
                                <img src="/themes/giacngo/nhang.png" alt="nhang" className="w-10 h-10 object-contain mb-1" />
                                <h3 className="text-[#1f2937] font-bold text-sm font-sans">{t.incense}</h3>
                                <p className="text-[#6D605A] text-[10px] font-sans font-medium">{paymentTab === 'stripe' ? '$2 • +2 MERIT' : '50.000đ • +2 MERIT'}</p>
                            </button>

                            {/* Sutra/Book Card */}
                            <button
                                onClick={() => handleSelectOption('book')}
                                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 bg-white shadow-sm ${selection === 'book' ? 'border-[#991b1b] ring-1 ring-[#991b1b] bg-[#fffbf0]' : 'border-transparent hover:border-[#dcd5bc]'}`}
                            >
                                <img src="/themes/giacngo/sach.png" alt="sách" className="w-10 h-10 object-contain mb-1" />
                                <h3 className="text-[#1f2937] font-bold text-sm font-sans">{language === 'vi' ? 'Cuộn Kinh' : 'Scriptures'}</h3>
                                <p className="text-[#6D605A] text-[10px] font-sans font-medium">{paymentTab === 'stripe' ? '$8 • +8 MERIT' : '200.000đ • +8 MERIT'}</p>
                            </button>

                            {/* Custom Card */}
                            <button
                                onClick={() => handleSelectOption('custom')}
                                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 bg-white shadow-sm ${selection === 'custom' ? 'border-[#991b1b] ring-1 ring-[#991b1b] bg-[#fffbf0]' : 'border-transparent hover:border-[#dcd5bc]'}`}
                            >
                                <img src="/themes/giacngo/hoasen.png" alt="hoa sen" className="w-10 h-10 object-contain mb-1" />
                                <h3 className="text-[#1f2937] font-bold text-sm font-sans">{t.custom}</h3>
                                <p className="text-[#6D605A] text-[10px] font-sans font-medium">{language === 'vi' ? 'Tuỳ ý' : 'Custom'}</p>
                            </button>
                        </div>
                    )}

                    {/* Container for inputs, styled for homepage mode */}
                    <div className="bg-[#fffbf0] border border-[#991b1b] rounded-xl p-6 shadow-sm">
                        {/* Amount Input — always show when a tier is selected */}
                        {(selection !== null) && (
                            <div className="relative w-full animate-fade-in">
                                {!showIncenseOption && (
                                    <div className="flex flex-col items-center justify-center mb-4">
                                        <div className="text-5xl mb-2 filter drop-shadow-sm">🙏</div>
                                        <h3 className="text-[#1f2937] font-bold text-xl font-sans">{t.custom}</h3>
                                    </div>
                                )}
                                <div className="relative w-full">
                                    {paymentTab === 'stripe' && (
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-[#991b1b] font-bold text-xl">$</span>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        inputMode={paymentTab === 'stripe' ? "decimal" : "numeric"}
                                        value={customAmount 
                                            ? (paymentTab === 'stripe'
                                                ? customAmount
                                                : Number(customAmount.replace(/[^0-9]/g, '') || '0').toLocaleString('vi-VN'))
                                            : ''}
                                        onChange={(e) => {
                                            const raw = paymentTab === 'stripe'
                                                ? e.target.value.replace(/[^0-9.]/g, '')
                                                : e.target.value.replace(/[^0-9]/g, '');
                                            setCustomAmount(raw);
                                        }}
                                        placeholder={paymentTab === 'stripe' ? (language === 'vi' ? 'Nhập số tiền ($ USD)' : 'Enter amount ($ USD)') : (language === 'vi' ? 'Nhập số tiền (VNĐ)' : 'Enter amount (VND)')}
                                        className={`w-full bg-white border border-[#e0d5b8] rounded-xl py-3 text-center text-[#991b1b] font-bold text-2xl placeholder-[#d1d5db] focus:outline-none focus:border-[#991b1b] font-sans transition-all ${paymentTab === 'stripe' ? 'pl-8 pr-4' : 'pr-14 pl-4'}`}
                                        autoFocus={selection === 'custom'}
                                    />
                                    {paymentTab !== 'stripe' && (
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-[#991b1b] font-bold text-xl">VNĐ</span>
                                        </div>
                                    )}
                                </div>
                                {customAmount && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) > 0 && paymentTab !== 'stripe' && (
                                    <div className="text-center mt-3 animate-fade-in space-y-1">
                                        <p className="text-sm font-bold text-[#991b1b]">
                                            ≈ ${(parseFloat(customAmount) / usdVndRate).toFixed(2)} USD
                                        </p>
                                        <p className="text-xs text-[#8c7b75]">
                                            {language === 'vi' ? `Tỷ giá: 1 USD ≈ ${usdVndRate.toLocaleString('vi-VN')} VNĐ • Tối thiểu 10.000 VNĐ` : `Rate: 1 USD ≈ ${usdVndRate.toLocaleString('en-US')} VND • Min 10,000 VND`}
                                        </p>
                                    </div>
                                )}
                                {customAmount && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) > 0 && paymentTab === 'stripe' && (
                                    <div className="text-center mt-3 animate-fade-in space-y-1">
                                        <p className="text-sm font-bold text-[#991b1b]">
                                            ≈ {Math.round(parseFloat(customAmount) * usdVndRate).toLocaleString('vi-VN')} VNĐ
                                        </p>
                                        <p className="text-xs text-[#8c7b75]">
                                            {language === 'vi' ? `Tỷ giá: 1 USD ≈ ${usdVndRate.toLocaleString('vi-VN')} VNĐ • Tối thiểu $1 USD` : `Rate: 1 USD ≈ ${usdVndRate.toLocaleString('en-US')} VND • Min $1 USD`}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Message Input Section */}
                        <div className={`relative w-full animate-fade-in ${(selection === 'custom' || !showIncenseOption) ? 'mt-4' : ''}`}>
                            <label htmlFor="offering-message" className="text-xs font-bold text-[#8c7b75] uppercase tracking-wider font-sans mb-1 block">{t.messageLabel}</label>
                            <textarea
                                id="offering-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t.messagePlaceholder}
                                className="w-full bg-white border border-[#e0d5b8] rounded-xl px-4 py-3 text-sm text-[#4B3226] placeholder-[#d1d5db] focus:outline-none focus:border-[#c4a882] font-sans transition-all"
                                rows={2}
                                maxLength={500}
                            />
                        </div>
                    </div>
                </>)}

                {/* Venmo Tab Content */}
                {paymentTab === 'venmo' && spaceConfig.hasVenmo && (
                    <div className="bg-[#fffbf0] border border-[#991b1b] rounded-xl p-6 text-center shadow-sm">
                        <div className="text-5xl mb-3">💵</div>
                        <p className="text-sm text-[#6D605A] mb-4 font-sans">
                            {language === 'vi' ? 'Quyên góp qua Venmo (dành cho người dùng tại Mỹ)' : 'Donate via Venmo (for US users)'}
                        </p>
                        <a
                            href={`https://venmo.com/u/${spaceConfig.venmoHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#3D95CE] hover:bg-[#2e7ab0] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all font-sans"
                        >
                            @{spaceConfig.venmoHandle} trên Venmo
                        </a>
                        <p className="text-xs text-[#8c7b75] mt-3 font-sans opacity-80">
                            venmo.com/u/{spaceConfig.venmoHandle}
                        </p>
                    </div>
                )}
            </div>


            {/* Footer / Action Section */}
            <div className="p-6 bg-[#e8d9b9]">
                <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full bg-[#991b1b] hover:bg-[#7f1d1d] text-[#fefce8] font-bold font-sans py-3.5 px-6 rounded-full shadow-lg transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-t border-white/10"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                {t.redirecting}
                            </>
                        ) : (
                            t.complete
                        )}
                    </button>

                {/* Donation List Section */}
                <div ref={listRef} className="hidden mt-6 bg-[#fffbf0] rounded-xl p-4 shadow-inner border border-[#dcd5bc] animate-fade-in">
                    <div className="flex gap-2 mb-3">
                        <input
                            type="date"
                            onChange={(e) => handleDateFilterChange(e, 'from')}
                            className="w-1/2 p-1.5 text-xs border border-[#dcd5bc] rounded bg-white text-[#4B3226]"
                        />
                        <input
                            type="date"
                            onChange={(e) => handleDateFilterChange(e, 'to')}
                            className="w-1/2 p-1.5 text-xs border border-[#dcd5bc] rounded bg-white text-[#4B3226]"
                        />
                    </div>

                    {listLoading ? (
                        <div className="py-8 text-center text-[#8c7b75] text-sm italic">Loading...</div>
                    ) : (
                        <>
                            {transactions.length === 0 ? (
                                <div className="py-8 text-center text-[#8c7b75] text-sm italic">Chưa có dữ liệu.</div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((tx, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-[#e5e7eb] shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[#991b1b] font-bold text-sm">{new Date(tx.timestamp).toLocaleDateString('vi-VN')}</span>
                                                <span className="bg-[#fef2f2] text-[#991b1b] text-xs px-2 py-0.5 rounded-full font-bold">
                                                    ${Number(tx.merits).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <p className="text-[#4b5563] text-xs line-clamp-2">
                                                {(() => {
                                                    try {
                                                        const details = tx.details ? (typeof tx.details === 'string' ? JSON.parse(tx.details) : tx.details) : {};
                                                        return details.message || tx.message || 'Cúng dường tuỳ tâm';
                                                    } catch {
                                                        return 'Cúng dường tuỳ tâm';
                                                    }
                                                })()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {listTotal > 5 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <button
                                        onClick={() => handlePageChange(listPage - 1)}
                                        disabled={listPage === 1}
                                        className="px-2 py-1 text-xs bg-[#dcd5bc] rounded disabled:opacity-50 text-[#5d4a3a] hover:bg-[#c4bb9e]"
                                    >
                                        Trước
                                    </button>
                                    <span className="text-xs text-[#8c7b75] py-1">Trang {listPage}</span>
                                    <button
                                        onClick={() => handlePageChange(listPage + 1)}
                                        disabled={listPage >= Math.ceil(listTotal / 5)}
                                        className="px-2 py-1 text-xs bg-[#dcd5bc] rounded disabled:opacity-50 text-[#5d4a3a] hover:bg-[#c4bb9e]"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                </div>


                <div className="mt-6 flex items-start gap-3 px-1 opacity-80">
                    <HeartIcon className="w-5 h-5 text-[#991b1b] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#6D605A] leading-snug font-sans">
                        {t.footerText}
                    </p>
                </div>
                <p className="text-center text-xs text-[#6D605A] mt-4 font-sans">
                    {t.contactUs}
                </p>
            </div>
        </div>
    );
    if (!isOpen && !embedded) return null;

    if (embedded) {
        return content;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            {content}
        </div>
    );
};