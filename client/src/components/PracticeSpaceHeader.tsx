// client/src/components/PracticeSpaceHeader.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AIConfig } from '../types';
// FIX: Imported missing MenuIcon and XIcon components.
import { ChevronDownIcon, ChevronLeftIcon, MenuIcon, XIcon, ListIcon } from './Icons';
import { ViewMode } from '../types';


interface PracticeSpaceHeaderProps {
    language: 'vi' | 'en';
    t: any;
    currentAiConfig: AIConfig | null;
    aiConfigs: AIConfig[];
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    isAiSelectorOpen: boolean;
    setIsAiSelectorOpen: (isOpen: boolean) => void;
    aiSelectorRef: React.RefObject<HTMLDivElement>;
    handleSelectAi: (ai: AIConfig) => void;
    setIsMarketplaceModalOpen: (isOpen: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    viewMode: ViewMode;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    spaceSlug?: string;
    // Auth
    isLoggedIn?: boolean;
    onGoToLogin?: () => void;
    // Community nav
    communityTab?: 'home' | 'feed';
    setCommunityTab?: (tab: 'home' | 'feed') => void;
    showNotifications?: boolean;
    handleToggleNotifications?: () => void;
    notificationCount?: number;
    onSearchClick?: () => void;
    isViewingUser?: boolean;
}

export const PracticeSpaceHeader: React.FC<PracticeSpaceHeaderProps> = ({
    language,
    t,
    currentAiConfig,
    aiConfigs,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isAiSelectorOpen,
    setIsAiSelectorOpen,
    aiSelectorRef,
    handleSelectAi,
    setIsMarketplaceModalOpen,
    setViewMode,
    viewMode,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    spaceSlug,
    isLoggedIn,
    onGoToLogin,
    communityTab,
    setCommunityTab,
    showNotifications,
    handleToggleNotifications,
    notificationCount,
    onSearchClick,
    isViewingUser,
}) => {
    const handleCommunityClick = () => {
        if (!isLoggedIn && onGoToLogin) {
            onGoToLogin();
        } else {
            setViewMode('community');
        }
    };
    const navigate = useNavigate();

    // Detect dark mode from localStorage (synced by ConversationSidebar)
    const isDarkMode = typeof window !== 'undefined' &&
        localStorage.getItem('spaceColorMode_v3') === 'dark';
    const inactiveBg = isDarkMode ? 'hsl(28, 18%, 20%)' : 'rgba(255,255,255,0.55)';
    const inactiveColor = isDarkMode ? 'hsl(44, 40%, 65%)' : 'var(--color-text-light)';
    const inactiveShadow = isDarkMode ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.1)';

    // Nếu đang ở custom domain (tathata.bodhilab.io), Back về origin của domain đó
    // Nếu ở giac.ngo với spaceSlug != giac-ngo, Back về trang space (/:spaceSlug)
    // Còn lại Back về /
    const handleBack = () => {
        const host = window.location.hostname;
        const isCustomDomain = host !== 'localhost' && host !== '127.0.0.1' && host !== 'login.bodhilab.io';
        if (isCustomDomain) {
            window.location.href = window.location.origin;
        } else if (spaceSlug && spaceSlug !== 'giac-ngo') {
            navigate(`/${spaceSlug}`);
        } else {
            navigate('/');
        }
    };

    return (
        <header className="chat-main-header">
            <div className="header-content-wrapper" style={{ position: 'relative' }}>
                <div className="header-left-group">
                    {false && (
                        <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                        </button>
                    )}
                    <button onClick={handleBack} className="back-link-desktop flex items-center gap-3 text-text-light hover:text-text-main">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    {viewMode === 'library' && (
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
                            title={isSidebarCollapsed ? 'Mở mục lục' : 'Đóng mục lục'}
                        >
                            <ListIcon className="w-5 h-5" />
                            <span className="hidden md:inline font-medium">Mục lục</span>
                        </button>
                    )}
                </div>

                {/* Community center nav — shown only in community mode */}
                {viewMode === 'community' && setCommunityTab && (
                    <div style={{
                        position: 'absolute', left: '50%', top: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        {/* Profile/My Wall - person icon */}
                        <button
                            onClick={() => { setCommunityTab('home'); }}
                            title="Tường nhà"
                            style={{
                                width: 44, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: communityTab === 'home' && !showNotifications && !isViewingUser ? 'var(--color-primary)' : inactiveBg,
                                color: communityTab === 'home' && !showNotifications && !isViewingUser ? 'var(--color-text-on-primary)' : inactiveColor,
                                boxShadow: communityTab === 'home' && !showNotifications && !isViewingUser ? '0 2px 8px rgba(153,27,27,0.3)' : inactiveShadow,
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Person/profile icon */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                            </svg>
                        </button>
                        {/* Feed - home/house icon */}
                        <button
                            onClick={() => { setCommunityTab('feed'); }}
                            title="Feed"
                            style={{
                                width: 44, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: communityTab === 'feed' && !showNotifications && !isViewingUser ? 'var(--color-primary)' : inactiveBg,
                                color: communityTab === 'feed' && !showNotifications && !isViewingUser ? 'var(--color-text-on-primary)' : inactiveColor,
                                boxShadow: communityTab === 'feed' && !showNotifications && !isViewingUser ? '0 2px 8px rgba(153,27,27,0.3)' : inactiveShadow,
                                transition: 'all 0.2s',
                            }}
                        >
                            {/* Home icon */}
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        </button>
                        {/* Search */}
                        <button
                            onClick={onSearchClick}
                            title="Tìm kiếm"
                            style={{
                                width: 44, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: inactiveBg,
                                color: inactiveColor,
                                boxShadow: inactiveShadow,
                                transition: 'all 0.2s',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                        </button>
                        {/* Bell */}
                        <button
                            id="notif-bell-btn"
                            onClick={handleToggleNotifications}
                            title="Thông báo"
                            style={{
                                width: 44, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                background: showNotifications ? 'var(--color-primary)' : inactiveBg,
                                color: showNotifications ? 'var(--color-text-on-primary)' : inactiveColor,
                                boxShadow: showNotifications ? '0 2px 8px rgba(153,27,27,0.3)' : inactiveShadow,
                                transition: 'all 0.2s',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                            {(notificationCount ?? 0) > 0 && (
                                <span style={{
                                    position: 'absolute', top: 6, right: 6,
                                    width: 17, height: 17, borderRadius: '50%',
                                    background: '#e11d48', color: '#fff',
                                    fontSize: 10, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{(notificationCount ?? 0) > 9 ? '9+' : notificationCount}</span>
                            )}
                        </button>
                    </div>
                )}

                <div className="header-right-group">
                    {viewMode === 'chat' && (
                        <>
                            <div ref={aiSelectorRef} className="relative">
                                {currentAiConfig ? (
                                    <button onClick={() => setIsAiSelectorOpen(!isAiSelectorOpen)} aria-expanded={isAiSelectorOpen} className="ai-selector-button">
                                        <img src={currentAiConfig.avatarUrl} alt={currentAiConfig.name} className="ai-selector-avatar" />
                                        <span className="ai-selector-name">{language === 'en' && currentAiConfig.nameEn ? currentAiConfig.nameEn : currentAiConfig.name}</span>
                                        <ChevronDownIcon className={`chevron ${isAiSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                ) : (
                                    <div className="ai-selector-button is-loading">
                                        <div className="ai-selector-avatar skeleton-placeholder" />
                                        <span className="ai-selector-name skeleton-placeholder" />
                                    </div>
                                )}
                                {isAiSelectorOpen && (
                                    <div className="ai-selector-dropdown">
                                        <p className="px-3 py-2 text-xs font-semibold text-text-light uppercase">{t.aiListTitle}</p>
                                        {aiConfigs.map(ai => (
                                            <button key={ai.id} onClick={() => handleSelectAi(ai)} className={`w-full text-left flex items-center gap-3 p-2 rounded-md ${ai.id === currentAiConfig?.id ? 'bg-primary-light' : 'hover:bg-background-light'}`}>
                                                <img src={ai.avatarUrl} alt={ai.name} className="w-8 h-8 rounded-full" />
                                                <div>
                                                    <p className="font-semibold text-sm">{(language === 'en' && ai.nameEn) ? ai.nameEn : ai.name}</p>
                                                    <p className="text-xs text-text-light">{(language === 'en' && ai.descriptionEn) ? ai.descriptionEn : ai.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsMarketplaceModalOpen(true)} className="header-icon-btn" title={t.marketplace} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:'5px 10px', background:'#991b1b', border:'1px solid #7f1d1d', borderRadius:10, cursor:'pointer', color:'#fefce8', minWidth:44 }}>
                                {/* Magnifying glass icon */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                                </svg>
                                <span className="header-icon-label" style={{ fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.02em', whiteSpace:'nowrap', lineHeight:1, color:'#fefce8' }}>{language === 'vi' ? 'Khám phá' : 'Explore'}</span>
                            </button>
                        </>
                    )}
                    {/* Hide Cộng Đồng button when already in community */}
                    {viewMode !== 'community' && (
                        <button
                            onClick={handleCommunityClick}
                            className="header-icon-btn"
                            title={language === 'vi' ? 'Cộng Đồng' : 'Community'}
                            style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:'5px 10px', background:'#991b1b', border:'1px solid #7f1d1d', borderRadius:10, cursor:'pointer', color:'#fefce8', minWidth:44 }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                            <span className="header-icon-label" style={{ fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.02em', whiteSpace:'nowrap', lineHeight:1, color:'#fefce8' }}>{language === 'vi' ? 'Cộng Đồng' : 'Community'}</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};