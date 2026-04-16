// client/src/pages/PracticeSpacePage.tsx
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Message, AIConfig, SystemConfig, Conversation, ViewMode, LibraryFilters, Space } from '../types';
import { apiService } from '../services/apiService';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { MessageContextMenu } from '../components/MessageContextMenu';
import { useToast } from '../components/ToastProvider';
import { CopyIcon, SpeakerWaveIcon, ThumbsUpIcon, ThumbsDownIcon, PaperclipIcon, MicIcon, SpinnerIcon, HeartIcon, XIcon, DownloadIcon, ShareIcon } from '../components/Icons';
import { MeritPaymentModal } from '../components/MeritPaymentModal';
import { MarketplaceModal } from '../components/MarketplaceModal';
import { DonateForLimitModal } from '../components/DonateForLimitModal';
import { PricingModal } from '../components/PricingModal';
import { PracticeSpaceHeader } from '../components/PracticeSpaceHeader';
import { SpaceDetailPage } from './SpaceDetailPage';
import { SocialFeed } from '../components/social/SocialFeed';
import { VoiceChat } from '../components/social/VoiceChat';
import { MediaLibraryPicker } from '../components/MediaLibraryPicker';


// Lazy load components for code splitting
const MeditationTimer = lazy(() => import('../components/MeditationTimer').then(module => ({ default: module.MeditationTimer })));
const LibraryView = lazy(() => import('../components/LibraryView').then(module => ({ default: module.LibraryView })));
const DharmaTalksView = lazy(() => import('../components/DharmaTalksView').then(module => ({ default: module.DharmaTalksView })));


declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const translations = {
    vi: {
        loadError: "Xin lỗi, không thể tải dữ liệu cần thiết. Vui lòng thử lại sau.",
        logout: "Đăng xuất",
        inputPlaceholder: "Nhập tin nhắn của bạn...",
        contactAdminForAccess: "Vui lòng liên hệ quản trị viên để kích hoạt AI này.",
        genericError: "Xin lỗi, đã có lỗi xảy ra.",
        toAdminPage: "Quản trị viên",
        login: "Đăng nhập",
        language: "Ngôn ngữ",
        languageToggle: "English",
        aiListTitle: "Danh sách AI",
        guestLimitReached: "Hết lượt chat miễn phí. Vui lòng đăng nhập để tiếp tục.",
        userLimitReached: "Bạn đã hết merit. Vui lòng nạp thêm để tiếp tục.",
        purchaseNeeded: "AI này cần được mua để sử dụng.",
        pricing: "Bảng giá",
        marketplace: "Explore AI",
        micNotSupported: 'Trình duyệt không hỗ trợ nhận dạng giọng nói.',
        micAccessDenied: 'Quyền truy cập micro đã bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.',
        micNotFound: 'Không tìm thấy micro trên thiết bị của bạn.',
        messageCopied: 'Đã sao chép tin nhắn!',
        remainingMerits: 'Số merits còn lại:',
        unlimited: 'Không giới hạn',
        speaking: 'Đang nói...',
        like: 'Thích',
        dislike: 'Không thích',
        copy: 'Sao chép',
        speak: 'Nghe',
        download: 'Tải xuống',
        share: 'Chia sẻ',
        newChat: 'Trò chuyện mới',
        openSidebar: 'Mở sidebar',
        conversationDeleted: 'Đã xóa hội thoại.',
        deleteConversationError: 'Xóa hội thoại thất bại.',
        comment: 'Phản hồi',
        commentNotImplemented: 'Chức năng phản hồi chưa được cài đặt.',
        liveChatConnecting: 'Đang kết nối...',
        liveChatConnected: 'Đang trò chuyện trực tiếp...',
        liveChatError: 'Lỗi trò chuyện trực tiếp: {message}',
        liveChatEnded: 'Kết thúc trò chuyện trực tiếp.',
        liveChatSubscriptionNeeded: 'Bạn cần đăng nhập để dùng tính năng này.',
        liveChatApiKeyMissing: 'Khóa API Gemini cá nhân của bạn chưa được thiết lập trong Cài đặt.',
        liveChatTooltip: 'Yêu cầu đăng nhập',
        translationError: 'Không thể dịch nội dung AI.',
        sutra: "Giới thiệu",
        library: "Thư viện",
        uploadingFile: 'Đang tải file lên...',
        uploadSuccess: 'Tải file lên thành công!',
        uploadError: 'Tải file thất bại.',
        loadingOlderMessages: 'Đang tải tin nhắn cũ...',
        feedbackError: 'Lưu phản hồi thất bại.',
        aiThought: 'AI đang suy nghĩ...',
        comingSoon: 'Sắp có',
        listening: 'Đang nghe...',
        community: 'Tin tức',
        donation: 'Cúng dường',
        switchToSpace: 'Chuyển sang không gian: {spaceName}',
        loadingAi: 'Đang tải AI...',
        loginToChat: 'Vui lòng đăng nhập để xem và bắt đầu cuộc trò chuyện.',
        offeringNudgeTitle: 'Cúng Dường Tam Bảo',
        offeringNudgeSubtitle: 'Lan tỏa chánh pháp',
        offeringNudgeButton: 'Ủng hộ',
    },
    en: {
        loadError: "Sorry, the necessary data could not be loaded. Please try again later.",
        logout: "Logout",
        inputPlaceholder: "Enter your message...",
        contactAdminForAccess: "Please contact an administrator to activate this AI.",
        genericError: "Sorry, an error occurred.",
        toAdminPage: "Admin",
        login: "Login",
        language: "Language",
        languageToggle: "Tiếng Việt",
        aiListTitle: "AI List",
        guestLimitReached: "Free chat limit reached. Please login to continue.",
        userLimitReached: "You are out of merits. Please top up to continue.",
        purchaseNeeded: "This AI must be purchased to use.",
        pricing: "Pricing",
        marketplace: "Explore AI",
        micNotSupported: 'Browser does not support speech recognition.',
        micAccessDenied: 'Microphone access was denied. Please allow access in your browser settings.',
        micNotFound: 'No microphone was found on your device.',
        messageCopied: 'Message copied!',
        remainingMerits: 'Remaining merits:',
        unlimited: 'Unlimited',
        speaking: 'Speaking...',
        like: 'Like',
        dislike: 'Dislike',
        copy: 'Copy',
        speak: 'Speak',
        download: 'Download',
        share: 'Share',
        newChat: 'New Chat',
        openSidebar: 'Open sidebar',
        conversationDeleted: 'Conversation deleted.',
        deleteConversationError: 'Failed to delete conversation.',
        comment: 'Feedback',
        commentNotImplemented: 'Feedback feature is not implemented yet.',
        liveChatConnecting: 'Connecting live chat...',
        liveChatConnected: 'Live chat active...',
        liveChatError: 'Live chat error: {message}',
        liveChatEnded: 'Live chat ended.',
        liveChatSubscriptionNeeded: 'You need to be logged in to use this feature.',
        liveChatApiKeyMissing: 'Your personal Gemini API key is not set in Settings.',
        liveChatTooltip: 'Requires login',
        translationError: 'Could not translate AI content.',
        sutra: "Sutra",
        library: "Library",
        uploadingFile: 'Uploading file...',
        uploadSuccess: 'File uploaded successfully!',
        uploadError: 'File upload failed.',
        loadingOlderMessages: 'Loading older messages...',
        feedbackError: 'Failed to save feedback.',
        aiThought: 'AI is thinking...',
        comingSoon: 'Coming Soon',
        listening: 'Listening...',
        community: 'Community ',
        donation: 'Donation',
        switchToSpace: 'Switching to space: {spaceName}',
        loadingAi: 'Loading AI...',
        loginToChat: 'Please log in to see and start conversations.',
        offeringNudgeTitle: 'Offering to the Triple Gem',
        offeringNudgeSubtitle: 'Spread the Dharma',
        offeringNudgeButton: 'Support',
    }
};

const GUEST_CONVERSATION_KEY = 'guestConversation';
const GUEST_MESSAGE_COUNT_KEY = 'guestMessageCount';
const INITIAL_MESSAGES_COUNT = 14;
const MESSAGE_BATCH_SIZE = 10;

export const PracticeSpacePage: React.FC<{
    user: User | null;
    systemConfig: SystemConfig;
    onLogout: () => void;
    onGoToLogin: (spaceSlug?: string) => void;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
    onUserUpdate: (updatedData: Partial<User>) => void;
    inferredSpaceSlug?: string;
    inferredView?: ViewMode;
}> = ({ user, systemConfig, onLogout, onGoToLogin, language, setLanguage, onUserUpdate, inferredSpaceSlug, inferredView }) => {
    const params = useParams<{ spaceSlug?: string; view?: ViewMode }>();
    // On custom subdomains (e.g. mirror.bodhilab.io), params.spaceSlug may be empty
    // Detect the slug from the subdomain hostname
    const hostnameSlug = (() => {
        const host = window.location.hostname;
        const isRoot = host === 'localhost' || host === '127.0.0.1' || host === 'login.bodhilab.io';
        if (isRoot) return '';
        const parts = host.split('.');
        // Only extract slug from real subdomains (3+ parts): 'mirror' from 'mirror.bodhilab.io'
        // Bare custom domains like 'giac.ngo' (2 parts) do NOT provide a slug
        return parts.length >= 3 ? parts[0] : '';
    })();
    // Priority: URL param > hostname subdomain > inferred prop (hardcoded 'giac-ngo') > fallback
    // hostnameSlug must beat inferredSpaceSlug so mirror.bodhilab.io/chat uses 'mirror', not 'giac-ngo'
    const spaceSlug = params.spaceSlug || hostnameSlug || inferredSpaceSlug || 'giac-ngo';
    const view = params.view || inferredView;
    const handleGoToSpaceLogin = () => onGoToLogin(spaceSlug);
    const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // UI States
    const [isTyping, setIsTyping] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | number | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [fileAttachment, setFileAttachment] = useState<{ name: string; url: string } | null>(null);
    const [guestMessageCount, setGuestMessageCount] = useState<number>(() => {
        const stored = localStorage.getItem(GUEST_MESSAGE_COUNT_KEY);
        return stored ? parseInt(stored, 10) : 0;
    });

    const [allAiConfigs, setAllAiConfigs] = useState<AIConfig[]>([]);
    const [allSpaces, setAllSpaces] = useState<Space[]>([]);

    const [conversationUpdateTrigger, setConversationUpdateTrigger] = useState(0);
    const [currentAiConfig, setCurrentAiConfig] = useState<AIConfig | null>(null);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<{ [messageId: string]: 'liked' | 'disliked' | null }>({});

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [contextMenu, setContextMenu] = useState<{ message: Message; position: { x: number, y: number } } | null>(null);
    const [isMeritPurchaseModalOpen, setIsMeritPurchaseModalOpen] = useState(false);
    const [showOfferingNudge, setShowOfferingNudge] = useState(false);
    const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
    const [promptPurchaseAiId, setPromptPurchaseAiId] = useState<string | null>(null);
    const [isAiSelectorOpen, setIsAiSelectorOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
    const [dailyLimitInfo, setDailyLimitInfo] = useState<{ base: number; bonus: number }>({ base: 20, bonus: 0 });
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
    const [shareModal, setShareModal] = useState<{ text: string; comment: string; submitting: boolean; aiName?: string; userQuestion?: string } | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [communityTab, setCommunityTabState] = useState<'home' | 'feed'>(() => {
        const tab = searchParams.get('tab');
        return (tab === 'home' || tab === 'feed') ? tab : 'feed';
    });
    // Wrap setter to also update URL — always show ?tab= explicitly
    const setCommunityTab = (tab: 'home' | 'feed') => {
        setCommunityTabState(tab);
        setViewingUser(null); // clear profile view when navigating to home/feed
        setSearchParams(prev => {
            prev.set('tab', tab);
            prev.delete('profile');
            prev.delete('profileName');
            return prev;
        }, { replace: true });
    };
    const openUserProfile = async (id: number, name: string, avatarUrl?: string | null, bio?: string | null) => {
        setViewingUser({ id, name, avatarUrl, bio });
        setViewingUserFollowersCount(0);
        setViewingUserFollowingCount(0);
        setViewingUserPostCount(0);
        setSearchParams(prev => {
            prev.set('profile', String(id));
            prev.set('profileName', name);
            return prev;
        }, { replace: true });
        // Fetch real stats
        if (currentSpace?.id) {
            try {
                const stats = await apiService.getUserSocialStats(currentSpace.id as number, id);
                setViewingUserFollowersCount(stats.followersCount);
                setViewingUserFollowingCount(stats.followingCount);
                setViewingUserPostCount(stats.postCount);
                if (stats.isFollowing) {
                    setFollowingIds(prev => { const next = new Set(prev); next.add(id); return next; });
                } else {
                    setFollowingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                }
            } catch { /* ignore */ }
        }
    };

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const notifCount = notifications.filter(n => n.unread !== false).length;
    const [myPostsCount, setMyPostsCount] = useState(0);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editBio, setEditBio] = useState('');
    const [editAvatarUrl, setEditAvatarUrl] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState<'avatar' | null>(null);
    const notifPanelRef = useRef<HTMLDivElement>(null);
    // User profile panel
    const [viewingUser, setViewingUser] = useState<{ id: number; name: string; avatarUrl?: string | null; bio?: string | null } | null>(null);
    const [viewingUserFollowersCount, setViewingUserFollowersCount] = useState(0);
    const [viewingUserFollowingCount, setViewingUserFollowingCount] = useState(0);
    const [viewingUserPostCount, setViewingUserPostCount] = useState(0);
    const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
    const [followLoading, setFollowLoading] = useState(false);

    const handleToggleNotifications = async () => {
        if (!showNotifications && currentSpace?.id) {
            setNotifLoading(true);
            try {
                const data = await apiService.getSocialNotifications(currentSpace.id as number);
                setNotifications(data);
            } catch { /* ignore */ }
            finally { setNotifLoading(false); }
        }
        setShowNotifications(v => !v);
    };

    // Restore profile view from URL param on mount/F5
    useEffect(() => {
        const profileId = searchParams.get('profile');
        const profileName = searchParams.get('profileName');
        if (profileId && profileName && !viewingUser) {
            const id = parseInt(profileId, 10);
            if (!isNaN(id)) {
                setViewingUser({ id, name: profileName, avatarUrl: null });
                setViewingUserFollowersCount(0);
                setViewingUserFollowingCount(0);
                setViewingUserPostCount(0);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close notification panel when clicking outside
    useEffect(() => {
        if (!showNotifications) return;
        const handler = (e: MouseEvent) => {
            if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
                // Also ignore clicks on the bell button itself (it handles its own toggle)
                const bellBtn = document.getElementById('notif-bell-btn');
                if (bellBtn && bellBtn.contains(e.target as Node)) return;
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNotifications]);


    const [libraryFilters, setLibraryFilters] = useState<LibraryFilters>(() => {
        try {
            const savedFilters = sessionStorage.getItem('libraryFilters');
            if (savedFilters) {
                return JSON.parse(savedFilters);
            }
        } catch (e) {
            console.error("Failed to parse library filters from sessionStorage", e);
        }
        return {};
    });

    const navigate = useNavigate();
    const t = translations[language];
    const { showToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const aiSelectorRef = useRef<HTMLDivElement>(null);

    const [feedSearchTrigger, setFeedSearchTrigger] = useState(0);
    const textBeforeRecording = useRef('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const initialQuerySent = useRef(false);

    const streamBufferRef = useRef<string>('');

    const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);

    const viewMode = view || 'chat';

    useEffect(() => {
        if (viewMode === 'library' || viewMode === 'dharmatalks') {
            setShowOfferingNudge(true);
            // Force-close the modal if the user navigates away from chat while it's open
            setIsMeritPurchaseModalOpen(false);
            // Auto-open sidebar to show table of contents
            setIsSidebarCollapsed(false);
        } else {
            setShowOfferingNudge(false);
        }
    }, [viewMode]);

    const isGuestLimitReached = !user && guestMessageCount >= (systemConfig.guestMessageLimit || 5);
    const isUserMeritsDepleted = user ? (user.merits !== null && user.merits <= 0 && !!currentAiConfig?.meritCost && currentAiConfig.meritCost > 0) : false;
    const isOwned = user && currentAiConfig && user.ownedAis?.some(ai => ai.aiConfigId === currentAiConfig.id);
    const isGranted = user && currentAiConfig && user.grantedAiConfigIds?.includes(currentAiConfig.id as number);

    const needsPurchase = user ? (!!currentAiConfig?.purchaseCost && currentAiConfig.purchaseCost > 0 && !isOwned) : false;
    const needsContactAccess = !!(currentAiConfig?.isContactForAccess && (!user || !isGranted));

    const isChatDisabled = !currentAiConfig || isTyping || isGuestLimitReached || isUserMeritsDepleted || needsPurchase || (needsContactAccess && !user);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const payment = searchParams.get('payment');
        const orderCode = searchParams.get('orderCode');
        
        if (payment === 'success' && orderCode) {
            // Verify payment
            apiService.verifyPayOsOrder(orderCode).then(res => {
                if (res.status === 'PAID') {
                    showToast(language === 'vi' ? 'Giao dịch thành công! Xin cảm ơn.' : 'Transaction successful! Thank you.', 'success');
                    if (user && onUserUpdate) {
                        apiService.getUserProfile().then(u => onUserUpdate(u));
                    }
                } else {
                    showToast(language === 'vi' ? 'Giao dịch chưa hoàn tất.' : 'Transaction not completed.', 'info');
                }
            }).catch(err => {
                console.error('Verify error:', err);
            }).finally(() => {
                searchParams.delete('payment');
                searchParams.delete('orderCode');
                searchParams.delete('status');
                searchParams.delete('id');
                searchParams.delete('cancel');
                searchParams.delete('planId');
                searchParams.delete('userId');
                searchParams.delete('code');
                const newSearch = searchParams.toString();
                window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
            });
        } else if (payment === 'cancel') {
             searchParams.delete('payment');
             const newSearch = searchParams.toString();
             window.history.replaceState({}, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
        }
    }, [showToast, user, onUserUpdate, language]);

    useEffect(() => {
        if (isGuestLimitReached) {
            showToast(t.guestLimitReached, 'error');
        }
    }, [isGuestLimitReached, showToast, t.guestLimitReached]);

    const setViewMode = (mode: ViewMode) => {
        if (spaceSlug) {
            navigate(`/${spaceSlug}/${mode}`);
        }
    };

    const onGoToAdmin = () => navigate(`/${spaceSlug}/admin`);

    const handleSelectConversation = useCallback((conv: Conversation) => {
        if (isTyping) return;
        setConversationId(conv.id);
        const fullHistory = conv.messages || [];
        setAllMessages(fullHistory);
        setMessages(fullHistory.slice(-INITIAL_MESSAGES_COUNT));
        const newAiConfig = allAiConfigs.find(c => c.id === conv.aiConfigId);
        if (newAiConfig) {
            setCurrentAiConfig(newAiConfig);
            localStorage.setItem('lastSelectedAiId', String(newAiConfig.id));
        }
        initialQuerySent.current = true;
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 0);
    }, [allAiConfigs, isTyping]);

    const handleNewConversation = useCallback((aiConfig: AIConfig) => {
        if (isTyping) return;
        setConversationId(null);
        setAllMessages([]);
        setMessages([]);
        setCurrentAiConfig(aiConfig);
        localStorage.setItem('lastSelectedAiId', String(aiConfig.id));
        initialQuerySent.current = false;
        if (!user) {
            localStorage.removeItem(GUEST_CONVERSATION_KEY);
        }
    }, [isTyping, user]);

    const handleDeleteConversation = useCallback(async (id: number) => {
        if (!user) return;
        try {
            await apiService.deleteConversation(id);
            if (currentAiConfig) handleNewConversation(currentAiConfig);
            showToast(t.conversationDeleted, 'success');
            setConversationUpdateTrigger(c => c + 1); // Trigger sidebar refresh
        } catch (error) {
            showToast(t.deleteConversationError, 'error');
        }
    }, [user, showToast, t.conversationDeleted, t.deleteConversationError, handleNewConversation, currentAiConfig]);

    const handleSelectAi = (ai: AIConfig) => {
        if (ai.id === currentAiConfig?.id) {
            setIsAiSelectorOpen(false);
            return;
        }

        if (ai.spaceId !== currentAiConfig?.spaceId) {
            const newSpace = allSpaces.find(s => s.id === ai.spaceId);
            if (newSpace) {
                showToast(t.switchToSpace.replace('{spaceName}', newSpace.name), 'info');
                localStorage.setItem('lastSelectedAiId', String(ai.id));
                navigate(`/${newSpace.slug}/chat`);
            } else {
                handleNewConversation(ai);
            }
        } else {
            handleNewConversation(ai);
        }
        setIsAiSelectorOpen(false);
    };

    useEffect(() => {
        const promptedId = localStorage.getItem('promptPurchaseAiId');
        if (promptedId) {
            setPromptPurchaseAiId(promptedId);
            setIsMarketplaceModalOpen(true);
            localStorage.removeItem('promptPurchaseAiId');
        }
    }, []);


    useEffect(() => {
        if (!isLoadingMore) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isTyping, isLoadingMore]);

    useLayoutEffect(() => {
        if (isLoadingMore) {
            const container = chatContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
            }
            setIsLoadingMore(false);
        }
    }, [messages, isLoadingMore]);

    useEffect(() => {
        return () => {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (liveSessionPromiseRef.current) {
                liveSessionPromiseRef.current.then(session => session.close());
                liveSessionPromiseRef.current = null;
            }
            inputAudioContextRef.current?.close();
            outputAudioContextRef.current?.close();
        };
    }, []);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSidebarCollapsed(window.innerWidth < 1024);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (aiSelectorRef.current && !aiSelectorRef.current.contains(event.target as Node)) {
                setIsAiSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            try {
                const saved = localStorage.getItem(GUEST_CONVERSATION_KEY);
                const parsed = saved ? JSON.parse(saved) : null;
                const fullHistory = parsed?.messages || [];
                setAllMessages(fullHistory);
                setMessages(fullHistory.slice(-INITIAL_MESSAGES_COUNT));
            } catch {
                localStorage.removeItem(GUEST_CONVERSATION_KEY);
                setAllMessages([]);
                setMessages([]);
            }
        }
    }, [user?.id]);

    useEffect(() => {
        if (!spaceSlug) {
            navigate('/');
            return;
        }

        const fetchAllData = async () => {
            try {
                const [spaceData, allSpacesData] = await Promise.all([
                    apiService.getSpaceBySlug(spaceSlug),
                    apiService.getSpaces()
                ]);

                setCurrentSpace(spaceData);
                setAllSpaces(allSpacesData || []);

                if (!spaceData || typeof spaceData.id !== 'number') {
                    showToast('Space not found.', 'error');
                    navigate('/');
                    return;
                }

                const spaceSpecificAIs = await apiService.getAiConfigsBySpaceId(spaceData.id);
                setAllAiConfigs(spaceSpecificAIs || []);

                let initialAi: AIConfig | undefined;
                const lastSelectedId = localStorage.getItem('lastSelectedAiId');

                if (lastSelectedId) {
                    initialAi = spaceSpecificAIs.find(c => String(c.id) === lastSelectedId);
                }
                if (!initialAi) initialAi = spaceSpecificAIs.find(ai => ai.name === 'Giác Ngộ');
                if (!initialAi) initialAi = spaceSpecificAIs.find(ai => ai.id == 7);
                if (!initialAi) initialAi = spaceSpecificAIs[0];

                if (initialAi) {
                    setCurrentAiConfig(initialAi);
                } else {
                    setCurrentAiConfig(null);
                }

            } catch (error) {
                console.error("Error loading practice space data:", error);
                showToast(t.loadError, 'error');
                navigate('/');
            }
        };

        fetchAllData();
        if (window.speechSynthesis) window.speechSynthesis.cancel();

        // Refresh user permissions on every page visit — tránh stale permissions sau khi admin đổi role
        if (user) {
            apiService.getUserProfile().then(updatedUser => {
                if (updatedUser) onUserUpdate(updatedUser);
            }).catch(() => { /* silent — không làm gián đoạn UX */ });
        }
    }, [spaceSlug, navigate, showToast, t.loadError]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'vi' ? 'vi-VN' : 'en-US';

        let finalTranscript = '';

        recognition.onstart = () => {
            finalTranscript = textBeforeRecording.current;
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setNewMessage(finalTranscript + interimTranscript);
        };

        recognition.onend = () => {
            setIsRecording(false);
            textBeforeRecording.current = finalTranscript;
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, [language]);

    useEffect(() => {
        if (!user && currentAiConfig && allMessages.length > 0 && allMessages.some(m => m.sender === 'user')) {
            localStorage.setItem(GUEST_CONVERSATION_KEY, JSON.stringify({ aiConfigId: currentAiConfig.id, messages: allMessages }));
        }
    }, [allMessages, user, currentAiConfig]);

    useEffect(() => {
        const initialFeedback: { [messageId: string]: 'liked' | 'disliked' | null } = {};
        for (const msg of allMessages) {
            if (msg.id && msg.feedback) {
                initialFeedback[String(msg.id)] = msg.feedback;
            }
        }
        setFeedbackStatus(initialFeedback);
    }, [allMessages]);

    const handleSendMessage = useCallback(async (e?: React.FormEvent, overrideOptions?: { text?: string; messagesHistory?: Message[] }) => {
        e?.preventDefault();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setSpeakingMessageId(null);

        const textToSend = overrideOptions?.text ?? newMessage.trim();
        const historyToSend = overrideOptions?.messagesHistory ?? allMessages;

        if ((!textToSend && !imagePreview && !fileAttachment) || !currentAiConfig) return;

        const isInitialQuery = overrideOptions?.messagesHistory?.length === 0;

        // Proactive daily limit check: open DonateForLimitModal immediately if user already exceeded limit
        // Note: check applies to ALL messages including initial/suggested questions (no !isInitialQuery guard)
        if (user && currentAiConfig && currentAiConfig.baseDailyLimit !== undefined && currentAiConfig.baseDailyLimit !== null) {
            const totalLimit = (currentAiConfig.baseDailyLimit as number) + (user.dailyLimitBonus || 0);
            const used = user.dailyMsgUsed || 0;
            if (used >= totalLimit) {
                setDailyLimitInfo({ base: currentAiConfig.baseDailyLimit as number, bonus: user.dailyLimitBonus || 0 });
                setIsDonateModalOpen(true);
                return;
            }
        }

        if (isChatDisabled && !isInitialQuery) {
            if (isGuestLimitReached) showToast(t.guestLimitReached, 'error');
            if (isUserMeritsDepleted) showToast(t.userLimitReached, 'error');
            if (needsPurchase) showToast(t.purchaseNeeded, 'error');
            if (needsContactAccess) showToast(t.contactAdminForAccess, 'error');
            return;
        }

        const userMessage: Message = { id: `msg-${Date.now()}`, text: textToSend, sender: 'user', timestamp: Date.now(), imageUrl: imagePreview || undefined, fileAttachment: fileAttachment || undefined };

        // Nudge for merit purchase every 10 user messages, only in chat view
        if (viewMode === 'chat') {
            const userMsgCount = allMessages.filter(m => m.sender === 'user').length + 1;
            if (user && userMsgCount > 0 && userMsgCount % 10 === 0) {
                setIsMeritPurchaseModalOpen(true);
            }
        }

        setAllMessages(prev => [...prev, userMessage]);
        setMessages(prev => [...prev, userMessage]);

        setNewMessage('');
        setImagePreview(null);
        setFileAttachment(null);
        textareaRef.current?.focus();

        setIsTyping(true);
        setIsAiThinking(true);
        streamBufferRef.current = '';

        const aiMessageId = `ai-${Date.now()}`;

        try {
            await apiService.sendMessageStream(currentAiConfig, [...historyToSend, userMessage], user, conversationId, {
                onChunk: (chunk) => {
                    streamBufferRef.current += chunk;
                    const fullBuffer = streamBufferRef.current;
                    const visibleText = fullBuffer;
                    const hasVisibleContent = visibleText.trim().length > 0;

                    if (hasVisibleContent) {
                        setIsAiThinking(false);
                        setIsTyping(false);
                        const updateStreamingMessage = (msgs: Message[]) => {
                            const alreadyExists = msgs.some(m => m.id === aiMessageId);
                            if (alreadyExists) {
                                return msgs.map(m => m.id === aiMessageId ? { ...m, text: visibleText.trimStart() } : m);
                            }
                            const newMessage: Message = { id: aiMessageId, text: visibleText.trimStart(), sender: 'ai', timestamp: Date.now() };
                            return [...msgs, newMessage];
                        };
                        setAllMessages(prev => updateStreamingMessage(prev));
                        setMessages(prev => updateStreamingMessage(prev));
                    }
                },
                onEnd: (newConversationId, updatedUser, finalMessage) => {
                    setIsTyping(false);
                    setIsAiThinking(false);
                    if (newConversationId && !conversationId) {
                        setConversationId(newConversationId);
                        setConversationUpdateTrigger(c => c + 1); // Trigger sidebar refresh for new conversation
                    }
                    if (!user) {
                        const newCount = guestMessageCount + 1;
                        setGuestMessageCount(newCount);
                        localStorage.setItem(GUEST_MESSAGE_COUNT_KEY, String(newCount));
                    }

                    if (updatedUser) {
                        onUserUpdate(updatedUser);
                    }

                    if (finalMessage) {
                        const updateOrAddMessage = (msgs: Message[]) => {
                            const exists = msgs.some(m => m.id === aiMessageId);
                            if (exists) {
                                return msgs.map(msg => msg.id === aiMessageId ? { ...msg, text: finalMessage.text, thought: finalMessage.thought || undefined } : msg);
                            } else {
                                const newMessage: Message = { id: aiMessageId, text: finalMessage.text, sender: 'ai', timestamp: Date.now(), thought: finalMessage.thought || undefined };
                                return [...msgs, newMessage];
                            }
                        };
                        setAllMessages(prev => updateOrAddMessage(prev));
                        setMessages(prev => updateOrAddMessage(prev));
                    }
                },
                onError: (error) => {
                    setIsTyping(false);
                    setIsAiThinking(false);

                    // Remove the user message bubble that was optimistically added
                    setAllMessages(prev => prev.filter(m => m.id !== userMessage.id));
                    setMessages(prev => prev.filter(m => m.id !== userMessage.id));

                    if (error.startsWith('DAILY_LIMIT_REACHED:')) {
                        const [, base, bonus] = error.split(':');
                        setDailyLimitInfo({ base: parseInt(base) || 20, bonus: parseInt(bonus) || 0 });
                        setIsDonateModalOpen(true);
                        return;
                    }

                    const displayError = error.includes('GUEST_REGISTER_NUDGE')
                        ? t.guestLimitReached
                        : t.genericError + `: ${error}`;

                    const errorMsg: Message = { id: `ai-err-${Date.now()}`, text: displayError, sender: 'ai', timestamp: Date.now() };
                    setAllMessages(prev => [...prev, errorMsg]);
                    setMessages(prev => [...prev, errorMsg]);

                    if (error.includes('GUEST_REGISTER_NUDGE')) handleGoToSpaceLogin();
                }
            }, false, language, aiMessageId, guestMessageCount);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setIsTyping(false);
            setIsAiThinking(false);
            const errorMsg: Message = { id: `ai-err-${Date.now()}`, text: t.genericError + `: ${errorMessage}`, sender: 'ai', timestamp: Date.now() };
            setAllMessages(prev => [...prev, errorMsg]);
            setMessages(prev => [...prev, errorMsg]);
        }
    }, [allMessages, conversationId, currentAiConfig, fileAttachment, imagePreview, isChatDisabled, isGuestLimitReached, isUserMeritsDepleted, language, needsPurchase, newMessage, onUserUpdate, showToast, t, user, needsContactAccess, guestMessageCount, viewMode]);

    // ─── Save Voice Session to Conversation History ──────────────────────────
    const handleVoiceSessionSave = useCallback(async (turns: { role: 'user' | 'ai'; text: string }[]) => {
        if (!user || !currentAiConfig || turns.length === 0) return;
        // Convert VoiceTurn[] → Message[]
        const now = Date.now();
        const voiceMessages: Message[] = turns.map((t, i) => ({
            id: `voice-${now}-${i}`,
            text: t.text,
            sender: t.role === 'user' ? 'user' : 'ai',
            timestamp: now + i,
        }));
        try {
            if (conversationId) {
                // Append to existing conversation: update local state
                setAllMessages(prev => [...prev, ...voiceMessages]);
                setMessages(prev => [...prev, ...voiceMessages]);
                // Persist via streaming endpoint isn't ideal; use createConversation to merge
                await apiService.createConversation(currentAiConfig.id!, [...allMessages, ...voiceMessages], user);
            } else {
                // Create new conversation from voice session
                const conv = await apiService.createConversation(currentAiConfig.id!, voiceMessages, user);
                if (conv?.id) {
                    setConversationId(conv.id);
                    setAllMessages(voiceMessages);
                    setMessages(voiceMessages);
                    setConversationUpdateTrigger(c => c + 1);
                }
            }
            showToast(language === 'vi' ? 'Đã lưu lịch sử trò chuyện thoại.' : 'Voice session saved to history.', 'success');
        } catch {
            showToast(language === 'vi' ? 'Không thể lưu lịch sử thoại.' : 'Failed to save voice session.', 'error');
        }
    }, [user, currentAiConfig, conversationId, allMessages, language, showToast]);

    useEffect(() => {
        const initialQuery = localStorage.getItem('initialQuery');
        if (initialQuery && currentAiConfig && !initialQuerySent.current) {
            initialQuerySent.current = true;
            localStorage.removeItem('initialQuery');
            handleSendMessage(undefined, { text: initialQuery, messagesHistory: [] });
        }
    }, [currentAiConfig, handleSendMessage]);

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as any);
        }
    };

    const handleToggleRecording = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            showToast(t.micNotSupported, 'error');
            return;
        }
        if (isRecording) {
            recognition.stop();
        } else {
            textBeforeRecording.current = newMessage;
            recognition.start();
        }
        setIsRecording(!isRecording);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImagePreview(null);
        setFileAttachment(null);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            const formData = new FormData();
            formData.append('file', file);
            showToast(t.uploadingFile, 'info');
            try {
                const response = await apiService.uploadFiles(formData);
                if (response.filePaths && response.filePaths.length > 0) {
                    setFileAttachment({ name: file.name, url: response.filePaths[0] });
                    showToast(t.uploadSuccess, 'success');
                } else {
                    console.error('Upload response missing filePaths:', response);
                    showToast(t.uploadError, 'error');
                }
            } catch (err) {
                console.error('File upload error:', err);
                const errorMessage = err instanceof Error ? err.message : String(err);
                showToast(`${t.uploadError} ${errorMessage}`, 'error');
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast(t.messageCopied, 'info');
    };

    const handleSpeak = async (text: string, msgId: string | number) => {
        if (speakingMessageId === msgId) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }
        window.speechSynthesis.cancel();
        setSpeakingMessageId(msgId);

        const geminiKey = (user?.apiKeys as any)?.gemini;
        const geminiVoice = (user?.apiKeys as any)?.geminiVoice || 'Algieba';
        const geminiStyle = (user?.apiKeys as any)?.geminiStyle || '';
        const geminiTemperature = parseFloat((user?.apiKeys as any)?.geminiTemperature ?? '1') || 1;

        if (geminiKey && user?.id) {
            try {
                const res = await apiService.generateTtsAudio(
                    text, 'gemini', 'gemini-2.5-flash-preview-tts',
                    geminiVoice, language, user.id as number, geminiStyle, geminiTemperature
                );
                const audio = new Audio(`data:${res.mimeType};base64,${res.audioContent}`);
                audio.onended = () => setSpeakingMessageId(null);
                audio.play();
                return;
            } catch (e) {
                console.warn('Gemini TTS failed, falling back to SpeechSynthesis:', e);
            }
        }

        // Fallback: browser SpeechSynthesis
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        utterance.onend = () => setSpeakingMessageId(null);
        window.speechSynthesis.speak(utterance);
    };

    const handleDownload = async (text: string, msgId: string | number) => {
        const geminiKey = (user?.apiKeys as any)?.gemini;
        const geminiVoice = (user?.apiKeys as any)?.geminiVoice || 'Algieba';
        const geminiStyle = (user?.apiKeys as any)?.geminiStyle || '';
        const geminiTemperature = parseFloat((user?.apiKeys as any)?.geminiTemperature ?? '1') || 1;

        if (geminiKey && user?.id) {
            try {
                const res = await apiService.generateTtsAudio(
                    text, 'gemini', 'gemini-2.5-flash-preview-tts',
                    geminiVoice, language, user.id as number, geminiStyle, geminiTemperature
                );
                const byteChars = atob(res.audioContent);
                const byteArr = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
                const blob = new Blob([byteArr], { type: res.mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `voice-${msgId}.wav`;
                a.click();
                URL.revokeObjectURL(url);
                return;
            } catch (e) {
                console.warn('Gemini TTS download failed, falling back to text:', e);
            }
        }

        // Fallback: download as text file
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `message-${msgId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = (text: string, aiName?: string, userQuestion?: string) => {
        if (!user) {
            showToast(language === 'vi' ? 'Vui lòng đăng nhập để chia sẻ lên cộng đồng.' : 'Please login to share to community.', 'info');
            return;
        }
        setShareModal({ text, comment: '', submitting: false, aiName, userQuestion });
    };

    const handleShareSubmit = async () => {
        if (!shareModal || !currentSpace?.id) return;
        setShareModal(prev => prev ? { ...prev, submitting: true } : null);
        try {
            const fd = new FormData();
            // If AI share: store comment as content + metadata
            if (shareModal.aiName && shareModal.userQuestion) {
                fd.append('content', shareModal.comment || ' ');
                fd.append('metadata', JSON.stringify({
                    type: 'ai_share',
                    aiName: shareModal.aiName,
                    userQuestion: shareModal.userQuestion,
                    aiResponse: shareModal.text,
                }));
            } else {
                const content = shareModal.comment
                    ? `${shareModal.comment}\n\n---\n${shareModal.text}`
                    : shareModal.text;
                fd.append('content', content);
            }
            await apiService.createSocialPost(currentSpace.id as number, fd);
            showToast(language === 'vi' ? 'Đã chia sẻ lên cộng đồng! 🎉' : 'Shared to community! 🎉', 'success');
            setShareModal(null);
        } catch {
            showToast(language === 'vi' ? 'Chia sẻ thất bại.' : 'Share failed.', 'error');
            setShareModal(prev => prev ? { ...prev, submitting: false } : null);
        }
    };

    const handleFeedback = async (msgId: string | number, newFeedback: 'liked' | 'disliked') => {
        if (!conversationId) return;
        const currentFeedback = feedbackStatus[String(msgId)];
        const finalFeedback = currentFeedback === newFeedback ? null : newFeedback;

        setFeedbackStatus(prev => ({ ...prev, [String(msgId)]: finalFeedback }));

        try {
            await apiService.setMessageFeedback(conversationId, msgId, finalFeedback);
            const updateFeedbackInMessages = (msgs: Message[]) => msgs.map(m => m.id === msgId ? { ...m, feedback: finalFeedback } : m);
            setAllMessages(prev => updateFeedbackInMessages(prev));
            setMessages(prev => updateFeedbackInMessages(prev));
        } catch (error) {
            setFeedbackStatus(prev => ({ ...prev, [String(msgId)]: currentFeedback }));
            showToast(t.feedbackError, 'error');
        }
    };

    const handleScroll = () => {
        const container = chatContainerRef.current;
        if (container && container.scrollTop === 0 && !isLoadingMore) {
            if (messages.length < allMessages.length) {
                setIsLoadingMore(true);
                prevScrollHeightRef.current = container.scrollHeight;

                setTimeout(() => {
                    const newCount = messages.length + MESSAGE_BATCH_SIZE;
                    setMessages(allMessages.slice(-newCount));
                }, 300);
            }
        }
    };

    let placeholder = t.inputPlaceholder;
    if (!currentAiConfig) placeholder = t.loadingAi;
    else if (isGuestLimitReached) placeholder = t.guestLimitReached;
    else if (isUserMeritsDepleted) placeholder = t.userLimitReached;
    else if (needsPurchase) placeholder = t.purchaseNeeded;
    else if (needsContactAccess) placeholder = t.contactAdminForAccess;
    else if (isRecording) placeholder = t.listening;

    return (
        <div className="practice-space-page">
            <ConversationSidebar
                user={user}
                aiConfigs={allAiConfigs}
                currentAiConfig={currentAiConfig}
                selectedConversationId={conversationId}
                conversationUpdateTrigger={conversationUpdateTrigger}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onGoToLogin={handleGoToSpaceLogin}
                onGoToAdmin={onGoToAdmin}
                onLogout={onLogout}
                language={language}
                setLanguage={setLanguage}
                systemConfig={systemConfig}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                onOpenMeritPurchase={() => setIsMeritPurchaseModalOpen(true)}
                viewMode={viewMode}
                libraryFilters={libraryFilters}
                onSetLibraryFilters={setLibraryFilters}
                spaceSlug={spaceSlug}
                currentSpace={currentSpace}
            />
            <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <PracticeSpaceHeader
                    language={language}
                    t={t}
                    currentAiConfig={currentAiConfig}
                    aiConfigs={allAiConfigs}
                    isAiSelectorOpen={isAiSelectorOpen}
                    setIsAiSelectorOpen={setIsAiSelectorOpen}
                    aiSelectorRef={aiSelectorRef}
                    handleSelectAi={handleSelectAi}
                    setIsMarketplaceModalOpen={setIsMarketplaceModalOpen}
                    setViewMode={setViewMode}
                    viewMode={viewMode}
                    isMobileMenuOpen={isMobileMenuOpen}
                    setIsMobileMenuOpen={setIsMobileMenuOpen}
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    spaceSlug={spaceSlug}
                    isLoggedIn={!!user}
                    onGoToLogin={handleGoToSpaceLogin}
                    communityTab={communityTab}
                    setCommunityTab={setCommunityTab}
                    showNotifications={showNotifications}
                    handleToggleNotifications={handleToggleNotifications}
                    notificationCount={notifCount}
                    onSearchClick={() => {
                        if (viewMode !== 'community') { setViewMode('community'); setCommunityTab('feed'); }
                        setFeedSearchTrigger(t => t + 1);
                    }}
                    isViewingUser={!!viewingUser}
                />

                <div className="main-view-wrapper">
                    <Suspense fallback={<div className="flex-grow flex items-center justify-center"><SpinnerIcon className="w-8 h-8 animate-spin text-primary" /></div>}>
                        {viewMode === 'chat' ? (
                            <div className="chat-view-container">
                                <div ref={chatContainerRef} onScroll={handleScroll} className="chat-messages-container">
                                    {allMessages.length === 0 && !isTyping && !isAiThinking && currentAiConfig ? (
                                        <div className="welcome-screen-ai">
                                            {currentAiConfig.avatarUrl && <img src={currentAiConfig.avatarUrl} alt={currentAiConfig.name} className="welcome-ai-avatar" />}
                                            <h1 className="welcome-ai-name">
                                                {language === 'en' && currentAiConfig.nameEn ? currentAiConfig.nameEn : currentAiConfig.name}
                                            </h1>
                                            <p className="welcome-ai-description">
                                                {language === 'en' && currentAiConfig.descriptionEn ? currentAiConfig.descriptionEn : currentAiConfig.description}
                                            </p>
                                            {(() => {
                                                const suggestions = (language === 'en' && currentAiConfig.suggestedQuestionsEn?.length)
                                                    ? currentAiConfig.suggestedQuestionsEn
                                                    : currentAiConfig.suggestedQuestions;

                                                if (!suggestions || suggestions.length === 0) {
                                                    return null;
                                                }

                                                return (
                                                    <div className="welcome-ai-suggestions">
                                                        {suggestions.slice(0, 4).map((q, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => handleSendMessage(undefined, { text: q, messagesHistory: [] })}
                                                                className="welcome-ai-prompt-card"
                                                            >
                                                                <span>{q}</span>
                                                                <div className="prompt-arrow">&rarr;</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="chat-messages-list">
                                            {isLoadingMore && <div className="text-center text-xs text-gray-500 p-2">{t.loadingOlderMessages}</div>}
                                            {messages.map((msg, index) => {
                                                const segments = (() => {
                                                    if (msg.sender !== 'ai') return [msg.text];
                                                    const rawSegs = msg.text.split(/^-{3,}\s*$|\n{2,}/m).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                                                    if (rawSegs.length <= 1) return rawSegs;

                                                    // A short single-line segment (likely a kệ/verse line)
                                                    // Exclude: numbered list items (1. 2. ...), bullets (- * •), headings (#)
                                                    const isKeLine = (seg: string): boolean =>
                                                        !seg.includes('\n') && seg.length >= 4 && seg.length <= 140
                                                        && !/^\d+\.\s/.test(seg)
                                                        && !/^[-*•]\s/.test(seg)
                                                        && !/^#+\s/.test(seg);

                                                    // Strategy 1: Numbered sections (e.g. "1. TAM VÕ", "2. THẤY MÌNH")
                                                    // → group each section's content together, join kệ lines with \n (no blank line)
                                                    const isSectionHeading = (seg: string): boolean =>
                                                        /^\d+\.\s+\S/.test(seg) && !seg.includes('\n') && seg.length < 100;

                                                    if (rawSegs.some(isSectionHeading)) {
                                                        const sections: string[][] = [];
                                                        let current: string[] = [];
                                                        for (const seg of rawSegs) {
                                                            if (isSectionHeading(seg) && current.length > 0) {
                                                                sections.push(current);
                                                                current = [seg];
                                                            } else {
                                                                current.push(seg);
                                                            }
                                                        }
                                                        if (current.length > 0) sections.push(current);

                                                        // Within each section, join kệ lines with \n (no blank gap)
                                                        const sectionTexts = sections.map((segs: string[]) => {
                                                            const parts: string[] = [];
                                                            let i = 0;
                                                            while (i < segs.length) {
                                                                if (isKeLine(segs[i])) {
                                                                    const block: string[] = [segs[i]];
                                                                    while (i + 1 < segs.length && isKeLine(segs[i + 1])) {
                                                                        i++;
                                                                        block.push(segs[i]);
                                                                    }
                                                                    // kệ lines: join with \n (no blank line between verses)
                                                                    parts.push(block.join('\n'));
                                                                } else {
                                                                    parts.push(segs[i]);
                                                                }
                                                                i++;
                                                            }
                                                            return parts.join('\n\n');
                                                        });

                                                        // Max 2 bubbles for numbered sections
                                                        const sTotal = sectionTexts.join('').length;
                                                        if (sTotal < 1200 || sectionTexts.length <= 2) return [sectionTexts.join('\n\n')];
                                                        const sHalf = Math.ceil(sectionTexts.length / 2);
                                                        return [
                                                            sectionTexts.slice(0, sHalf).join('\n\n'),
                                                            sectionTexts.slice(sHalf).join('\n\n'),
                                                        ].filter((s: string) => s.trim().length > 0);
                                                    }

                                                    // Strategy 2: No numbered sections
                                                    // → merge consecutive short single-line segs as kệ (joined with \n)
                                                    const merged: string[] = [];
                                                    let i = 0;
                                                    while (i < rawSegs.length) {
                                                        if (isKeLine(rawSegs[i])) {
                                                            const block: string[] = [rawSegs[i]];
                                                            while (i + 1 < rawSegs.length && isKeLine(rawSegs[i + 1])) {
                                                                i++;
                                                                block.push(rawSegs[i]);
                                                            }
                                                            // kệ lines: join with \n (no blank line)
                                                            merged.push(block.join('\n'));
                                                        } else {
                                                            merged.push(rawSegs[i]);
                                                        }
                                                        i++;
                                                    }

                                                    if (merged.length <= 1) return merged;
                                                    const totalChars = merged.join('').length;
                                                    // For short-to-medium responses → single bubble
                                                    if (totalChars < 1200) return [merged.join('\n\n')];
                                                    // For long responses → max 2 bubbles (less scattered)
                                                    const half = Math.ceil(merged.length / 2);
                                                    const grouped: string[] = [
                                                        merged.slice(0, half).join('\n\n'),
                                                        merged.slice(half).join('\n\n'),
                                                    ].filter((s: string) => s.trim().length > 0);
                                                    return grouped;
                                                })();

                                                return segments.filter((s: string) => s.trim().length > 0).map((segText: string, segIndex: number) => (
                                                    <div key={`${msg.id || index}-${segIndex}`} className={`chat-message-row ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                                                        <div className="chat-message-content group">
                                                            <div className={`chat-message-bubble ${msg.sender}`}>
                                                                <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{
                                                                    // Nếu segment có dòng mới đơn (kệ thơ, không phải list/heading) → convert thành markdown hard break
                                                                    segText.includes('\n') && !segText.includes('\n\n')
                                                                        && !/^\d+\.\s/m.test(segText)
                                                                        && !/^[-*•]\s/m.test(segText)
                                                                        && !/^#+\s/m.test(segText)
                                                                        ? segText.replace(/\n/g, '  \n')
                                                                        : segText
                                                                }</ReactMarkdown></div>
                                                                {msg.imageUrl && segIndex === 0 && <img src={msg.imageUrl} alt="Uploaded content" className="mt-2 rounded-lg max-w-full h-auto" />}
                                                            </div>
                                                            {msg.sender === 'ai' && !isTyping && !isAiThinking && msg.id && (
                                                                <div className="chat-message-toolbar">
                                                                    {segIndex === segments.length - 1 && (
                                                                        <>
                                                                            <button onClick={() => handleFeedback(msg.id!, 'liked')} title={t.like} className={`p-1.5 rounded-full hover:bg-background-light ${feedbackStatus[String(msg.id!)] === 'liked' ? 'text-primary' : 'text-text-light'}`}><ThumbsUpIcon className="w-4 h-4" /></button>
                                                                            <button onClick={() => handleFeedback(msg.id!, 'disliked')} title={t.dislike} className={`p-1.5 rounded-full hover:bg-background-light ${feedbackStatus[String(msg.id!)] === 'disliked' ? 'text-accent-red' : 'text-text-light'}`}><ThumbsDownIcon className="w-4 h-4" /></button>
                                                                        </>
                                                                    )}
                                                                    <button onClick={() => handleCopy(segText)} title={t.copy} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><CopyIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleSpeak(segText, `${msg.id}-${segIndex}`)} title={t.speak} className={`p-1.5 rounded-full hover:bg-background-light ${speakingMessageId === `${msg.id}-${segIndex}` ? 'text-primary' : 'text-text-light'}`}><SpeakerWaveIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleDownload(segText, `${msg.id}-${segIndex}`)} title={t.download} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><DownloadIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleShare(segments.join('\n\n'), currentAiConfig?.name, messages[index - 1]?.text)} title={language === 'vi' ? 'Chia sẻ lên cộng đồng' : 'Share to community'} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><ShareIcon className="w-5 h-5" /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ));
                                            })}
                                            {(isAiThinking || isTyping) && (
                                                <div className="chat-message-row ai">
                                                    <div className="chat-message-content">
                                                        <div className="chat-message-bubble ai">
                                                            <div className="typing-indicator">
                                                                <span></span>
                                                                <span></span>
                                                                <span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>
                                <div className="chat-input-area">
                                    {/* Thông báo khi cần mua AI */}
                                    {user && currentAiConfig && needsPurchase && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-3">
                                            <p className="text-red-800 font-medium mb-2">
                                                {language === 'vi'
                                                    ? 'Bạn cần mua AI này để sử dụng.'
                                                    : 'You need to purchase this AI to use it.'}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setPromptPurchaseAiId(String(currentAiConfig?.id));
                                                    setIsMarketplaceModalOpen(true);
                                                }}
                                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                                            >
                                                {t.marketplace}
                                            </button>
                                        </div>
                                    )}

                                    {/* Thông báo khi hết merits */}
                                    {user && isUserMeritsDepleted && isOwned && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
                                            <p className="text-yellow-800 font-medium mb-2">
                                                {t.userLimitReached}
                                            </p>
                                            <button
                                                onClick={() => setIsMeritPurchaseModalOpen(true)}
                                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                                            >
                                                {t.donation}
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={handleSendMessage} className="relative">
                                        {imagePreview && (<div className="absolute bottom-full mb-2 left-2 p-1 bg-white rounded-lg shadow-md"><img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded" /><button type="button" onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6">&times;</button></div>)}
                                        {fileAttachment && (<div className="absolute bottom-full mb-2 left-2 p-2 bg-white rounded-lg shadow-md flex items-center gap-2"><PaperclipIcon className="w-5 h-5 text-gray-500" /><span className="text-sm text-gray-700">{fileAttachment.name}</span><button type="button" onClick={() => setFileAttachment(null)} className="text-red-500 hover:text-red-700">&times;</button></div>)}
                                        <div className="chat-input-wrapper">
                                            <button type="button" onClick={() => setIsMeritPurchaseModalOpen(true)} disabled={!user} className="chat-input-icon-btn" title={t.donation}>
                                                <HeartIcon className="w-5 h-5" />
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.doc,.docx,.pdf,.txt" />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isChatDisabled}
                                                className={`chat-input-icon-btn ${isChatDisabled && !isOwned ? 'text-red-500 opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <PaperclipIcon className="w-5 h-5" />
                                            </button>
                                            <textarea
                                                ref={textareaRef}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={handleTextareaKeyDown}
                                                placeholder={placeholder}
                                                disabled={isChatDisabled}
                                                rows={1}
                                                className={`chat-input-field ${isChatDisabled && !isOwned ? 'border-red-300 bg-red-50' : ''}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleToggleRecording}
                                                disabled={isChatDisabled}
                                                className={`chat-input-icon-btn ${isRecording ? 'text-accent-red' : ''} ${isChatDisabled && !isOwned ? 'text-red-500 opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <MicIcon className="w-5 h-5" />
                                            </button>
                                            {user && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsVoiceChatOpen(true)}
                                                    title={language === 'vi' ? 'Trò chuyện trực tiếp bằng giọng nói' : 'Live voice chat'}
                                                    className="chat-input-icon-btn"
                                                    style={{ color: '#8b4513' }}
                                                >
                                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                                        <circle cx="11" cy="11" r="11" fill="#8b4513"/>
                                                        <rect x="4"  y="9"  width="2" height="4" rx="1" fill="white"/>
                                                        <rect x="7"  y="6"  width="2" height="10" rx="1" fill="white"/>
                                                        <rect x="10" y="4"  width="2" height="14" rx="1" fill="white"/>
                                                        <rect x="13" y="6"  width="2" height="10" rx="1" fill="white"/>
                                                        <rect x="16" y="9"  width="2" height="4" rx="1" fill="white"/>
                                                    </svg>
                                                </button>
                                            )}
                                            <button type="submit" disabled={isChatDisabled || (!newMessage.trim() && !imagePreview && !fileAttachment)} className="chat-send-btn">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        ) : viewMode === 'meditationtimer' ? <MeditationTimer language={language} spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : undefined} />
                            : viewMode === 'library' ? <LibraryView filters={libraryFilters} onFiltersChange={setLibraryFilters} language={language} spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null} spaceSlug={spaceSlug} onShare={(text) => handleShare(text)} />
                                : viewMode === 'dharmatalks' ? <DharmaTalksView language={language} spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null} />
                                    : viewMode === 'about' ? <SpaceDetailPage user={user} onUserUpdate={onUserUpdate} />
                                        : viewMode === 'community' ? (
                                            <>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

                                                {/* Notification Panel — dropdown from bell */}
                                                {showNotifications && (
                                                    <div ref={notifPanelRef} style={{
                                                        position: 'fixed',
                                                        top: 64,
                                                        right: 12,
                                                        zIndex: 200,
                                                        width: 'min(380px, 95vw)',
                                                        maxHeight: '70vh',
                                                        background: 'var(--color-background-panel)',
                                                        borderRadius: 14,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                                                        overflowY: 'auto',
                                                        border: '1px solid var(--color-border-color)',
                                                        animation: 'notifDropIn 0.18s ease',
                                                    }}>
                                                        <style>{`
                                                            @keyframes notifDropIn {
                                                                from { opacity: 0; transform: translateY(-8px); }
                                                                to   { opacity: 1; transform: translateY(0); }
                                                            }
                                                        `}</style>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 12px', borderBottom: '1px solid var(--color-border-color)', position: 'sticky', top: 0, background: 'var(--color-background-panel)', zIndex: 1 }}>
                                                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>Thông báo</span>
                                                            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>Đánh dấu đã đọc</button>
                                                        </div>
                                                        {notifLoading ? (
                                                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-light)', fontSize: 13 }}>Đang tải...</div>
                                                        ) : notifications.length === 0 ? (
                                                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-light)', fontSize: 13 }}>Không có thông báo nào.</div>
                                                        ) : notifications.map((n, i) => {
                                                            const initials = (n.actorName || '?').charAt(0);
                                                            const timeStr = n.createdAt
                                                                ? (() => { const d = Math.floor((Date.now() - new Date(n.createdAt).getTime()) / 86400000); return d === 0 ? 'Hôm nay' : `${d} ngày trước`; })()
                                                                : '';
                                                            const actionText = n.type === 'like' ? 'đã thích bài viết của bạn'
                                                                : n.type === 'comment' ? 'đã bình luận về bài viết của bạn'
                                                                : n.type === 'follow' ? 'đã bắt đầu theo dõi bạn'
                                                                : 'đã chia sẻ lại bài viết của bạn';
                                                            const iconEl = n.type === 'like'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                                                : n.type === 'comment'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                                : n.type === 'follow'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
                                                            return (
                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--color-border-color)' }}>
                                                                    {n.actorAvatarUrl
                                                                        ? <img src={n.actorAvatarUrl} alt={n.actorName} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--color-border-color)' }} />
                                                                        : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#7c3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{initials}</div>
                                                                    }
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.5 }}>
                                                                            <strong>{n.actorName}</strong>{' '}<span style={{ color: 'var(--color-text-light)' }}>{actionText}</span>
                                                                        </p>
                                                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-text-light)' }}>{timeStr}</p>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                                        {iconEl}
                                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Feed / Profile content */}

                                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                                                    {viewingUser && currentSpace?.id ? (
                                                        /* ── Viewed user profile (read-only wall) ── */
                                                        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 8px' }}>

                                                            {/* Profile card (read-only) */}
                                                            <div style={{ background: 'var(--color-background-panel)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid var(--color-border-color)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                                                                    {/* Avatar */}
                                                                    {viewingUser.avatarUrl
                                                                        ? <img src={viewingUser.avatarUrl} alt={viewingUser.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-border-color)', flexShrink: 0 }} />
                                                                        : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#7c3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 26, flexShrink: 0 }}>{viewingUser.name.charAt(0).toUpperCase()}</div>
                                                                    }
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                                            <div>
                                                                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{viewingUser.name}</div>
                                                                                <div style={{ fontSize: 13, color: 'var(--color-text-light)', marginTop: 2 }}>@{viewingUser.name.toLowerCase().replace(/\s+/g, '')}</div>
                                                                            </div>
                                                                            {/* Follow button */}
                                                                            {user && (() => {
                                                                                const isFollowing = followingIds.has(viewingUser.id);
                                                                                return (
                                                                                    <button
                                                                                        onClick={async () => {
                                                                                            if (followLoading) return;
                                                                                            setFollowLoading(true);
                                                                                            try {
                                                                                                const res = await apiService.toggleSocialFollow(currentSpace.id as number, viewingUser.id);
                                                                                                setFollowingIds(prev => {
                                                                                                    const next = new Set(prev);
                                                                                                    if (res.following) next.add(viewingUser.id); else next.delete(viewingUser.id);
                                                                                                    return next;
                                                                                                });
                                                                                                setViewingUserFollowersCount(res.followersCount);
                                                                                            } catch { /* ignore */ } finally { setFollowLoading(false); }
                                                                                        }}
                                                                                        disabled={followLoading}
                                                                                        style={{ padding: '7px 20px', borderRadius: 20, border: isFollowing ? '1px solid var(--color-border-color)' : 'none', cursor: followLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0, background: isFollowing ? 'transparent' : 'var(--color-primary)', color: isFollowing ? 'var(--color-text-main)' : 'var(--color-text-on-primary)', transition: 'all 0.2s', opacity: followLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                                                                                    >
                                                                                        {followLoading ? (
                                                                                            <svg style={{ animation: 'spin 0.7s linear infinite' }} width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'><path d='M21 12a9 9 0 1 1-6.219-8.56'/></svg>
                                                                                        ) : (isFollowing ? 'Hủy theo dõi' : 'Theo dõi')}
                                                                                    </button>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        {viewingUser.bio && (
                                                                            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.55 }}>{viewingUser.bio}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Stats row */}
                                                                <div style={{ display: 'flex', gap: 32, borderTop: '1px solid var(--color-border-color)', paddingTop: 14, marginTop: 2 }}>
                                                                    {[{ val: viewingUserPostCount, label: 'B\u00e0i vi\u1ebft' }, { val: viewingUserFollowersCount, label: 'Ng\u01b0\u1eddi theo d\u00f5i' }, { val: viewingUserFollowingCount, label: '\u0110ang theo d\u00f5i' }].map((s, i) => (
                                                                        <div key={i} style={{ textAlign: 'left' }}>
                                                                            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{s.val}</div>
                                                                            <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{s.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* Posts of viewed user */}
                                                            <SocialFeed
                                                                spaceId={currentSpace.id as number}
                                                                currentUser={user}
                                                                filterUserId={viewingUser.id}
                                                                onPostsLoaded={(count: number) => setViewingUserPostCount(count)}
                                                                onUserClick={(uid, uname, uavatar) => {
                                                                    if (viewingUser && uid === viewingUser.id) return;
                                                                    openUserProfile(uid, uname, uavatar);
                                                                }}
                                                                language={language}
                                                            />
                                                        </div>
                                                    ) : communityTab === 'home' && user ? (
                                                        /* ── Personal profile page ── */
                                                        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 8px' }}>
                                                            {/* Profile card */}
                                                            <div style={{ background: 'var(--color-background-panel)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: '1px solid var(--color-border-color)' }}>

                                                                {/* Top row: avatar + info + pencil */}
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>

                                                                    {/* Avatar — clickable to open media library when editing */}
                                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                        {(editProfileOpen ? editAvatarUrl : null) || user.avatarUrl
                                                                            ? <img
                                                                                src={editProfileOpen ? (editAvatarUrl || user.avatarUrl || '') : user.avatarUrl!}
                                                                                alt={user.name}
                                                                                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-border-color)', cursor: editProfileOpen ? 'pointer' : 'default' }}
                                                                                onClick={() => editProfileOpen && setShowMediaPicker('avatar')}
                                                                              />
                                                                            : <div
                                                                                style={{ width: 64, height: 64, borderRadius: '50%', background: '#7c3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 26, cursor: editProfileOpen ? 'pointer' : 'default' }}
                                                                                onClick={() => editProfileOpen && setShowMediaPicker('avatar')}
                                                                              >{user.name?.charAt(0) || '?'}</div>
                                                                        }
                                                                        {editProfileOpen && (
                                                                            <div
                                                                                onClick={() => setShowMediaPicker('avatar')}
                                                                                style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary)', border: '2px solid var(--color-background-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                                                title="Chọn ảnh từ thư viện"
                                                                            >
                                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                                                                    <circle cx="12" cy="13" r="4"/>
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                                            <div>
                                                                                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{user.name}</div>
                                                                                <div style={{ fontSize: 13, color: 'var(--color-text-light)', marginTop: 2 }}>@{user.name?.toLowerCase().replace(/\s/g, '') || 'user'}</div>
                                                                            </div>
                                                                            {/* Pencil toggle */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (editProfileOpen) {
                                                                                        setEditProfileOpen(false);
                                                                                    } else {
                                                                                        setEditBio(user.bio || '');
                                                                                        setEditAvatarUrl(user.avatarUrl || '');
                                                                                        setEditProfileOpen(true);
                                                                                    }
                                                                                }}
                                                                                title={editProfileOpen ? 'Đóng' : 'Chỉnh sửa hồ sơ'}
                                                                                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--color-border-color)', background: editProfileOpen ? 'var(--color-primary)' : 'transparent', color: editProfileOpen ? '#fff' : 'var(--color-text-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                                                                            >
                                                                                {editProfileOpen
                                                                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                                                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                                                      </svg>
                                                                                }
                                                                            </button>
                                                                        </div>

                                                                        {/* Bio display (always shown, placeholder if empty) */}
                                                                        {!editProfileOpen && (
                                                                            <p style={{ margin: '8px 0 0', fontSize: 13, color: user.bio ? 'var(--color-text-main)' : 'var(--color-text-light)', lineHeight: 1.55, fontStyle: user.bio ? 'normal' : 'italic' }}>
                                                                                {user.bio || 'Chưa có giới thiệu. Nhấn ✏️ để thêm.'}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* ── Inline edit section ── */}
                                                                {editProfileOpen && (
                                                                    <div style={{ marginBottom: 14, borderTop: '1px solid var(--color-border-color)', paddingTop: 14 }}>
                                                                        {/* About textarea */}
                                                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-light)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giới thiệu bản thân</label>
                                                                        <textarea
                                                                            value={editBio}
                                                                            onChange={e => setEditBio(e.target.value)}
                                                                            placeholder="Viết vài điều giới thiệu về bạn..."
                                                                            rows={3}
                                                                            autoFocus
                                                                            style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--color-border-color)', background: 'var(--color-background-main)', color: 'var(--color-text-main)', fontSize: 13, resize: 'none', boxSizing: 'border-box' as any, outline: 'none', fontFamily: 'inherit', lineHeight: 1.55, marginBottom: 12 }}
                                                                        />

                                                                        {/* Save / Cancel */}
                                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                            <button onClick={() => setEditProfileOpen(false)}
                                                                                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--color-border-color)', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                                                                Hủy
                                                                            </button>
                                                                            <button
                                                                                disabled={editSaving}
                                                                                onClick={async () => {
                                                                                    if (!user?.id) return;
                                                                                    setEditSaving(true);
                                                                                    try {
                                                                                        const updated = await apiService.updateUser({ id: user.id, avatarUrl: editAvatarUrl || undefined, bio: editBio } as any);
                                                                                        onUserUpdate(updated);
                                                                                        setEditProfileOpen(false);
                                                                                        showToast('Hồ sơ đã được cập nhật! ✨', 'success');
                                                                                    } catch {
                                                                                        showToast('Cập nhật thất bại. Vui lòng thử lại.', 'error');
                                                                                    } finally { setEditSaving(false); }
                                                                                }}
                                                                                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', cursor: editSaving ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, opacity: editSaving ? 0.7 : 1 }}>
                                                                                {editSaving ? 'Đang lưu...' : 'Lưu'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Stats row */}
                                                                <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--color-border-color)', paddingTop: 14 }}>
                                                                    {[
                                                                        { label: 'Bài viết', value: myPostsCount },
                                                                        { label: 'Người theo dõi', value: (user as any).followersCount ?? 0 },
                                                                        { label: 'Đang theo dõi', value: (user as any).followingCount ?? 0 },
                                                                    ].map((s, i) => (
                                                                        <div key={i} style={{ textAlign: 'left' }}>
                                                                            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{s.value}</div>
                                                                            <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{s.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            {/* My posts */}
                                                            {currentSpace?.id && (
                                                                <SocialFeed
                                                                    spaceId={currentSpace.id as number}
                                                                    currentUser={user}
                                                                    filterUserId={typeof user.id === 'number' ? user.id : null}
                                                                    onPostsLoaded={(count: number) => setMyPostsCount(count)}
                                                                    onUserClick={(uid, uname, uavatar) => {
                                                                        if (typeof user?.id === 'number' && uid === user.id) return;
                                                                        openUserProfile(uid, uname, uavatar);
                                                                    }}
                                                                    language={language}
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        /* ── Feed tab ── */
                                                        currentSpace?.id ? (
                                                            <SocialFeed
                                                                spaceId={currentSpace.id as number}
                                                                currentUser={user}
                                                                filterUserId={null}
                                                                focusTrigger={feedSearchTrigger}
                                                                onUserClick={(uid, uname, uavatar) => {
                                                                    if (typeof user?.id === 'number' && uid === user.id) return;
                                                                    openUserProfile(uid, uname, uavatar);
                                                                }}
                                                                language={language}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full">
                                                                <SpinnerIcon className="w-8 h-8 animate-spin text-primary" />
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            </>
                                        )
                                        : <div className="flex items-center justify-center h-full text-text-light">{t.comingSoon}</div>
                        }
                    </Suspense>
                </div>
            </main>

            {isVoiceChatOpen && currentAiConfig && (
                <VoiceChat
                    currentAiConfig={currentAiConfig}
                    user={user}
                    language={language}
                    setLanguage={setLanguage}
                    conversationId={conversationId}
                    onNewConversationId={(id) => {
                        setConversationId(id);
                        setConversationUpdateTrigger(c => c + 1);
                    }}
                    onSaveSession={handleVoiceSessionSave}
                    onClose={() => setIsVoiceChatOpen(false)}
                />
            )}

            {showOfferingNudge && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#fefcf5] rounded-xl shadow-2xl p-4 w-72 border border-primary/20 animate-fade-in-right">
                    <button onClick={() => setShowOfferingNudge(false)} className="absolute top-2.5 right-2.5 text-text-light hover:text-text-main">
                        <XIcon className="w-5 h-5" />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100/50 rounded-full mt-1 flex-shrink-0 border border-primary/10">
                            <HeartIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-text-main pr-4 text-base font-serif">{t.offeringNudgeTitle}</h4>
                            <p className="text-sm text-text-light mt-1 font-sans">{t.offeringNudgeSubtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setShowOfferingNudge(false);
                            setIsMeritPurchaseModalOpen(true);
                        }}
                        className="w-full mt-4 bg-primary text-text-on-primary py-2 rounded-lg font-semibold hover:bg-primary-hover flex items-center justify-center gap-2 text-base"
                    >
                        <span>{t.offeringNudgeButton}</span>
                    </button>
                </div>
            )}

            {isMeritPurchaseModalOpen && (
                <MeritPaymentModal
                    isOpen={isMeritPurchaseModalOpen}
                    onClose={() => setIsMeritPurchaseModalOpen(false)}
                    user={user}
                    onPaymentSuccess={onUserUpdate}
                    language={language}
                    showIncenseOption={true}
                    spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : undefined}
                />
            )}
            {isDonateModalOpen && user && (
                <DonateForLimitModal
                    isOpen={isDonateModalOpen}
                    onClose={() => setIsDonateModalOpen(false)}
                    user={user}
                    onUserUpdate={(updatedUser) => onUserUpdate(updatedUser)}
                    language={language}
                    baseDailyLimit={dailyLimitInfo.base}
                    bonusLimit={dailyLimitInfo.bonus}
                    spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null}
                    aiConfigId={currentAiConfig?.id ? Number(currentAiConfig.id) : null}
                />
            )}
            {isPricingModalOpen && (
                <PricingModal
                    isOpen={isPricingModalOpen}
                    onClose={() => setIsPricingModalOpen(false)}
                    user={user}
                    onUserUpdate={onUserUpdate}
                    language={language}
                    spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null}
                    aiConfigId={currentAiConfig?.id ? Number(currentAiConfig.id) : null}
                />
            )}

            {isMarketplaceModalOpen && (
                <MarketplaceModal
                    isOpen={isMarketplaceModalOpen}
                    onClose={() => setIsMarketplaceModalOpen(false)}
                    user={user}
                    onUserUpdate={onUserUpdate}
                    language={language}
                    prioritizedAiId={promptPurchaseAiId}
                    spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null}
                />
            )}
            {contextMenu && (
                <MessageContextMenu
                    message={contextMenu.message}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onCopy={handleCopy}
                    onDeleteForMe={(id) => setMessages(msgs => msgs.filter(m => m.id !== id))}
                    language={language}
                />
            )}
            {/* Media Library Picker — for avatar and other image selections */}
            {showMediaPicker === 'avatar' && (
                <MediaLibraryPicker
                    space={currentSpace as any}
                    acceptLabel="ảnh đại diện"
                    onSelect={url => setEditAvatarUrl(url)}
                    onClose={() => setShowMediaPicker(null)}
                />
            )}
            {/* Share to Community Modal */}
            {shareModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    onClick={() => !shareModal.submitting && setShareModal(null)}
                >
                    <div
                        style={{ background: 'var(--color-background-panel)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border-color)' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)', fontFamily: "'EB Garamond', serif" }}>
                                {language === 'vi' ? 'Chia sẻ lên cộng đồng' : 'Share to Community'}
                            </span>
                            <button onClick={() => setShareModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
                        </div>

                        {/* Post preview card */}
                        <div style={{ margin: '0.75rem 1.25rem', background: 'var(--color-background-main)', borderRadius: 12, border: '1px solid var(--color-border-color)', overflow: 'hidden' }}>
                            {/* User row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 0' }}>
                                {user?.avatarUrl
                                    ? <img src={user.avatarUrl} alt={user.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7c3d3d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{user?.name?.charAt(0) || '?'}</div>
                                }
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>{user?.name || 'Bạn'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>@{(user?.name || 'user').toLowerCase().replace(/\s/g, '')} · {language === 'vi' ? 'Vừa xong' : 'Just now'}</div>
                                </div>
                            </div>

                            {/* Textarea for thoughts */}
                            <textarea
                                autoFocus
                                value={shareModal.comment}
                                onChange={e => setShareModal(prev => prev ? { ...prev, comment: e.target.value } : null)}
                                placeholder={language === 'vi' ? 'Thêm suy nghĩ của bạn...' : 'Add your thoughts...'}
                                rows={2}
                                style={{
                                    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                                    color: 'var(--color-text-main)', fontSize: '0.9rem', resize: 'none', outline: 'none',
                                    fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5
                                }}
                            />

                            {/* AI Quote block */}
                            <div style={{ margin: '0 10px 10px', background: 'rgba(185,148,90,0.12)', border: '1px solid rgba(185,148,90,0.3)', borderRadius: 10, padding: '10px 12px' }}>
                                {shareModal.aiName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>☆</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
                                            Agent: {shareModal.aiName}
                                        </span>
                                    </div>
                                )}
                                <div style={{ fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
                                    {shareModal.text}
                                </div>
                            </div>

                            {/* Preview stats bar */}
                            <div style={{ display: 'flex', gap: 18, padding: '8px 14px 12px', borderTop: '1px solid var(--color-border-color)' }}>
                                {[{ icon: '♡', label: '0' }, { icon: '○', label: '0' }, { icon: '↻', label: '0' }].map((item, i) => (
                                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-light)' }}>
                                        <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '0.75rem 1.25rem 1rem' }}>
                            <button onClick={() => setShareModal(null)} disabled={shareModal.submitting}
                                style={{ padding: '0.55rem 1.2rem', borderRadius: 8, border: 'none', background: 'none', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                                {language === 'vi' ? 'Hủy' : 'Cancel'}
                            </button>
                            <button onClick={handleShareSubmit} disabled={shareModal.submitting}
                                style={{ padding: '0.55rem 1.4rem', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'var(--color-text-on-primary)', cursor: shareModal.submitting ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: shareModal.submitting ? 0.7 : 1 }}>
                                {shareModal.submitting ? (language === 'vi' ? 'Đang đăng...' : 'Posting...') : (language === 'vi' ? 'Chia sẻ' : 'Share')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
