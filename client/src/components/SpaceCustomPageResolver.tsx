import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { NotFoundPage } from '../pages/NotFoundPage';
import { User } from '../types';
import { MeritPaymentModal } from './MeritPaymentModal';

interface SpaceCustomPageResolverProps {
    language?: 'vi' | 'en';
    setLanguage?: (lang: 'vi' | 'en') => void;
    user?: User | null;
    onUserUpdate?: (user: User) => void;
}

export const SpaceCustomPageResolver: React.FC<SpaceCustomPageResolverProps> = ({ language, setLanguage, user, onUserUpdate }) => {
    const { spaceSlug, pageSlug } = useParams<{ spaceSlug: string; pageSlug?: string }>();
    const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading');
    const [spaceExists, setSpaceExists] = useState<boolean | null>(null);
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [donationModal, setDonationModal] = useState<{
        isOpen: boolean;
        title: string;
        amount: number;
    }>({ isOpen: false, title: '', amount: 0 });
    const navigate = useNavigate();

    // Listen for postMessage from iframe (navigation, donation, etc.)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'NAVIGATE' && data.path) {
                // Store selected AI if provided
                if (data.aiId) {
                    localStorage.setItem('lastSelectedAiId', String(data.aiId));
                }
                // Use full navigation instead of React Router to ensure it works from any iframe context
                window.location.href = data.path;
            } else if (data.type === 'OPEN_DONATION_MODAL' || data.type === 'OPEN_DONATION') {
                setDonationModal({
                    isOpen: true,
                    title: data.title || '',
                    amount: Number(data.amount) || 0,
                });
            } else if (data.type === 'SET_LANGUAGE' || data.type === 'LANGUAGE_CHANGE') {
                if (data.language === 'vi' || data.language === 'en') {
                    try {
                        localStorage.setItem('language', data.language);
                    } catch (e) {}
                    if (setLanguage) {
                        setLanguage(data.language);
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [navigate, setLanguage]);

    useEffect(() => {
        const checkCustomPage = async () => {
            if (!spaceSlug) {
                setStatus('not_found');
                setSpaceExists(false);
                return;
            }

            try {
                const apiUrl = pageSlug
                    ? `/api/spaces/${spaceSlug}/published-page/${pageSlug}`
                    : `/api/spaces/${spaceSlug}/published-page`;
                const res = await fetch(apiUrl);
                if (res.ok) {
                    const html = await res.text();
                    setHtmlContent(html);
                    setStatus('found');
                } else {
                    // Check whether the space itself exists
                    try {
                        const space = await apiService.getSpaceBySlug(spaceSlug);
                        if (space && space.id) {
                            setSpaceExists(true);
                        } else {
                            setSpaceExists(false);
                        }
                    } catch {
                        setSpaceExists(false);
                    }
                    setStatus('not_found');
                }
            } catch (err) {
                console.error("Failed to fetch custom space page:", err);
                setSpaceExists(false);
                setStatus('not_found');
            }
        };

        checkCustomPage();
    }, [spaceSlug, pageSlug]);

    // Detect if the custom page is just a redirect script (e.g. window.location.replace("/thile/chat"))
    // If so, perform the redirect at the parent level instead of rendering inside an iframe
    const redirectTarget = useMemo(() => {
        if (!htmlContent) return null;
        // Match common redirect patterns:
        // window.location.replace("..."), window.location.href = "...", window.location = "..."
        const patterns = [
            /window\.location\.replace\(\s*["']([^"']+)["']\s*\)/,
            /window\.location\.href\s*=\s*["']([^"']+)["']/,
            /window\.location\s*=\s*["']([^"']+)["']/,
        ];
        // Only treat as redirect if the <body> contains essentially ONLY a script with a redirect
        // Strip HTML tags except script content to check if there's meaningful content
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const bodyContent = bodyMatch ? bodyMatch[1].trim() : htmlContent;
        // Remove all HTML tags to see if there's any visible text content
        const textContent = bodyContent.replace(/<[^>]*>/g, '').trim();
        if (textContent.length > 0) return null; // Has visible content, not a pure redirect

        for (const pattern of patterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) return match[1];
        }
        return null;
    }, [htmlContent]);

    if (status === 'loading') {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-[#F9F5F0]">
                <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (status === 'not_found') {
        // If the space itself does not exist: render dedicated 404 page
        if (spaceExists === false) {
            return <NotFoundPage language={language} setLanguage={setLanguage} />;
        }
        // If the space exists but has no custom home page, fallback to space's about page
        if (!pageSlug && spaceExists === true) {
            return <Navigate to={`/${spaceSlug}/about`} replace />;
        }
        // If the space exists but a specific sub-page slug was not found
        return <NotFoundPage language={language} setLanguage={setLanguage} />;
    }

    // If the custom page is just a redirect, perform it at the parent level
    if (redirectTarget) {
        return <Navigate to={redirectTarget} replace />;
    }

    // For real custom pages (not pure redirects), inject a script that ensures
    // any window.location redirects target the top window instead of staying in the iframe
    const safeHtml = htmlContent ? htmlContent.replace(
        '<head>',
        `<head><script>
            // Override location methods to always target the top window
            if (window !== window.top) {
                var _origReplace = window.location.replace.bind(window.location);
                Object.defineProperty(window, '__gnRedirect', { value: function(url) { window.top.location.href = url; } });
                // Patch common redirect patterns
                var _origAssign = window.location.assign.bind(window.location);
                window.location.replace = function(url) { window.top.location.replace(url); };
                window.location.assign = function(url) { window.top.location.assign(url); };
            }
        </script>`
    ) : '';

    return (
        <>
            <iframe
                title={`Space Page - ${pageSlug || 'home'}`}
                srcDoc={safeHtml}
                className="w-full h-screen border-none block m-0 p-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
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
