// client/src/components/ConversationSidebar.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AIConfig, Conversation, User, SystemConfig, ViewMode, LibraryFilters, Space } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from './ToastProvider';
import { LanguageIcon, CryptoIcon, LogoutIcon, PencilIcon, TrashIcon, HelmetIcon, LoginIcon, SpinnerIcon } from './Icons';
import { LibraryMenu } from './LibraryMenu';


interface ConversationSidebarProps {
    user: User | null;
    aiConfigs: AIConfig[];
    currentAiConfig: AIConfig | null;
    selectedConversationId: number | null;
    conversationUpdateTrigger: number;
    onSelectConversation: (conv: Conversation) => void;
    onNewConversation: (aiConfig: AIConfig) => void;
    onDeleteConversation: (id: number) => void;
    onGoToAdmin: () => void;
    onLogout: () => void;
    onGoToLogin: () => void;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
    systemConfig: SystemConfig;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    onOpenMeritPurchase: () => void;
    viewMode: ViewMode;
    libraryFilters: LibraryFilters;
    onSetLibraryFilters: React.Dispatch<React.SetStateAction<LibraryFilters>>;
    spaceSlug?: string;
    currentSpace: Space | null;
    onOpenAbout?: () => void;
}

const translations = {
    vi: {
        newChat: "Trò chuyện mới",
        recentChats: "Cuộc trò chuyện gần đây",
        noRecentChats: "Không có cuộc trò chuyện nào.",
        delete: "Xóa",
        rename: "Đổi tên",
        renameSuccess: "Đã đổi tên hội thoại.",
        renameError: "Lỗi khi đổi tên hội thoại.",
        meritsLeft: "Số merit còn lại",
        requestsLeft: "Request gói tháng",
        aiRequestsLeft: "Request của AI này",
        adminPage: "Quản trị",
        logout: "Đăng xuất",
        unlimited: "Không giới hạn",
        loading: "Đang tải...",
        topUp: "Nạp Merit",
        donation: "Cúng dường",
        chatMode: 'Trò chuyện',
        meditationMode: 'Thiền',
        communityMode: 'Cộng Đồng',
        dharmaTalksMode: 'Pháp Thoại',
        libraryMode: 'Thư Viện',
        meditationTitle: 'Thiền Định',
        meditationDesc: 'Tĩnh tâm là khoảng lặng cần thiết để tâm trí được nghỉ ngơi, tái tạo năng lượng và tìm thấy sự bình an từ bên trong.',
        dharmaTalksTitle: 'Pháp Thoại',
        dharmaTalksDesc: 'Lắng nghe các bài giảng pháp thoại từ các thiền sư và giảng sư uy tín.',
        loginToChat: "Vui lòng đăng nhập để xem và bắt đầu cuộc trò chuyện.",
        login: "Đăng nhập",
        loginOrRegister: "Đăng nhập / Đăng ký",
        loadingMore: 'Đang tải thêm...',
    },
    en: {
        newChat: "New Conversation",
        recentChats: "Recent Chats",
        noRecentChats: "No recent chats.",
        delete: "Delete",
        rename: "Rename",
        renameSuccess: "Conversation renamed.",
        renameError: "Error renaming conversation.",
        meritsLeft: "Merits Left",
        requestsLeft: "Subscription Requests",
        aiRequestsLeft: "Requests for this AI",
        adminPage: "Admin Page",
        logout: "Logout",
        unlimited: "Unlimited",
        loading: "Loading...",
        topUp: "Top up Merits",
        donation: "Donation",
        chatMode: 'Chat',
        meditationMode: 'Meditation',
        communityMode: 'Community',
        dharmaTalksMode: 'Dharma Talks',
        libraryMode: 'Library',
        meditationTitle: 'Meditation',
        meditationDesc: 'Meditation is a necessary pause for the mind to rest, regenerate energy, and find inner peace.',
        dharmaTalksTitle: 'Dharma Talks',
        dharmaTalksDesc: 'Listen to dharma talks from reputable Zen masters and teachers.',
        loginToChat: "Please log in to see and start conversations.",
        login: "Login",
        loginOrRegister: "Login / Sign Up",
        loadingMore: 'Loading more...',
    }
};

const CONVERSATIONS_PAGE_SIZE = 15;

const SidebarInfoPanel: React.FC<{ title: string, description: string }> = ({ title, description }) => (
    <div className="sidebar-info-panel">
        <h3 className="title">{title}</h3>
        <p className="description">{description}</p>
    </div>
);


export const ConversationSidebar: React.FC<ConversationSidebarProps> = (props) => {
    const {
        user, currentAiConfig, selectedConversationId, onSelectConversation,
        onNewConversation, onDeleteConversation, onLogout, language,
        setLanguage, systemConfig, isSidebarCollapsed, setIsSidebarCollapsed,
        onGoToAdmin, onGoToLogin, onOpenMeritPurchase, viewMode, libraryFilters,
        onSetLibraryFilters, spaceSlug, currentSpace, conversationUpdateTrigger, aiConfigs
    } = props;

    const navigate = useNavigate();
    const { showToast } = useToast();


    const t = translations[language];

    // DEBUG: log currentSpace flags (remove after fixing)
    React.useEffect(() => {
        if (currentSpace) {
            console.log('[Sidebar] currentSpace flags:', {
                slug: currentSpace.slug,
                hasMeditation: currentSpace.hasMeditation,
                hasLibrary: currentSpace.hasLibrary,
                hasDharmaTalks: currentSpace.hasDharmaTalks,
            });
        }
    }, [currentSpace]);

    const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('spaceColorMode_v3') as 'light' | 'dark';
        return saved || 'light';
    });

    // Apply color mode to practice-space-page and persist to localStorage
    useEffect(() => {
        const page = document.querySelector('.practice-space-page');
        if (page) {
            if (colorMode === 'dark') {
                page.setAttribute('data-color-mode', 'dark');
            } else {
                page.removeAttribute('data-color-mode');
            }
        }
        localStorage.setItem('spaceColorMode_v3', colorMode);
    }, [colorMode]);

    const toggleColorMode = () => setColorMode(prev => prev === 'light' ? 'dark' : 'light');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const userMenuRef = useRef<HTMLDivElement>(null);
    const hasAdminPermission = !!user;
    const currentTheme = user?.template || systemConfig?.template || 'giacngo';
    const logoUrl = (currentSpace?.imageUrl && currentSpace.imageUrl.trim() !== '') 
        ? currentSpace.imageUrl 
        : (systemConfig?.templateSettings?.[currentTheme]?.logoUrl || '/themes/giacngo/giac-ngo-logo-doc.png');

    const fetchConversations = useCallback(async (pageNum: number, abortSignal: AbortSignal) => {
        if (!user || !currentAiConfig || typeof currentAiConfig.id !== 'number') {
            setConversations([]);
            setHasMore(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiService.getConversations({
                userId: user.id as number,
                aiConfigId: currentAiConfig.id,
                page: pageNum,
                limit: CONVERSATIONS_PAGE_SIZE
            });

            const { data, total } = response;

            if (abortSignal.aborted) return;

            setConversations(prev => pageNum === 1 ? data : [...prev, ...data]);
            setHasMore((pageNum * CONVERSATIONS_PAGE_SIZE) < total);
        } catch (error) {
            if (!abortSignal.aborted) {
                showToast('Failed to load conversations', 'error');
            }
        } finally {
            if (!abortSignal.aborted) {
                setIsLoading(false);
            }
        }
    }, [user, currentAiConfig, showToast]);

    useEffect(() => {
        const controller = new AbortController();
        setConversations([]);
        setPage(1);
        setHasMore(true);
        fetchConversations(1, controller.signal);
        return () => controller.abort();
    }, [currentAiConfig?.id, user?.id, conversationUpdateTrigger, fetchConversations]);

    const handleScroll = () => {
        const listElement = listRef.current;
        if (listElement && listElement.scrollTop + listElement.clientHeight >= listElement.scrollHeight - 50 && !isLoading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    useEffect(() => {
        if (page > 1) {
            const controller = new AbortController();
            fetchConversations(page, controller.signal);
            return () => controller.abort();
        }
    }, [page, fetchConversations]);

    const handleRename = async (id: number) => {
        if (!renameValue.trim()) {
            setRenamingId(null);
            return;
        }
        try {
            await apiService.renameConversation(id, renameValue);
            setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: [{ ...c.messages[0], text: renameValue }, ...c.messages.slice(1)] } : c));
            showToast(t.renameSuccess, 'success');
        } catch (error) {
            showToast(t.renameError, 'error');
        } finally {
            setRenamingId(null);
        }
    };



    const handleRestrictedTabClick = (path: string) => {
        onOpenMeritPurchase();
        navigate(path);
    };

    const renderSidebarContent = () => {
        if (isSidebarCollapsed) return null;
        switch (viewMode) {
            case 'chat':
                return (
                    <div className="flex flex-col gap-4 flex-grow min-h-0">
                        <div className="px-3 pt-4">
                            <button onClick={() => currentAiConfig && onNewConversation(currentAiConfig)} className="btn-new-chat-plus w-full">
                                {t.newChat}
                            </button>
                        </div>

                        {!user ? (
                            <p className="px-3 text-center text-sm text-text-light">{t.loginToChat}</p>
                        ) : (
                            <>
                                <div className="px-3"><h3 className="text-xs font-semibold uppercase text-text-light">{t.recentChats}</h3></div>
                                <div className="overflow-y-auto flex-grow min-h-0 conversation-list" ref={listRef} onScroll={handleScroll}>
                                    {isLoading && page === 1 && <div className="p-4 text-center"><SpinnerIcon className="w-6 h-6 animate-spin text-primary mx-auto" /></div>}

                                    {conversations.map(conv => (
                                        <div key={conv.id} className={`conversation-item-wrapper ${selectedConversationId === conv.id ? 'active' : ''}`}>
                                            <button onClick={() => onSelectConversation(conv)} className="conversation-item">
                                                {renamingId === conv.id ? (
                                                    <input
                                                        type="text"
                                                        value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onBlur={() => handleRename(conv.id)}
                                                        onKeyDown={e => e.key === 'Enter' && handleRename(conv.id)}
                                                        autoFocus
                                                        className="rename-input"
                                                    />
                                                ) : (
                                                    <span className="truncate">{conv.messages[0]?.text || `Conversation ${conv.id}`}</span>
                                                )}
                                            </button>
                                            {renamingId !== conv.id && (
                                                <div className="conversation-actions">
                                                    <button onClick={() => { setRenamingId(conv.id); setRenameValue(conv.messages[0]?.text || ''); }} title={t.rename}><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => onDeleteConversation(conv.id)} title={t.delete}><TrashIcon className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {isLoading && page > 1 && <div className="p-2 text-center text-xs text-text-light">{t.loadingMore}</div>}
                                    {!isLoading && conversations.length === 0 && <p className="px-3 text-sm text-text-light">{t.noRecentChats}</p>}
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'library': return <LibraryMenu filters={libraryFilters} onSetFilters={onSetLibraryFilters} language={language} isSidebarCollapsed={isSidebarCollapsed} spaceId={currentSpace?.id} spaceSlug={spaceSlug} />;
            case 'meditationtimer': return <SidebarInfoPanel title={t.meditationTitle} description={t.meditationDesc} />;
            case 'dharmatalks': return <SidebarInfoPanel title={t.dharmaTalksTitle} description={t.dharmaTalksDesc} />;
            case 'community': return null; // Social Feed renders in main panel
            default: return null;
        }
    }


    return (
        <aside className={`conversation-sidebar ${isSidebarCollapsed ? 'conversation-sidebar-collapsed' : 'w-80'} bg-background-panel flex flex-col h-full flex-shrink-0`}>
            <header className="sidebar-header">
                {!isSidebarCollapsed && (
                    <Link to="/" className="logo-link">
                        <img src={logoUrl} alt="Logo" className="logo" />
                    </Link>
                )}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="sidebar-toggle-btn"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </header>

            <div className="flex-grow min-h-0 flex flex-col">
                <div className="quick-actions-container">
                    <div className="quick-actions-grid">
                        <Link 
                            to={`/${spaceSlug}/chat`}  
                            onClick={(e) => {
                                if (!aiConfigs || aiConfigs.length === 0) {
                                    e.preventDefault();
                                    showToast(language === 'vi' ? 'Không gian này chưa khởi tạo AI.' : 'AI not initialized for this space.', 'info');
                                }
                            }}
                            className={`quick-action-btn ${viewMode === 'chat' ? 'active' : ''}`} title={t.chatMode}
                        >
                            <img src="/themes/giacngo/2.png" alt={t.chatMode} />
                            <span className="quick-action-label">{language === 'vi' ? 'Trò chuyện' : 'Chat'}</span>
                        </Link>
                        {Boolean(currentSpace?.hasMeditation) && (
                            <Link to={`/${spaceSlug}/meditationtimer`} className={`quick-action-btn ${viewMode === 'meditationtimer' ? 'active' : ''}`} title={t.meditationMode}>
                                <img src="/themes/giacngo/5.png" alt={t.meditationMode} />
                                <span className="quick-action-label">{language === 'vi' ? 'Thiền' : 'Meditate'}</span>
                            </Link>
                        )}
                        {Boolean(currentSpace?.hasLibrary) && (
                            <button onClick={() => handleRestrictedTabClick(`/${spaceSlug}/library`)} className={`quick-action-btn ${viewMode === 'library' ? 'active' : ''}`} title={t.libraryMode}>
                                <img src="/themes/giacngo/3.png" alt={t.libraryMode} />
                                <span className="quick-action-label">{language === 'vi' ? 'Thư viện' : 'Library'}</span>
                            </button>
                        )}
                        {Boolean(currentSpace?.hasDharmaTalks) && (
                            <button onClick={() => handleRestrictedTabClick(`/${spaceSlug}/dharmatalks`)} className={`quick-action-btn ${viewMode === 'dharmatalks' ? 'active' : ''}`} title={t.dharmaTalksMode}>
                                <img src="/themes/giacngo/4.png" alt={t.dharmaTalksMode} />
                                <span className="quick-action-label">{language === 'vi' ? 'Pháp thoại' : 'Dharma'}</span>
                            </button>
                        )}
                        {/* Tab Community (Social Feed) — tạm ẩn */}
                        {/* <Link to={`/${spaceSlug}/community`} className={`quick-action-btn ${viewMode === 'community' ? 'active' : ''}`} title={t.communityMode}>
                            <img src="/themes/giacngo/3.png" alt={t.communityMode} style={{ filter: 'hue-rotate(180deg)' }} />
                            <span className="quick-action-label">{t.communityMode}</span>
                        </Link> */}
                    </div>
                </div>
                {renderSidebarContent()}
            </div>

            <footer className="sidebar-footer">
                {user ? (
                    isSidebarCollapsed ? (
                        <div className="flex flex-col items-center gap-y-2 py-2">
                            <div className="flex flex-col items-center gap-y-2">
                                <button onClick={() => setIsSidebarCollapsed(false)} className="p-0 border-0 bg-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-panel focus:ring-primary">
                                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full cursor-pointer" title={user.name} />
                                </button>
                                <button onClick={toggleColorMode} title={colorMode === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {colorMode === 'dark'
                                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                    }
                                </button>
                                <button onClick={onLogout} className="p-2 text-text-light hover:bg-background-light rounded-full" title={t.logout}>
                                    <LogoutIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div ref={userMenuRef}>
                            <div className="user-info-card-new">
                                <div className="user-info-header">
                                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                                    <div className="user-info-details overflow-hidden">
                                        <p className="font-semibold truncate">{user.name}</p>
                                        <p className="text-xs text-text-light truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="w-full flex flex-col gap-1.5 mt-2">
                                    <div className="w-full flex justify-between items-center text-xs">
                                        <span className="text-text-light">{t.meritsLeft}:</span>
                                        <span className="font-semibold text-text">{user.merits !== null && user.merits < 0 ? t.unlimited : Number(user.merits ?? 0).toLocaleString(language)}</span>
                                    </div>
                                    {currentAiConfig && currentAiConfig.baseDailyLimit !== undefined && currentAiConfig.baseDailyLimit !== null && (
                                        <div className="w-full flex justify-between items-center text-xs">
                                            <span className="text-text-light">Lượt chat hôm nay:</span>
                                            <span className="font-semibold text-primary">
                                                {user.dailyMsgUsed || 0} / {currentAiConfig.baseDailyLimit + (user.dailyLimitBonus || 0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="user-info-actions">
                                    <button onClick={onOpenMeritPurchase} className="btn-cta-new">
                                        <CryptoIcon className="w-4 h-4" /> {t.donation}
                                    </button>
                                    <button onClick={toggleColorMode} title={colorMode === 'dark' ? 'Chuyển sang sáng' : 'Chuyển sang tối'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, borderRadius: 8 }}>
                                        {colorMode === 'dark'
                                            ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>Sáng</>
                                            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>Tối</>
                                        }
                                    </button>
                                    <div className="w-full flex items-center justify-between gap-2">
                                        <div className="user-menu-language-switcher !p-0">
                                            <div className="user-menu-language-switcher-pill flex items-center">
                                                <button onClick={() => setLanguage('vi')} className={`${language === 'vi' ? 'active' : ''} !px-2 !py-0.5 !text-[10px]`}>VIE</button>
                                                <button onClick={() => setLanguage('en')} className={`${language === 'en' ? 'active' : ''} !px-2 !py-0.5 !text-[10px]`}>ENG</button>
                                            </div>
                                        </div>
                                        {hasAdminPermission && (
                                            <button onClick={onGoToAdmin} className="btn-secondary-new !px-2 !py-1 !text-[11px] whitespace-nowrap">
                                                <HelmetIcon className="w-3 h-3" /> {t.adminPage}
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={onLogout} className="btn-logout-new">
                                        <LogoutIcon className="w-4 h-4" />
                                        {t.logout}
                                    </button>
                                </div>

                            </div>
                        </div>
                    )
                ) : (
                    isSidebarCollapsed ? (
                        <div className="flex flex-col items-center gap-y-2 py-2">
                            <button onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')} className="p-2 text-text-light hover:bg-background-light rounded-full" title={language === 'vi' ? 'English' : 'Tiếng Việt'}>
                                <LanguageIcon className="w-6 h-6" />
                            </button>
                            <button onClick={onGoToLogin} className="p-2 text-text-light hover:bg-background-light rounded-full" title={t.login}>
                                <LoginIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex justify-center">
                                <div className="user-menu-language-switcher">
                                    <div className="user-menu-language-switcher-pill flex items-center">
                                        <button onClick={() => setLanguage('vi')} className={language === 'vi' ? 'active' : ''}>VIE</button>
                                        <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>ENG</button>
                                    </div>
                                </div>

                            </div>
                            <button onClick={onGoToLogin} className="btn-new-chat-plus w-full">
                                <LoginIcon className="w-5 h-5 mr-2" />
                                {t.loginOrRegister}
                            </button>

                        </div>
                    )
                )}
            </footer>
        </aside>
    );
};
