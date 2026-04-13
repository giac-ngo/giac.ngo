// client/src/components/SocialFeed.tsx
import React, { useState } from 'react';

type SocialView = 'feed' | 'notifications';

// ── SVG Icons ────────────────────────────────────────────────────────────────

const HomeIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
);
const SearchIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
    </svg>
);
const UserIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
);
const BellIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
);
const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
);
const RetweetIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
);
const CommentIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);
const FollowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
);
const MoreIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
);

// ── Translations ─────────────────────────────────────────────────────────────

const translations = {
    vi: {
        title: "Mạng Xã Hội Tỉnh Thức",
        subtitle: "Chia sẻ và khám phá những lời dạy từ Phật pháp qua các Agent AI",
        home: "Trang chủ",
        notificationsLabel: "Thông báo",
        cta: "Khám phá toàn bộ mạng xã hội",
        posts: [
            {
                userName: "Minh Tâm", userHandle: "@minhtam", time: "284 ngày trước",
                avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
                content: "Lời dạy này đã giúp tôi tìm thấy sự bình yên trong những ngày khó khăn. Cảm ơn Phật pháp!",
                aiName: "Giác Ngộ",
                aiQuestion: '"Làm thế nào để tìm thấy bình an trong tâm?"',
                aiAnswer: "Bình an không phải là điều ta tìm kiếm bên ngoài, mà là trạng thái ta nuôi dưỡng từ bên trong. Khi tâm không còn bám víu vào quá khứ, không lo âu về tương lai, chỉ an trú trong giây phút hiện tại - đó chính là bình an chân thật. Hãy bắt đầu bằng việc quan sát hơi thở, để tâm trở về với thân, và từ từ, bình an sẽ tự nhiên hiện ra.",
                likes: 15, retweets: 3, comments: 7, liked: false,
            },
            {
                userName: "Thanh Hương", userHandle: "@thanhhuong", time: "284 ngày trước",
                avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
                content: "Đúng vậy, sống trong hiện tại là chìa khóa để giải thoát khỏi lo âu.",
                aiName: "Tâm An",
                aiQuestion: '"Tôi cảm thấy lo lắng về tương lai. Phật dạy gì về điều này?"',
                aiAnswer: "Lo lắng về tương lai là khổ đau mà tâm tự tạo ra. Đức Phật dạy rằng tương lai chưa đến, quá khứ đã qua, chỉ có hiện tại là thật. Hãy sống trọn vẹn trong từng khoảnh khắc, làm tốt những gì có thể làm hôm nay, và tin tưởng vào nhân quả. Khi ta gieo nhân lành, quả tốt sẽ đến một cách tự nhiên.",
                likes: 8, retweets: 1, comments: 4, liked: true,
            },
        ],
        notificationsTitle: "Thông báo",
        markAllRead: "Đánh dấu đã đọc",
        notifications: [
            { userName: "Thanh Hương", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", action: "đã thích bài viết của bạn", time: "284 ngày trước", type: "like" },
            { userName: "Tuệ Minh", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", action: "đã bình luận về bài viết của bạn", time: "284 ngày trước", type: "comment" },
            { userName: "An Nhiên", avatarUrl: "", action: "đã bắt đầu theo dõi bạn", time: "284 ngày trước", type: "follow" },
            { userName: "Minh Đức", avatarUrl: "", action: "đã chia sẻ lại bài viết của bạn", time: "284 ngày trước", type: "retweet", unread: false },
        ],
    },
    en: {
        title: "Awakening Social Network",
        subtitle: "Share and discover teachings from the Dharma through AI Agents",
        home: "Home",
        notificationsLabel: "Notifications",
        cta: "Explore the full social network",
        posts: [
            {
                userName: "Clarity Mind", userHandle: "@claritymind", time: "284 days ago",
                avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
                content: "This teaching helped me find peace in difficult days. Thank you, Dharma!",
                aiName: "Enlightenment",
                aiQuestion: '"How to find peace in the mind?"',
                aiAnswer: "Peace is not something we seek outside, but a state we cultivate from within. When the mind no longer clings to the past, nor worries about the future, but simply abides in the present moment - that is true peace.",
                likes: 15, retweets: 3, comments: 7, liked: false,
            },
            {
                userName: "Thanh Huong", userHandle: "@thanhhuong", time: "284 days ago",
                avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
                content: "Exactly, living in the present is the key to freedom from anxiety.",
                aiName: "Inner Peace",
                aiQuestion: '"I feel anxious about the future. What does the Buddha teach about this?"',
                aiAnswer: "Anxiety about the future is suffering the mind creates itself. The Buddha taught that the future has not yet come, the past has gone, only the present moment is real. Live fully in each moment, do well what you can today, and trust in karma.",
                likes: 8, retweets: 1, comments: 4, liked: true,
            },
        ],
        notificationsTitle: "Notifications",
        markAllRead: "Mark all as read",
        notifications: [
            { userName: "Thanh Huong", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", action: "liked your post", time: "284 days ago", type: "like" },
            { userName: "Tue Minh", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", action: "commented on your post", time: "284 days ago", type: "comment" },
            { userName: "An Nhien", avatarUrl: "", action: "started following you", time: "284 days ago", type: "follow" },
            { userName: "Minh Duc", avatarUrl: "", action: "reposted your post", time: "284 days ago", type: "retweet", unread: false },
        ],
    },
};

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 44 }: { name: string; url?: string; size?: number }) {
    if (url) return (
        <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #e8d5b0' }} />
    );
    const initials = name?.charAt(0)?.toUpperCase() || '?';
    const bgColors = ['#7c3d3d', '#5d4037', '#4e342e', '#6d4c41', '#795548'];
    const bg = bgColors[name.charCodeAt(0) % bgColors.length];
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
            {initials}
        </div>
    );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: typeof translations.vi.posts[0] }) {
    const [liked, setLiked] = useState(post.liked);
    const [likes, setLikes] = useState(post.likes);

    return (
        <div style={{
            background: '#fff',
            borderRadius: 18,
            marginBottom: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 12px', gap: 12 }}>
                <Avatar name={post.userName} url={post.avatarUrl} size={44} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 6px' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', fontFamily: 'inherit' }}>{post.userName}</span>
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>{post.userHandle}</span>
                        <span style={{ color: '#d1d5db', fontSize: 13 }}>·</span>
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>{post.time}</span>
                    </div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px 4px', borderRadius: 6 }}>
                    <MoreIcon />
                </button>
            </div>

            {/* User content */}
            <div style={{ padding: '0 20px 14px', fontSize: 15, color: '#374151', lineHeight: 1.7, fontFamily: 'Lora, Georgia, serif' }}>
                {post.content}
            </div>

            {/* AI Quote block */}
            <div style={{ margin: '0 16px 16px', background: '#fdf6e3', border: '1px solid #e8d5b0', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#7c1d1d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5
                    }}>AI</div>
                    <span style={{ fontWeight: 700, color: '#991b1b', fontSize: 14, fontFamily: 'Lora, Georgia, serif' }}>{post.aiName}</span>
                </div>
                <p style={{ fontStyle: 'italic', fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>{post.aiQuestion}</p>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, fontFamily: 'Lora, Georgia, serif' }}>{post.aiAnswer}</p>
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 14px', gap: 24 }}>
                <button
                    onClick={() => { setLiked(v => !v); setLikes(n => liked ? n - 1 : n + 1); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: liked ? '#e11d48' : '#6b7280', fontSize: 14, fontWeight: liked ? 600 : 400, padding: '4px 0', transition: 'color 0.15s' }}
                >
                    <HeartIcon filled={liked} /> {likes}
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: '4px 0' }}>
                    <RetweetIcon /> {post.retweets}
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: '4px 0' }}>
                    <CommentIcon /> {post.comments}
                </button>
            </div>
        </div>
    );
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({ item }: { item: { userName: string; avatarUrl: string; action: string; time: string; type: string; unread?: boolean } }) {
    const isUnread = item.unread !== false;
    const icon = item.type === 'like'
        ? <HeartIcon filled={true} />
        : item.type === 'comment'
            ? <CommentIcon />
            : item.type === 'follow'
                ? <FollowIcon />
                : <RetweetIcon />;
    const iconColor = item.type === 'like' ? '#e11d48' : item.type === 'comment' ? '#d97706' : item.type === 'follow' ? '#374151' : '#d97706';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <Avatar name={item.userName} url={item.avatarUrl} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: '#1a1a1a', margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ fontWeight: 700 }}>{item.userName}</strong>
                    {' '}<span style={{ color: '#4b5563' }}>{item.action}</span>
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0', fontFamily: 'inherit' }}>{item.time}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ color: iconColor }}>{icon}</span>
                {isUnread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48', flexShrink: 0 }} />}
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const SocialFeed: React.FC<{ language: 'vi' | 'en' }> = ({ language }) => {
    const [activeView, setActiveView] = useState<SocialView>('feed');
    const t = translations[language];

    // Nav button style
    const navBtnStyle = (isActive: boolean): React.CSSProperties => ({
        width: 52, height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? '#a16207' : 'rgba(255,255,255,0.7)',
        color: isActive ? '#fff' : '#6b7280',
        boxShadow: isActive ? '0 2px 8px rgba(161,98,7,0.35)' : '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s', position: 'relative',
    });

    return (
        <div className="social-section" style={{ fontFamily: 'inherit' }}>
            <div className="section-title">
                <h2>{t.title}</h2>
                <p>{t.subtitle}</p>
            </div>

            {/* Nav bar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                <button style={navBtnStyle(activeView === 'feed')} onClick={() => setActiveView('feed')} title={t.home}>
                    <HomeIcon />
                </button>
                <button style={navBtnStyle(false)} title="Tìm kiếm">
                    <SearchIcon />
                </button>
                <button style={navBtnStyle(false)} title="Trang cá nhân">
                    <UserIcon />
                </button>
                <button style={{ ...navBtnStyle(activeView === 'notifications'), position: 'relative' }} onClick={() => setActiveView('notifications')} title={t.notificationsTitle}>
                    <BellIcon />
                    <span style={{
                        position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%',
                        background: '#e11d48', color: '#fff', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>3</span>
                </button>
            </div>

            {/* Feed view */}
            {activeView === 'feed' && (
                <div>
                    {t.posts.map((post, i) => <PostCard key={i} post={post} />)}
                </div>
            )}

            {/* Notification view */}
            {activeView === 'notifications' && (
                <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{t.notificationsTitle}</h3>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#991b1b', fontWeight: 600, fontFamily: 'inherit' }}>{t.markAllRead}</button>
                    </div>
                    {t.notifications.map((n, i) => <NotificationItem key={i} item={n} />)}
                </div>
            )}

            <div className="cta-container">
                <button className="cta-btn">{t.cta}</button>
            </div>
        </div>
    );
};

export default SocialFeed;
