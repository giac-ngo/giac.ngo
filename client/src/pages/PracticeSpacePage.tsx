// client/src/pages/PracticeSpacePage.tsx
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Message, AIConfig, SystemConfig, Conversation, ViewMode, LibraryFilters, Space } from '../types';
import { apiService, ModelType } from '../services/apiService';
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
import { SocialFeed, UserPhotoGallery } from '../components/social/SocialFeed';
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
    const [loadingTtsId, setLoadingTtsId] = useState<string | number | null>(null);
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

    // Owner voice config — lấy voice/style/temperature từ owner AI config
    const [ownerVoiceConfig, setOwnerVoiceConfig] = useState<{ ephemeralToken?: string; geminiVoice?: string; geminiStyle?: string; geminiTemperature?: number } | null>(null);
    useEffect(() => {
        if (!currentAiConfig?.id) { setOwnerVoiceConfig(null); return; }
        apiService.getAiVoiceKey(currentAiConfig.id)
            .then(res => setOwnerVoiceConfig(res || null))
            .catch(() => setOwnerVoiceConfig(null));
    }, [currentAiConfig?.id]);

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
    const [shareModal, setShareModal] = useState<{ text: string; comment: string; submitting: boolean; aiName?: string; userQuestion?: string; libraryDoc?: { title: string; author: string; content: string } } | null>(null);
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
    const [notifCount, setNotifCount] = useState(0);
    const [myPostsCount, setMyPostsCount] = useState(0);
    const [myHomeTab, setMyHomeTab] = useState<'posts' | 'photos' | 'gatha' | 'audio' | 'saved'>('posts');
    const [highlightPostId, setHighlightPostId] = useState<number | null>(null);
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

    const [currentUserFollowersCount, setCurrentUserFollowersCount] = useState(0);
    const [currentUserFollowingCount, setCurrentUserFollowingCount] = useState(0);

    useEffect(() => {
        if (communityTab === 'home' && user?.id && currentSpace?.id && !viewingUser) {
            apiService.getUserSocialStats(currentSpace.id as number, user.id as number).then(stats => {
                setCurrentUserFollowersCount(stats.followersCount);
                setCurrentUserFollowingCount(stats.followingCount);
            }).catch(console.error);
        }
    }, [communityTab, user?.id, currentSpace?.id, viewingUser]);

    // Poll unread notification count every 30s
    useEffect(() => {
        if (!currentSpace?.id || !user?.id) return;
        const fetchCount = () => {
            apiService.getUnreadNotificationCount(currentSpace.id as number)
                .then(r => setNotifCount(r.count))
                .catch(() => {});
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [currentSpace?.id, user?.id]);

    const handleToggleNotifications = async () => {
        if (!showNotifications && currentSpace?.id) {
            setNotifLoading(true);
            try {
                const data = await apiService.getSocialNotifications(currentSpace.id as number);
                setNotifications(data);
                // Mark all as read
                await apiService.markNotificationsRead(currentSpace.id as number);
                setNotifCount(0);
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
    const testAudioRef = useRef<HTMLAudioElement | null>(null);
    const speakingQueueRef = useRef<string | number | null>(null); // Track current TTS session for cancel
    // Client-side TTS cache: key = text hash, value = blob URL (or array for chunked)
    const ttsCacheRef = useRef<Map<string, { blobUrl: string; mimeType: string; chunkUrls?: string[] }>>(new Map());

    const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);

    const viewMode = view || 'chat';

    useEffect(() => {
        if (viewMode === 'library' || viewMode === 'dharmatalks') {
            setShowOfferingNudge(true);
            // Force-close the modal if the user navigates away from chat while it's open
            setIsMeritPurchaseModalOpen(false);
            if (viewMode === 'library') {
                // Library always opens sidebar (shows table of contents)
                setIsSidebarCollapsed(false);
            } else {
                // DharmaTalks: collapse on mobile, open on desktop
                if (window.innerWidth < 1024) {
                    setIsSidebarCollapsed(true);
                } else {
                    setIsSidebarCollapsed(false);
                }
            }
        } else {
            setShowOfferingNudge(false);
            // On mobile: collapse sidebar for chat, meditation, community, about
            if (window.innerWidth < 1024) {
                setIsSidebarCollapsed(true);
            }
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

    // Auto-open Voice Chat if coming from homepage mic button
    useEffect(() => {
        const openVoice = localStorage.getItem('openVoiceOnLoad');
        if (openVoice === '1') {
            localStorage.removeItem('openVoiceOnLoad');
            // Small delay to allow AI config to load
            setTimeout(() => setIsVoiceChatOpen(true), 800);
        }
    }, []);

    // Auto-trigger STT mic if coming from homepage mic button
    useEffect(() => {
        const openMic = localStorage.getItem('openMicOnLoad');
        if (openMic === '1') {
            localStorage.removeItem('openMicOnLoad');
            // Delay to allow recognition to initialize
            setTimeout(() => {
                handleToggleRecording();
            }, 900);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                onChunk: (chunk: string) => {
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
                onEnd: (newConversationId: number | string, updatedUser: any, finalMessage: any) => {
                    setIsTyping(false);
                    setIsAiThinking(false);
                    if (newConversationId && !conversationId) {
                        setConversationId(newConversationId as any);
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
                onError: (error: any) => {
                    setIsTyping(false);
                    setIsAiThinking(false);

                    // Remove the user message bubble that was optimistically added
                    setAllMessages(prev => prev.filter(m => m.id !== userMessage.id));
                    setMessages(prev => prev.filter(m => m.id !== userMessage.id));

                    if (typeof error === 'string' && error.startsWith('DAILY_LIMIT_REACHED:')) {
                        const [, base, bonus] = error.split(':');
                        setDailyLimitInfo({ base: parseInt(base) || 20, bonus: parseInt(bonus) || 0 });
                        setIsDonateModalOpen(true);
                        return;
                    }

                    const displayError = (typeof error === 'string' && error.includes('GUEST_REGISTER_NUDGE'))
                        ? t.guestLimitReached
                        : t.genericError + `: ${error.message || error}`;

                    const errorMsg: Message = { id: `ai-err-${Date.now()}`, text: displayError, sender: 'ai', timestamp: Date.now() };
                    setAllMessages(prev => [...prev, errorMsg]);
                    setMessages(prev => [...prev, errorMsg]);

                    if (typeof error === 'string' && error.includes('GUEST_REGISTER_NUDGE')) handleGoToSpaceLogin();
                }
            });
        } catch (error: any) {
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

    // Auto-expand textarea like ChatGPT
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        if (!newMessage) {
            textarea.style.height = '24px';
            return;
        }
        
        // Force shrink to 0 to get accurate scrollHeight based only on content
        textarea.style.height = '0px';
        const scrollHeight = textarea.scrollHeight;
        
        // Base height is 24px, max height is 200px
        const newHeight = Math.min(Math.max(scrollHeight, 24), 200);
        textarea.style.height = `${newHeight}px`;
    }, [newMessage]);

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

    // Strip markdown formatting from text before sending to TTS
    const stripMarkdown = (md: string): string => {
        return md
            .replace(/```[\s\S]*?```/g, '') // code blocks
            .replace(/`[^`]+`/g, '')         // inline code
            .replace(/!?\[[^\]]*\]\([^)]*\)/g, '') // links/images
            .replace(/#{1,6}\s*/g, '')       // headings
            .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
            .replace(/\*([^*]+)\*/g, '$1')     // italic
            .replace(/~~([^~]+)~~/g, '$1')     // strikethrough
            .replace(/^[\s]*[-*+]\s/gm, '')   // list markers
            .replace(/^[\s]*\d+\.\s/gm, '')   // numbered list
            .replace(/^>\s?/gm, '')           // blockquotes
            .replace(/---+/g, '')             // hr
            .replace(/\n{3,}/g, '\n\n')       // excess newlines
            .trim();
    };

    // Split text into chunks at sentence boundaries for parallel TTS
    const splitTtsChunks = (text: string, maxLen = 350): string[] => {
        if (text.length <= maxLen) return [text];
        const chunks: string[] = [];
        // Split by sentence-ending punctuation followed by space/newline
        const sentences = text.split(/(?<=[.!?。…]\s)|(?<=\n)/g).filter(s => s.trim());
        let current = '';
        for (const sentence of sentences) {
            if (current.length + sentence.length > maxLen && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current += sentence;
            }
        }
        if (current.trim()) chunks.push(current.trim());
        // If splitting by sentences didn't work (e.g. no punctuation), force split by length
        if (chunks.length <= 1 && text.length > maxLen) {
            const forced: string[] = [];
            for (let i = 0; i < text.length; i += maxLen) {
                forced.push(text.slice(i, i + maxLen).trim());
            }
            return forced.filter(Boolean);
        }
        return chunks.length > 0 ? chunks : [text];
    };

    // Helper: convert Base64 audio to Blob URL
    const base64ToBlobUrl = (audioContent: string, mimeType: string): string => {
        const byteCharacters = atob(audioContent);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType || 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    const handleSpeak = async (text: string, msgId: string | number) => {
        // Toggle off if already playing/loading this message
        if (speakingMessageId === msgId || loadingTtsId === msgId) {
            window.speechSynthesis.cancel();
            if (testAudioRef.current) {
                testAudioRef.current.pause();
                testAudioRef.current.currentTime = 0;
            }
            speakingQueueRef.current = null;
            setSpeakingMessageId(null);
            setLoadingTtsId(null);
            return;
        }
        window.speechSynthesis.cancel();
        speakingQueueRef.current = msgId;
        setLoadingTtsId(msgId);
        setSpeakingMessageId(null);

        // Pre-create Audio element synchronously to bypass Autoplay restrictions!
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        audio.play().catch(e => console.warn('Silent unlock play failed:', e));
        testAudioRef.current = audio;

        const cleanText = stripMarkdown(text);
        const geminiVoice = currentAiConfig?.ttsVoice || ownerVoiceConfig?.geminiVoice || (user?.apiKeys as any)?.geminiVoice || 'Algieba';
        const geminiStyle = currentAiConfig?.ttsStyle || ownerVoiceConfig?.geminiStyle || (user?.apiKeys as any)?.geminiStyle || '';
        const geminiTemperature = currentAiConfig?.ttsTemperature ?? ownerVoiceConfig?.geminiTemperature ?? (parseFloat((user?.apiKeys as any)?.geminiTemperature ?? '1') || 1);
        const ttsProvider = (currentAiConfig?.ttsProvider || 'gemini') as ModelType;
        const ttsModel = currentAiConfig?.ttsModel || 'gemini-3.1-flash-tts-preview';
        const cacheKey = `${ttsProvider}:${ttsModel}:${geminiVoice}:${String(msgId)}`;

        // ── Play a sequence of blob URLs on the unlocked audio element ──
        const playChunkSequence = async (urls: string[]) => {
            for (let i = 0; i < urls.length; i++) {
                if (speakingQueueRef.current !== msgId) return; // cancelled
                audio.src = urls[i];
                audio.onerror = () => { speakingQueueRef.current = null; setSpeakingMessageId(null); };
                try {
                    await audio.play();
                } catch (e) {
                    console.error('Autoplay blocked:', e);
                    // Fallback to browser SpeechSynthesis for remaining text
                    speakingQueueRef.current = null;
                    setSpeakingMessageId(null);
                    const utterance = new SpeechSynthesisUtterance(cleanText);
                    utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
                    utterance.onend = () => setSpeakingMessageId(null);
                    window.speechSynthesis.speak(utterance);
                    return;
                }
                // Wait for this chunk to finish playing
                await new Promise<void>(resolve => { audio.onended = () => resolve(); });
            }
            // All chunks done
            if (speakingQueueRef.current === msgId) {
                speakingQueueRef.current = null;
                setSpeakingMessageId(null);
            }
        };

        if (user?.id) {
            // ── CACHE HIT: play cached chunks immediately ──
            const cached = ttsCacheRef.current.get(cacheKey);
            if (cached) {
                setLoadingTtsId(null);
                setSpeakingMessageId(msgId);
                const urls = cached.chunkUrls || [cached.blobUrl];
                playChunkSequence(urls);
                return;
            }

            try {
                const chunks = splitTtsChunks(cleanText);
                console.log(`[TTS Pipeline] ${chunks.length} chunks, sizes: ${chunks.map(c => c.length).join(', ')}`);

                const fetchChunk = (chunkText: string) =>
                    apiService.generateTtsAudio(
                        chunkText, ttsProvider, ttsModel,
                        geminiVoice, language, user.id as number, geminiStyle, Number(geminiTemperature),
                        currentAiConfig?.id
                    ).then(res => base64ToBlobUrl(res.audioContent, res.mimeType));

                // Pipeline: fetch chunk[0], play it; while playing, fetch chunk[1]; etc.
                const allUrls: string[] = [];

                for (let i = 0; i < chunks.length; i++) {
                    if (speakingQueueRef.current !== msgId) return; // cancelled

                    // Start fetching this chunk
                    const urlPromise = fetchChunk(chunks[i]);

                    // For chunk[0], also start pre-fetching chunk[1] while we wait
                    let nextUrlPromise: Promise<string> | null = null;
                    if (i === 0 && chunks.length > 1) {
                        // Delay the 2nd request by 1s to avoid rate limit
                        nextUrlPromise = new Promise<string>(resolve => {
                            setTimeout(() => resolve(fetchChunk(chunks[1])), 1000);
                        });
                    }

                    const url = await urlPromise;
                    if (speakingQueueRef.current !== msgId) return;
                    allUrls.push(url);

                    // First chunk: remove loading spinner, show speaking state
                    if (i === 0) {
                        setLoadingTtsId(null);
                        setSpeakingMessageId(msgId);
                    }

                    // Play this chunk
                    audio.src = url;
                    audio.onerror = () => { speakingQueueRef.current = null; setSpeakingMessageId(null); };
                    try { await audio.play(); } catch { break; }

                    // While audio plays, pre-fetch next chunk (if not already started)
                    if (i + 1 < chunks.length && !nextUrlPromise) {
                        nextUrlPromise = fetchChunk(chunks[i + 1]);
                    }

                    // Wait for this chunk to finish playing
                    await new Promise<void>(resolve => { audio.onended = () => resolve(); });

                    // If we pre-fetched next chunk, resolve it now (should be ready)
                    if (nextUrlPromise && i + 1 < chunks.length) {
                        const nextUrl = await nextUrlPromise;
                        if (speakingQueueRef.current !== msgId) return;
                        allUrls.push(nextUrl);

                        // Play the pre-fetched chunk
                        audio.src = nextUrl;
                        try { await audio.play(); } catch { break; }
                        await new Promise<void>(resolve => { audio.onended = () => resolve(); });

                        i++; // skip next iteration since we already played it
                        nextUrlPromise = null;
                    }
                }

                // All done — cache all chunk URLs for instant replay
                if (allUrls.length > 0) {
                    ttsCacheRef.current.set(cacheKey, { blobUrl: allUrls[0], mimeType: 'audio/wav', chunkUrls: allUrls });
                    if (ttsCacheRef.current.size > 50) {
                        const firstKey = ttsCacheRef.current.keys().next().value;
                        if (firstKey) {
                            const old = ttsCacheRef.current.get(firstKey);
                            if (old) (old.chunkUrls || [old.blobUrl]).forEach(u => URL.revokeObjectURL(u));
                            ttsCacheRef.current.delete(firstKey);
                        }
                    }
                }

                if (speakingQueueRef.current === msgId) {
                    speakingQueueRef.current = null;
                    setSpeakingMessageId(null);
                }
                return;
            } catch (e) {
                console.error('Chunked TTS failed, falling back to SpeechSynthesis:', e);
                speakingQueueRef.current = null;
                setLoadingTtsId(null);
            }
        }

        // Fallback: browser SpeechSynthesis
        setLoadingTtsId(null);
        setSpeakingMessageId(msgId);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        utterance.onend = () => { speakingQueueRef.current = null; setSpeakingMessageId(null); };
        window.speechSynthesis.speak(utterance);
    };

    const handleDownload = async (text: string, msgId: string | number) => {
        const cleanText = stripMarkdown(text);
        const geminiVoice = currentAiConfig?.ttsVoice || ownerVoiceConfig?.geminiVoice || (user?.apiKeys as any)?.geminiVoice || 'Algieba';
        const geminiStyle = currentAiConfig?.ttsStyle || ownerVoiceConfig?.geminiStyle || (user?.apiKeys as any)?.geminiStyle || '';
        const geminiTemperature = currentAiConfig?.ttsTemperature ?? ownerVoiceConfig?.geminiTemperature ?? (parseFloat((user?.apiKeys as any)?.geminiTemperature ?? '1') || 1);
        const ttsProvider = (currentAiConfig?.ttsProvider || 'gemini') as ModelType;
        const ttsModel = currentAiConfig?.ttsModel || 'gemini-3.1-flash-tts-preview';

        if (user?.id) {
            try {
                const res = await apiService.generateTtsAudio(
                    cleanText, ttsProvider, ttsModel,
                    geminiVoice, language, user.id as number, geminiStyle, Number(geminiTemperature),
                    currentAiConfig?.id
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

    const handleShare = (text: string, aiName?: string, userQuestion?: string, libraryDoc?: { title: string; author: string; content: string }) => {
        if (!user) {
            showToast(language === 'vi' ? 'Vui lòng đăng nhập để chia sẻ lên cộng đồng.' : 'Please login to share to community.', 'info');
            return;
        }
        setShareModal({ text, comment: '', submitting: false, aiName, userQuestion, libraryDoc });
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
            } else if (shareModal.libraryDoc) {
                fd.append('content', shareModal.comment || ' ');
                fd.append('metadata', JSON.stringify({
                    type: 'library_share',
                    docTitle: shareModal.libraryDoc.title,
                    docAuthor: shareModal.libraryDoc.author,
                    docContent: shareModal.libraryDoc.content,
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
            await apiService.setMessageFeedback(conversationId as any as string, msgId, finalFeedback as string);
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
                    currentSpace={currentSpace as any}
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
                                                const msgText = msg.text;

                                                return (
                                                    <div key={msg.id || index} className={`chat-message-row ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                                                        <div className="chat-message-content group">
                                                            <div className={`chat-message-bubble ${msg.sender}`}>
                                                                <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{
                                                                    // Convert mọi single newline → markdown hard break (2 spaces + \n)
                                                                    // để bài kệ/thơ giữ đúng format xuống dòng.
                                                                    // Double newline (\n\n) vẫn giữ nguyên làm paragraph break.
                                                                    msgText
                                                                        .replace(/\n\n/g, '\x00PARA\x00')     // tạm giữ double newline
                                                                        .replace(/\n/g, '  \n')               // single newline → hard break
                                                                        .replace(/\x00PARA\x00/g, '\n\n')     // khôi phục paragraph
                                                                }</ReactMarkdown></div>
                                                                {msg.imageUrl && <img src={msg.imageUrl} alt="Uploaded content" className="mt-2 rounded-lg max-w-full h-auto" />}
                                                            </div>
                                                            {msg.sender === 'ai' && !isTyping && !isAiThinking && msg.id && (
                                                                <div className="chat-message-toolbar">
                                                                    <button onClick={() => handleFeedback(msg.id!, 'liked')} title={t.like} className={`p-1.5 rounded-full hover:bg-background-light ${feedbackStatus[String(msg.id!)] === 'liked' ? 'text-primary' : 'text-text-light'}`}><ThumbsUpIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleFeedback(msg.id!, 'disliked')} title={t.dislike} className={`p-1.5 rounded-full hover:bg-background-light ${feedbackStatus[String(msg.id!)] === 'disliked' ? 'text-accent-red' : 'text-text-light'}`}><ThumbsDownIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleCopy(msgText)} title={t.copy} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><CopyIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleSpeak(msgText, `${msg.id}`)} title={t.speak} className={`p-1.5 rounded-full hover:bg-background-light ${speakingMessageId === `${msg.id}` ? 'text-primary' : loadingTtsId === `${msg.id}` ? 'text-primary' : 'text-text-light'}`}>{loadingTtsId === `${msg.id}` ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <SpeakerWaveIcon className="w-4 h-4" />}</button>
                                                                    <button onClick={() => handleDownload(msgText, `${msg.id}`)} title={t.download} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><DownloadIcon className="w-4 h-4" /></button>
                                                                    <button onClick={() => handleShare(msgText, currentAiConfig?.name, messages[index - 1]?.text)} title={language === 'vi' ? 'Chia sẻ lên cộng đồng' : 'Share to community'} className="p-1.5 rounded-full hover:bg-background-light text-text-light"><ShareIcon className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
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
                                                rows={1}
                                                disabled={isChatDisabled}
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
                            : viewMode === 'library' ? <LibraryView filters={libraryFilters} onFiltersChange={setLibraryFilters} language={language} spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : null} spaceSlug={spaceSlug} onShare={(text, doc) => handleShare(text, undefined, undefined, doc)} />
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
                                                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{language === 'en' ? 'Notifications' : 'Thông báo'}</span>
                                                            <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{language === 'en' ? 'Close' : 'Đóng'}</button>
                                                        </div>
                                                        {notifLoading ? (
                                                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-light)', fontSize: 13 }}>{language === 'en' ? 'Loading...' : 'Đang tải...'}</div>
                                                        ) : notifications.length === 0 ? (
                                                            <div style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-light)', fontSize: 13 }}>{language === 'en' ? 'No notifications.' : 'Không có thông báo nào.'}</div>
                                                        ) : notifications.map((n, i) => {
                                                            const initials = (n.actorName || '?').charAt(0);
                                                            const timeStr = n.createdAt
                                                                ? (() => { const ms = Date.now() - new Date(n.createdAt).getTime(); const m = Math.floor(ms / 60000); if (m < 1) return language === 'en' ? 'Just now' : 'Vừa xong'; if (m < 60) return `${m}${language === 'en' ? 'm ago' : ' phút trước'}`; const h = Math.floor(m / 60); if (h < 24) return `${h}${language === 'en' ? 'h ago' : ' giờ trước'}`; const d = Math.floor(h / 24); return `${d}${language === 'en' ? 'd ago' : ' ngày trước'}`; })()
                                                                : '';
                                                            const actionTexts: Record<string, Record<string, string>> = {
                                                                like: { vi: 'đã thích bài viết của bạn', en: 'liked your post' },
                                                                comment: { vi: 'đã bình luận về bài viết của bạn', en: 'commented on your post' },
                                                                follow: { vi: 'đã bắt đầu theo dõi bạn', en: 'started following you' },
                                                                mention: { vi: 'đã nhắc đến bạn', en: 'mentioned you' },
                                                                new_post: { vi: 'đã đăng bài mới', en: 'posted something new' },
                                                            };
                                                            const actionText = actionTexts[n.type]?.[language] || actionTexts[n.type]?.vi || '';
                                                            const iconEl = n.type === 'like'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                                                : n.type === 'comment'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                                : n.type === 'follow'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-main)" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                                                : n.type === 'mention'
                                                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b4513" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0V12a10 10 0 1 0-3.92 7.94"/></svg>
                                                                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#45bd62" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
                                                            return (
                                                                <div key={i}
                                                                    onClick={() => {
                                                                        if (n.type === 'follow') {
                                                                            // Follow → open user profile
                                                                            if (n.actorUserId) {
                                                                                openUserProfile(n.actorUserId, n.actorName, n.actorAvatarUrl);
                                                                            }
                                                                        } else if (n.postId) {
                                                                            // like, comment, mention, new_post → switch to feed tab, highlight post
                                                                            setViewingUser(null);
                                                                            setCommunityTabState('feed');
                                                                            setHighlightPostId(null);
                                                                            // Use setTimeout to ensure state resets before setting new value
                                                                            setTimeout(() => setHighlightPostId(n.postId), 50);
                                                                        } else if (n.actorUserId) {
                                                                            openUserProfile(n.actorUserId, n.actorName, n.actorAvatarUrl);
                                                                        }
                                                                        setShowNotifications(false);
                                                                    }}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--color-border-color)', background: n.isRead ? 'transparent' : 'rgba(139,69,19,0.04)', cursor: 'pointer' }}
                                                                >
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
                                                                        {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} />}
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
                                                                    {[{ val: viewingUserPostCount, label: language === 'en' ? 'Posts' : 'Bài viết' }, { val: viewingUserFollowersCount, label: language === 'en' ? 'Followers' : 'Người theo dõi' }, { val: viewingUserFollowingCount, label: language === 'en' ? 'Following' : 'Đang theo dõi' }].map((s, i) => (
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
                                                        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 12px' }}>
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
                                                                        { label: language === 'en' ? 'Posts' : 'Bài viết', value: myPostsCount },
                                                                        { label: language === 'en' ? 'Followers' : 'Người theo dõi', value: currentUserFollowersCount },
                                                                        { label: language === 'en' ? 'Following' : 'Đang theo dõi', value: currentUserFollowingCount },
                                                                    ].map((s, i) => (
                                                                        <div key={i} style={{ textAlign: 'left' }}>
                                                                            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif" }}>{s.value}</div>
                                                                            <div style={{ fontSize: 12, color: 'var(--color-text-light)' }}>{s.label}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* ── Home sub-tabs ── */}
                                                            {currentSpace?.id && (
                                                                <>
                                                                    {/* Tab switcher — pill style */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        marginBottom: 16,
                                                                        background: 'rgba(185,148,90,0.18)',
                                                                        borderRadius: 999,
                                                                        padding: '3px',
                                                                        gap: 0,
                                                                        overflowX: 'auto',
                                                                        scrollbarWidth: 'none',
                                                                        WebkitOverflowScrolling: 'touch',
                                                                    }}>
                                                                        {[
                                                                            { key: 'posts', labelVi: 'Bài viết', labelEn: 'Posts' },
                                                                            { key: 'photos', labelVi: 'Ảnh', labelEn: 'Photos' },
                                                                            { key: 'gatha', labelVi: 'Kệ', labelEn: 'Gatha' },
                                                                            { key: 'audio', labelVi: 'Pháp thoại', labelEn: 'Audio' },
                                                                            { key: 'saved', labelVi: 'Đã lưu', labelEn: 'Saved' },
                                                                        ].map(tab => {
                                                                            const isActive = myHomeTab === tab.key;
                                                                            return (
                                                                            <button
                                                                                key={tab.key}
                                                                                onClick={() => setMyHomeTab(tab.key as 'posts' | 'photos' | 'saved' | 'gatha' | 'audio')}
                                                                                style={{
                                                                                    flex: '1 0 auto',
                                                                                    padding: '7px 10px',
                                                                                    border: 'none',
                                                                                    borderRadius: 999,
                                                                                    background: isActive ? '#ffffff' : 'transparent',
                                                                                    boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.13)' : 'none',
                                                                                    fontWeight: isActive ? 600 : 400,
                                                                                    fontSize: 13,
                                                                                    cursor: 'pointer',
                                                                                    color: isActive ? '#111111' : '#a07850',
                                                                                    transition: 'background 0.18s, box-shadow 0.18s, color 0.18s',
                                                                                    whiteSpace: 'nowrap',
                                                                                    letterSpacing: 0,
                                                                                }}
                                                                            >
                                                                                {language === 'en' ? tab.labelEn : tab.labelVi}
                                                                            </button>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Posts tab */}
                                                                    {myHomeTab === 'posts' && (
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

                                                                    {/* Photos tab */}
                                                                    {myHomeTab === 'photos' && (
                                                                        <UserPhotoGallery
                                                                            spaceId={currentSpace.id as number}
                                                                            userId={typeof user.id === 'number' ? user.id : 0}
                                                                            currentUser={user}
                                                                            language={language}
                                                                        />
                                                                    )}

                                                                    {/* Gatha tab */}
                                                                    {myHomeTab === 'gatha' && (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
                                                                            <span style={{ fontSize: 36 }}>🪷</span>
                                                                            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif", margin: 0 }}>
                                                                                {language === 'vi' ? 'Kệ sáng tác' : 'Gatha'}
                                                                            </p>
                                                                            <p style={{ fontSize: 13, color: 'var(--color-text-light)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                                                                                {language === 'vi' ? 'Tính năng đang phát triển. Bạn sẽ sớm có thể chia sẻ những bài kệ, thơ thiền và cảm ngộ của mình.' : 'Feature coming soon. You will be able to share your gathas, meditation poems and spiritual insights.'}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    {/* Saved/Bookmarked tab */}
                                                                    {myHomeTab === 'saved' && currentSpace?.id && (
                                                                        <SocialFeed
                                                                            spaceId={currentSpace.id as number}
                                                                            currentUser={user}
                                                                            showSavedOnly={true}
                                                                            onUserClick={(uid, uname, uavatar) => {
                                                                                if (typeof user?.id === 'number' && uid === user.id) return;
                                                                                openUserProfile(uid, uname, uavatar);
                                                                            }}
                                                                            language={language}
                                                                        />
                                                                    )}


                                                                    {/* Audio tab */}
                                                                    {myHomeTab === 'audio' && (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12 }}>
                                                                            <span style={{ fontSize: 36 }}>🎵</span>
                                                                            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-main)', fontFamily: "'EB Garamond', serif", margin: 0 }}>
                                                                                {language === 'vi' ? 'Pháp thoại & Nhạc ngộ đạo' : 'Dharma Talks & Awakening Music'}
                                                                            </p>
                                                                            <p style={{ fontSize: 13, color: 'var(--color-text-light)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                                                                                {language === 'vi' ? 'Tính năng đang phát triển. Bạn sẽ sớm có thể chia sẻ pháp thoại và nhạc ngộ đạo tự sáng tác.' : 'Feature coming soon. You will be able to share your own dharma talks and original awakening music.'}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </>
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
                                                                highlightPostId={highlightPostId}
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
                    ownerVoiceConfig={ownerVoiceConfig}
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

                            {/* AI / Library Quote block */}
                            <div style={{ margin: '0 10px 10px', background: 'rgba(185,148,90,0.12)', border: '1px solid rgba(185,148,90,0.3)', borderRadius: 10, padding: '10px 12px' }}>
                                {shareModal.aiName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>☆</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
                                            Agent: {shareModal.aiName}
                                        </span>
                                    </div>
                                )}
                                {shareModal.libraryDoc && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 13, color: 'var(--color-text-light)' }}>📖</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>
                                            {shareModal.libraryDoc.title}
                                        </span>
                                    </div>
                                )}
                                <div style={{ fontSize: 13, color: 'var(--color-text-main)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                    {shareModal.libraryDoc ? shareModal.libraryDoc.content : shareModal.text}
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

