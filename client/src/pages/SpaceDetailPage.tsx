// client/src/pages/SpaceDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { Space, User, AIConfig } from '../types';
import { useToast } from '../components/ToastProvider';
import { MapPinIcon, UsersIcon, StarIcon, ChevronLeftIcon, BookOpenIcon, CalendarIcon, AiIcon, RadioIcon, HeartIcon, GlobeAltIcon, PhoneIcon, EnvelopeIcon } from '../components/Icons';
import { MeritPaymentModal } from '../components/MeritPaymentModal';

const translations = {
    vi: {
        backToList: 'Quay lại',
        members: 'thành viên',
        views: 'lượt xem',
        likes: 'yêu thích',
        loading: 'Đang tải...',
        notFound: 'Không tìm thấy không gian này.',
        loadError: 'Không thể tải dữ liệu không gian.',
        aiLoadError: 'Không thể tải AI Agents cho không gian này.',
        contact: 'Liên hệ',
        website: 'Trang web',
        joinCommunity: 'Tham gia cộng đồng',
        // Tabs
        tabInfo: 'Giới thiệu',
        tabDharma: 'Pháp Thoại',
        tabSchedule: 'Lịch & Sự kiện',
        tabLibrary: 'Thư viện',
        tabAgents: 'AI Agents',
        tabOffering: 'Cúng dường',
        // Tab Content
        about: 'Về',
        details: 'Thông tin chi tiết',
        rank: 'Xếp hạng',
        type: 'Loại hình',
        rating: 'Đánh giá',
        scheduleInfo: 'Lịch sinh hoạt và các khóa tu sẽ được cập nhật sớm tại đây.',
        libraryLinkText: 'Khám phá thư viện',
        dharmaLinkText: 'Nghe pháp thoại',
        // Offering Modal
        offeringTitle: 'Cúng dường cho {name}',
        offeringAmount: 'Số Merit cúng dường',
        yourBalance: 'Số dư của bạn: {balance} Merit',
        unlimitedBalance: 'Số dư của bạn: Không giới hạn',
        offeringButton: 'Cúng dường',
        offeringLoading: 'Đang xử lý...',
        offeringSuccess: 'Cúng dường thành công! Xin chân thành cảm ơn.',
        offeringError: 'Cúng dường thất bại: {message}',
        insufficientMerits: 'Bạn không đủ Merit để thực hiện cúng dường.',
        loginToOffer: 'Vui lòng đăng nhập để cúng dường.',
        likeSuccess: 'Cảm ơn bạn đã yêu thích!',
        likeError: 'Yêu thích thất bại.',
        loginToLike: 'Vui lòng đăng nhập để yêu thích.',
        // Offering Tab Content
        offeringSupportTitle: 'Hỗ trợ {name}',
        offeringSupportSubtitle: 'Chấp nhận cúng dường với lòng tôn nghiêm—sự cúng dường rộng lượng được coi là một thực hành tâm linh, không phải là gây quỹ giao dịch.',
        recurringDanaTitle: 'Cúng dường Định kỳ',
        recurringDanaDesc: 'Cho phép các cam kết hàng tháng để tôn vinh những người ủng hộ tận tụy.',
        recurringDanaFeatures: ['Hàng tháng, hàng quý, hàng năm', 'Quản lý và tạm dừng dễ dàng', 'Ghi nhận sự hỗ trợ bền vững'],
        qrCodesTitle: 'Mã QR & Nhiều Phương thức',
        qrCodesDesc: 'Dễ dàng nhận quyên góp qua các phương thức hiện đại và truyền thống.',
        qrCodesFeatures: ['Mã QR để tặng ngay', 'Thẻ tín dụng/ghi nợ, chuyển khoản ngân hàng', 'Cash App, Apple Pay, Venmo'],
        meritDedicationTitle: 'Hồi hướng Công đức & Cúng dường Ẩn danh',
        meritDedicationDesc: 'Cho phép người cúng dường hồi hướng công đức và thực hành bố thí vô ngã.',
        meritDedicationFeatures: ['Hồi hướng công đức cho người thân', 'Hỗ trợ cúng dường ẩn danh', 'Ghi nhận công đức công khai'],
        makeDonationTitle: 'Thực hiện Cúng dường',
        makeDonationSubtitle: 'Chọn một số tiền và phương thức thanh toán để hỗ trợ {name}.',
        popular: 'Phổ biến',
        basicSupport: 'Hỗ trợ cơ bản',
        mediumSupport: 'Hỗ trợ vừa',
        majorSupport: 'Hỗ trợ lớn',
        customAmount: 'Hoặc nhập số tiền tùy chỉnh',
        enterAmount: 'Nhập số tiền (VND)',
        paymentMethod: 'Phương thức Thanh toán',
        cardInformation: 'Thông tin Thanh toán',
        cardNumber: 'Số thẻ',
        expiration: 'Ngày hết hạn',
        cvc: 'CVC',
        country: 'Quốc gia',
        zip: 'ZIP',
        completeDonation: 'Hoàn tất Cúng dường',
        donationSuccess: 'Cảm ơn sự cúng dường của bạn!',
        invalidAmount: 'Vui lòng nhập số tiền hợp lệ.',
        stripeError: 'Lỗi thanh toán: {message}',
        paymentSuccessful: 'Thanh toán thành công!',
        paymentProcessing: 'Đang xử lý thanh toán...',
        paymentFailed: 'Thanh toán thất bại. Vui lòng thử lại.',
        paymentMethodsLoadError: 'Không thể tải các phương thức thanh toán.',
        walletNotAvailable: 'Apple Pay/Google Pay không khả dụng trên thiết bị hoặc trình duyệt này.',
    },
    en: {
        backToList: 'Back',
        members: 'members',
        views: 'views',
        likes: 'likes',
        loading: 'Loading...',
        notFound: 'This space could not be found.',
        loadError: 'Could not load space data.',
        aiLoadError: 'Failed to load AI Agents for this space.',
        contact: 'Contact',
        website: 'Website',
        joinCommunity: 'Join Community',
        // Tabs
        tabInfo: 'Introduction',
        tabDharma: 'Dharma Talk',
        tabSchedule: 'Schedule & Events',
        tabLibrary: 'Library',
        tabAgents: 'AI Agents',
        tabOffering: 'Offering',
        // Tab Content
        about: 'About',
        details: 'Detailed Information',
        rank: 'Rank',
        type: 'Type',
        rating: 'Rating',
        scheduleInfo: 'Activity schedules and retreats will be updated here soon.',
        libraryLinkText: 'Explore the library',
        dharmaLinkText: 'Listen to dharma talks',
        // Offering Modal
        offeringTitle: 'Make an offering to {name}',
        offeringAmount: 'Merit amount to offer',
        yourBalance: 'Your balance: {balance} Merit',
        unlimitedBalance: 'Your balance: Unlimited',
        offeringButton: 'Offer',
        offeringLoading: 'Processing...',
        offeringSuccess: 'Offering successful! Thank you for your generosity.',
        offeringError: 'Offering failed: {message}',
        insufficientMerits: 'You do not have enough Merit for this offering.',
        loginToOffer: 'Please log in to make an offering.',
        likeSuccess: 'Thank you for your like!',
        likeError: 'Failed to like.',
        loginToLike: 'Please log in to like.',
        // Offering Tab Content
        offeringSupportTitle: 'Support {name}',
        offeringSupportSubtitle: 'Accept dāna with dignity—generous giving framed as spiritual practice, not transactional fundraising.',
        recurringDanaTitle: 'Recurring Dāna',
        recurringDanaDesc: 'Enable monthly commitments to honor supporters who dedicate long-term.',
        recurringDanaFeatures: ['Monthly, quarterly, annually', 'Easy management & pausing', 'Recognition for sustained support'],
        qrCodesTitle: 'QR Codes & Multiple Methods',
        qrCodesDesc: 'Seamlessly accept donations through modern and traditional payment methods.',
        qrCodesFeatures: ['QR codes for instant giving', 'Credit/debit cards, bank transfers', 'Cash App, Apple Pay, Venmo'],
        meritDedicationTitle: 'Merit Dedication & Anonymous Giving',
        meritDedicationDesc: 'Enable donors to dedicate merit and practice selfless giving.',
        meritDedicationFeatures: ['Dedicate merit to loved ones', 'Anonymous donations supported', 'Public or private recognition'],
        makeDonationTitle: 'Make a Donation',
        makeDonationSubtitle: 'Select an amount and payment method to support {name}.',
        popular: 'Popular',
        basicSupport: 'Basic support',
        mediumSupport: 'Medium support',
        majorSupport: 'Major support',
        customAmount: 'Or enter custom amount',
        enterAmount: 'Enter amount (VND)',
        paymentMethod: 'Payment Method',
        cardInformation: 'Payment Information',
        cardNumber: 'Card number',
        expiration: 'Expiration',
        cvc: 'CVC',
        country: 'Country',
        zip: 'ZIP',
        completeDonation: 'Complete Donation',
        donationSuccess: 'Thank you for your donation!',
        invalidAmount: 'Please enter a valid amount.',
        stripeError: 'Payment Error: {message}',
        paymentSuccessful: 'Payment successful!',
        paymentProcessing: 'Processing payment...',
        paymentFailed: 'Payment failed. Please try again.',
        paymentMethodsLoadError: 'Could not load payment methods.',
        walletNotAvailable: 'Apple Pay/Google Pay is not available on this device or browser.',
    }
};

interface SpaceDetailPageProps {
    user: User | null;
    onUserUpdate: (updatedData: Partial<User>) => void;
}





export const SpaceDetailPage: React.FC<SpaceDetailPageProps> = ({ user, onUserUpdate }) => {
    const language: 'vi' | 'en' = (localStorage.getItem('language') as 'vi' | 'en') || 'vi';
    const t = translations[language];
    const { spaceSlug: slug } = useParams<{ spaceSlug: string }>();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [center, setCenter] = useState<Space | null>(null);
    const [aiAgents, setAiAgents] = useState<AIConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('schedule');
    const [likes, setLikes] = useState(0);
    const [isLiking, setIsLiking] = useState(false);



    // Logic for offering modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Automatically open modal when offering tab is active
    useEffect(() => {
        if (activeTab === 'offering') {
            setIsPaymentModalOpen(true);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!slug) return;
        setIsLoading(true);
        apiService.getSpaceBySlug(slug)
            .then((data: Space) => {
                setCenter(data);
                setLikes(data.likes || 0);
                if (data && typeof data.id === 'number') {
                    apiService.incrementSpaceView(data.id).catch(err => console.error("Failed to increment view count", err));

                    apiService.getAiConfigsBySpaceId(data.id)
                        .then(setAiAgents)
                        .catch(() => showToast(t.aiLoadError, 'error'));
                }
            })
            .catch((err: any) => {
                showToast(t.loadError, 'error');
                console.error(err);
            })
            .finally(() => setIsLoading(false));
    }, [slug, showToast, t.loadError, t.aiLoadError]);



    const handleLike = async () => {
        if (!user) {
            showToast(t.loginToLike, 'info');
            navigate('/login', { state: { from: location } });
            return;
        }
        if (!center || isLiking) return;

        setIsLiking(true);
        try {
            const response = await apiService.likeSpace(center.id as number);
            setLikes(response.likes);
            showToast(t.likeSuccess, 'success');
        } catch (error) {
            showToast(t.likeError, 'error');
        } finally {
            setIsLiking(false);
        }
    };

    const handleSelectAi = (aiId: string | number) => {
        if (!slug) return;
        localStorage.setItem('lastSelectedAiId', String(aiId));
        navigate(`/${slug}/chat`);
    };

    const TabButton: React.FC<{ id: string, label: string, icon: React.ReactNode }> = ({ id, label, icon }) => (
        <button onClick={() => setActiveTab(id)} className={`tab-btn ${activeTab === id ? 'active' : ''}`}>
            {icon}
            <span>{label}</span>
        </button>
    );

    const renderTabContent = () => {
        if (!center || !slug) return null;
        const eventContent = language === 'en' && center.eventEn ? center.eventEn : center.event;
        const centerName = language === 'en' && center.nameEn ? center.nameEn : center.name;

        switch (activeTab) {
            case 'schedule':
                return (
                    <div className="tab-content">
                        {eventContent ? (
                            <div className="detail-description" dangerouslySetInnerHTML={{ __html: eventContent }} />
                        ) : (
                            <div className="coming-soon">{t.scheduleInfo}</div>
                        )}
                    </div>
                );
            case 'agents':
                return (
                    <div className="tab-content">
                        <h2>AI Agents at {centerName}</h2>
                        <div className="ai-agent-list">
                            {aiAgents.map(ai => (
                                <div key={ai.id} className="ai-agent-card" onClick={() => handleSelectAi(ai.id)}>
                                    <img src={ai.avatarUrl} alt={(language === 'en' && ai.nameEn) ? ai.nameEn : ai.name} />
                                    <div className="ai-agent-info">
                                        <h3>{(language === 'en' && ai.nameEn) ? ai.nameEn : ai.name}</h3>
                                        <p>{(language === 'en' && ai.descriptionEn) ? ai.descriptionEn : ai.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'library':
                return (
                    <div className="tab-content coming-soon">
                        <Link to={`/${slug}/library`} className="library-link-text">
                            {t.libraryLinkText} &rarr;
                        </Link>
                    </div>
                );
            case 'dharma':
                return (
                    <div className="tab-content coming-soon">
                        <Link to={`/${slug}/dharmatalks`} className="library-link-text">
                            {t.dharmaLinkText} &rarr;
                        </Link>
                    </div>
                );
            case 'offering':
                return (
                    <div className="tab-content offering-content">
                        <div className="offering-section-header">
                            <HeartIcon className="w-10 h-10" />
                            <h2>{t.offeringSupportTitle.replace('{name}', centerName)}</h2>
                            <p>{t.offeringSupportSubtitle}</p>
                        </div>

                        <div className="flex justify-center mt-4 mb-8">
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="bg-[#991b1b] text-white px-12 py-4 rounded-full font-bold shadow-lg hover:bg-[#7f1d1d] transition-transform hover:scale-105"
                                style={{ fontSize: '1.2rem' }}
                            >
                                {language === 'vi' ? 'Mở Form Cúng Dường' : 'Open Offering Form'}
                            </button>
                        </div>
                    </div>
                );
            default:
                return <div className="tab-content coming-soon">{t.scheduleInfo}</div>
        }
    };

    if (isLoading) return <div className="loading-container">{t.loading}</div>;
    if (!center) return <div className="loading-container">{t.notFound}</div>;

    const centerName = language === 'en' && center.nameEn ? center.nameEn : center.name;

    return (
        <div className="space-detail-page">
            <div className="detail-card-container">
                <Link to="/" className="back-link" style={{ display: 'none' }}><ChevronLeftIcon className="w-5 h-5" /> {t.backToList}</Link>

                <MeritPaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    user={user}
                    language={language}
                    onPaymentSuccess={onUserUpdate}
                    offeringTitle={t.offeringTitle.replace('{name}', centerName)}
                    showIncenseOption={true}
                    spaceId={typeof center?.id === 'number' ? center.id : undefined}
                />

                <div
                    className="detail-image-container"
                    style={!center.imageUrl && center.spaceColor ? { backgroundColor: center.spaceColor } : {}}
                >
                    {center.imageUrl && <img src={center.imageUrl} alt={centerName} />}
                    <div className="detail-rank-badge">#{center.rank}</div>
                </div>

                <div className="detail-info-card">
                    <div className="detail-main-info">
                        <div className="detail-header-top">
                            {center.status && <span className="status-badge">{language === 'en' && center.statusEn ? center.statusEn : center.status}</span>}
                        </div>
                        <h1 className="detail-title">{centerName}</h1>
                        <p className="detail-description-short">{language === 'en' && center.descriptionEn ? center.descriptionEn : center.description}</p>
                        <div className="detail-meta">
                            <span><UsersIcon className="w-5 h-5" />{center.membersCount?.toLocaleString()} {t.members}</span>
                            <span><StarIcon className="w-5 h-5 text-yellow-400" />{center.rating} / 5.0</span>
                            <span><MapPinIcon className="w-5 h-5" />{language === 'en' && center.locationTextEn ? center.locationTextEn : center.locationText}</span>
                            <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1 p-1 rounded-full hover:bg-accent-red-light disabled:opacity-50">
                                <HeartIcon className="w-5 h-5 text-accent-red" />
                                <span className="font-semibold">{likes.toLocaleString()}</span>
                            </button>
                        </div>
                        <div className="detail-tags">
                            {(language === 'en' && center.tagsEn ? center.tagsEn : center.tags)?.map((tag: string) => <span key={tag} className="tag">{tag}</span>)}
                        </div>
                    </div>
                    <div className="detail-contact-card">
                        <h3>{t.contact}</h3>
                        <ul>
                            <li><GlobeAltIcon className="w-5 h-5" /> <a href="https://plumvillage.org" target="_blank" rel="noopener noreferrer">{center.website}</a></li>
                            <li><PhoneIcon className="w-5 h-5" /> <span>{center.phoneNumber}</span></li>
                            <li><EnvelopeIcon className="w-5 h-5" /> <span>{center.email}</span></li>
                        </ul>
                        <button className="join-btn">{t.joinCommunity}</button>
                    </div>
                </div>

                <div className="detail-tabs-card">
                    <div className="detail-tabs">
                        <TabButton id="schedule" label={t.tabSchedule} icon={<CalendarIcon className="w-5 h-5" />} />
                        <TabButton id="dharma" label={t.tabDharma} icon={<RadioIcon className="w-5 h-5" />} />
                        <TabButton id="library" label={t.tabLibrary} icon={<BookOpenIcon className="w-5 h-5" />} />
                        <TabButton id="agents" label={t.tabAgents} icon={<AiIcon className="w-5 h-5" />} />
                        <TabButton id="offering" label={t.tabOffering} icon={<HeartIcon className="w-5 h-5" />} />
                    </div>
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};