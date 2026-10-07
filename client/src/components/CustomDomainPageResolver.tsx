import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { Space, User } from '../types';
import { MeritPaymentModal } from './MeritPaymentModal';

interface Props {
    fallback: React.ReactNode;
    language?: 'vi' | 'en';
    setLanguage?: (lang: 'vi' | 'en') => void;
    user?: User | null;
    onUserUpdate?: (user: User) => void;
}

/**
 * When the app is loaded on a custom domain (not login.bodhilab.io / localhost),
 * this component tries to resolve the space by domain and load its published home page.
 * If no custom page exists, it renders the fallback (usually HomePage).
 */
export const CustomDomainPageResolver: React.FC<Props> = ({ fallback, language, setLanguage, user, onUserUpdate }) => {
    const [status, setStatus] = useState<'loading' | 'found' | 'fallback'>('loading');
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [space, setSpace] = useState<Space | null>(null);
    const [donationModal, setDonationModal] = useState<{
        isOpen: boolean;
        title: string;
        amount: number;
    }>({ isOpen: false, title: '', amount: 0 });
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Listen for postMessage from iframe (navigation, language changes, donation modal, etc.)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // P0 Security Fix: Only accept postMessage from the resolver's own iframe window
            if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'NAVIGATE' && typeof data.path === 'string') {
                const path = data.path.trim();
                // P0 Security Fix: Path must be a local relative path, cannot start with // or javascript:
                if (!path.startsWith('/') || path.startsWith('//') || path.toLowerCase().startsWith('javascript:')) {
                    console.warn('[CustomDomainPageResolver] Rejected unsafe navigation path:', path);
                    return;
                }

                if (data.aiId) {
                    localStorage.setItem('lastSelectedAiId', String(data.aiId));
                }
                // Use React Router navigate for SPA routing instead of full reload
                navigate(path);
            } else if (data.type === 'OPEN_DONATION_MODAL' || data.type === 'OPEN_DONATION') {
                setDonationModal({
                    isOpen: true,
                    title: data.title || '',
                    amount: Number(data.amount) || 0,
                });
            } else if (data.type === 'SET_LANGUAGE' || data.type === 'LANGUAGE_CHANGE' || data.type === 'SET_LANG') {
                const newLang = data.language || data.lang;
                if (newLang === 'vi' || newLang === 'en') {
                    try {
                        localStorage.setItem('language', newLang);
                    } catch (e) {}
                    if (setLanguage) {
                        setLanguage(newLang);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [navigate, setLanguage]);

    const handleIframeLoad = () => {
        try {
            const targetLang = language || (localStorage.getItem('language') as 'vi' | 'en') || 'vi';
            iframeRef.current?.contentWindow?.postMessage({ type: 'SET_LANG', lang: targetLang, language: targetLang }, '*');
            iframeRef.current?.contentWindow?.postMessage({ type: 'SYNC_LANGUAGE', language: targetLang, lang: targetLang }, '*');
        } catch (e) {}
    };

    useEffect(() => {
        const host = window.location.hostname;

        const resolve = async () => {
            try {
                // 1. Find the space for this domain
                const sp = await apiService.getSpaceByDomain(host);
                if (!sp || !sp.slug) {
                    setStatus('fallback');
                    return;
                }
                setSpace(sp);

                // 2. Fetch the published home page for this space
                const res = await fetch(`/api/spaces/${sp.slug}/published-page`);
                if (res.ok) {
                    const html = await res.text();
                    setHtmlContent(html);
                    setStatus('found');

                    // Update tab title
                    document.title = sp.name;
                    // Apply favicon from space's dedicated faviconUrl field (not cover image)
                    if ((sp as any).faviconUrl) {
                        const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
                        link.rel = 'icon';
                        link.href = (sp as any).faviconUrl;
                        if (!link.parentNode) document.head.appendChild(link);
                    }
                } else {
                    setStatus('fallback');
                }
            } catch (err) {
                console.error('CustomDomainPageResolver error:', err);
                setStatus('fallback');
            }
        };

        resolve();
    }, []);

    if (status === 'loading') {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-[#F9F5F0]">
                <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (status === 'fallback') {
        return <>{fallback}</>;
    }

    return (
        <>
            <iframe
                ref={iframeRef}
                onLoad={handleIframeLoad}
                title={space?.name || 'Space'}
                srcDoc={htmlContent || ''}
                className="w-full h-screen border-none block m-0 p-0"
                sandbox="allow-scripts allow-forms allow-popups"
            />
            {donationModal.isOpen && (
                <MeritPaymentModal
                    isOpen={donationModal.isOpen}
                    onClose={() => setDonationModal(prev => ({ ...prev, isOpen: false }))}
                    user={user || null}
                    onPaymentSuccess={(updatedUser) => {
                        if (onUserUpdate) onUserUpdate(updatedUser);
                        setDonationModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    language={language || 'vi'}
                    offeringTitle={donationModal.title}
                    suggestedAmount={donationModal.amount}
                />
            )}
        </>
    );
};
