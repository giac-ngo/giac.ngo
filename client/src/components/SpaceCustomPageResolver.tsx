import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';

export const SpaceCustomPageResolver: React.FC = () => {
    const { spaceSlug, pageSlug } = useParams<{ spaceSlug: string; pageSlug?: string }>();
    const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading');
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
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
            } else if (data.type === 'OPEN_DONATION') {
                // Donation modal is handled within the iframe itself - no action needed here
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [navigate]);

    useEffect(() => {
        const checkCustomPage = async () => {
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
                    setStatus('not_found');
                }
            } catch (err) {
                console.error("Failed to fetch custom space page:", err);
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

    if (status === 'not_found' && !pageSlug) {
        return <Navigate to={`/${spaceSlug}/about`} replace />;
    }

    if (status === 'not_found' && pageSlug) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-[#F9F5F0]">
                <h1 className="text-3xl font-bold font-serif text-[#5D2E0C] mb-2">404 - Not Found</h1>
                <p className="text-[#8B4513]">The requested page could not be found in this space.</p>
                <a href={`/${spaceSlug}/about`} className="mt-4 px-6 py-2 bg-[#8B4513] text-white rounded hover:bg-[#5D2E0C] transition-colors">Return to Space</a>
            </div>
        );
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
        <iframe
            title={`Space Page - ${pageSlug || 'home'}`}
            srcDoc={safeHtml}
            className="w-full h-screen border-none block m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
    );
};
