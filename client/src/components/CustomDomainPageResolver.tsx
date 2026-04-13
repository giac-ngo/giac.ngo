import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Space } from '../types';

interface Props {
    fallback: React.ReactNode;
}

/**
 * When the app is loaded on a custom domain (not login.bodhilab.io / localhost),
 * this component tries to resolve the space by domain and load its published home page.
 * If no custom page exists, it renders the fallback (usually HomePage).
 */
export const CustomDomainPageResolver: React.FC<Props> = ({ fallback }) => {
    const [status, setStatus] = useState<'loading' | 'found' | 'fallback'>('loading');
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [space, setSpace] = useState<Space | null>(null);

    // Listen for postMessage from iframe (navigation, etc.)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'NAVIGATE' && data.path) {
                if (data.aiId) {
                    localStorage.setItem('lastSelectedAiId', String(data.aiId));
                }
                // Full navigation to ensure it works from any context
                window.location.href = data.path;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
        <iframe
            title={`${space?.name || 'Space'} - Home`}
            srcDoc={htmlContent || ''}
            className="w-full h-screen border-none block m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
    );
};
