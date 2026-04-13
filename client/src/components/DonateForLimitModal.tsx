// client/src/components/DonateForLimitModal.tsx
import React, { useState, useEffect } from 'react';
import { PricingPlan, User } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from './ToastProvider';

interface DonateForLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUserUpdate: (user: User) => void;
    language: 'vi' | 'en';
    baseDailyLimit?: number;
    bonusLimit?: number;
    spaceId?: number | null;
    aiConfigId?: number | null;
}

export const translations = {
    vi: {
        title: "\"Chén trà đã vơi, tâm cần nghỉ ngơi\"",
        subtitle: (dailyLimit: number) => `Hôm nay bạn đã tinh tấn vấn đạo đủ ${dailyLimit} lần.\nĐể duy trì ánh sáng trí tuệ cho không gian này, bạn có thể:`,
        meditateTitle: 'Ngồi Yên Thiền Định',
        meditateDesc: 'Nhận 0.04 MERIT (tương đương 1 câu hỏi) sau mỗi 30 phút tọa thiền.',
        tomorrowTitle: 'Quay Lại Vào Ngày Mai',
        tomorrowDesc: 'Tâm trí được làm mới sau một giấc ngủ ngon. Hẹn gặp lại bạn vào ngày mai.',
        loading: "Đang tải...",
        loadError: "Không thể tải bảng giá. Vui lòng thử lại sau.",
        redirecting: "Đang chuyển đến trang thanh toán...",
        errorGeneric: "Đã xảy ra lỗi. Vui lòng thử lại.",
        maybeLater: 'Để sau',
    },
    en: {
        title: "\"The tea cup is empty, the mind needs rest\"",
        subtitle: (dailyLimit: number) => `You have diligently asked ${dailyLimit} questions today.\nTo maintain the light of wisdom for this space, you can:`,
        meditateTitle: 'Sit Still and Meditate',
        meditateDesc: 'Receive 0.04 MERIT (equals 1 question) after every 30 minutes of meditation.',
        tomorrowTitle: 'Return Tomorrow',
        tomorrowDesc: 'The mind is refreshed after a good sleep. See you tomorrow.',
        loading: "Loading...",
        loadError: "Could not load pricing plans. Please try again later.",
        redirecting: "Redirecting to payment...",
        errorGeneric: "An error occurred. Please try again.",
        maybeLater: 'Maybe later',
    }
};

export const DonateForLimitModal: React.FC<DonateForLimitModalProps> = ({ isOpen, onClose, language, baseDailyLimit = 1, spaceId }) => {
    const { showToast } = useToast();
    const t = translations[language];
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingPlanId, setLoadingPlanId] = useState<number | string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'payos' | 'stripe'>('payos');

    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        let isMounted = true;
        apiService.getPricingPlans(spaceId ?? undefined).then(res => {
            if (isMounted) {
                // Show all active plans with a price > 0
                const activePlans = res.filter(p => p.isActive && parseFloat(String(p.price)) > 0);
                setPlans(activePlans);
                setIsLoading(false);
            }
        }).catch(err => {
            console.error(err);
            if (isMounted) setIsLoading(false);
        });
        return () => { isMounted = false; };
    }, [isOpen, spaceId]);

    const handlePaymentClick = async (plan: PricingPlan) => {
        setLoadingPlanId(plan.id);
        try {
            showToast(t.redirecting, 'info');
            const returnPath = window.location.pathname + window.location.search;
            let res: any;
            if (paymentMethod === 'stripe') {
                const amount = parseFloat(String(plan.price).replace(/[^0-9.]/g, '')) || 0;
                res = await apiService.createStripeCheckoutSession(amount, plan.planName, spaceId || 1, returnPath, 'ai_limit_donate', plan.id as number);
            } else {
                res = await apiService.createPayOSPaymentLink(plan.id, spaceId || null, returnPath);
            }
            if (res && (res.checkoutUrl || res.url)) {
                window.location.href = res.checkoutUrl || res.url;
            } else {
                throw new Error(t.errorGeneric);
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            showToast(error.message || t.errorGeneric, 'error');
            setLoadingPlanId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-[#e6d5b0] rounded-2xl shadow-2xl w-full max-w-lg transform transition-all animate-fade-in-up overflow-hidden" 
                onClick={e => e.stopPropagation()}
                style={{ backgroundImage: 'linear-gradient(to bottom, #f0e6d2, #e6d5b0)' }}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-[#8c7b75] hover:text-[#5d4a3a] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div className="p-8 text-center pt-10">
                    <div className="mb-6 flex justify-center">
                        <img src="/themes/giacngo/chaptay.png" alt="Pray" className="w-20 h-20 object-contain" />
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-bold text-[#991b1b] italic mb-4" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                        {t.title}
                    </h2>
                    
                    <p className="text-[#5d4a3a] mb-8 font-medium whitespace-pre-line leading-relaxed">
                        {t.subtitle(baseDailyLimit)}
                    </p>

                    <div className="space-y-4 text-left">
                        {/* Option 1: Meditate */}
                        <button 
                            onClick={onClose}
                            className="group w-full bg-[#fdfbf7]/80 hover:bg-[#991b1b] border border-[#e0d5b8] hover:border-[#991b1b] rounded-xl p-4 flex items-start gap-4 transition-all shadow-sm hover:shadow-md text-left"
                        >
                            <div className="mt-1 shrink-0 flex items-center justify-center w-12 h-12">
                                <img src="/themes/giacngo/thien.png" alt="Meditate" className="w-12 h-12 object-contain" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#333] group-hover:text-white transition-colors">{t.meditateTitle}</h3>
                                <p className="text-sm text-[#666] group-hover:text-white/90 mt-1 transition-colors">{t.meditateDesc}</p>
                            </div>
                        </button>

                        {/* Payment Toggle */}
                        <div className="flex justify-center gap-2 mb-4">
                            <button
                                onClick={() => setPaymentMethod('payos')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'payos' ? 'bg-[#991b1b] text-white shadow-md' : 'bg-[#e0d5b8]/50 text-[#5d4a3a] hover:bg-[#e0d5b8]'}`}
                            >
                                🇻🇳 PayOS
                            </button>
                            <button
                                onClick={() => setPaymentMethod('stripe')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${paymentMethod === 'stripe' ? 'bg-[#991b1b] text-white shadow-md' : 'bg-[#e0d5b8]/50 text-[#5d4a3a] hover:bg-[#e0d5b8]'}`}
                            >
                                🌍 thẻ Quốc Tế (Stripe)
                            </button>
                        </div>

                        {/* Option 2: Dynamic Pricing Plans */}
                        {!isLoading && plans.map(plan => (
                            <button 
                                key={plan.id}
                                onClick={() => handlePaymentClick(plan)}
                                disabled={loadingPlanId !== null}
                                className="group w-full bg-[#fdfbf7]/80 hover:bg-[#991b1b] border border-[#e0d5b8] hover:border-[#991b1b] rounded-xl p-4 flex items-start gap-4 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed text-left"
                            >
                                <div className="mt-1 shrink-0 flex items-center justify-center w-12 h-12">
                                    {plan.imageUrl ? (
                                        <img src={plan.imageUrl} alt={plan.planName} className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                        <img src="/themes/giacngo/nhang.png" alt="Nhang" className="w-12 h-12 object-contain" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#333] group-hover:text-white transition-colors">
                                        {language === 'vi' ? 'Gieo Duyên Hộ Pháp — ' : 'Cultivate Merits — '}
                                        {language === 'en' && plan.planNameEn ? plan.planNameEn : plan.planName} (${plan.price})
                                    </h3>
                                    <p className="text-sm text-[#666] group-hover:text-white/90 mt-1 transition-colors">
                                        {language === 'vi' 
                                            ? `Cúng dường một ${plan.planName} ($${plan.price}) để nhận ngay ${plan.dailyLimitBonus} lượt vấn đáp và giúp đỡ những người khác.`
                                            : `Make a ${plan.planNameEn || plan.planName} donation ($${plan.price}) to instantly receive ${plan.dailyLimitBonus} questions and support others.`}
                                    </p>
                                </div>
                                {loadingPlanId === plan.id && (
                                    <div className="ml-auto mt-2 shrink-0 animate-spin rounded-full h-5 w-5 border-b-2 border-[#991b1b] group-hover:border-white"></div>
                                )}
                            </button>
                        ))}

                        {/* Option 3: Return Tomorrow */}
                        <button 
                            onClick={onClose}
                            className="group w-full bg-[#fdfbf7]/80 hover:bg-[#991b1b] border border-[#e0d5b8] hover:border-[#991b1b] rounded-xl p-4 flex items-start gap-4 transition-all shadow-sm hover:shadow-md text-left"
                        >
                            <div className="mt-1 shrink-0 flex items-center justify-center w-12 h-12">
                                <img src="/themes/giacngo/senhong.png" alt="Lotus" className="w-12 h-12 object-contain" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#333] group-hover:text-white transition-colors">{t.tomorrowTitle}</h3>
                                <p className="text-sm text-[#666] group-hover:text-white/90 mt-1 transition-colors">{t.tomorrowDesc}</p>
                            </div>
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="mt-6 text-sm text-[#8c7b75] hover:text-[#5d4a3a] underline underline-offset-4"
                    >
                        {t.maybeLater}
                    </button>
                </div>
            </div>
        </div>
    );
};
