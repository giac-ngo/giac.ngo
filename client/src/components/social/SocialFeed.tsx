import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { apiService } from '../../services/apiService';
import { SocialPost, SocialComment, User } from '../../types';
import { useToast } from '../ToastProvider';
import { MediaLibraryPicker } from '../MediaLibraryPicker';

// Inject CSS keyframes for double-tap heart animation (#2)
if (typeof document !== 'undefined' && !document.getElementById('sf-animations')) {
    const style = document.createElement('style');
    style.id = 'sf-animations';
    style.textContent = `
        @keyframes sfHeartPop {
            0% { transform: scale(0); opacity: 0; }
            15% { transform: scale(1.3); opacity: 1; }
            30% { transform: scale(0.95); opacity: 1; }
            45% { transform: scale(1.1); opacity: 1; }
            70% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
        }
        @keyframes sfPullSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Convert single newlines → double newlines so ReactMarkdown creates <p> breaks
function toMdParagraphs(text: string): string {
    if (!text) return text;
    // Replace single \n (not already \n\n) with \n\n to force paragraph spacing
    return text.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
}


const translations = {
    vi: {
        justNow: 'Vừa xong', minutesAgo: ' phút trước', hoursAgo: ' giờ trước', daysAgo: ' ngày trước', monthsAgo: ' tháng trước', yearsAgo: ' năm trước',
        reply: 'Phản hồi', delete: 'Xóa', readMore: 'Xem thêm ▼', showLess: 'Thu gọn ▲', readMoreContent: 'Xem thêm', deletePost: '🗑 Xóa bài viết',
        writeComment: 'Viết bình luận...', loading: 'Đang tải...', replyingTo: 'Đang phản hồi', loginToLike: 'Vui lòng đăng nhập để like.',
        deleteCommentFailed: 'Xóa bình luận thất bại.', deletePostFailed: 'Xóa bài viết thất bại.', sendCommentFailed: 'Gửi bình luận thất bại.',
        thinking: 'ơi, bạn đang nghĩ gì vậy?', thinkingAnonymous: 'Bạn đang nghĩ gì vậy?', photoVideo: '📸 Ảnh/Video', feeling: '😊 Cảm xúc',
        post: 'Đăng', posting: 'Đang đăng...', postToCommunity: 'Đăng lên cộng đồng', searchPosts: 'Tìm kiếm bài viết...', loginToJoin: 'Đăng nhập để tham gia cộng đồng',
        loginReq: 'Bạn cần đăng nhập để xem, đăng bài và bình luận.', noPostsYet: 'Chưa có bài đăng nào', noUserPostsYet: 'Bạn chưa có bài đăng nào',
        beFirst: 'Hãy là người đầu tiên chia sẻ điều gì đó!', shareSomething: 'Hãy chia sẻ điều gì đó lên cộng đồng!', loginToRepost: 'Vui lòng đăng nhập để repost.',
        alreadyReposted: 'Bạn đã repost bài này rồi.', repostSuccess: 'Đã repost lên tường của bạn! 🎉', repostFailed: 'Repost thất bại.',
        repostTitle: 'Chia sẻ bài viết', repostPlaceholder: 'Nhập nội dung chia sẻ...', cancel: 'Hủy', share: 'Chia sẻ', sharing: 'Đang chia sẻ...', update: 'Cập nhật',
        from: 'Từ', mediaLibrary: 'Thư Viện Media', selectImages: 'Chọn tối đa 4 ảnh', mediaLibOrDevice: 'Chọn từ Thư Viện Media hoặc tải lên từ thiết bị',
        likeAction: 'Thích', commentAction: 'Bình luận', shareAction: 'Chia sẻ',
        whoLiked: 'Người đã thích', noLikesYet: 'Chưa có ai thích bài này',
        editPost: '✏️ Chỉnh sửa bài viết', editDesc: '✏️ Chỉnh sửa mô tả', save: 'Lưu', editSaved: 'Đã cập nhật!', editFailed: 'Cập nhật thất bại.',
        copyLink: '📋 Sao chép liên kết', linkCopied: 'Đã sao chép liên kết!', deleteCommentConfirm: 'Bạn có chắc muốn xóa bình luận này?',
        pinPost: '📌 Ghim bài viết', unpinPost: '📌 Bỏ ghim', pinned: 'Đã ghim', bookmarkPost: '🔖 Lưu bài viết', unbookmarkPost: '🔖 Bỏ lưu', bookmarked: 'Đã lưu!', unbookmarked: 'Đã bỏ lưu.',
    },
    en: {
        justNow: 'Just now', minutesAgo: 'm ago', hoursAgo: 'h ago', daysAgo: 'd ago', monthsAgo: 'mo ago', yearsAgo: 'y ago',
        reply: 'Reply', delete: 'Delete', readMore: 'Read more ▼', showLess: 'Show less ▲', readMoreContent: 'Read more', deletePost: '🗑 Delete post',
        writeComment: 'Write a comment...', loading: 'Loading...', replyingTo: 'Replying to', loginToLike: 'Please login to like.',
        deleteCommentFailed: 'Failed to delete comment.', deletePostFailed: 'Failed to delete post.', sendCommentFailed: 'Failed to send comment.',
        thinking: 'what are you thinking?', thinkingAnonymous: 'What are you thinking?', photoVideo: '📸 Photo/Video', feeling: '😊 Feeling',
        post: 'Post', posting: 'Posting...', postToCommunity: 'Share with community', searchPosts: 'Search posts...', loginToJoin: 'Log in to join the community',
        loginReq: 'You need to be logged in to view, post, and comment.', noPostsYet: 'No posts yet', noUserPostsYet: 'You have no posts yet',
        beFirst: 'Be the first to share something!', shareSomething: 'Share something with the community!', loginToRepost: 'Please login to repost.',
        alreadyReposted: 'You already reposted this.', repostSuccess: 'Reposted successfully! 🎉', repostFailed: 'Failed to repost.',
        repostTitle: 'Repost', repostPlaceholder: 'Add your thoughts...', cancel: 'Cancel', share: 'Repost', sharing: 'Posting...', update: 'Update',
        from: 'From', mediaLibrary: 'Media Library', selectImages: 'Select up to 4 images', mediaLibOrDevice: 'Select from Media Library or upload from device',
        likeAction: 'Like', commentAction: 'Comment', shareAction: 'Share',
        whoLiked: 'People who liked', noLikesYet: 'No one liked this yet',
        editPost: '✏️ Edit post', editDesc: '✏️ Edit description', save: 'Save', editSaved: 'Updated!', editFailed: 'Update failed.',
        copyLink: '📋 Copy link', linkCopied: 'Link copied!', deleteCommentConfirm: 'Are you sure you want to delete this comment?',
        pinPost: '📌 Pin post', unpinPost: '📌 Unpin', pinned: 'Pinned', bookmarkPost: '🔖 Save post', unbookmarkPost: '🔖 Unsave', bookmarked: 'Saved!', unbookmarked: 'Unsaved.',
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, lang: 'vi' | 'en' = 'vi'): string {
    const t = translations[lang];
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return t.justNow;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} ${t.minutesAgo}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ${t.hoursAgo}`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} ${t.daysAgo}`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo} ${t.monthsAgo}`;
    return `${Math.floor(mo / 12)} ${t.yearsAgo}`;
}

function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
    const [imgError, setImgError] = React.useState(false);
    const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
    const palette = [
        { bg: 'hsl(0,  55%, 38%)', fg: 'hsl(44, 55%, 92%)' },
        { bg: 'hsl(28, 50%, 32%)', fg: 'hsl(44, 55%, 90%)' },
        { bg: 'hsl(35, 65%, 35%)', fg: 'hsl(44, 60%, 92%)' },
        { bg: 'hsl(170, 35%, 28%)', fg: 'hsl(170, 40%, 85%)' },
        { bg: 'hsl(220, 35%, 38%)', fg: 'hsl(220, 60%, 90%)' },
        { bg: 'hsl(290, 30%, 38%)', fg: 'hsl(290, 40%, 90%)' },
        { bg: 'hsl(130, 30%, 30%)', fg: 'hsl(130, 40%, 88%)' },
        { bg: 'hsl(195, 40%, 30%)', fg: 'hsl(195, 50%, 88%)' },
    ];
    const { bg, fg } = palette[Math.abs((name ?? '').charCodeAt(0)) % palette.length];
    const validUrl = url && url.trim() !== '' && url !== 'null' && url !== 'undefined' && !imgError;
    return validUrl ? (
        <img
            src={url!} alt={name}
            style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            onError={() => setImgError(true)}
        />
    ) : (
        <div style={{
            width: size, height: size, borderRadius: '50%', background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: fg, fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
            userSelect: 'none', letterSpacing: '-0.5px',
        }}>{initial}</div>
    );
}

// ─── @Mention Helpers ─────────────────────────────────────────────────────────

interface MentionUser { id: number; name: string; avatarUrl?: string | null; }

/**
 * Hook: detects @query in a text input/textarea, fetches space members,
 * and provides a filtered suggestion list + insertion callback.
 */
function useMentionAutocomplete(spaceId: number, text: string, cursorPos: number) {
    const [members, setMembers] = React.useState<MentionUser[]>([]);
    const [loaded, setLoaded] = React.useState(false);
    const [query, setQuery] = React.useState<string | null>(null);
    const [mentionStart, setMentionStart] = React.useState<number>(-1);

    // Load members once
    React.useEffect(() => {
        if (loaded) return;
        apiService.getSpaceMembers(spaceId)
            .then((m: any[]) => { setMembers(m.map(u => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }))); setLoaded(true); })
            .catch(() => setLoaded(true));
    }, [spaceId, loaded]);

    // Detect @query at cursor position
    React.useEffect(() => {
        if (cursorPos <= 0) { setQuery(null); return; }
        const before = text.slice(0, cursorPos);
        // Find last @ that is either at start or after whitespace/newline
        const match = before.match(/(^|[\s\n])@([^\s@]*)$/);
        if (match) {
            setQuery(match[2].toLowerCase());
            setMentionStart(before.length - match[2].length - 1); // position of @
        } else {
            setQuery(null);
            setMentionStart(-1);
        }
    }, [text, cursorPos]);

    const suggestions = React.useMemo(() => {
        if (query === null || !loaded) return [];
        return members.filter(m => m.name.toLowerCase().includes(query)).slice(0, 8);
    }, [query, members, loaded]);

    return { suggestions, query, mentionStart, isOpen: query !== null && suggestions.length > 0 };
}

/**
 * Hook: detects #query in a text input, suggests existing hashtags from posts.
 */
function useHashtagAutocomplete(text: string, cursorPos: number, allHashtags: string[]) {
    const [query, setQuery] = React.useState<string | null>(null);
    const [hashtagStart, setHashtagStart] = React.useState<number>(-1);

    React.useEffect(() => {
        if (cursorPos <= 0) { setQuery(null); return; }
        const before = text.slice(0, cursorPos);
        const match = before.match(/(^|[\s\n])#([\wÀ-ỹ]*)$/);
        if (match) {
            setQuery(match[2].toLowerCase());
            setHashtagStart(before.length - match[2].length - 1); // position of #
        } else {
            setQuery(null);
            setHashtagStart(-1);
        }
    }, [text, cursorPos]);

    const suggestions = React.useMemo(() => {
        if (query === null) return [];
        return allHashtags
            .filter(t => t.toLowerCase().startsWith(query) && t.toLowerCase() !== query)
            .slice(0, 8);
    }, [query, allHashtags]);

    return { suggestions, query, hashtagStart, isOpen: query !== null && suggestions.length > 0 };
}

/**
 * Renders text with clickable @mentions.
 * Pattern: @Name (terminated by certain boundaries)
 * membersList is used to verify the mention matches a real user.
 */
function renderMentionText(
    text: string,
    members: MentionUser[],
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void,
    style?: React.CSSProperties,
    onHashtagClick?: (tag: string) => void
): React.ReactNode {
    if (!text) return <span style={style}>{text}</span>;

    // Build a regex that matches @Username for all known members AND #hashtag
    const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
    const escaped = sorted.map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    
    // Combined regex: @mention OR #hashtag
    const mentionPart = escaped.length > 0 ? '@(' + escaped.join('|') + ')(?=[\\s.,!?;:)\\]\\n]|$)' : null;
    const hashtagPart = '#([\\wÀ-ỹ]+)';
    const pattern = mentionPart ? `${mentionPart}|${hashtagPart}` : hashtagPart;
    const regex = new RegExp(pattern, 'g');

    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
            parts.push(text.slice(lastIdx, match.index));
        }
        
        if (match[1]) {
            // @mention match
            const mentionName = match[1];
            const member = sorted.find(m => m.name === mentionName);
            parts.push(
                <span
                    key={`m-${match.index}`}
                    onClick={(e) => { e.stopPropagation(); member && onUserClick?.(member.id, member.name, member.avatarUrl); }}
                    style={{
                        color: '#8b4513', fontWeight: 600, cursor: onUserClick ? 'pointer' : 'default',
                        borderBottom: '1px dotted rgba(139,69,19,0.3)',
                    }}
                >
                    @{mentionName}
                </span>
            );
        } else if (match[2]) {
            // #hashtag match
            const tag = match[2];
            parts.push(
                <span
                    key={`h-${match.index}`}
                    onClick={(e) => { e.stopPropagation(); onHashtagClick?.(tag); }}
                    style={{
                        color: '#2563eb', fontWeight: 600, cursor: onHashtagClick ? 'pointer' : 'default',
                    }}
                >
                    #{tag}
                </span>
            );
        }
        lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
        parts.push(text.slice(lastIdx));
    }

    return parts.length === 0 ? <span style={style}>{text}</span> : <span style={style}>{parts}</span>;
}

/**
 * Portal-based dropdown — renders at document.body to avoid overflow/clip issues.
 * anchorRef: the textarea/input to anchor below.
 */
function PortalDropdown({ anchorRef, children, visible }: {
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    visible: boolean;
}) {
    const [rect, setRect] = React.useState<DOMRect | null>(null);

    React.useEffect(() => {
        if (!visible || !anchorRef.current) { setRect(null); return; }
        const update = () => {
            if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [visible, anchorRef]);

    if (!visible || !rect) return null;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

    const style: React.CSSProperties = {
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        background: 'var(--sf-card, #fdfbf7)',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        border: '1px solid var(--sf-border, #ebdcc5)',
        maxHeight: 240,
        overflowY: 'auto',
        ...(showAbove
            ? { bottom: window.innerHeight - rect.top + 4 }
            : { top: rect.bottom + 4 }),
    };

    return ReactDOM.createPortal(
        <div style={style}>{children}</div>,
        document.body
    );
}

/**
 * Dropdown for @mention suggestions — uses PortalDropdown to avoid overflow clipping.
 */
function MentionDropdown({ suggestions, onSelect, anchorRef }: {
    suggestions: MentionUser[];
    onSelect: (user: MentionUser) => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    containerStyle?: React.CSSProperties; // kept for compat, unused
}) {
    return (
        <PortalDropdown anchorRef={anchorRef} visible={suggestions.length > 0}>
            {suggestions.map(user => (
                <div
                    key={user.id}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(user); }}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px', cursor: 'pointer',
                        transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(185,148,90,0.08))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <Avatar name={user.name} url={user.avatarUrl} size={28} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sf-text, #1a1a1a)' }}>{user.name}</span>
                </div>
            ))}
        </PortalDropdown>
    );
}

/**
 * Dropdown for #hashtag suggestions — uses PortalDropdown.
 */
function HashtagDropdown({ suggestions, onSelect, anchorRef }: {
    suggestions: string[];
    onSelect: (tag: string) => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}) {
    return (
        <PortalDropdown anchorRef={anchorRef} visible={suggestions.length > 0}>
            {suggestions.map(tag => (
                <div
                    key={tag}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(tag); }}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', cursor: 'pointer',
                        transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(185,148,90,0.08))')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>#{tag}</span>
                </div>
            ))}
        </PortalDropdown>
    );
}

function PhotoGrid({ urls, onImageClick }: { urls: string[]; onImageClick?: (idx: number) => void }) {
    const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
    // #4 Swipe support
    const touchStartX = React.useRef(0);
    const touchStartY = React.useRef(0);
    if (!urls.length) return null;
    const count = urls.length;

    const openLightbox = (i: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onImageClick) {
            onImageClick(i);
        } else {
            setLightboxIdx(i);
        }
    };
    const closeLightbox = () => setLightboxIdx(null);
    const prev = (e?: React.MouseEvent) => { e?.stopPropagation(); setLightboxIdx(i => i != null && i > 0 ? i - 1 : i); };
    const next = (e?: React.MouseEvent) => { e?.stopPropagation(); setLightboxIdx(i => i != null && i < urls.length - 1 ? i + 1 : i); };

    // #4 Touch swipe handlers for lightbox
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx > 0) prev(); else next();
        }
    };

    return (
        <>
            <div style={{
                display: 'grid', gap: 2, borderRadius: 12, overflow: 'hidden',
                gridTemplateColumns: count === 1 ? '1fr' : count === 2 ? '1fr 1fr' : count === 3 ? '2fr 1fr' : '1fr 1fr',
                gridTemplateRows: count === 3 ? '1fr 1fr' : 'auto',
            }}>
                {urls.slice(0, 4).map((url, i) => (
                    <div key={i} style={{
                        position: 'relative',
                        gridRow: count === 3 && i === 0 ? 'span 2' : undefined,
                        aspectRatio: count === 1 ? '16/9' : '1',
                    }}>
                        <img
                            src={url} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                            onClick={(e) => openLightbox(i, e)}
                        />
                        {i === 3 && count > 4 && (
                            <div style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 28, fontWeight: 700
                            }}>+{count - 4}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Lightbox modal */}
            {lightboxIdx !== null && (
                <div
                    onClick={closeLightbox}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        touchAction: 'pan-y',
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        style={{
                            position: 'absolute', top: 16, right: 16,
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            borderRadius: '50%', width: 40, height: 40,
                            color: '#fff', fontSize: 22, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                        }}
                    >×</button>

                    {/* Prev */}
                    {lightboxIdx > 0 && (
                        <button onClick={prev} style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: 44, height: 44, color: '#fff', fontSize: 22, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>‹</button>
                    )}

                    {/* Image */}
                    <img
                        src={urls[lightboxIdx]}
                        alt=""
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '95vw', maxHeight: '90vh',
                            objectFit: 'contain', borderRadius: 8,
                            userSelect: 'none',
                        }}
                    />

                    {/* Next */}
                    {lightboxIdx < urls.length - 1 && (
                        <button onClick={next} style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: 44, height: 44, color: '#fff', fontSize: 22, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>›</button>
                    )}

                    {/* Counter */}
                    {urls.length > 1 && (
                        <div style={{
                            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                            color: '#fff', fontSize: 13, background: 'rgba(0,0,0,0.5)',
                            padding: '4px 12px', borderRadius: 20,
                        }}>{lightboxIdx + 1} / {urls.length}</div>
                    )}
                </div>
            )}
        </>
    );
}

// ─── Comment Item ──────────────────────────────────────────────────────────────

function CommentItem({
    language = 'vi',
    comment, currentUser, postUserId, spaceId, postId,
    onDelete, onReply, onUserClick, parentComment, onLikeUpdate, spaceMembers
}: {
    comment: SocialComment;
    currentUser: User | null;
    postUserId: number;
    spaceId: number;
    postId: number;
    onDelete: (id: number) => void;
    onReply: (parentId: number, userName: string) => void;
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void;
    parentComment?: SocialComment | null;
    language?: 'vi' | 'en';
    onLikeUpdate?: (commentId: number, liked: boolean, likesCount: number) => void;
    spaceMembers: MentionUser[];
}) {
    const canDelete = currentUser && (
        currentUser.id === comment.userId ||
        currentUser.id === postUserId ||
        (currentUser.roleIds && currentUser.roleIds.length > 0)
    );
    const [liking, setLiking] = React.useState(false);
    const liked = comment.isLikedByMe || false;
    const likesCount = comment.likesCount || 0;
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const handleLike = async () => {
        if (!currentUser || liking) return;
        setLiking(true);
        try {
            const res = await apiService.toggleCommentLike(spaceId, postId, comment.id);
            onLikeUpdate?.(comment.id, res.liked, res.likesCount);
        } catch { /* silent */ }
        finally { setLiking(false); }
    };

    return (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Avatar name={comment.userName} url={comment.userAvatarUrl} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    background: 'var(--sf-input-bg)', borderRadius: 18,
                    padding: '10px 14px', display: 'inline-block', maxWidth: '100%'
                }}>
                    <div
                        style={{ fontWeight: 700, fontSize: 13, color: 'var(--sf-text)', marginBottom: 4, cursor: onUserClick ? 'pointer' : 'default', lineHeight: 1.2 }}
                        onClick={() => onUserClick && comment.userId != null && onUserClick(comment.userId, comment.userName, comment.userAvatarUrl)}
                    >
                        {comment.userName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--sf-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                        {(() => {
                            if (parentComment && comment.content.startsWith(`@${parentComment.userName} `)) {
                                const prefix = `@${parentComment.userName} `;
                                const rest = comment.content.slice(prefix.length);
                                return (
                                    <>
                                        <span
                                            onClick={(e) => { e.stopPropagation(); onUserClick && parentComment.userId != null && onUserClick(parentComment.userId, parentComment.userName, parentComment.userAvatarUrl); }}
                                            style={{ color: '#8b4513', fontWeight: 600, cursor: onUserClick ? 'pointer' : 'default' }}
                                        >
                                            {prefix.trim()}
                                        </span>
                                        {' '}{renderMentionText(rest, spaceMembers, onUserClick)}
                                    </>
                                );
                            }
                            return renderMentionText(comment.content, spaceMembers, onUserClick);
                        })()}
                    </div>
                    {/* #8 Comment image */}
                    {comment.imageUrl && (
                        <img src={comment.imageUrl} alt="" style={{
                            maxWidth: 200, maxHeight: 200, borderRadius: 10,
                            marginTop: 6, display: 'block', cursor: 'pointer',
                        }} onClick={() => window.open(comment.imageUrl!, '_blank')} />
                    )}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, paddingLeft: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--sf-muted)' }}>{timeAgo(comment.createdAt, language)}</span>
                    {currentUser && (
                        <button
                            onClick={handleLike}
                            style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: liked ? '#e74c3c' : 'var(--sf-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                            <span style={{ fontSize: 22, display: 'inline-block', transform: 'translateY(1px)' }}>{liked ? '❤️' : '♡'}</span>{likesCount > 0 && <span style={{ fontWeight: 600 }}>{likesCount}</span>}
                        </button>
                    )}
                    <button
                        onClick={() => onReply(comment.id, comment.userName)}
                        style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: 'var(--sf-muted)', cursor: 'pointer', padding: 0 }}
                    >{translations[language].reply}</button>
                    {canDelete && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                        >{translations[language].delete}</button>
                    )}
                </div>
                {/* Delete comment confirmation modal (#3) */}
                {showDeleteConfirm && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                    }} onClick={() => setShowDeleteConfirm(false)}>
                        <div style={{
                            background: 'var(--sf-card, #fdfbf7)', borderRadius: 14, padding: '20px 24px',
                            maxWidth: 360, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--sf-text)', marginBottom: 12 }}>
                                {translations[language].deleteCommentConfirm}
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowDeleteConfirm(false)}
                                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--sf-border, #e5d5c0)', color: 'var(--sf-text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                                >{translations[language].cancel}</button>
                                <button onClick={() => { onDelete(comment.id); setShowDeleteConfirm(false); }}
                                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                                >{translations[language].delete}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Comment Thread ────────────────────────────────────────────────────────────

function CommentThread({
    comment, allComments, currentUser, spaceId, postId, postUserId,
    onDelete, onReply, onUserClick, onLikeUpdate, language = 'vi', spaceMembers
}: {
    comment: SocialComment;
    allComments: SocialComment[];
    currentUser: User | null;
    spaceId: number;
    postId: number;
    postUserId: number;
    onDelete: (id: number) => void;
    onReply: (parentId: number, userName: string) => void;
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void;
    onLikeUpdate?: (commentId: number, liked: boolean, likesCount: number) => void;
    language?: 'vi' | 'en';
    spaceMembers: MentionUser[];
}) {
    const replies = allComments.filter(c => c.parentCommentId === comment.id);
    const parentComment = allComments.find(c => c.id === comment.parentCommentId);
    const [expanded, setExpanded] = React.useState(false);
    const COLLAPSE_THRESHOLD = 2;
    const visibleReplies = expanded ? replies : replies.slice(0, COLLAPSE_THRESHOLD);
    const hiddenCount = replies.length - COLLAPSE_THRESHOLD;

    return (
        <div key={comment.id}>
            <CommentItem
                comment={comment} currentUser={currentUser}
                postUserId={postUserId} spaceId={spaceId} postId={postId}
                onDelete={onDelete} onReply={onReply}
                onUserClick={onUserClick} parentComment={parentComment}
                onLikeUpdate={onLikeUpdate}
                language={language}
                spaceMembers={spaceMembers}
            />
            {replies.length > 0 && (
                <div className="sf-comment-replies">
                    {visibleReplies.map(reply => (
                        <CommentThread
                            key={reply.id} comment={reply} allComments={allComments}
                            currentUser={currentUser} spaceId={spaceId} postId={postId}
                            postUserId={postUserId} onDelete={onDelete} onReply={onReply}
                            onUserClick={onUserClick} onLikeUpdate={onLikeUpdate}
                            language={language}
                            spaceMembers={spaceMembers}
                        />
                    ))}
                    {!expanded && hiddenCount > 0 && (
                        <button
                            onClick={() => setExpanded(true)}
                            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: '#8b4513', cursor: 'pointer', padding: '4px 0 8px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b4513" strokeWidth="2" strokeLinecap="round"><path d="M7 13l5 5 5-5"/><path d="M7 6l5 5 5-5"/></svg>
                            {language === 'vi' ? `Xem thêm ${hiddenCount} phản hồi` : `View ${hiddenCount} more replies`}
                        </button>
                    )}
                    {expanded && hiddenCount > 0 && (
                        <button
                            onClick={() => setExpanded(false)}
                            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--sf-muted)', cursor: 'pointer', padding: '4px 0 8px 10px' }}
                        >
                            {language === 'vi' ? 'Thu gọn' : 'Collapse'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Quoted Post Body ────────────────────────────────────────────────────────────
// Renders a quoted/reposted post's content exactly like the original, handles
// both regular posts and ai_share posts (with AI metadata block).

function QuotedPostBody({ post, maxLines, onImageClick }: { post: any; maxLines?: number; onImageClick?: (idx: number) => void }) {
    const meta = post.metadata;
    const isAiShare = meta?.type === 'ai_share';

    return (
        <>
            {isAiShare ? (
                <>
                    {/* User comment above AI block */}
                    {post.content?.trim() && post.content.trim() !== ' ' && (
                        <div style={{ fontSize: 12, color: 'var(--sf-text)', marginBottom: 6, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                            {post.content}
                        </div>
                    )}
                    {/* AI block — same visual as main feed */}
                    <div style={{
                        background: 'rgba(185, 148, 90, 0.12)',
                        border: '1px solid rgba(185, 148, 90, 0.35)',
                        borderRadius: 8,
                        padding: '8px 10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{
                                background: '#991b1b', color: '#fff', fontSize: 9, fontWeight: 700,
                                padding: '1px 5px', borderRadius: 4, letterSpacing: '0.05em'
                            }}>AI</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-text)' }}>{meta.aiName}</span>
                        </div>
                        {meta.userQuestion && (
                            <div style={{ fontSize: 11, color: 'var(--sf-muted)', fontStyle: 'italic', marginBottom: 5, lineHeight: 1.4 }}>
                                "{meta.userQuestion}"
                            </div>
                        )}
                        <div style={{
                            fontSize: 12, color: 'var(--sf-text)', lineHeight: 1.6,
                            ...(maxLines ? {
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical' as any,
                            } : {})
                        }} className="sf-ai-markdown sf-ai-markdown--compact">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{toMdParagraphs(meta.aiResponse)}</ReactMarkdown>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {post.content?.trim() && (
                        <div style={{
                            fontSize: 12, color: 'var(--sf-text)', lineHeight: 1.55,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            ...(maxLines ? {
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical' as any,
                            } : {})
                        }}>
                            {post.content}
                        </div>
                    )}
                    {(post.imageUrls?.length ?? 0) > 0 && (
                        <div style={{ marginTop: post.content?.trim() ? 6 : 0 }}>
                            <PhotoGrid
                                urls={post.imageUrls}
                                onImageClick={onImageClick}
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );
}

function PostCard({ post, currentUser, spaceId, onDelete, onRepost, onUserClick, language, spaceMembers, onHashtagClick }: {
    post: SocialPost;
    currentUser: User | null;
    spaceId: number;
    onDelete: (id: number) => void;
    onRepost?: (post: SocialPost) => void;
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void;
    language?: 'vi' | 'en';
    spaceMembers: MentionUser[];
    onHashtagClick?: (tag: string) => void;
}) {
    const { showToast } = useToast();
    const [liked, setLiked] = useState(post.isLikedByMe || false);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [reposted, setReposted] = useState(false);
    const [repostsCount, setRepostsCount] = useState(post.retweetsCount ?? 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentImageFile, setCommentImageFile] = useState<File | null>(null); // #8 Image in comments
    const commentImageInputRef = useRef<HTMLInputElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [aiExpanded, setAiExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(post.content || '');
    const [editSaving, setEditSaving] = useState(false);
    const [editImages, setEditImages] = useState<string[]>(post.imageUrls || []);
    const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
    const editFileRef = useRef<HTMLInputElement>(null);
    const [displayContent, setDisplayContent] = useState(post.content || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [repostModalOpen, setRepostModalOpen] = useState(false);
    const [repostComment, setRepostComment] = useState('');
    const [repostSubmitting, setRepostSubmitting] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [lightboxPost, setLightboxPost] = useState<any>(post); // which post the lightbox belongs to
    const [lightboxPostId, setLightboxPostId] = useState<number>(post.id); // postId for comment loading
    const [lightboxComments, setLightboxComments] = useState<SocialComment[]>([]);
    const [loadingLightboxComments, setLoadingLightboxComments] = useState(false);
    const [lightboxLiked, setLightboxLiked] = useState<boolean>(post.isLikedByMe || false);
    const [lightboxLikesCount, setLightboxLikesCount] = useState<number>(post.likesCount ?? 0);
    const [showCommentEmoji, setShowCommentEmoji] = useState(false);
    const [doubleTapHeart, setDoubleTapHeart] = useState(false); // #2 Double-tap like animation

    const [autoLoadedComments, setAutoLoadedComments] = useState(false);
    const [visibleCount, setVisibleCount] = useState(3);

    useEffect(() => {
        if ((post.commentsCount ?? 0) > 0 && !autoLoadedComments) {
            setLoadingComments(true);
            apiService.getSocialComments(spaceId, post.id).then(data => {
                setComments(data);
                setShowComments(true);
            }).catch(() => {}).finally(() => {
                setLoadingComments(false);
                setAutoLoadedComments(true);
            });
        }
    }, [post.commentsCount, autoLoadedComments, spaceId, post.id]);


    const [bookmarked, setBookmarked] = useState(post.isBookmarkedByMe || false); // #10 Bookmark
    const [commentCursorPos, setCommentCursorPos] = useState(0);
    const commentMention = useMentionAutocomplete(spaceId, commentText, commentCursorPos);
    const handleCommentMentionSelect = (user: MentionUser) => {
        const before = commentText.slice(0, commentMention.mentionStart);
        const after = commentText.slice(commentCursorPos);
        const inserted = `@${user.name} `;
        setCommentText(before + inserted + after);
        const newPos = before.length + inserted.length;
        setCommentCursorPos(newPos);
        setTimeout(() => { commentInputRef.current?.focus(); commentInputRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    // Lightbox comment mention
    const [lbCommentCursorPos, setLbCommentCursorPos] = useState(0);
    const lbCommentMention = useMentionAutocomplete(spaceId, commentText, lbCommentCursorPos);
    const handleLbCommentMentionSelect = (user: MentionUser) => {
        const before = commentText.slice(0, lbCommentMention.mentionStart);
        const after = commentText.slice(lbCommentCursorPos);
        const inserted = `@${user.name} `;
        setCommentText(before + inserted + after);
        const newPos = before.length + inserted.length;
        setLbCommentCursorPos(newPos);
    };

    // Edit post mention
    const [editCursorPos, setEditCursorPos] = useState(0);
    const editMention = useMentionAutocomplete(spaceId, editText, editCursorPos);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const handleEditMentionSelect = (user: MentionUser) => {
        const before = editText.slice(0, editMention.mentionStart);
        const after = editText.slice(editCursorPos);
        const inserted = `@${user.name} `;
        setEditText(before + inserted + after);
        const newPos = before.length + inserted.length;
        setEditCursorPos(newPos);
        setTimeout(() => { editTextareaRef.current?.focus(); editTextareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    // Lightbox edit description
    const [lbEditing, setLbEditing] = useState(false);
    const [lbEditText, setLbEditText] = useState('');
    const [lbEditSaving, setLbEditSaving] = useState(false);
    const [lbMenuOpen, setLbMenuOpen] = useState(false);
    const lbMenuRef = useRef<HTMLDivElement>(null);
    const lbIsOwner = currentUser && currentUser.id === lightboxPost?.userId;

    const handleLbSaveEdit = async () => {
        setLbEditSaving(true);
        try {
            await apiService.updateSocialPost(spaceId, lightboxPostId, lbEditText);
            setLightboxPost((prev: any) => ({ ...prev, content: lbEditText }));
            setDisplayContent(lbEditText); // sync PostCard too
            setLbEditing(false);
            showToast(translations[language || 'vi'].editSaved, 'success');
        } catch {
            showToast(translations[language || 'vi'].editFailed, 'error');
        } finally { setLbEditSaving(false); }
    };

    const loadLightboxComments = async (targetPostId: number) => {
        setLoadingLightboxComments(true);
        setLightboxComments([]);
        try {
            const data = await apiService.getSocialComments(spaceId, targetPostId);
            setLightboxComments(data);
        } catch { /* silent */ }
        finally { setLoadingLightboxComments(false); }
    };

    const handleLightboxLike = async () => {
        if (!currentUser) return showToast('Vui lòng đăng nhập để like.', 'error');
        const prev = lightboxLiked;
        setLightboxLiked(!lightboxLiked);
        setLightboxLikesCount(c => lightboxLiked ? c - 1 : c + 1);
        try {
            const res = await apiService.toggleSocialLike(spaceId, lightboxPostId);
            setLightboxLiked(res.liked);
            setLightboxLikesCount(res.likesCount);
            // Sync back to parent card if it's the same post
            if (lightboxPostId === post.id) { setLiked(res.liked); setLikesCount(res.likesCount); }
        } catch {
            setLightboxLiked(prev);
            setLightboxLikesCount(lightboxPost.likesCount ?? 0);
        }
    };
    const [likersPopup, setLikersPopup] = useState<{ loading: boolean; users: { id: number; name: string; avatarUrl: string | null }[] } | null>(null);
    const likersPopupRef = useRef<HTMLDivElement>(null);

    const [isFollowed, setIsFollowed] = useState(post.isFollowedByMe || false);
    const [followLoading, setFollowLoading] = useState(false);

    const handleFollowToggle = async () => {
        if (!currentUser) return showToast('Vui lòng đăng nhập để theo dõi.', 'error');
        if (!post.userId) return;
        setFollowLoading(true);
        try {
            const res = await apiService.toggleSocialFollow(spaceId, post.userId);
            setIsFollowed(res.following);
        } catch {
            showToast('Lỗi khi thao tác theo dõi.', 'error');
        } finally {
            setFollowLoading(false);
        }
    };

    useEffect(() => {
        const el = contentRef.current;
        if (el) setIsTruncated(el.scrollHeight > el.clientHeight + 2);
    }, [post.content]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
            if (likersPopupRef.current && !likersPopupRef.current.contains(e.target as Node)) setLikersPopup(null);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleShowLikers = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (likesCount === 0) return;
        setLikersPopup({ loading: true, users: [] });
        try {
            const data = await apiService.getPostLikers(spaceId, post.id);
            setLikersPopup({ loading: false, users: data });
        } catch {
            setLikersPopup({ loading: false, users: [] });
        }
    };

    const handleLike = async () => {
        if (!currentUser) return showToast('Vui lòng đăng nhập để like.', 'error');
        const prev = liked;
        setLiked(!liked);
        setLikesCount(c => liked ? c - 1 : c + 1);
        try {
            const res = await apiService.toggleSocialLike(spaceId, post.id);
            setLiked(res.liked);
            setLikesCount(res.likesCount);
        } catch {
            setLiked(prev);
            setLikesCount(post.likesCount);
        }
    };

    // #2 Double-tap Like — Instagram style
    const handleDoubleTapLike = async () => {
        if (!currentUser) return;
        if (!liked) {
            setLiked(true);
            setLikesCount(c => c + 1);
            setDoubleTapHeart(true);
            setTimeout(() => setDoubleTapHeart(false), 1000);
            try {
                const res = await apiService.toggleSocialLike(spaceId, post.id);
                setLiked(res.liked);
                setLikesCount(res.likesCount);
            } catch {
                setLiked(false);
                setLikesCount(post.likesCount);
            }
        } else {
            // Already liked — just show animation
            setDoubleTapHeart(true);
            setTimeout(() => setDoubleTapHeart(false), 1000);
        }
    };

    // #9 Copy link
    const handleCopyLink = () => {
        const url = `${window.location.origin}/${post.spaceSlug || 'giac-ngo'}/community?post=${post.id}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast(translations[language || 'vi'].linkCopied, 'success');
        }).catch(() => {
            showToast('Copy failed', 'error');
        });
        setMenuOpen(false);
    };

    // #10 Bookmark toggle
    const handleBookmark = async () => {
        if (!currentUser) return showToast('Vui lòng đăng nhập.', 'error');
        const prev = bookmarked;
        setBookmarked(!bookmarked);
        try {
            const res = await apiService.toggleSocialBookmark(spaceId, post.id);
            setBookmarked(res.bookmarked);
            showToast(res.bookmarked ? translations[language || 'vi'].bookmarked : translations[language || 'vi'].unbookmarked, 'success');
        } catch {
            setBookmarked(prev);
        }
    };

    const loadComments = async () => {
        if (comments.length > 0) { setShowComments(v => !v); return; }
        setShowComments(true);
        setLoadingComments(true);
        try {
            const data = await apiService.getSocialComments(spaceId, post.id);
            setComments(data);
        } catch { showToast(translations[language || "vi"].sendCommentFailed, 'error'); }
        finally { setLoadingComments(false); }
    };

    const handleReply = (parentId: number, name: string) => {
        setReplyTo({ id: parentId, name });
        setCommentText(`@${name} `);
        setShowComments(true);
        commentInputRef.current?.focus();
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            await apiService.deleteSocialComment(spaceId, post.id, commentId);
            setComments(cs => cs.filter(c => c.id !== commentId));
        } catch { showToast('Xóa bài viết thất bại.', 'error'); }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !currentUser) return;
        setSubmittingComment(true);
        try {
            // #8 Upload comment image first if present
            let imgUrl: string | undefined = undefined;
            if (commentImageFile) {
                const fd = new FormData();
                fd.append('images', commentImageFile);
                const uploadRes = await apiService.createSocialPost(spaceId, fd) as any;
                // Extract image URL from the upload response metadata
                if (uploadRes?.imageUrls?.length) {
                    imgUrl = uploadRes.imageUrls[0];
                }
            }
            const newComment = await apiService.addSocialComment(
                spaceId, post.id, commentText.trim(), replyTo?.id, imgUrl
            );
            setComments(cs => [...cs, newComment]);
            setCommentText('');
            setReplyTo(null);
            setCommentImageFile(null);
        } catch { showToast('Gửi bình luận thất bại.', 'error'); }
        finally { setSubmittingComment(false); }
    };

    const handleRepost = () => {
        if (!currentUser) return showToast('Vui lòng đăng nhập để repost.', 'error');
        if (reposted) return showToast('Bạn đã repost bài này rồi.', 'info');
        setRepostModalOpen(true);
    };

    const handleRepostSubmit = async () => {
        setRepostSubmitting(true);
        try {
            const fd = new FormData();
            // content phải có giá trị (NOT NULL) — gửi space nếu không có comment
            fd.append('content', repostComment.trim() || ' ');
            fd.append('quotedPostId', String(post.id));
            const newPost = await apiService.createSocialPost(spaceId, fd);
            setReposted(true);
            setRepostsCount(c => c + 1);
            onRepost?.(newPost);
            setRepostModalOpen(false);
            setRepostComment('');
            showToast('Đã repost lên tường của bạn! 🎉', 'success');
        } catch {
            showToast('Repost thất bại.', 'error');
        } finally {
            setRepostSubmitting(false);
        }
    };

    const isOwner = currentUser && currentUser.id === post.userId;
    const canDelete = currentUser && (isOwner || (currentUser.roleIds && currentUser.roleIds.length > 0));
    const canEdit = isOwner;

    const handleSaveEdit = async () => {
        setEditSaving(true);
        try {
            const fd = new FormData();
            fd.append('content', editText);
            // Keep existing image URLs
            editImages.forEach(url => fd.append('keptImageUrls', url));
            // Attach new files
            editNewFiles.forEach(file => fd.append('images', file));
            await apiService.updateSocialPost(spaceId, post.id, fd);
            setDisplayContent(editText);
            // We need to get the final URLs — for now, refetch or approximate
            // Since we don't get back the final URLs from the server, trigger a reload
            const allImages = [...editImages]; // kept images are the same
            // New file URLs will be generated by server, but we don't get them back
            // For now, reload is the cleanest UX
            post.imageUrls = allImages; // at minimum keep existing
            setEditImages(allImages);
            setEditNewFiles([]);
            setEditing(false);
            showToast(translations[language || 'vi'].editSaved, 'success');
            // If new files were uploaded, force reload to get correct URLs
            if (editNewFiles.length > 0) {
                window.location.reload();
            }
        } catch {
            showToast(translations[language || 'vi'].editFailed, 'error');
        } finally { setEditSaving(false); }
    };

    // Group replies under their parent
    const topLevel = comments.filter(c => !c.parentCommentId);

    return (
        <div style={{
            background: 'var(--sf-card)', borderRadius: 12,
            marginBottom: 16, overflow: 'visible',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            fontFamily: 'var(--sf-font, inherit)',
        }}>
            {/* Header */}
            <div className="sf-post-header" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
                <div
                    onClick={() => onUserClick && post.userId && onUserClick(post.userId, post.userName, post.userAvatarUrl)}
                    style={{ cursor: onUserClick ? 'pointer' : 'default', flexShrink: 0 }}
                >
                    <Avatar name={post.userName} url={post.userAvatarUrl} size={40} />
                </div>
                <div style={{ flex: 1 }}>
                    <div
                        onClick={() => onUserClick && post.userId && onUserClick(post.userId, post.userName, post.userAvatarUrl)}
                        style={{ fontWeight: 600, fontSize: 14, color: 'var(--sf-text)', cursor: onUserClick ? 'pointer' : 'default', display: 'inline-block' }}
                    >{post.userName}</div>
                    <div style={{ fontSize: 11, color: 'var(--sf-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{timeAgo(post.createdAt, language || 'vi')}</span>
                        {post.isPinned && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#8b4513', fontWeight: 700, fontSize: 10 }}>
                                📌 {translations[language || 'vi'].pinned}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(!currentUser || currentUser.id !== post.userId) && (
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            style={{
                                background: 'none',
                                border: isFollowed ? '1px solid var(--sf-border)' : '1px solid currentColor',
                                borderRadius: 14,
                                padding: '3px 10px',
                                fontSize: 11,
                                cursor: followLoading ? 'default' : 'pointer',
                                color: isFollowed ? 'var(--sf-muted)' : '#8b4513',
                                fontWeight: 500,
                                opacity: followLoading ? 0.7 : 1,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isFollowed ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                    )}

                    {canDelete && (
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen(v => !v)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', padding: '4px 8px', borderRadius: 6, fontSize: 20, lineHeight: 1 }}
                            >···</button>
                            {menuOpen && (
                                <div style={{
                                    position: 'absolute', right: 0, top: '110%', background: 'var(--sf-card)',
                                    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                    zIndex: 100, minWidth: 200, overflow: 'hidden'
                                }}>
                                    {/* #9 Copy Link */}
                                    <button
                                        onClick={handleCopyLink}
                                        style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--sf-text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(0,0,0,0.04))')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >{translations[language || "vi"].copyLink}</button>
                                    {/* #10 Bookmark */}
                                    {currentUser && (
                                        <button
                                            onClick={() => { handleBookmark(); setMenuOpen(false); }}
                                            style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: bookmarked ? '#8b4513' : 'var(--sf-text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(0,0,0,0.04))')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >{bookmarked ? translations[language || "vi"].unbookmarkPost : translations[language || "vi"].bookmarkPost}</button>
                                    )}
                                    {/* #7 Pin Post — owner/admin only */}
                                    {canEdit && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await apiService.togglePinPost(spaceId, post.id);
                                                    post.isPinned = res.pinned;
                                                    showToast(res.pinned ? translations[language || 'vi'].pinned : translations[language || 'vi'].unpinPost, 'success');
                                                    setMenuOpen(false);
                                                    window.location.reload(); // reload to re-sort
                                                } catch { showToast('Lỗi ghim bài.', 'error'); }
                                            }}
                                            style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: post.isPinned ? '#8b4513' : 'var(--sf-text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(0,0,0,0.04))')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >{post.isPinned ? translations[language || "vi"].unpinPost : translations[language || "vi"].pinPost}</button>
                                    )}
                                    {canEdit && (
                                        <button
                                            onClick={() => { setEditing(true); setEditText(displayContent); setEditImages(post.imageUrls || []); setEditNewFiles([]); setMenuOpen(false); }}
                                            style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--sf-text)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(0,0,0,0.04))')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >{translations[language || "vi"].editPost}</button>
                                    )}
                                    {canEdit && (<>
                                    <div style={{ height: 1, background: 'var(--sf-border)', margin: '2px 0' }} />
                                    <button
                                        onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}
                                        style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: '#e74c3c', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover, rgba(0,0,0,0.04))')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >{translations[language || "vi"].deletePost}</button>
                                    </>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="sf-post-body" style={{ padding: '0 16px 12px' }}>
                {post.metadata?.type === 'ai_share' || post.metadata?.type === 'library_share' ? (
                    <>
                        {/* User's personal comment — editable */}
                        {editing ? (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    {editMention.isOpen && (
                                        <MentionDropdown suggestions={editMention.suggestions} onSelect={handleEditMentionSelect} anchorRef={editTextareaRef as React.RefObject<HTMLElement | null>} />
                                    )}
                                    <textarea
                                        ref={editTextareaRef}
                                        value={editText}
                                        onChange={e => { setEditText(e.target.value); setEditCursorPos(e.target.selectionStart); }}
                                        onKeyUp={e => setEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        onClick={e => setEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        style={{
                                            width: '100%', minHeight: 60, padding: '10px 14px', borderRadius: 10,
                                            border: '1.5px solid var(--sf-border, #ebdcc5)', background: 'var(--sf-card, #fff)',
                                            color: 'var(--sf-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                                            outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => { setEditing(false); setEditNewFiles([]); setEditImages(post.imageUrls || []); }}
                                        disabled={editSaving}
                                        style={{
                                            padding: '6px 18px', borderRadius: 8, border: '1px solid var(--sf-border, #ebdcc5)',
                                            background: 'none', color: 'var(--sf-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        }}
                                    >{translations[language || 'vi'].cancel}</button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={editSaving}
                                        style={{
                                            padding: '6px 18px', borderRadius: 8, border: 'none',
                                            background: '#8b4513', color: '#fff', cursor: editSaving ? 'wait' : 'pointer',
                                            fontSize: 13, fontWeight: 600, opacity: editSaving ? 0.6 : 1,
                                        }}
                                    >{editSaving ? '...' : translations[language || 'vi'].save}</button>
                                </div>
                            </div>
                        ) : post.content?.trim() && post.content.trim() !== ' ' && (
                            <div style={{ fontSize: 13, color: 'var(--sf-text)', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {renderMentionText(post.content, spaceMembers, onUserClick, { whiteSpace: 'pre-wrap' }, onHashtagClick)}
                            </div>
                        )}
                        {/* Quote Block */}
                        <div style={{
                            background: 'rgba(185, 148, 90, 0.12)',
                            border: '1px solid rgba(185, 148, 90, 0.35)',
                            borderRadius: 10,
                            padding: '12px 14px',
                        }}>
                            {post.metadata.type === 'ai_share' ? (
                                <>
                                    {/* AI name header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{
                                            background: '#8b4513', color: '#fff', fontSize: 10, fontWeight: 700,
                                            padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em'
                                        }}>AI</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-text)' }}>
                                            {post.metadata.aiName}
                                        </span>
                                    </div>
                                    {/* User question (italic) */}
                                    <div style={{ fontSize: 12, color: 'var(--sf-muted)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
                                        "{post.metadata.userQuestion}"
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Library name header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 14, color: 'var(--sf-muted)' }}>📖</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-text)' }}>
                                            {post.metadata.docTitle}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--sf-muted)', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
                                        Tác giả: {post.metadata.docAuthor}
                                    </div>
                                </>
                            )}
                            {/* Response with truncation */}
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    color: 'var(--sf-text)',
                                    maxHeight: aiExpanded ? undefined : '240px', overflow: 'hidden',
                                    whiteSpace: post.metadata.type === 'library_share' ? 'pre-wrap' : undefined,
                                    lineHeight: post.metadata.type === 'library_share' ? 1.6 : undefined
                                }} className={post.metadata.type === 'ai_share' ? "sf-ai-markdown" : ""}>
                                    {post.metadata.type === 'ai_share' ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{toMdParagraphs(post.metadata.aiResponse || '')}</ReactMarkdown>
                                    ) : (
                                        post.metadata.docContent || ''
                                    )}
                                </div>
                                {!aiExpanded && ((post.metadata.type === 'ai_share' ? post.metadata.aiResponse : post.metadata.docContent) || '').length > 300 && (
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        height: 40, background: 'linear-gradient(transparent, var(--sf-card))'
                                    }} />
                                )}
                            </div>
                            {((post.metadata.type === 'ai_share' ? post.metadata.aiResponse : post.metadata.docContent) || '').length > 300 && (
                                <button
                                    onClick={() => setAiExpanded(v => !v)}
                                    style={{ background: 'none', border: 'none', color: 'var(--sf-primary, #8b4513)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '4px 0 0', display: 'block' }}
                                >
                                    {aiExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {editing ? (
                            <div style={{ padding: '0 0 8px' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    {editMention.isOpen && (
                                        <MentionDropdown suggestions={editMention.suggestions} onSelect={handleEditMentionSelect} anchorRef={editTextareaRef as React.RefObject<HTMLElement | null>} />
                                    )}
                                    <textarea
                                        ref={editTextareaRef}
                                        value={editText}
                                        onChange={e => { setEditText(e.target.value); setEditCursorPos(e.target.selectionStart); }}
                                        onKeyUp={e => setEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        onClick={e => setEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        rows={5}
                                        style={{
                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                            border: '1px solid var(--sf-border, #ebdcc5)', background: 'var(--sf-input-bg, #fff)',
                                            color: 'var(--sf-text)', fontSize: 13, resize: 'vertical', outline: 'none',
                                            fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {/* Existing images */}
                                {editImages.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                        {editImages.map((url, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                                                <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--sf-border)' }} />
                                                <button
                                                    onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                                                    style={{
                                                        position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                                                        background: '#e74c3c', color: '#fff', border: 'none', cursor: 'pointer',
                                                        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                                                    }}
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* New file previews */}
                                {editNewFiles.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                        {editNewFiles.map((file, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                                                <img src={URL.createObjectURL(file)} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #8b4513' }} />
                                                <button
                                                    onClick={() => setEditNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    style={{
                                                        position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                                                        background: '#e74c3c', color: '#fff', border: 'none', cursor: 'pointer',
                                                        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                                                    }}
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <input ref={editFileRef} type="file" accept="image/*" multiple hidden onChange={e => {
                                            if (e.target.files) setEditNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                            e.target.value = '';
                                        }} />
                                        <button
                                            onClick={() => editFileRef.current?.click()}
                                            style={{
                                                padding: '5px 14px', borderRadius: 8, border: '1px solid var(--sf-border, #ebdcc5)',
                                                background: 'none', color: '#8b4513', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: 4,
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b4513" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                                            {language === 'en' ? 'Add photos' : 'Thêm ảnh'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => { setEditing(false); setEditNewFiles([]); setEditImages(post.imageUrls || []); }}
                                            disabled={editSaving}
                                            style={{
                                                padding: '6px 18px', borderRadius: 8, border: '1px solid var(--sf-border, #ebdcc5)',
                                                background: 'none', color: 'var(--sf-text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                            }}
                                        >{translations[language || 'vi'].cancel}</button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={editSaving || (!editText.trim() && editImages.length === 0 && editNewFiles.length === 0)}
                                            style={{
                                                padding: '6px 18px', borderRadius: 8, border: 'none',
                                                background: '#8b4513', color: '#fff', cursor: editSaving ? 'wait' : 'pointer',
                                                fontSize: 13, fontWeight: 600, opacity: editSaving ? 0.6 : 1,
                                            }}
                                        >{editSaving ? '...' : translations[language || 'vi'].save}</button>
                                    </div>
                                </div>
                            </div>
                        ) : displayContent?.trim() && (
                            <>
                                <div
                                    ref={contentRef}
                                    className="sf-post-content"
                                    style={{
                                        fontSize: 'var(--sf-post-text-size, 13px)', color: 'var(--sf-text)', wordBreak: 'break-word', lineHeight: 1.7,
                                        maxHeight: expanded ? undefined : '120px', overflow: 'hidden',
                                        fontFamily: 'var(--sf-font, inherit)',
                                    }}
                                >
                                    {renderMentionText(displayContent, spaceMembers, onUserClick, { whiteSpace: 'pre-wrap' }, onHashtagClick)}
                                </div>
                                {isTruncated && !expanded && (
                                    <button onClick={() => setExpanded(true)}
                                        style={{ background: 'none', border: 'none', color: '#8b4513', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, marginTop: 4 }}>
                                        Xem thêm
                                    </button>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Photos — #2 Double-tap to like */}
            {post.imageUrls?.length > 0 && (
                <div style={{ position: 'relative', cursor: 'pointer' }} onDoubleClick={handleDoubleTapLike}>
                    <PhotoGrid urls={post.imageUrls} onImageClick={i => {
                        setLightboxPost(post);
                        setLightboxPostId(post.id);
                        setLightboxLiked(post.isLikedByMe || false);
                        setLightboxLikesCount(post.likesCount ?? 0);
                        setLightboxIdx(i);
                        loadLightboxComments(post.id);
                    }} />
                    {/* Heart animation overlay */}
                    {doubleTapHeart && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', zIndex: 10,
                        }}>
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="#e11d48" style={{
                                animation: 'sfHeartPop 0.9s ease-out forwards',
                                filter: 'drop-shadow(0 4px 12px rgba(225,29,72,0.5))',
                            }}>
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                    )}
                </div>
            )}

            {/* Quoted post card (for reposts) */}
            {post.quotedPost && (
                <div style={{
                    margin: '10px 12px 4px',
                    border: '1px solid var(--sf-border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: 'var(--sf-input-bg)',
                    padding: '8px 12px 10px',
                }}>
                    {/* Original author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div
                            onClick={() => onUserClick && post.quotedPost?.userId != null && onUserClick(post.quotedPost.userId as number, post.quotedPost.userName, post.quotedPost.userAvatarUrl)}
                            style={{ cursor: onUserClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <Avatar name={post.quotedPost.userName} url={post.quotedPost.userAvatarUrl} size={22} />
                            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--sf-text)' }}>{post.quotedPost.userName}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--sf-muted)' }}>{timeAgo(post.quotedPost.createdAt, language || 'vi')}</span>
                    </div>
                    {/* Original content — rendered with same format as original post */}
                    <QuotedPostBody post={post.quotedPost} onImageClick={(i) => {
                        const qp = post.quotedPost;
                        if (!qp) return;
                        setLightboxPost(qp);
                        setLightboxPostId(qp.id);
                        setLightboxLiked(qp.isLikedByMe || false);
                        setLightboxLikesCount(qp.likesCount ?? 0);
                        setLightboxIdx(i);
                        loadLightboxComments(qp.id);
                    }} />
                </div>
            )}

            {/* Repost comment modal */}
            {repostModalOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => !repostSubmitting && setRepostModalOpen(false)}
                >
                    <div style={{ background: 'var(--sf-card)', borderRadius: 14, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid var(--sf-border)' }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--sf-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img src="/themes/giacngo/senhong.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                                {translations[language || "vi"].repostTitle}
                            </span>
                            <button onClick={() => setRepostModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '14px 16px 16px' }}>
                            {/* Comment textarea */}
                            <textarea
                                value={repostComment}
                                onChange={e => setRepostComment(e.target.value)}
                                placeholder={translations[language || "vi"].repostPlaceholder}
                                rows={3}
                                autoFocus
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--sf-border)', background: 'var(--sf-input-bg)', color: 'var(--sf-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box' as any, outline: 'none', fontFamily: 'inherit', lineHeight: 1.55, marginBottom: 12 }}
                            />
                            {/* Quoted post preview — same format as original */}
                            <div style={{ border: '1px solid var(--sf-border)', borderRadius: 9, overflow: 'hidden', marginBottom: 14, background: 'var(--sf-input-bg)', padding: '8px 12px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <Avatar name={post.userName} url={post.userAvatarUrl} size={20} />
                                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--sf-text)' }}>{post.userName}</span>
                                </div>
                                <QuotedPostBody post={post} maxLines={4} />
                            </div>
                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setRepostModalOpen(false)} disabled={repostSubmitting}
                                    style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--sf-border)', color: 'var(--sf-text)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                                    {translations[language || "vi"].cancel}
                                </button>
                                <button onClick={handleRepostSubmit} disabled={repostSubmitting}
                                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#8b4513', color: '#fff', cursor: repostSubmitting ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, opacity: repostSubmitting ? 0.7 : 1 }}>
                                    {repostSubmitting ? translations[language || "vi"].sharing : translations[language || "vi"].share}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat row: conditionally show clickable counts */}
            {(likesCount > 0 || repostsCount > 0 || (post.commentsCount ?? 0) > 0) && (
                <div className="sf-post-stats" style={{ display: 'flex', alignItems: 'center', padding: '4px 16px 8px', fontSize: 13, color: 'var(--sf-muted)' }}>
                    {/* Likes count — clickable to see who liked */}
                    {likesCount > 0 && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={handleShowLikers}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--sf-muted)', fontSize: 13, padding: 0,
                                    transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                title={translations[language || 'vi'].whoLiked}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="1.8">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {likesCount.toLocaleString()}
                            </button>
                            {/* Likers popup */}
                            {likersPopup && (
                                <div
                                    ref={likersPopupRef}
                                    style={{
                                        position: 'absolute', bottom: '100%', left: 0, zIndex: 200,
                                        background: 'var(--sf-card, #f4ecd8)', border: '1px solid var(--sf-border)',
                                        borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                        minWidth: 260, maxHeight: 350, display: 'flex', flexDirection: 'column',
                                        marginBottom: 6, overflow: 'hidden'
                                    }}
                                >
                                    {!likersPopup.loading && likersPopup.users.length > 0 && (
                                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--sf-border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--sf-card, #f4ecd8)' }}>
                                            {/* Avatar Stack */}
                                            <div style={{ display: 'flex', position: 'relative', width: Math.min(likersPopup.users.length, 3) * 18 + 14, height: 32 }}>
                                                {likersPopup.users.slice(0, 3).map((u, i) => (
                                                    <div key={u.id} style={{ position: 'absolute', left: i * 16, zIndex: 3 - i, border: '2px solid var(--sf-card, #f4ecd8)', borderRadius: '50%' }}>
                                                        <Avatar name={u.name} url={u.avatarUrl} size={28} />
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Header Text */}
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-text)' }}>
                                                    {likersPopup.users[0].name} {likersPopup.users.length > 1 ? `& ${likersPopup.users.length - 1} ng...` : ''}
                                                </span>
                                                <span style={{ fontSize: 12, color: 'var(--sf-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ color: '#e11d48', fontSize: 10 }}>❤️</span> yêu thích bài viết này
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0', background: 'var(--sf-card, #f4ecd8)' }}>
                                        {likersPopup.loading ? (
                                            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--sf-muted)', fontSize: 12 }}>...</div>
                                        ) : likersPopup.users.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--sf-muted)', fontSize: 13 }}>{translations[language || 'vi'].noLikesYet}</div>
                                        ) : (
                                            likersPopup.users.map(u => (
                                                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', cursor: 'default' }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <Avatar name={u.name} url={u.avatarUrl} size={36} />
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sf-text)' }}>{u.name}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ flex: 1 }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(post.commentsCount ?? 0) > 0 && (
                            <button
                                onClick={() => { setShowComments(v => !v); if (!showComments && comments.length === 0) loadComments(); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 13, padding: 0 }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                                {(post.commentsCount ?? 0).toLocaleString()} {language === 'en' ? 'comments' : 'bình luận'}
                            </button>
                        )}

                        {repostsCount > 0 && (
                            <span style={{ color: 'var(--sf-muted)', fontSize: 13, cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                                {repostsCount.toLocaleString()} {language === 'en' ? 'shares' : 'lượt chia sẻ'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="sf-post-actions" style={{ display: 'flex', alignItems: 'center', padding: '2px 8px 8px', gap: 4, borderBottom: '1px solid var(--sf-border)' }}>
                {/* Like */}
                <div style={{ flex: 1 }}>
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
                            background: 'none', border: 'none', borderRadius: 8,
                            cursor: currentUser ? 'pointer' : 'default',
                            color: liked ? '#e11d48' : 'var(--sf-muted)',
                            fontWeight: 500, fontSize: 13, padding: '7px 4px',
                            transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => { if (currentUser) e.currentTarget.style.background = 'rgba(225,29,72,0.07)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span>{translations[language || 'vi'].likeAction}</span>
                    </button>
                </div>

                {/* Comment */}
                <button
                    onClick={() => { setShowComments(v => !v); if (!showComments && comments.length === 0) loadComments(); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center',
                        background: 'none', border: 'none', borderRadius: 8,
                        cursor: 'pointer', color: showComments ? 'var(--sf-text)' : 'var(--sf-muted)',
                        fontWeight: 500, fontSize: 13, padding: '7px 4px',
                        transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>{translations[language || 'vi'].commentAction}</span>
                </button>

                {/* Repost/Share */}
                <button
                    onClick={handleRepost}
                    title={language === 'en' ? 'Share to your wall' : 'Chia sẻ lên tường của bạn'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center',
                        background: 'none', border: 'none', borderRadius: 8,
                        cursor: currentUser ? 'pointer' : 'default',
                        color: reposted ? '#45bd62' : 'var(--sf-muted)',
                        fontWeight: reposted ? 600 : 500, fontSize: 13, padding: '7px 4px',
                        transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { if (currentUser) e.currentTarget.style.background = 'rgba(69,189,98,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 1l4 4-4 4" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 23l-4-4 4-4" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    <span>{translations[language || 'vi'].shareAction}{repostsCount > 0 ? ` · ${repostsCount}` : ''}</span>
                </button>
            </div>

            {/* Comments section */}
            {showComments && (
                <div className="sf-post-comments" style={{ padding: '12px 16px' }}>
                    {loadingComments && comments.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: 13, padding: '8px 0' }}>{translations[language || "vi"].loading}</div>
                    ) : (
                        <>
                            {topLevel.length > visibleCount && (
                                <button 
                                    onClick={() => setVisibleCount(v => v + 10)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b4513', fontSize: 13, fontWeight: 600, padding: '0 0 12px 0', display: 'block', width: '100%', textAlign: 'left' }}
                                >
                                    {language === 'vi' ? 'Xem tiếp bình luận...' : 'View more comments...'}
                                </button>
                            )}
                            {topLevel.slice(-visibleCount).map(c => (
                                <CommentThread
                                    key={c.id} comment={c} allComments={comments}
                                    currentUser={currentUser} spaceId={spaceId} postId={post.id}
                                    postUserId={post.userId ?? 0}
                                    onDelete={handleDeleteComment} onReply={handleReply}
                                    onUserClick={onUserClick}
                                    onLikeUpdate={(commentId, liked, likesCount) => {
                                        setComments(prev => prev.map(cc => cc.id === commentId ? { ...cc, isLikedByMe: liked, likesCount } : cc));
                                    }}
                                    language={language}
                                    spaceMembers={spaceMembers}
                                />
                            ))}
                        </>
                    )}

                    {/* Quick emoji reactions bar */}
                    {currentUser && (
                        <div style={{ display: 'flex', gap: 2, padding: '6px 0 2px', flexWrap: 'wrap' }}>
                            {['\u2764\ufe0f', '\ud83d\ude4f', '\ud83d\udd25', '\ud83d\udc4f', '\ud83d\ude22', '\ud83d\ude0d', '\ud83c\udf38', '\u2728'].map(e => (
                                <button
                                    key={e}
                                    onClick={() => setCommentText(prev => prev + e)}
                                    style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '3px 5px', borderRadius: 6, lineHeight: 1, transition: 'transform 0.15s' }}
                                    onMouseEnter={el => { el.currentTarget.style.transform = 'scale(1.25)'; el.currentTarget.style.background = 'var(--sf-hover)'; }}
                                    onMouseLeave={el => { el.currentTarget.style.transform = 'scale(1)'; el.currentTarget.style.background = 'none'; }}
                                >{e}</button>
                            ))}
                        </div>
                    )}

                    {/* Comment input */}
                    {currentUser && (
                        <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 4 }}>
                            <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={32} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {replyTo && (
                                    <div style={{ fontSize: 12, color: '#8b4513', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {translations[language || "vi"].replyingTo} <strong>{replyTo.name}</strong>
                                        <button onClick={() => { setReplyTo(null); setCommentText(''); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 14, lineHeight: 1 }}>×</button>
                                    </div>
                                )}
                                <div style={{ position: 'relative', width: '100%' }}>
                                    {commentMention.isOpen && (
                                        <MentionDropdown suggestions={commentMention.suggestions} onSelect={handleCommentMentionSelect} anchorRef={commentInputRef as React.RefObject<HTMLElement | null>} />
                                    )}
                                    <input
                                        ref={commentInputRef}
                                        value={commentText}
                                        onChange={e => { setCommentText(e.target.value); setCommentCursorPos(e.target.selectionStart ?? 0); }}
                                        onKeyUp={e => setCommentCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                        onClick={e => setCommentCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                        placeholder={translations[language || "vi"].writeComment}
                                        style={{
                                            width: '100%', padding: '8px 64px 8px 14px', borderRadius: 20,
                                            border: '1px solid var(--sf-border)', background: 'var(--sf-input-bg)',
                                            color: 'var(--sf-text)', fontSize: 13, outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2, alignItems: 'center' }}>
                                        {/* #8 Image upload for comments */}
                                        <button type="button" onClick={() => commentImageInputRef.current?.click()}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: commentImageFile ? '#8b4513' : 'var(--sf-muted)', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
                                            title="Đính kèm ảnh"
                                        >📷</button>
                                        <input type="file" accept="image/*" ref={commentImageInputRef} style={{ display: 'none' }}
                                            onChange={e => { if (e.target.files?.[0]) setCommentImageFile(e.target.files[0]); }} />
                                        <button type="button" onClick={() => setShowCommentEmoji(v => !v)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                                            title="Emoji"
                                        >😊</button>
                                        <button type="submit" disabled={!commentText.trim() || submittingComment}
                                            style={{
                                                background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
                                                color: commentText.trim() ? '#8b4513' : 'var(--sf-muted)', fontSize: 18, lineHeight: 1
                                            }}>↑</button>
                                    </div>
                                </div>
                                {/* #8 Comment image preview */}
                                {commentImageFile && (
                                    <div style={{ position: 'relative', marginTop: 4, display: 'inline-block' }}>
                                        <img src={URL.createObjectURL(commentImageFile)} alt="" style={{ maxWidth: 120, maxHeight: 80, borderRadius: 8, objectFit: 'cover' }} />
                                        <button onClick={() => setCommentImageFile(null)} style={{
                                            position: 'absolute', top: -4, right: -4, background: '#e74c3c', border: 'none', borderRadius: '50%',
                                            width: 18, height: 18, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                                        }}>×</button>
                                    </div>
                                )}
                                {showCommentEmoji && (
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2,
                                        background: 'var(--sf-card)', borderRadius: 10, padding: 8,
                                        marginTop: 6, border: '1px solid var(--sf-border)',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                                    }}>
                                        {['\ud83d\ude0a', '\ud83d\ude04', '\ud83d\ude02', '\ud83e\udd70', '\ud83d\ude0d', '\ud83e\udd29', '\ud83d\ude0e', '\ud83e\udd73', '\ud83d\ude4f', '\u2764\ufe0f',
                                          '\ud83d\udc95', '\u2728', '\ud83c\udf38', '\ud83c\udf3a', '\ud83c\udf3b', '\ud83c\udf40', '\ud83c\udf19', '\u2600\ufe0f', '\ud83c\udf08', '\ud83d\udd25',
                                          '\ud83d\udcaf', '\ud83d\udc4f', '\ud83e\udd1d', '\ud83d\ude4c', '\ud83d\udcaa', '\ud83e\uddd8', '\ud83d\udd4a\ufe0f', '\u26a1', '\ud83c\udfaf', '\ud83c\udf89'].map(em => (
                                            <button
                                                key={em}
                                                onClick={() => { setCommentText(prev => prev + em); setShowCommentEmoji(false); }}
                                                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 3, borderRadius: 6, lineHeight: 1 }}
                                                onMouseEnter={el => (el.currentTarget.style.background = 'var(--sf-hover)')}
                                                onMouseLeave={el => (el.currentTarget.style.background = 'none')}
                                            >{em}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            )}
            {/* Post Lightbox with Comments */}
            {lightboxIdx !== null && (
                <div className="sf-lightbox-container">
                    {/* Left side / Top on mobile: Image Box */}
                    <div className="sf-lightbox-image-area" onClick={() => setLightboxIdx(null)}>
                        <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 22, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        {lightboxIdx > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i! - 1); }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 26, cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>‹</button>
                        )}
                        <img src={lightboxPost.imageUrls[lightboxIdx]} alt="" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', userSelect: 'none' }} onClick={e => e.stopPropagation()} />
                        {lightboxIdx < lightboxPost.imageUrls.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i! + 1); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 26, cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>›</button>
                        )}
                    </div>
                    {/* Right side / Bottom on mobile: Comments Sidebar */}
                    <div className="sf-lightbox-sidebar" style={{ minHeight: 0 }}>
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {/* Post author + content */}
                            <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #ebdcc5' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div
                                        onClick={() => {
                                            if (onUserClick && lightboxPost.userId != null) {
                                                setLightboxIdx(null);
                                                onUserClick(lightboxPost.userId, lightboxPost.userName, lightboxPost.userAvatarUrl);
                                            }
                                        }}
                                        style={{ cursor: onUserClick && lightboxPost.userId ? 'pointer' : 'default' }}
                                    >
                                        <Avatar name={lightboxPost.userName} url={lightboxPost.userAvatarUrl} size={38} />
                                    </div>
                                    <div style={{ flex: 1, fontSize: 15, color: '#4a4a4a', lineHeight: 1.6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span 
                                                    onClick={() => {
                                                        if (onUserClick && lightboxPost.userId != null) {
                                                            setLightboxIdx(null);
                                                            onUserClick(lightboxPost.userId, lightboxPost.userName, lightboxPost.userAvatarUrl);
                                                        }
                                                    }}
                                                    style={{ fontWeight: 700, color: '#1a1a1a', cursor: onUserClick && lightboxPost.userId ? 'pointer' : 'default' }}
                                                >{lightboxPost.userName}</span>
                                                <span style={{ fontSize: 11, color: '#a08b7a', marginTop: 2, fontWeight: 500, fontFamily: 'var(--sf-font, inherit)' }}>{timeAgo(lightboxPost.createdAt, language || 'vi')}</span>
                                            </div>
                                            {lbIsOwner && (
                                                <div style={{ position: 'relative' }} ref={lbMenuRef}>
                                                    <button
                                                        onClick={() => setLbMenuOpen(v => !v)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a08b7a', padding: '4px 8px', borderRadius: 6, fontSize: 20, lineHeight: 1 }}
                                                    >···</button>
                                                    {lbMenuOpen && (
                                                        <div style={{
                                                            position: 'absolute', right: 0, top: '110%', background: 'var(--sf-card, #fff)',
                                                            borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                            zIndex: 200, minWidth: 180, overflow: 'hidden'
                                                        }}>
                                                            <button
                                                                onClick={() => { setLbEditing(true); setLbEditText(lightboxPost.content || ''); setLbMenuOpen(false); }}
                                                                style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--sf-text, #4a4a4a)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                                            >{translations[language || 'vi'].editDesc}</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {lbEditing ? (
                                            <div>
                                                <textarea
                                                    value={lbEditText}
                                                    onChange={e => setLbEditText(e.target.value)}
                                                    rows={4}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        border: '1px solid #ebdcc5', background: '#faf6f0',
                                                        color: '#4a4a4a', fontSize: 13, resize: 'vertical', outline: 'none',
                                                        fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
                                                    }}
                                                />
                                                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setLbEditing(false)}
                                                        disabled={lbEditSaving}
                                                        style={{ padding: '6px 18px', borderRadius: 8, border: '1px solid #ebdcc5', background: 'none', color: '#4a4a4a', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                                    >{translations[language || 'vi'].cancel}</button>
                                                    <button
                                                        onClick={handleLbSaveEdit}
                                                        disabled={lbEditSaving}
                                                        style={{ padding: '6px 18px', borderRadius: 8, border: 'none', background: '#8b4513', color: '#fff', cursor: lbEditSaving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: lbEditSaving ? 0.6 : 1 }}
                                                    >{lbEditSaving ? '...' : translations[language || 'vi'].save}</button>
                                                </div>
                                            </div>
                                        ) : lightboxPost.content?.trim() && (
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{renderMentionText(lightboxPost.content, spaceMembers, (uid, uname, uav) => { setLightboxIdx(null); onUserClick?.(uid, uname, uav); })}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Comments title */}
                            <div style={{ padding: '20px 20px 0' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#c4a482', textTransform: 'uppercase', marginBottom: 12 }}>
                                    {language === 'en' ? 'Comments' : 'Bình luận'}
                                </div>
                            </div>

                            {/* Comments list — from lightboxComments (correct post) */}
                            <div style={{ padding: '0 20px 16px' }}>
                                {loadingLightboxComments ? (
                                    <div style={{ textAlign: 'center', color: '#c4a482', fontSize: 14 }}>{translations[language || "vi"].loading}</div>
                                ) : lightboxComments.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#c4a482', fontSize: 13, padding: '8px 0' }}>
                                        {language === 'en' ? 'No comments yet' : 'Chưa có bình luận'}
                                    </div>
                                ) : (() => {
                                    const renderLbComment = (c: SocialComment, depth: number, visibleReplies?: SocialComment[]): React.ReactNode => {
                                        const replies = visibleReplies ?? lightboxComments.filter(r => r.parentCommentId === c.id);
                                        const canDel = currentUser && (currentUser.id === c.userId || currentUser.id === lightboxPost.userId || (currentUser.roleIds && currentUser.roleIds.length > 0));
                                        const cLiked = c.isLikedByMe || false;
                                        const cLikes = c.likesCount || 0;
                                        return (
                                            <React.Fragment key={c.id}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, marginLeft: depth * 24 }}>
                                                    <Avatar name={c.userName} url={c.userAvatarUrl} size={32} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 3, cursor: 'pointer', lineHeight: 1.2 }} onClick={() => { onUserClick && c.userId != null && onUserClick(c.userId, c.userName, c.userAvatarUrl); setLightboxIdx(null); }}>{c.userName}</div>
                                                        <div style={{ fontSize: 14, color: '#4a4a4a', lineHeight: 1.5 }}>
                                                            {(() => {
                                                                const pc = lightboxComments.find(p => p.id === c.parentCommentId);
                                                                if (pc && c.content.startsWith(`@${pc.userName} `)) {
                                                                    const prefix = `@${pc.userName} `;
                                                                    const rest = c.content.slice(prefix.length);
                                                                    return (<><span onClick={(e) => { e.stopPropagation(); onUserClick && pc.userId != null && onUserClick(pc.userId, pc.userName, pc.userAvatarUrl); setLightboxIdx(null); }} style={{ color: '#8b4513', fontWeight: 600, cursor: 'pointer' }}>{prefix.trim()}</span>{' '}{renderMentionText(rest, spaceMembers, (uid, uname, uav) => { setLightboxIdx(null); onUserClick?.(uid, uname, uav); })}</>);
                                                                }
                                                                return renderMentionText(c.content, spaceMembers, (uid, uname, uav) => { setLightboxIdx(null); onUserClick?.(uid, uname, uav); });
                                                            })()}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 14, marginTop: 4, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: '#a08b7a', fontWeight: 500 }}>{timeAgo(c.createdAt, language || 'vi')}</span>
                                                            {currentUser && <button onClick={async () => {
                                                                try {
                                                                    const res = await apiService.toggleCommentLike(spaceId, lightboxPostId, c.id);
                                                                    setLightboxComments(prev => prev.map(cc => cc.id === c.id ? { ...cc, isLikedByMe: res.liked, likesCount: res.likesCount } : cc));
                                                                } catch { /* silent */ }
                                                            }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: cLiked ? '#e74c3c' : '#a08b7a', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                                <span style={{ fontSize: 22, display: 'inline-block', transform: 'translateY(1px)' }}>{cLiked ? '❤️' : '♡'}</span>{cLikes > 0 && <span>{cLikes}</span>}
                                                            </button>}
                                                            {currentUser && <button onClick={() => handleReply(c.id, c.userName)} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: '#8b4513', cursor: 'pointer', padding: 0 }}>{language === 'en' ? 'Reply' : 'Phản hồi'}</button>}
                                                            {canDel && <button onClick={async () => { try { await apiService.deleteSocialComment(spaceId, lightboxPostId, c.id); setLightboxComments(prev => prev.filter(x => x.id !== c.id)); } catch { /* silent */ } }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#e74c3c', cursor: 'pointer', padding: 0 }}>{language === 'en' ? 'Delete' : 'Xóa'}</button>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {replies.map(r => renderLbComment(r, depth + 1))}
                                            </React.Fragment>
                                        );
                                    };
                                    return lightboxComments.filter(c => !c.parentCommentId).map(c => renderLbComment(c, 0));
                                })()}
                            </div>
                        </div>

                        {/* Bottom: actions + comment input */}
                        <div style={{ flexShrink: 0, padding: '16px 20px 24px', borderTop: '1px solid #ebdcc5', background: '#fdfbf7' }}>
                            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                                <button onClick={handleLightboxLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: lightboxLiked ? '#8b4513' : '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill={lightboxLiked ? '#8b4513' : 'none'} stroke={lightboxLiked ? '#8b4513' : '#a08b7a'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                </button>
                                <button onClick={() => commentInputRef.current?.focus()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a08b7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                </button>
                                <button onClick={handleRepost} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: reposted ? '#45bd62' : '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a08b7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                                </button>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginBottom: 4 }}>
                                {lightboxLikesCount} {language === 'en' ? 'likes' : 'lượt thích'}
                            </div>
                            {currentUser && (
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!commentText.trim() || submittingComment) return;
                                    setSubmittingComment(true);
                                    try {
                                        const nc = await apiService.addSocialComment(spaceId, lightboxPostId, commentText.trim(), replyTo?.id);
                                        setLightboxComments(prev => [...prev, nc]);
                                        setCommentText('');
                                        setReplyTo(null);
                                    } catch { showToast(translations[language || 'vi'].sendCommentFailed, 'error'); }
                                    finally { setSubmittingComment(false); }
                                }} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
                                    <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={30} />
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        {lbCommentMention.isOpen && (
                                            <MentionDropdown suggestions={lbCommentMention.suggestions} onSelect={handleLbCommentMentionSelect} anchorRef={commentInputRef as React.RefObject<HTMLElement | null>} />
                                        )}
                                        <input
                                            ref={commentInputRef}
                                            value={commentText}
                                            onChange={e => { setCommentText(e.target.value); setLbCommentCursorPos(e.target.selectionStart ?? 0); }}
                                            onKeyUp={e => setLbCommentCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                            onClick={e => setLbCommentCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                            placeholder={translations[language || "vi"].writeComment}
                                            style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 20, border: '1px solid #ebdcc5', background: '#fff', color: '#1a1a1a', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                        />
                                        <button type="submit" disabled={!commentText.trim() || submittingComment}
                                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'default', color: commentText.trim() ? '#8b4513' : '#c4a482', fontSize: 18, lineHeight: 1 }}
                                        >↑</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10001,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                }} onClick={() => setShowDeleteConfirm(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--sf-card, #fff)', borderRadius: 16, padding: '24px 28px',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.25)', maxWidth: 360, width: '100%',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--sf-text)', marginBottom: 8 }}>
                            {language === 'en' ? 'Delete this post?' : 'Xóa bài viết này?'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--sf-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                            {language === 'en' ? 'This action cannot be undone.' : 'Hành động này không thể hoàn tác.'}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    padding: '8px 28px', borderRadius: 10, border: '1px solid var(--sf-border, #ddd)',
                                    background: 'none', color: 'var(--sf-text)', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                }}
                            >{language === 'en' ? 'Cancel' : 'Hủy'}</button>
                            <button
                                onClick={() => { onDelete(post.id); setShowDeleteConfirm(false); }}
                                style={{
                                    padding: '8px 28px', borderRadius: 10, border: 'none',
                                    background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                }}
                            >{language === 'en' ? 'Delete' : 'Xóa'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Post Editor ───────────────────────────────────────────────────────────────

function PostEditor({ currentUser, spaceId, onPostCreated, language = "vi", allHashtags = [] }: {
    currentUser: User;
    spaceId: number;
    onPostCreated: (post: SocialPost) => void;
    language?: "vi" | "en";
    allHashtags?: string[];
}) {
    const { showToast } = useToast();
    const [expanded, setExpanded] = useState(false);
    const [content, setContent] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [libraryUrls, setLibraryUrls] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [currentSpace, setCurrentSpace] = useState<any>(null);
    const [cursorPos, setCursorPos] = useState(0);
    const mention = useMentionAutocomplete(spaceId, content, cursorPos);
    const hashtag = useHashtagAutocomplete(content, cursorPos, allHashtags);

    const handleMentionSelect = (user: MentionUser) => {
        const before = content.slice(0, mention.mentionStart);
        const after = content.slice(cursorPos);
        const inserted = `@${user.name} `;
        setContent(before + inserted + after);
        const newPos = before.length + inserted.length;
        setCursorPos(newPos);
        setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    const handleHashtagSelect = (tag: string) => {
        const before = content.slice(0, hashtag.hashtagStart);
        const after = content.slice(cursorPos);
        const inserted = `#${tag} `;
        setContent(before + inserted + after);
        const newPos = before.length + inserted.length;
        setCursorPos(newPos);
        setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    const EMOJIS = [
        '😊', '😄', '😂', '🥰', '😍', '🤩', '😎', '🥳', '🙏', '❤️',
        '💕', '✨', '🌸', '🌺', '🌻', '🍀', '🌙', '☀️', '🌈', '🔥',
        '💯', '👏', '🤝', '🙌', '💪', '🧘', '🕊️', '⚡', '🎯', '🎉',
    ];

    const insertEmoji = (emoji: string) => {
        const ta = textareaRef.current;
        if (!ta) {
            setContent(prev => prev + emoji);
            setShowEmojiPicker(false);
            return;
        }
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        setContent(prev => prev.slice(0, start) + emoji + prev.slice(end));
        setShowEmojiPicker(false);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    };

    // Fetch space info for media library scope
    useEffect(() => {
        apiService.getSpaceById(spaceId).then(s => setCurrentSpace(s)).catch(() => { });
    }, [spaceId]);



    const addLibraryUrl = (url: string) => {
        if (libraryUrls.length + images.length >= 4) return;
        setLibraryUrls(prev => [...prev, url]);
    };

    const removeImage = (i: number) => {
        const newImages = images.filter((_, idx) => idx !== i);
        setImages(newImages);
        setPreviews(newImages.map(f => URL.createObjectURL(f)));
    };

    const removeLibraryUrl = (i: number) => {
        setLibraryUrls(prev => prev.filter((_, idx) => idx !== i));
    };

    const totalImages = images.length + libraryUrls.length;

    const handleSubmit = async () => {
        if (!content.trim() && totalImages === 0) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('content', content.trim());
            images.forEach(img => formData.append('images', img));
            libraryUrls.forEach(url => formData.append('imageUrls', url));
            const newPost = await apiService.createSocialPost(spaceId, formData);
            onPostCreated(newPost);
            setContent('');
            setImages([]);
            setPreviews([]);
            setLibraryUrls([]);
            setExpanded(false);
        } catch (err) {
            showToast('Đăng bài thất bại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div style={{
                background: 'var(--sf-card)', borderRadius: 12, padding: 16, marginBottom: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)', fontFamily: 'var(--sf-font, inherit)',
            }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={40} />
                    {!expanded ? (
                        <div
                            onClick={() => { setExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 24,
                                background: 'var(--sf-input-bg)', border: '1px solid var(--sf-border)',
                                color: 'var(--sf-muted)', cursor: 'pointer', fontSize: 13
                            }}
                        >
                            {currentUser ? `${currentUser.name} ${translations[language || "vi"].thinking}` : translations[language || "vi"].thinkingAnonymous}
                        </div>
                    ) : (
                        <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: 'var(--sf-text)' }}>
                            {language === "vi" ? "Tạo bài viết" : "Create post"}
                        </div>
                    )}
                </div>

                {expanded && (
                    <>
                        <div style={{ display: 'flex', gap: 10, marginTop: 12, position: 'relative' }}>
                            <div style={{ width: 40, flexShrink: 0 }} />
                            <div style={{ flex: 1, position: 'relative' }}>
                                {mention.isOpen && (
                                    <MentionDropdown
                                        suggestions={mention.suggestions}
                                        onSelect={handleMentionSelect}
                                        anchorRef={textareaRef as React.RefObject<HTMLElement | null>}
                                    />
                                )}
                                {hashtag.isOpen && (
                                    <HashtagDropdown
                                        suggestions={hashtag.suggestions}
                                        onSelect={handleHashtagSelect}
                                        anchorRef={textareaRef as React.RefObject<HTMLElement | null>}
                                    />
                                )}
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={e => { setContent(e.target.value); setCursorPos(e.target.selectionStart); }}
                                    onKeyUp={e => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                    onClick={e => setCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                    placeholder={currentUser ? `${currentUser.name} ${translations[language || 'vi'].thinking}` : translations[language || 'vi'].thinkingAnonymous}
                                    rows={4}
                                    style={{
                                        width: '100%', padding: '8px 0', background: 'none', border: 'none',
                                        color: 'var(--sf-text)', fontSize: 13, resize: 'none', outline: 'none',
                                        fontFamily: 'inherit', lineHeight: 1.5
                                    }}
                                />
                            </div>
                        </div>

                        {/* Image previews — file uploads */}
                        {previews.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 12, borderRadius: 10, overflow: 'hidden' }}>
                                {previews.map((src, i) => (
                                    <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                                        <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                                        <button
                                            onClick={() => removeImage(i)}
                                            style={{
                                                position: 'absolute', top: 4, right: 4,
                                                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1
                                            }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Image previews — from media library */}
                        {libraryUrls.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: previews.length ? 4 : 12, borderRadius: 10, overflow: 'hidden' }}>
                                {libraryUrls.map((url, i) => (
                                    <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                                        <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                                        <button
                                            onClick={() => removeLibraryUrl(i)}
                                            style={{
                                                position: 'absolute', top: 4, right: 4,
                                                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1
                                            }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add to post row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid var(--sf-border)', paddingTop: 12 }}>
                            <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
                                <button
                                    onClick={() => setShowMediaPicker(true)}
                                    disabled={totalImages >= 4}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                                        background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer',
                                        color: totalImages >= 4 ? 'var(--sf-muted)' : '#8b4513', fontSize: 13, fontWeight: 600,
                                        opacity: totalImages >= 4 ? 0.5 : 1
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#8b4513">
                                        <rect x="3" y="3" width="18" height="18" rx="3" />
                                        <circle cx="8.5" cy="8.5" r="1.5" fill="#fff" />
                                        <path d="M21 15l-5-5L5 21h16z" fill="rgba(255,255,255,0.9)" />
                                    </svg>
                                    {translations[language || "vi"].photoVideo.replace(/📸 /g, "")}
                                </button>
                                <button
                                    onClick={() => setShowEmojiPicker(v => !v)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                                        background: showEmojiPicker ? 'var(--sf-hover)' : 'none',
                                        border: 'none', borderRadius: 8, cursor: 'pointer',
                                        color: '#8b4513', fontSize: 13, fontWeight: 600,
                                    }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="11" fill="#8b4513" />
                                        <circle cx="9" cy="10" r="1.5" fill="#fff" />
                                        <circle cx="15" cy="10" r="1.5" fill="#fff" />
                                        <path d="M8 15c1 2 7 2 8 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                                    </svg>
                                    {translations[language || "vi"].feeling.replace(/😊 /g, "")}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => { setExpanded(false); setContent(''); setImages([]); setPreviews([]); setShowEmojiPicker(false); }}
                                    style={{
                                        padding: '8px 16px', borderRadius: 8, border: 'none',
                                        background: 'var(--sf-input-bg)', color: 'var(--sf-text)', cursor: 'pointer', fontWeight: 600, fontSize: 12
                                    }}
                                >{translations[language || "vi"].cancel}</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={(!content.trim() && images.length === 0) || submitting}
                                    style={{
                                        padding: '8px 20px', borderRadius: 8, border: 'none',
                                        background: (content.trim() || images.length > 0) && !submitting ? '#8b4513' : 'var(--sf-border)',
                                        color: '#fff', cursor: (content.trim() || images.length > 0) && !submitting ? 'pointer' : 'default',
                                        fontWeight: 700, fontSize: 12, transition: 'background 0.2s'
                                    }}
                                >
                                    {submitting ? translations[language || "vi"].posting : translations[language || "vi"].post}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* When collapsed — quick action icons */}
                {!expanded && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 12, borderTop: '1px solid var(--sf-border)', paddingTop: 12 }}>
                        <button
                            onClick={() => { setExpanded(true); setTimeout(() => { textareaRef.current?.focus(); setShowMediaPicker(true); }, 80); }}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '8px 0', background: 'none', border: 'none', borderRadius: 8,
                                cursor: 'pointer', color: '#8b4513', fontSize: 13, fontWeight: 600
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#8b4513">
                                <rect x="1" y="1" width="22" height="22" rx="4" />
                                <circle cx="8" cy="9" r="2" fill="#fff" />
                                <path d="M22 16L15 9 8 16" fill="rgba(255,255,255,0.85)" stroke="none" />
                                <path d="M22 20L13 11 2 20" fill="rgba(255,255,255,0.6)" stroke="none" />
                            </svg> {translations[language || "vi"].photoVideo.replace(/📸 /g, "")}
                        </button>
                        <button
                            onClick={() => { setExpanded(true); setTimeout(() => { textareaRef.current?.focus(); setShowEmojiPicker(true); }, 80); }}
                            style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '8px 0', background: 'none', border: 'none', borderRadius: 8,
                                cursor: 'pointer', color: '#8b4513', fontSize: 13, fontWeight: 600
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--sf-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="11" fill="#8b4513" />
                                <circle cx="9" cy="10" r="1.5" fill="#fff" />
                                <circle cx="15" cy="10" r="1.5" fill="#fff" />
                                <path d="M8 15c1 2 7 2 8 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                            </svg> {translations[language || "vi"].feeling.replace(/😊 /g, "")}
                        </button>
                    </div>
                )}
            </div>
            {showEmojiPicker && (
                <div
                    style={{
                        background: 'var(--sf-card)', borderRadius: 12, padding: 12,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)', zIndex: 100,
                        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
                        marginTop: 4, marginBottom: 16, border: '1px solid var(--sf-border)',
                    }}
                >
                    {EMOJIS.map(e => (
                        <button
                            key={e}
                            onClick={() => insertEmoji(e)}
                            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4, borderRadius: 6 }}
                            onMouseEnter={el => (el.currentTarget.style.background = 'var(--sf-hover)')}
                            onMouseLeave={el => (el.currentTarget.style.background = 'none')}
                        >{e}</button>
                    ))}
                </div>
            )}
            {showMediaPicker && (
                <MediaLibraryPicker
                    space={currentSpace}
                    acceptLabel="ảnh"
                    onSelect={url => addLibraryUrl(url)}
                    onClose={() => setShowMediaPicker(false)}
                    defaultFileType="image"
                />
            )}

        </>
    );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────────

function PostSkeleton() {
    return (
        <div style={{ background: 'var(--sf-card)', borderRadius: 12, marginBottom: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {[...Array(3)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sf-skeleton)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ height: 12, width: '40%', background: 'var(--sf-skeleton)', borderRadius: 6, marginBottom: 8 }} />
                        <div style={{ height: 12, width: '80%', background: 'var(--sf-skeleton)', borderRadius: 6, marginBottom: 6 }} />
                        <div style={{ height: 12, width: '60%', background: 'var(--sf-skeleton)', borderRadius: 6 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main SocialFeed ───────────────────────────────────────────────────────────

export const SocialFeed: React.FC<{ spaceId: number; currentUser: User | null; filterUserId?: number | null; onPostsLoaded?: (count: number) => void; searchQuery?: string; focusTrigger?: number; onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void; language?: 'vi' | 'en'; highlightPostId?: number | null; showSavedOnly?: boolean; }> = ({ spaceId, currentUser, filterUserId, onPostsLoaded, searchQuery: externalSearch, focusTrigger, onUserClick, language = 'vi', highlightPostId, showSavedOnly }) => {
    const { showToast } = useToast();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setPage] = useState(1);
    const [, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [internalSearch, setInternalSearch] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const hasMoreRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const pageRef = useRef(1);
    const loadingRef = useRef(false);
    const [highlightedId, setHighlightedId] = useState<number | null>(null);

    // Load space members once for @mention rendering across all PostCards
    const [spaceMembers, setSpaceMembers] = useState<MentionUser[]>([]);
    useEffect(() => {
        apiService.getSpaceMembers(spaceId)
            .then((m: any[]) => setSpaceMembers(m.map((u: any) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }))))
            .catch(() => {});
    }, [spaceId]);

    // Extract unique hashtags from loaded posts for autocomplete
    const allHashtags = React.useMemo(() => {
        const set = new Set<string>();
        posts.forEach(p => {
            const matches = (p.content || '').matchAll(/#([À-ỹ\w]+)/g);
            for (const m of matches) set.add(m[1]);
        });
        return Array.from(set).sort();
    }, [posts]);

    const searchQ = (externalSearch ?? internalSearch).toLowerCase().trim();
    const LIMIT = 10;
    const basePosts = filterUserId ? posts.filter(p => p.userId === filterUserId) : posts;
    const displayedPosts = searchQ
        ? basePosts.filter(p => {
            const m = p.metadata;
            // #11 Hashtag search — if query starts with #, match hashtag
            if (searchQ.startsWith('#')) {
                const tag = searchQ.slice(1);
                return p.content?.toLowerCase().includes(`#${tag}`);
            }
            return (
                p.content?.toLowerCase().includes(searchQ) ||
                p.userName?.toLowerCase().includes(searchQ) ||
                (m?.type === 'ai_share' && (
                    m.aiResponse?.toLowerCase().includes(searchQ) ||
                    m.userQuestion?.toLowerCase().includes(searchQ)
                ))
            );
        })
        : basePosts;

    // #11 Hashtag click handler — sets search to #tag
    const handleHashtagClick = useCallback((tag: string) => {
        setInternalSearch(`#${tag}`);
        setShowSearchBar(true);
    }, []);

    // #5 Pull to refresh state
    const [pullRefreshing, setPullRefreshing] = useState(false);
    const feedContainerRef = useRef<HTMLDivElement>(null);

    const loadPosts = useCallback(async (pg: number, append = false) => {
        if (!currentUser) return;
        if (loadingRef.current) return; // prevent duplicate calls
        loadingRef.current = true;
        if (pg === 1) setLoading(true); else { setLoadingMore(true); loadingMoreRef.current = true; }
        try {
            if (showSavedOnly) {
                // Saved/bookmarked posts mode
                const savedData: SocialPost[] = await apiService.getSavedPosts(spaceId);
                setPosts(savedData);
                hasMoreRef.current = false;
                setHasMore(false);
            } else {
                const res = await apiService.getSocialPosts(spaceId, pg, LIMIT);
                const newData: SocialPost[] = res.data;
                if (append) {
                    setPosts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const fresh = newData.filter(p => !existingIds.has(p.id));
                        const merged = [...prev, ...fresh];
                        const more = newData.length === LIMIT && merged.length < res.total;
                        hasMoreRef.current = more;
                        setHasMore(more);
                        return merged;
                    });
                } else {
                    setPosts(newData);
                    const more = newData.length === LIMIT && newData.length < res.total;
                    hasMoreRef.current = more;
                    setHasMore(more);
                }
                pageRef.current = pg;
                setPage(pg);
            }
        } catch {
            showToast('Không thể tải bài đăng.', 'error');
        } finally {
            loadingRef.current = false;
            loadingMoreRef.current = false;
            setLoading(false);
            setLoadingMore(false);
        }
    }, [spaceId, currentUser, showToast, showSavedOnly]);

    useEffect(() => { if (currentUser) loadPosts(1); else setLoading(false); }, [spaceId, currentUser, showSavedOnly]);

    // Highlight post scroll — when highlightPostId changes, scroll to that post
    useEffect(() => {
        if (!highlightPostId) return;
        setHighlightedId(highlightPostId);
        // Wait for render then scroll
        const timer = setTimeout(() => {
            const el = document.getElementById(`sf-post-${highlightPostId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Remove highlight after animation
                setTimeout(() => setHighlightedId(null), 2500);
            } else {
                setHighlightedId(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [highlightPostId]);

    // Report count to parent
    useEffect(() => {
        if (onPostsLoaded && !loading) onPostsLoaded(displayedPosts.length);
    }, [displayedPosts.length, loading, onPostsLoaded]);

    // Auto-refresh every 30s (only when logged in)
    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(async () => {
            try {
                const res = await apiService.getSocialPosts(spaceId, 1, 10);
                setPosts(prev => {
                    const prevIds = new Set(prev.map(p => p.id));
                    const newPosts = res.data.filter((p: SocialPost) => !prevIds.has(p.id));
                    if (newPosts.length === 0) return prev;
                    return [...newPosts, ...prev];
                });
            } catch { /* silent */ }
        }, 30000);
        return () => clearInterval(interval);
    }, [spaceId, currentUser]);

    // Infinite scroll — setup once, trigger via refs to avoid stale closures
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current && !loadingRef.current) {
                loadPosts(pageRef.current + 1, true);
            }
        }, { rootMargin: '300px' });
        if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [loadPosts]);

    // #5 Pull to refresh (mobile touch gesture)
    useEffect(() => {
        const el = feedContainerRef.current;
        if (!el) return;
        let startY = 0;
        let pulling = false;
        const onTouchStart = (e: TouchEvent) => {
            if (el.scrollTop <= 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        };
        const onTouchEnd = async (e: TouchEvent) => {
            if (!pulling) return;
            const diff = e.changedTouches[0].clientY - startY;
            pulling = false;
            if (diff > 80) {
                setPullRefreshing(true);
                await loadPosts(1);
                setPullRefreshing(false);
            }
        };
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchend', onTouchEnd);
        };
    }, [loadPosts]);

    // Toggle search bar when parent requests it (search button click)
    useEffect(() => {
        if (!focusTrigger) return;
        setShowSearchBar(v => {
            const next = !v;
            if (next) setTimeout(() => searchInputRef.current?.focus(), 50);
            else setInternalSearch('');
            return next;
        });
    }, [focusTrigger]);

    const handlePostCreated = (post: SocialPost) => {
        setPosts(prev => [post, ...prev]);
    };

    const handleDeletePost = async (postId: number) => {
        try {
            await apiService.deleteSocialPost(spaceId, postId);
            setPosts(prev => prev.filter(p => p.id !== postId));
            showToast('Đã xóa bài viết.', 'success');
        } catch {
            showToast('Xóa bài viết thất bại.', 'error');
        }
    };

    return (
        <>
            {/* CSS Variables — theme-aware */}
            <style>{`
                :root {
                    --sf-card: #fff;
                    --sf-bg: #f0f2f5;
                    --sf-input-bg: #f0f2f5;
                    --sf-text: #050505;
                    --sf-muted: #65676b;
                    --sf-border: #e4e6ea;
                    --sf-hover: rgba(0,0,0,0.05);
                    --sf-skeleton: #e4e6ea;
                    --sf-font: inherit;
                    --sf-font-size: 15px;
                    --sf-post-text-size: 15px;
                }
                @media (prefers-color-scheme: dark) {
                    :root {
                        --sf-card: #242526;
                        --sf-bg: #18191a;
                        --sf-input-bg: #3a3b3c;
                        --sf-text: #e4e6eb;
                        --sf-muted: #b0b3b8;
                        --sf-border: #3a3b3c;
                        --sf-hover: rgba(255,255,255,0.07);
                        --sf-skeleton: #3a3b3c;
                    }
                }
                [data-theme="dark"] {
                    --sf-card: #242526;
                    --sf-bg: #18191a;
                    --sf-input-bg: #3a3b3c;
                    --sf-text: #e4e6eb;
                    --sf-muted: #b0b3b8;
                    --sf-border: #3a3b3c;
                    --sf-hover: rgba(255,255,255,0.07);
                    --sf-skeleton: #3a3b3c;
                }
                /* ── Giác Ngộ Theme ── */
                [data-theme="giacngo"] {
                    --sf-card: #f2ead1;
                    --sf-bg: #e8d6a4;
                    --sf-input-bg: #efe0bd;
                    --sf-text: #1f2937;
                    --sf-muted: #6b7280;
                    --sf-border: #dcd5bc;
                    --sf-hover: rgba(153,27,27,0.06);
                    --sf-skeleton: #dcd5bc;
                    --sf-font: 'Libre Baskerville', 'Lora', 'Merriweather', Georgia, serif;
                    --sf-font-size: 13px;
                    --sf-post-text-size: 13px;
                }
                @keyframes sf-skeleton-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .sf-skeleton { animation: sf-skeleton-pulse 1.5s ease infinite; }
                @keyframes sf-highlight-flash {
                    0% { box-shadow: 0 0 0 3px rgba(185,148,90,0.7); }
                    50% { box-shadow: 0 0 12px 4px rgba(185,148,90,0.4); }
                    100% { box-shadow: 0 0 0 0 rgba(185,148,90,0); }
                }
                .sf-post-highlight {
                    animation: sf-highlight-flash 2s ease-out;
                    border-radius: 12px;
                }
                /* Apply giacngo font to social feed content */
                [data-theme="giacngo"] .sf-post-content,
                [data-theme="giacngo"] .sf-post-content * {
                    font-family: var(--sf-font) !important;
                    font-size: var(--sf-post-text-size) !important;
                    color: var(--sf-text);
                    line-height: 1.7;
                }

                /* ── Lightbox layout ── */
                .sf-lightbox-container {
                    position: fixed; inset: 0; z-index: 99999;
                    display: flex; flex-direction: row;
                    background: rgba(0,0,0,0.95);
                    backdrop-filter: blur(10px);
                }
                .sf-lightbox-image-area {
                    flex: 1; position: relative;
                    display: flex; align-items: center; justify-content: center;
                    min-height: 0;
                    padding: 20px;
                }
                .sf-lightbox-sidebar {
                    width: 380px; background: var(--sf-card, #fdfbf7);
                    display: flex; flex-direction: column;
                    height: 100%; border-left: 1px solid var(--sf-border, #ebdcc5);
                    font-family: var(--sf-font, inherit);
                    flex-shrink: 0;
                    min-height: 0;
                    overflow: hidden;
                    box-shadow: -10px 0 30px rgba(0,0,0,0.2);
                }
                /* Improved Action Buttons */
                .sf-post-actions button {
                    min-height: 44px; /* Apple/Google standard for touch targets */
                    transition: transform 0.1s active;
                }
                .sf-post-actions button:active {
                    transform: scale(0.95);
                }

                /* ── Mobile / Tablet responsive: image on top, comments below ── */
                @media (max-width: 768px) {
                    .sf-lightbox-container {
                        flex-direction: column !important;
                    }
                    .sf-lightbox-image-area {
                        flex: none !important;
                        max-height: 50vh;
                        min-height: 250px;
                        padding: 10px;
                    }
                    .sf-lightbox-image-area img {
                        max-height: 48vh !important;
                        max-width: 100% !important;
                        object-fit: contain;
                    }
                    .sf-lightbox-sidebar {
                        width: 100% !important;
                        height: auto !important;
                        flex: 1 !important;
                        border-left: none !important;
                        border-top: 1px solid var(--sf-border, #ebdcc5);
                        min-height: 0 !important;
                        overflow-y: auto !important;
                        border-radius: 20px 20px 0 0; /* Modern bottom sheet look */
                    }
                    /* Navigation arrows on mobile: smaller and positioned better */
                    .sf-lightbox-image-area button {
                        width: 36px !important;
                        height: 36px !important;
                        font-size: 20px !important;
                    }
                }
            `}</style>

            <div ref={feedContainerRef} style={{ maxWidth: 680, margin: '0 auto', padding: '0 12px' }}>
                {/* #5 Pull to refresh indicator */}
                {pullRefreshing && (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <div style={{
                            display: 'inline-block', width: 24, height: 24,
                            border: '3px solid var(--sf-border)', borderTopColor: '#8b4513',
                            borderRadius: '50%', animation: 'sfPullSpin 0.6s linear infinite',
                        }} />
                    </div>
                )}
                {/* Search bar — only on main feed, toggle via search button */}
                {!filterUserId && showSearchBar && (
                    <div style={{ marginBottom: 12, position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={internalSearch}
                            onChange={e => setInternalSearch(e.target.value)}
                            placeholder={translations[language].searchPosts}
                            style={{
                                width: '100%', padding: '9px 38px 9px 38px',
                                borderRadius: 20, border: '1px solid var(--sf-border)',
                                background: 'var(--sf-card)', color: 'var(--sf-text)',
                                fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        />
                        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-muted)' }}
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <button onClick={() => { setInternalSearch(''); setShowSearchBar(false); }}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 16, lineHeight: 1 }}>
                            ×
                        </button>
                    </div>
                )}

                {currentUser && !showSavedOnly && (!filterUserId || filterUserId === currentUser.id) && (
                    <PostEditor currentUser={currentUser} spaceId={spaceId} onPostCreated={handlePostCreated} language={language} allHashtags={allHashtags} />
                )}
                {!currentUser && (
                    <div style={{
                        background: 'var(--sf-card)', borderRadius: 12, padding: '20px 24px',
                        marginBottom: 16, textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--sf-text)', marginBottom: 4 }}>
                            Đăng nhập để tham gia cộng đồng
                        </div>
                        <div style={{ color: 'var(--sf-muted)', fontSize: 14 }}>
                            Bạn cần đăng nhập để xem, đăng bài và bình luận.
                        </div>
                    </div>
                )}

                {loading ? (
                    <><PostSkeleton /></>
                ) : displayedPosts.length === 0 ? (
                    <div style={{
                        background: 'var(--sf-card)', borderRadius: 12, padding: '40px 24px',
                        textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>{showSavedOnly ? '🔖' : '📭'}</div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--sf-text)', marginBottom: 6 }}>
                            {showSavedOnly ? (language === 'vi' ? 'Chưa có bài viết nào được lưu' : 'No saved posts') : filterUserId ? translations[language].noUserPostsYet : translations[language].noPostsYet}
                        </div>
                        <div style={{ color: 'var(--sf-muted)', fontSize: 14 }}>
                            {showSavedOnly ? (language === 'vi' ? 'Nhấn 🔖 trên bài viết để lưu lại đọc sau.' : 'Tap 🔖 on a post to save it for later.') : filterUserId ? translations[language].shareSomething : translations[language].beFirst}
                        </div>
                    </div>
                ) : (
                    displayedPosts.map(post => (
                        <div key={post.id} id={`sf-post-${post.id}`} className={highlightedId === post.id ? 'sf-post-highlight' : ''}>
                            <PostCard
                                post={post}
                                currentUser={currentUser}
                                spaceId={spaceId}
                                onDelete={handleDeletePost}
                                onRepost={handlePostCreated}
                                onUserClick={onUserClick}
                                language={language}
                                spaceMembers={spaceMembers}
                                onHashtagClick={handleHashtagClick}
                            />
                        </div>
                    ))
                )}

                {loadingMore && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid var(--sf-border)', borderTopColor: '#8b4513', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                )}

                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
        </>
    );
};

export default SocialFeed;

// ─── User Photo Gallery ────────────────────────────────────────────────────────

interface PhotoItem { url: string; postId: number; post: SocialPost; }

export const UserPhotoGallery: React.FC<{
    spaceId: number;
    userId: number;
    currentUser: User | null;
    language?: 'vi' | 'en';
}> = ({ spaceId, userId, currentUser, language = 'vi' }) => {
    const { showToast } = useToast();
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<PhotoItem | null>(null);
    const [selectedIdx, setSelectedIdx] = useState(0);

    // Load space members for @mention rendering
    const [spaceMembers, setSpaceMembers] = useState<MentionUser[]>([]);
    useEffect(() => {
        apiService.getSpaceMembers(spaceId)
            .then((m: any[]) => setSpaceMembers(m.map((u: any) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }))))
            .catch(() => {});
    }, [spaceId]);

    // Comments for selected photo post
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Edit description
    const [galleryMenuOpen, setGalleryMenuOpen] = useState(false);
    const [galleryEditing, setGalleryEditing] = useState(false);
    const [galleryEditText, setGalleryEditText] = useState('');
    const [galleryEditSaving, setGalleryEditSaving] = useState(false);
    const galleryMenuRef = useRef<HTMLDivElement>(null);

    // Gallery comment @mention
    const [galleryCmtCursorPos, setGalleryCmtCursorPos] = useState(0);
    const galleryCommentMention = useMentionAutocomplete(spaceId, commentText, galleryCmtCursorPos);
    const handleGalleryCommentMentionSelect = (user: MentionUser) => {
        const before = commentText.slice(0, galleryCommentMention.mentionStart);
        const after = commentText.slice(galleryCmtCursorPos);
        const inserted = `@${user.name} `;
        setCommentText(before + inserted + after);
        const newPos = before.length + inserted.length;
        setGalleryCmtCursorPos(newPos);
        setTimeout(() => { commentInputRef.current?.focus(); commentInputRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    // Gallery edit @mention
    const [galleryEditCursorPos, setGalleryEditCursorPos] = useState(0);
    const galleryEditMention = useMentionAutocomplete(spaceId, galleryEditText, galleryEditCursorPos);
    const galleryEditRef = useRef<HTMLTextAreaElement>(null);
    const handleGalleryEditMentionSelect = (user: MentionUser) => {
        const before = galleryEditText.slice(0, galleryEditMention.mentionStart);
        const after = galleryEditText.slice(galleryEditCursorPos);
        const inserted = `@${user.name} `;
        setGalleryEditText(before + inserted + after);
        const newPos = before.length + inserted.length;
        setGalleryEditCursorPos(newPos);
        setTimeout(() => { galleryEditRef.current?.focus(); galleryEditRef.current?.setSelectionRange(newPos, newPos); }, 0);
    };

    // Close menu on click outside
    useEffect(() => {
        if (!galleryMenuOpen) return;
        const handler = (e: MouseEvent) => {
            if (galleryMenuRef.current && !galleryMenuRef.current.contains(e.target as Node)) setGalleryMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [galleryMenuOpen]);

    const handleGallerySaveEdit = async () => {
        if (!selected) return;
        setGalleryEditSaving(true);
        try {
            const formData = new FormData();
            formData.append('content', galleryEditText);
            (selected.post.imageUrls || []).forEach((url: string) => formData.append('imageUrls', url));
            await apiService.updateSocialPost(spaceId, selected.postId, formData);
            selected.post.content = galleryEditText;
            setGalleryEditing(false);
            showToast(language === 'vi' ? 'Đã cập nhật mô tả' : 'Description updated', 'success');
        } catch { showToast(language === 'vi' ? 'Lỗi cập nhật' : 'Update failed', 'error'); }
        finally { setGalleryEditSaving(false); }
    };

    const [galleryDeleting, setGalleryDeleting] = useState(false);
    const handleGalleryDeleteImage = async () => {
        if (!selected || !window.confirm(language === 'vi' ? 'Xóa ảnh này?' : 'Delete this photo?')) return;
        setGalleryDeleting(true);
        setGalleryMenuOpen(false);
        try {
            const remaining = (selected.post.imageUrls || []).filter((u: string) => u !== selected.url);
            if (remaining.length === 0) {
                // Last image — delete entire post
                await apiService.deleteSocialPost(spaceId, selected.postId);
                setPhotos(prev => prev.filter(p => p.postId !== selected.postId));
            } else {
                // Multiple images — update post removing this image
                const formData = new FormData();
                formData.append('content', selected.post.content || '');
                remaining.forEach((url: string) => formData.append('imageUrls', url));
                await apiService.updateSocialPost(spaceId, selected.postId, formData);
                selected.post.imageUrls = remaining;
                setPhotos(prev => prev.filter(p => !(p.postId === selected.postId && p.url === selected.url)));
            }
            setSelected(null);
            showToast(language === 'vi' ? 'Đã xóa ảnh' : 'Photo deleted', 'success');
        } catch { showToast(language === 'vi' ? 'Xóa ảnh thất bại' : 'Failed to delete photo', 'error'); }
        finally { setGalleryDeleting(false); }
    };

    const t = {
        vi: { noPhotos: 'Chưa có ảnh nào', writeComment: 'Viết bình luận...', replyingTo: 'Đang phản hồi', send: 'Gửi', reply: 'Phản hồi', delete: 'Xóa', close: 'Đóng', editDesc: '✏️ Chỉnh sửa mô tả' },
        en: { noPhotos: 'No photos yet', writeComment: 'Write a comment...', replyingTo: 'Replying to', send: 'Send', reply: 'Reply', delete: 'Delete', close: 'Close', editDesc: '✏️ Edit description' },
    }[language];

    useEffect(() => {
        setLoading(true);
        apiService.getSocialPosts(spaceId, 1, 100)
            .then(res => {
                const items: PhotoItem[] = [];
                (res.data as SocialPost[]).filter(p => p.userId === userId).forEach(post => {
                    (post.imageUrls || []).forEach(url => items.push({ url, postId: post.id, post }));
                });
                setPhotos(items);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [spaceId, userId]);

    const openPhoto = async (item: PhotoItem, idx?: number) => {
        setSelected(item);
        if (idx !== undefined) setSelectedIdx(idx);
        setGalleryEditing(false);
        setComments([]);
        setLoadingComments(true);
        try {
            const data = await apiService.getSocialComments(spaceId, item.postId);
            setComments(data);
        } catch { /* silent */ }
        finally { setLoadingComments(false); }
    };

    const navigatePhoto = (dir: -1 | 1) => {
        const newIdx = selectedIdx + dir;
        if (newIdx >= 0 && newIdx < photos.length) {
            openPhoto(photos[newIdx], newIdx);
        }
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !currentUser || !selected) return;
        setSubmittingComment(true);
        try {
            const nc = await apiService.addSocialComment(spaceId, selected.postId, commentText.trim(), replyTo?.id);
            setComments(prev => [...prev, nc]);
            setCommentText('');
            setReplyTo(null);
        } catch { showToast('Gửi bình luận thất bại.', 'error'); }
        finally { setSubmittingComment(false); }
    };

    const handleDeleteComment = async (cid: number) => {
        if (!selected) return;
        try {
            await apiService.deleteSocialComment(spaceId, selected.postId, cid);
            setComments(prev => prev.filter(c => c.id !== cid));
        } catch { /* silent */ }
    };

    const topLevel = comments.filter(c => !c.parentCommentId);
    const renderComment = (c: SocialComment, depth: number): React.ReactNode => {
        const replies = comments.filter(r => r.parentCommentId === c.id);
        const canDel = currentUser && (currentUser.id === c.userId || currentUser.id === selected?.post.userId || (currentUser.roleIds?.length ?? 0) > 0);
        const cLiked = c.isLikedByMe || false;
        const cLikes = c.likesCount || 0;
        return (
            <React.Fragment key={c.id}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, marginLeft: depth * 20 }}>
                    <Avatar name={c.userName} url={c.userAvatarUrl} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 2, lineHeight: 1.2 }}>{c.userName}</div>
                        <div style={{ fontSize: 13, color: '#4a4a4a', lineHeight: 1.5 }}>{renderMentionText(c.content, spaceMembers, undefined)}</div>
                        <div style={{ display: 'flex', gap: 14, marginTop: 3, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#a08b7a' }}>{timeAgo(c.createdAt, language)}</span>
                            {currentUser && <button onClick={async () => {
                                try {
                                    const res = await apiService.toggleCommentLike(spaceId, selected!.postId, c.id);
                                    setComments(prev => prev.map(cc => cc.id === c.id ? { ...cc, isLikedByMe: res.liked, likesCount: res.likesCount } : cc));
                                } catch { /* silent */ }
                            }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: cLiked ? '#e74c3c' : '#a08b7a', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                                {cLiked ? '\u2764\ufe0f' : '\u2661'}{cLikes > 0 && <span>{cLikes}</span>}
                            </button>}
                            {currentUser && <button onClick={() => { setReplyTo({ id: c.id, name: c.userName }); commentInputRef.current?.focus(); }} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: '#8b4513', cursor: 'pointer', padding: 0 }}>{t.reply}</button>}
                            {canDel && <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#e74c3c', cursor: 'pointer', padding: 0 }}>{t.delete}</button>}
                        </div>
                    </div>
                </div>
                {replies.map(r => renderComment(r, depth + 1))}
            </React.Fragment>
        );
    };

    if (loading) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {[...Array(9)].map((_, i) => <div key={i} className="sf-skeleton" style={{ aspectRatio: '1', borderRadius: 6, background: 'var(--sf-skeleton)' }} />)}
        </div>
    );

    if (photos.length === 0) return (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sf-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
            {t.noPhotos}
        </div>
    );

    return (
        <>
            {/* Photo Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                {photos.map((item, i) => {
                    const isOwner = currentUser && currentUser.id === item.post.userId;
                    return (
                        <div
                            key={i}
                            style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 4, position: 'relative' }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.opacity = '0.9';
                                const btn = (e.currentTarget as HTMLDivElement).querySelector('.photo-menu-btn') as HTMLElement | null;
                                if (btn) btn.style.opacity = '1';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.opacity = '1';
                                const btn = (e.currentTarget as HTMLDivElement).querySelector('.photo-menu-btn') as HTMLElement | null;
                                if (btn) btn.style.opacity = '0';
                                const drop = (e.currentTarget as HTMLDivElement).querySelector('.photo-menu-drop') as HTMLElement | null;
                                if (drop) drop.style.display = 'none';
                            }}
                        >
                            <img
                                src={item.url} alt=""
                                onClick={() => openPhoto(item, i)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                            />
                            {isOwner && (
                                <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 10 }}>
                                    <button
                                        className="photo-menu-btn"
                                        onClick={e => {
                                            e.stopPropagation();
                                            const drop = (e.currentTarget.nextElementSibling as HTMLElement);
                                            drop.style.display = drop.style.display === 'block' ? 'none' : 'block';
                                        }}
                                        style={{
                                            opacity: 0, transition: 'opacity 0.15s',
                                            background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                                            width: 28, height: 28, color: '#fff', fontSize: 16, fontWeight: 700,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            lineHeight: 1, backdropFilter: 'blur(4px)'
                                        }}
                                    >⋯</button>
                                    <div
                                        className="photo-menu-drop"
                                        style={{
                                            display: 'none', position: 'absolute', right: 0, top: '110%',
                                            background: '#fdfbf7', border: '1px solid #ebdcc5', borderRadius: 10,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 160, overflow: 'hidden', zIndex: 99
                                        }}
                                    >
                                        <button
                                            onClick={async e => {
                                                e.stopPropagation();
                                                if (!window.confirm(language === 'vi' ? 'Xóa ảnh này?' : 'Delete this photo?')) return;
                                                try {
                                                    const remaining = (item.post.imageUrls || []).filter((u: string) => u !== item.url);
                                                    if (remaining.length === 0) {
                                                        await apiService.deleteSocialPost(spaceId, item.postId);
                                                        setPhotos(prev => prev.filter(p => p.postId !== item.postId));
                                                    } else {
                                                        const fd = new FormData();
                                                        fd.append('content', item.post.content || '');
                                                        remaining.forEach((u: string) => fd.append('imageUrls', u));
                                                        await apiService.updateSocialPost(spaceId, item.postId, fd);
                                                        item.post.imageUrls = remaining;
                                                        setPhotos(prev => prev.filter(p => !(p.postId === item.postId && p.url === item.url)));
                                                    }
                                                    showToast(language === 'vi' ? 'Đã xóa ảnh' : 'Photo deleted', 'success');
                                                } catch { showToast(language === 'vi' ? 'Xóa thất bại' : 'Delete failed', 'error'); }
                                            }}
                                            style={{
                                                display: 'block', width: '100%', padding: '10px 14px',
                                                background: 'none', border: 'none', textAlign: 'left',
                                                color: '#e74c3c', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                whiteSpace: 'nowrap'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(231,76,60,0.07)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            🗑️ {language === 'vi' ? 'Xóa ảnh này' : 'Delete photo'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Fullscreen Lightbox Modal */}
            {selected && ReactDOM.createPortal(
                <div
                    onClick={() => setSelected(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'row', background: 'rgba(0,0,0,0.92)' }}
                    className="gn-lightbox-overlay"
                >
                    <style>{`
                        @media (max-width: 768px) {
                            .gn-lightbox-overlay { flex-direction: column !important; }
                            .gn-lightbox-img-area { flex: none !important; max-height: 45vh !important; min-height: 160px !important; }
                            .gn-lightbox-img-area img { max-height: 43vh !important; }
                            .gn-lightbox-sidebar { width: 100% !important; height: auto !important; flex: 1 !important; border-left: none !important; border-top: 1px solid #ebdcc5 !important; }
                        }
                    `}</style>
                    {/* Image area */}
                    <div
                        onClick={e => e.stopPropagation()}
                        className="gn-lightbox-img-area"
                        style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelected(null)}
                            style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 22, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                        {/* Prev button */}
                        {selectedIdx > 0 && (
                            <button
                                onClick={() => navigatePhoto(-1)}
                                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 24, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                            >‹</button>
                        )}
                        {/* Next button */}
                        {selectedIdx < photos.length - 1 && (
                            <button
                                onClick={() => navigatePhoto(1)}
                                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 24, cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                            >›</button>
                        )}
                        {/* Photo counter */}
                        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, padding: '4px 12px', borderRadius: 12, fontWeight: 600 }}>
                            {selectedIdx + 1} / {photos.length}
                        </div>
                        <img
                            src={selected.url}
                            alt=""
                            style={{ maxWidth: '95%', maxHeight: '95vh', objectFit: 'contain', userSelect: 'none', borderRadius: 4 }}
                        />
                    </div>

                    {/* Sidebar: Post content + Comments */}
                    <div
                        onClick={e => e.stopPropagation()}
                        className="gn-lightbox-sidebar"
                        style={{ width: 380, background: '#fdfbf7', display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #ebdcc5', flexShrink: 0, minHeight: 0, overflow: 'hidden' }}
                    >
                        {/* Header: author + menu */}
                        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #ebdcc5', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <Avatar name={selected.post.userName} url={selected.post.userAvatarUrl} size={40} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{selected.post.userName}</div>
                                <div style={{ fontSize: 11, color: '#a08b7a', marginTop: 2 }}>{timeAgo(selected.post.createdAt, language)}</div>
                            </div>
                            {/* ⋯ menu — only for owner */}
                            {currentUser && currentUser.id === selected.post.userId && (
                                <div ref={galleryMenuRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setGalleryMenuOpen(v => !v)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#a08b7a', padding: '4px 8px', borderRadius: 8 }}
                                    >⋯</button>
                                    {galleryMenuOpen && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fdfbf7', border: '1px solid #ebdcc5', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
                                            <button
                                                onClick={() => { setGalleryEditing(true); setGalleryEditText(selected.post.content || ''); setGalleryMenuOpen(false); }}
                                                style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: '#1a1a1a', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                            >{t.editDesc}</button>
                                            <button
                                                onClick={handleGalleryDeleteImage}
                                                disabled={galleryDeleting}
                                                style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderTop: '1px solid #ebdcc5', textAlign: 'left', color: '#e74c3c', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: galleryDeleting ? 0.5 : 1 }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(231,76,60,0.06)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                            >
                                                {galleryDeleting ? '...' : (language === 'vi' ? '🗑️ Xóa ảnh này' : '🗑️ Delete photo')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Scrollable: post content + comments */}
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {/* Post content — editable */}
                            {galleryEditing ? (
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebdcc5', position: 'relative' }}>
                                    <textarea
                                        ref={galleryEditRef}
                                        value={galleryEditText}
                                        onChange={e => { setGalleryEditText(e.target.value); setGalleryEditCursorPos(e.target.selectionStart); }}
                                        onKeyUp={e => setGalleryEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        onClick={e => setGalleryEditCursorPos((e.target as HTMLTextAreaElement).selectionStart)}
                                        style={{ width: '100%', minHeight: 60, padding: '10px 12px', borderRadius: 8, border: '1px solid #ebdcc5', background: '#fff', color: '#1a1a1a', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                                    />
                                    {galleryEditMention.isOpen && (
                                        <MentionDropdown suggestions={galleryEditMention.suggestions} onSelect={handleGalleryEditMentionSelect} anchorRef={galleryEditRef as React.RefObject<HTMLElement | null>} />
                                    )}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                                        <button onClick={() => setGalleryEditing(false)} disabled={galleryEditSaving} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #ebdcc5', background: 'none', color: '#1a1a1a', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button>
                                        <button onClick={handleGallerySaveEdit} disabled={galleryEditSaving} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#8b4513', color: '#fff', cursor: galleryEditSaving ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: galleryEditSaving ? 0.6 : 1 }}>{galleryEditSaving ? '...' : (language === 'vi' ? 'Lưu' : 'Save')}</button>
                                    </div>
                                </div>
                            ) : selected.post.content?.trim() && (
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebdcc5', fontSize: 14, color: '#3a3a3a', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {selected.post.content}
                                </div>
                            )}

                            {/* Comments title */}
                            <div style={{ padding: '14px 20px 0' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#c4a482', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                                    {language === 'vi' ? 'Bình luận' : 'Comments'}
                                </div>
                            </div>

                            {/* Comments list */}
                            <div style={{ padding: '0 20px 16px' }}>
                                {loadingComments ? (
                                    <div style={{ textAlign: 'center', color: '#c4a482', fontSize: 14, padding: '8px 0' }}>...</div>
                                ) : topLevel.length === 0 ? (
                                    <div style={{ color: '#c4a482', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                                        {language === 'vi' ? 'Chưa có bình luận' : 'No comments yet'}
                                    </div>
                                ) : topLevel.map(c => renderComment(c, 0))}
                            </div>
                        </div>

                        {/* Comment input — fixed at bottom */}
                        {currentUser && (
                            <div style={{ flexShrink: 0, borderTop: '1px solid #ebdcc5', padding: '14px 20px 20px', background: '#fdfbf7' }}>
                                {replyTo && (
                                    <div style={{ fontSize: 11, color: '#8b4513', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span>{t.replyingTo} <strong>{replyTo.name}</strong></span>
                                        <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}>×</button>
                                    </div>
                                )}
                                <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={32} />
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <MentionDropdown
                                            suggestions={galleryCommentMention.suggestions}
                                            onSelect={handleGalleryCommentMentionSelect}
                                            anchorRef={commentInputRef as React.RefObject<HTMLElement | null>}
                                        />
                                        <input
                                            ref={commentInputRef}
                                            value={commentText}
                                            onChange={e => { setCommentText(e.target.value); setGalleryCmtCursorPos(e.target.selectionStart ?? 0); }}
                                            onKeyUp={e => setGalleryCmtCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                            onClick={e => setGalleryCmtCursorPos((e.target as HTMLInputElement).selectionStart ?? 0)}
                                            placeholder={t.writeComment}
                                            style={{
                                                width: '100%', padding: '9px 42px 9px 14px', borderRadius: 24,
                                                border: '1px solid #ebdcc5', background: '#fff',
                                                color: '#1a1a1a', fontSize: 13, outline: 'none',
                                                boxSizing: 'border-box', fontFamily: 'inherit'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!commentText.trim() || submittingComment}
                                            style={{
                                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none',
                                                cursor: commentText.trim() ? 'pointer' : 'default',
                                                color: commentText.trim() ? '#8b4513' : '#c4a482',
                                                fontSize: 20, lineHeight: 1
                                            }}
                                        >↑</button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            , document.body)}
        </>
    );
};
