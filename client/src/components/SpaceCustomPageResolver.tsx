import React, { useState, useEffect } from 'react';
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

    return (
        <iframe
            title={`Space Page - ${pageSlug || 'home'}`}
            srcDoc={htmlContent || ''}
            className="w-full h-screen border-none block m-0 p-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
    );
};
