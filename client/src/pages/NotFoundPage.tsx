// client/src/pages/NotFoundPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface NotFoundPageProps {
    language?: 'vi' | 'en';
    setLanguage?: (lang: 'vi' | 'en') => void;
}

const translations = {
    vi: {
        brand: 'Giác Ngộ',
        pageNotFound: 'Không Tìm Thấy Trang',
        description: 'Trang hoặc không gian bạn đang tìm kiếm không tồn tại, đã bị gỡ bỏ hoặc đường dẫn chưa chính xác.',
        zenQuote: '“Vạn sự do duyên khởi — Chúc bạn luôn an định và sáng suốt trong từng phút giây.”',
        backHome: '← Về Trang Chủ',
        enterTemple: 'Vào Chánh Điện (Chat AI)',
        exploreLibrary: 'Thư Viện Pháp Bảo',
        languageLabel: 'English',
    },
    en: {
        brand: 'Giac Ngo',
        pageNotFound: 'Page Not Found',
        description: 'The page or space you are looking for does not exist, has been removed, or the link is incorrect.',
        zenQuote: '“All phenomena arise from conditions — May you find peace and clarity in the present moment.”',
        backHome: '← Return to Home',
        enterTemple: 'Enter Main Hall (AI Chat)',
        exploreLibrary: 'Dharma Library',
        languageLabel: 'Tiếng Việt',
    }
};

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ language: propLang, setLanguage: propSetLanguage }) => {
    const [localLang, setLocalLang] = useState<'vi' | 'en'>(() => {
        if (propLang) return propLang;
        const saved = localStorage.getItem('language');
        return (saved === 'vi' || saved === 'en') ? saved : 'vi';
    });

    const activeLang = propLang || localLang;
    const t = translations[activeLang];

    const toggleLanguage = () => {
        const nextLang = activeLang === 'vi' ? 'en' : 'vi';
        try {
            localStorage.setItem('language', nextLang);
        } catch (e) {}
        if (propSetLanguage) {
            propSetLanguage(nextLang);
        } else {
            setLocalLang(nextLang);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9F5F0] text-[#2D3748] flex flex-col justify-between font-sans selection:bg-[#991b1b]/10 selection:text-[#991b1b]">
            {/* Header */}
            <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between border-b border-[#E2D9CC]/60">
                <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
                    <img 
                        src="/themes/giacngo/logo.svg" 
                        alt="Giác Ngộ Logo" 
                        className="h-10 w-auto object-contain"
                        onError={(e) => {
                            // Fallback if svg fails
                            (e.target as HTMLImageElement).src = '/themes/giacngo/logo.png';
                        }}
                    />
                </Link>

                <button
                    onClick={toggleLanguage}
                    className="px-3.5 py-1.5 text-xs font-semibold uppercase text-[#8B4513] border border-[#8B4513]/30 rounded-full hover:bg-[#8B4513]/10 transition-colors"
                    title={activeLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
                >
                    {t.languageLabel}
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="max-w-xl mx-auto flex flex-col items-center animate-fade-in">
                    {/* Lotus Icon with gentle breathing pulse */}
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-[#991b1b]/5 flex items-center justify-center ring-8 ring-[#991b1b]/5 shadow-inner">
                            <img
                                src="/themes/giacngo/lotus_icon.svg"
                                alt="Lotus"
                                className="w-14 h-14 object-contain opacity-85 transition-transform duration-700 hover:rotate-12"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/themes/giacngo/hoasen.png';
                                }}
                            />
                        </div>
                    </div>

                    {/* 404 Text */}
                    <span className="text-8xl sm:text-9xl font-serif font-black tracking-tight text-[#8B4513] opacity-90 select-none">
                        404
                    </span>

                    {/* Heading */}
                    <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-[#5D2E0C] tracking-normal">
                        {t.pageNotFound}
                    </h1>

                    {/* Description */}
                    <p className="mt-3 text-base text-[#718096] max-w-md leading-relaxed">
                        {t.description}
                    </p>

                    {/* Zen quote box */}
                    <div className="mt-6 px-6 py-3.5 rounded-2xl bg-white/70 border border-[#E2D9CC] shadow-sm max-w-lg">
                        <p className="text-xs sm:text-sm italic text-[#8B4513]/85 leading-relaxed font-serif tracking-normal">
                            {t.zenQuote}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                        <Link
                            to="/"
                            className="px-6 py-3 rounded-full bg-[#991b1b] text-white font-medium text-sm shadow-md hover:bg-[#7f1d1d] hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {t.backHome}
                        </Link>
                        <Link
                            to="/chat"
                            className="px-6 py-3 rounded-full bg-white text-[#5D2E0C] border border-[#E2D9CC] font-medium text-sm shadow-sm hover:border-[#8B4513]/50 hover:bg-[#FAF7F2] transition-all transform hover:-translate-y-0.5"
                        >
                            {t.enterTemple}
                        </Link>
                        <Link
                            to="/library"
                            className="px-6 py-3 rounded-full bg-white text-[#5D2E0C] border border-[#E2D9CC] font-medium text-sm shadow-sm hover:border-[#8B4513]/50 hover:bg-[#FAF7F2] transition-all transform hover:-translate-y-0.5"
                        >
                            {t.exploreLibrary}
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-4 text-center text-xs text-[#A0AEC0] border-t border-[#E2D9CC]/40">
                <p>© {new Date().getFullYear()} {t.brand} — Awakening Agentic Social Network</p>
            </footer>
        </div>
    );
};

export default NotFoundPage;
