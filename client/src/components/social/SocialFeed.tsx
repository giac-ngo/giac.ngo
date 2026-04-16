import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { apiService } from '../../services/apiService';
import { SocialPost, SocialComment, User } from '../../types';
import { useToast } from '../ToastProvider';
import { MediaLibraryPicker } from '../MediaLibraryPicker';

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
        from: 'Từ', mediaLibrary: 'Thư Viện Media', selectImages: 'Chọn tối đa 4 ảnh', mediaLibOrDevice: 'Chọn từ Thư Viện Media hoặc tải lên từ thiết bị'
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
        from: 'From', mediaLibrary: 'Media Library', selectImages: 'Select up to 4 images', mediaLibOrDevice: 'Select from Media Library or upload from device'
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

function PhotoGrid({ urls, onImageClick }: { urls: string[]; onImageClick?: (idx: number) => void }) {
    const [lightboxIdx, setLightboxIdx] = React.useState<number | null>(null);
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
    const prev = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => i != null && i > 0 ? i - 1 : i); };
    const next = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => i != null && i < urls.length - 1 ? i + 1 : i); };

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
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        touchAction: 'none',
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
    comment, currentUser, spaceId, postId, postUserId,
    onDelete, onReply, onUserClick, parentComment
}: {
    comment: SocialComment;
    currentUser: User | null;
    spaceId: number;
    postId: number;
    postUserId: number;
    onDelete: (id: number) => void;
    onReply: (parentId: number, userName: string) => void;
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void;
    parentComment?: SocialComment | null;
    language?: 'vi' | 'en';
}) {
    const canDelete = currentUser && (
        currentUser.id === comment.userId ||
        currentUser.id === postUserId ||
        (currentUser.roleIds && currentUser.roleIds.length > 0)
    );

    return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Avatar name={comment.userName} url={comment.userAvatarUrl} size={30} />
            <div style={{ flex: 1 }}>
                <div style={{
                    background: 'var(--sf-input-bg)', borderRadius: 18,
                    padding: '8px 12px', display: 'inline-block', maxWidth: '100%'
                }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--sf-text)', marginBottom: 2, cursor: onUserClick ? 'pointer' : 'default' }} onClick={() => onUserClick && onUserClick(comment.userId, comment.userName, comment.userAvatarUrl)}>
                        {comment.userName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sf-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {(() => {
                            if (parentComment && comment.content.startsWith(`@${parentComment.userName} `)) {
                                const prefix = `@${parentComment.userName} `;
                                const rest = comment.content.slice(prefix.length);
                                return (
                                    <>
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(parentComment.userId, parentComment.userName, parentComment.userAvatarUrl); }}
                                            style={{ color: '#8b4513', fontWeight: 600, cursor: onUserClick ? 'pointer' : 'default' }}
                                        >
                                            {prefix.trim()}
                                        </span>
                                        {' '}{rest}
                                    </>
                                );
                            }
                            return comment.content;
                        })()}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 3, paddingLeft: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--sf-muted)' }}>{timeAgo(comment.createdAt, language)}</span>
                    <button
                        onClick={() => onReply(comment.id, comment.userName)}
                        style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--sf-muted)', cursor: 'pointer', padding: 0 }}
                    >{translations[language].reply}</button>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(comment.id)}
                            style={{ background: 'none', border: 'none', fontSize: 12, color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                        >{translations[language].delete}</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Comment Thread ────────────────────────────────────────────────────────────

function CommentThread({
    comment, allComments, currentUser, spaceId, postId, postUserId,
    onDelete, onReply, onUserClick, language = 'vi'
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
    language?: 'vi' | 'en';
}) {
    const replies = allComments.filter(c => c.parentCommentId === comment.id);
    const parentComment = allComments.find(c => c.id === comment.parentCommentId);
    return (
        <div key={comment.id}>
            <CommentItem
                comment={comment} currentUser={currentUser}
                spaceId={spaceId} postId={postId} postUserId={postUserId}
                onDelete={onDelete} onReply={onReply}
                onUserClick={onUserClick} parentComment={parentComment}
                language={language}
            />
            {replies.length > 0 && (
                <div style={{ paddingLeft: 38 }}>
                    {replies.map(reply => (
                        <CommentThread
                            key={reply.id} comment={reply} allComments={allComments}
                            currentUser={currentUser} spaceId={spaceId} postId={postId}
                            postUserId={postUserId} onDelete={onDelete} onReply={onReply}
                            onUserClick={onUserClick}
                            language={language}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Quoted Post Body ────────────────────────────────────────────────────────────
// Renders a quoted/reposted post's content exactly like the original, handles
// both regular posts and ai_share posts (with AI metadata block).

function QuotedPostBody({ post, maxLines = 5 }: { post: any; maxLines?: number }) {
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
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: maxLines,
                            WebkitBoxOrient: 'vertical' as any,
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
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: maxLines,
                            WebkitBoxOrient: 'vertical' as any,
                        }}>
                            {post.content}
                        </div>
                    )}
                    {post.imageUrls?.length > 0 && (
                        <img
                            src={post.imageUrls[0]} alt=""
                            style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block', marginTop: post.content?.trim() ? 6 : 0, borderRadius: 6 }}
                        />
                    )}
                </>
            )}
        </>
    );
}

function PostCard({ post, currentUser, spaceId, onDelete, onRepost, onUserClick, language }: {
    post: SocialPost;
    currentUser: User | null;
    spaceId: number;
    onDelete: (id: number) => void;
    onRepost?: (post: SocialPost) => void;
    onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void;
    language?: 'vi' | 'en';
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
    const [expanded, setExpanded] = useState(false);
    const [aiExpanded, setAiExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);
    const [repostModalOpen, setRepostModalOpen] = useState(false);
    const [repostComment, setRepostComment] = useState('');
    const [repostSubmitting, setRepostSubmitting] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

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
            const newComment = await apiService.addSocialComment(
                spaceId, post.id, commentText.trim(), replyTo?.id
            );
            setComments(cs => [...cs, newComment]);
            setCommentText('');
            setReplyTo(null);
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

    const canDelete = currentUser && (currentUser.id === post.userId || (currentUser.roleIds && currentUser.roleIds.length > 0));

    // Group replies under their parent
    const topLevel = comments.filter(c => !c.parentCommentId);
    const getReplies = (id: number) => comments.filter(c => c.parentCommentId === id);

    return (
        <div style={{
            background: 'var(--sf-card)', borderRadius: 12,
            marginBottom: 16, overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            fontFamily: 'var(--sf-font, inherit)',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
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
                    <div style={{ fontSize: 11, color: 'var(--sf-muted)' }}>
                        <span>{timeAgo(post.createdAt, language || 'vi')}</span>
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
                                    zIndex: 100, minWidth: 160, overflow: 'hidden'
                                }}>
                                    <button
                                        onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                                        style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', color: '#e74c3c', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                                    >{translations[language || "vi"].deletePost}</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '0 16px 12px' }}>
                {post.metadata?.type === 'ai_share' || post.metadata?.type === 'library_share' ? (
                    <>
                        {/* User's personal comment */}
                        {post.content?.trim() && post.content.trim() !== ' ' && (
                            <div style={{ fontSize: 13, color: 'var(--sf-text)', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {post.content}
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
                        {post.content?.trim() && (
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
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{post.content}</span>
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

            {/* Photos */}
            {post.imageUrls?.length > 0 && <PhotoGrid urls={post.imageUrls} onImageClick={i => { setLightboxIdx(i); if (comments.length === 0) loadComments(); }} />}

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
                    <QuotedPostBody post={post.quotedPost} maxLines={6} />
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

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px 10px', gap: 20, borderBottom: '1px solid var(--sf-border)' }}>
                {/* Like */}
                <button
                    onClick={handleLike}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', borderRadius: 8,
                        cursor: currentUser ? 'pointer' : 'default',
                        color: liked ? '#e11d48' : 'var(--sf-muted)',
                        fontWeight: 500, fontSize: 13, padding: '4px 6px',
                        transition: 'color 0.15s',
                    }}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span>{likesCount}</span>
                </button>

                {/* Retweet/Share */}
                <button
                    onClick={handleRepost}
                    title="Repost lên tường của bạn"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', borderRadius: 8,
                        cursor: currentUser ? 'pointer' : 'default',
                        color: reposted ? '#45bd62' : 'var(--sf-muted)',
                        fontWeight: reposted ? 600 : 500, fontSize: 13, padding: '4px 6px',
                        transition: 'color 0.15s',
                    }}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 1l4 4-4 4"/>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <path d="M7 23l-4-4 4-4"/>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                    <span>{repostsCount}</span>
                </button>

                {/* Comment */}
                <button
                    onClick={() => { setShowComments(v => !v); if (!showComments && comments.length === 0) loadComments(); }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', borderRadius: 8,
                        cursor: 'pointer', color: showComments ? 'var(--sf-text)' : 'var(--sf-muted)',
                        fontWeight: 500, fontSize: 13, padding: '4px 6px',
                    }}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>{post.commentsCount ?? 0}</span>
                </button>
            </div>

            {/* Comments section */}
            {showComments && (
                <div style={{ padding: '12px 16px' }}>
                    {loadingComments ? (
                        <div style={{ textAlign: 'center', color: 'var(--sf-muted)', fontSize: 13, padding: '8px 0' }}>{translations[language || "vi"].loading}</div>
                    ) : (
                        <>
                            {topLevel.map(c => (
                                <CommentThread
                                    key={c.id} comment={c} allComments={comments}
                                    currentUser={currentUser} spaceId={spaceId} postId={post.id}
                                    postUserId={post.userId ?? 0}
                                    onDelete={handleDeleteComment} onReply={handleReply}
                                    onUserClick={onUserClick}
                                    language={language}
                                />
                            ))}
                        </>
                    )}

                    {/* Comment input */}
                    {currentUser && (
                        <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
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
                                    <input
                                        ref={commentInputRef}
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder={translations[language || "vi"].writeComment}
                                        style={{
                                            width: '100%', padding: '8px 40px 8px 14px', borderRadius: 20,
                                            border: '1px solid var(--sf-border)', background: 'var(--sf-input-bg)',
                                            color: 'var(--sf-text)', fontSize: 12, outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    <button type="submit" disabled={!commentText.trim() || submittingComment}
                                        style={{
                                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
                                            color: commentText.trim() ? '#8b4513' : 'var(--sf-muted)', fontSize: 18, lineHeight: 1
                                        }}>↑</button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            )}
            {/* Post Lightbox with Comments */}
            {lightboxIdx !== null && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', background: 'rgba(0,0,0,0.92)' }}>
                    {/* Left side: Image Box */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightboxIdx(null)}>
                        <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 22, cursor: 'pointer', zIndex: 10 }}>×</button>
                        {lightboxIdx > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i! - 1); }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 22, cursor: 'pointer' }}>‹</button>
                        )}
                        <img src={post.imageUrls[lightboxIdx]} alt="" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', userSelect: 'none' }} onClick={e => e.stopPropagation()} />
                        {lightboxIdx < post.imageUrls.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i! + 1); }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, color: '#fff', fontSize: 22, cursor: 'pointer' }}>›</button>
                        )}
                    </div>
                    {/* Right side: Comments Sidebar (Styled like the screenshot) */}
                    <div style={{ width: 360, background: '#fdfbf7', display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid #ebdcc5', fontFamily: 'Lora, Georgia, serif' }}>
                        {/* Scrollable Area for Post AND Comments */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Original Post inline */}
                            <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #ebdcc5' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <Avatar name={post.userName} url={post.userAvatarUrl} size={38} />
                                    <div style={{ flex: 1, fontSize: 15, color: '#4a4a4a', lineHeight: 1.6 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{post.userName}</span>
                                            <span style={{ fontSize: 11, color: '#a08b7a', marginTop: 2, fontWeight: 500, fontFamily: 'var(--sf-font, inherit)' }}>{timeAgo(post.createdAt, language || 'vi')}</span>
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>
                                            {post.content}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comments Title */}
                            <div style={{ padding: '20px 20px 0' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: '#c4a482', textTransform: 'uppercase', marginBottom: 12 }}>BÌNH LUẬN</div>
                            </div>

                            {/* Comments List */}
                            <div style={{ padding: '0 20px 16px' }}>
                            {loadingComments ? (
                                <div style={{ textAlign: 'center', color: '#c4a482', fontSize: 14 }}>{translations[language || "vi"].loading}</div>
                            ) : (
                                (() => {
                                    const renderComment = (c: SocialComment, depth: number) => {
                                        const replies = comments.filter(r => r.parentCommentId === c.id);
                                        const canDeleteComment = currentUser && (
                                            currentUser.id === c.userId ||
                                            currentUser.id === post.userId ||
                                            (currentUser.roleIds && currentUser.roleIds.length > 0)
                                        );
                                        return (
                                            <React.Fragment key={c.id}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, marginLeft: depth * 30 }}>
                                                    <Avatar name={c.userName} url={c.userAvatarUrl} size={32} />
                                                    <div style={{ flex: 1, fontSize: 14, color: '#4a4a4a', lineHeight: 1.5 }}>
                                                        <span style={{ fontWeight: 700, color: '#1a1a1a', marginRight: 6, cursor: 'pointer' }} onClick={() => { onUserClick && onUserClick(c.userId, c.userName, c.userAvatarUrl); setLightboxIdx(null); }}>{c.userName}</span>
                                                        <span>
                                                            {(() => {
                                                                const parentComment = comments.find(p => p.id === c.parentCommentId);
                                                                if (parentComment && c.content.startsWith(`@${parentComment.userName} `)) {
                                                                    const prefix = `@${parentComment.userName} `;
                                                                    const rest = c.content.slice(prefix.length);
                                                                    return (
                                                                        <>
                                                                            <span
                                                                                onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(parentComment.userId, parentComment.userName, parentComment.userAvatarUrl); setLightboxIdx(null); }}
                                                                                style={{ color: '#8b4513', fontWeight: 600, cursor: 'pointer' }}
                                                                            >
                                                                                {prefix.trim()}
                                                                            </span>
                                                                            {' '}{rest}
                                                                        </>
                                                                    );
                                                                }
                                                                return c.content;
                                                            })()}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: '#a08b7a', fontWeight: 500 }}>{timeAgo(c.createdAt, language || 'vi')}</span>
                                                            {currentUser && (
                                                                <button
                                                                    onClick={() => handleReply(c.id, c.userName)}
                                                                    style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: '#8b4513', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Phản hồi
                                                                </button>
                                                            )}
                                                            {canDeleteComment && (
                                                                <button
                                                                    onClick={() => handleDeleteComment(c.id)}
                                                                    style={{ background: 'none', border: 'none', fontSize: 11, color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                                                                >
                                                                    Xóa
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {replies.map(r => renderComment(r, depth + 1))}
                                            </React.Fragment>
                                        );
                                    };
                                    return topLevel.map(c => renderComment(c, 0));
                                })()
                            )}
                            </div>
                        </div>

                        {/* Action buttons mirroring screenshot */}
                        <div style={{ flexShrink: 0, padding: '16px 20px 24px', borderTop: '1px solid #ebdcc5', background: '#fdfbf7' }}>
                            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                                <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: liked ? '#8b4513' : '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#8b4513' : 'none'} stroke={liked ? '#8b4513' : '#a08b7a'} strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                    </svg>
                                </button>
                                <button onClick={() => commentInputRef.current?.focus()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a08b7a" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                </button>
                                <button onClick={handleRepost} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: reposted ? '#45bd62' : '#a08b7a' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a08b7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 1l4 4-4 4"/>
                                        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                                        <path d="M7 23l-4-4 4-4"/>
                                        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                                    </svg>
                                </button>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>
                                {likesCount} lượt thích
                            </div>

                            {/* Standard comment input embedded */}
                            {currentUser && (
                                <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
                                    <Avatar name={currentUser.name} url={currentUser.avatarUrl} size={30} />
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            ref={commentInputRef}
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            placeholder={translations[language || "vi"].writeComment}
                                            style={{
                                                width: '100%', padding: '10px 40px 10px 14px', borderRadius: 20,
                                                border: '1px solid #ebdcc5', background: '#fff',
                                                color: '#1a1a1a', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                        <button type="submit" disabled={!commentText.trim() || submittingComment}
                                            style={{
                                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: commentText.trim() ? 'pointer' : 'default',
                                                color: commentText.trim() ? '#8b4513' : '#c4a482', fontSize: 18, lineHeight: 1
                                            }}
                                        >↑</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Post Editor ───────────────────────────────────────────────────────────────

function PostEditor({ currentUser, spaceId, onPostCreated, language = "vi" }: {
    currentUser: User;
    spaceId: number;
    onPostCreated: (post: SocialPost) => void;
    language?: "vi" | "en";
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

    const EMOJIS = [
        '😊','😄','😂','🥰','😍','🤩','😎','🥳','🙏','❤️',
        '💕','✨','🌸','🌺','🌻','🍀','🌙','☀️','🌈','🔥',
        '💯','👏','🤝','🙌','💪','🧘','🕊️','⚡','🎯','🎉',
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
        apiService.getSpaceById(spaceId).then(s => setCurrentSpace(s)).catch(() => {});
    }, [spaceId]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).slice(0, 4 - images.length);
        const newImages = [...images, ...files].slice(0, 4);
        setImages(newImages);
        setPreviews(newImages.map(f => URL.createObjectURL(f)));
    };

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
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <div style={{ width: 40, flexShrink: 0 }} />
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={currentUser ? `${currentUser.name} ${translations[language || 'vi'].thinking}` : translations[language || 'vi'].thinkingAnonymous}
                            rows={4}
                            style={{
                                flex: 1, padding: '8px 0', background: 'none', border: 'none',
                                color: 'var(--sf-text)', fontSize: 13, resize: 'none', outline: 'none',
                                fontFamily: 'inherit', lineHeight: 1.5
                            }}
                        />
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
                                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                                    <circle cx="8.5" cy="8.5" r="1.5" fill="#fff"/>
                                    <path d="M21 15l-5-5L5 21h16z" fill="rgba(255,255,255,0.9)"/>
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
                                    <circle cx="12" cy="12" r="11" fill="#8b4513"/>
                                    <circle cx="9" cy="10" r="1.5" fill="#fff"/>
                                    <circle cx="15" cy="10" r="1.5" fill="#fff"/>
                                    <path d="M8 15c1 2 7 2 8 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
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
                                    <rect x="1" y="1" width="22" height="22" rx="4"/>
                                    <circle cx="8" cy="9" r="2" fill="#fff"/>
                                    <path d="M22 16L15 9 8 16" fill="rgba(255,255,255,0.85)" stroke="none"/>
                                    <path d="M22 20L13 11 2 20" fill="rgba(255,255,255,0.6)" stroke="none"/>
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
                                    <circle cx="12" cy="12" r="11" fill="#8b4513"/>
                                    <circle cx="9" cy="10" r="1.5" fill="#fff"/>
                                    <circle cx="15" cy="10" r="1.5" fill="#fff"/>
                                    <path d="M8 15c1 2 7 2 8 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
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

export const SocialFeed: React.FC<{ spaceId: number; currentUser: User | null; filterUserId?: number | null; onPostsLoaded?: (count: number) => void; searchQuery?: string; focusTrigger?: number; onUserClick?: (userId: number, userName: string, avatarUrl?: string | null) => void; language?: 'vi' | 'en'; }> = ({ spaceId, currentUser, filterUserId, onPostsLoaded, searchQuery: externalSearch, focusTrigger, onUserClick, language = 'vi' }) => {
    const { showToast } = useToast();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
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


    const searchQ = (externalSearch ?? internalSearch).toLowerCase().trim();
    const LIMIT = 10;
    const basePosts = filterUserId ? posts.filter(p => p.userId === filterUserId) : posts;
    const displayedPosts = searchQ
        ? basePosts.filter(p =>
            p.content?.toLowerCase().includes(searchQ) ||
            p.userName?.toLowerCase().includes(searchQ) ||
            p.metadata?.aiResponse?.toLowerCase().includes(searchQ) ||
            p.metadata?.userQuestion?.toLowerCase().includes(searchQ)
          )
        : basePosts;

    const loadPosts = useCallback(async (pg: number, append = false) => {
        if (!currentUser) return;
        if (loadingRef.current) return; // prevent duplicate calls
        loadingRef.current = true;
        if (pg === 1) setLoading(true); else { setLoadingMore(true); loadingMoreRef.current = true; }
        try {
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
        } catch {
            showToast('Không thể tải bài đăng.', 'error');
        } finally {
            loadingRef.current = false;
            loadingMoreRef.current = false;
            setLoading(false);
            setLoadingMore(false);
        }
    }, [spaceId, currentUser, showToast]);

    useEffect(() => { if (currentUser) loadPosts(1); else setLoading(false); }, [spaceId, currentUser]);

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
                /* Apply giacngo font to social feed content */
                [data-theme="giacngo"] .sf-post-content,
                [data-theme="giacngo"] .sf-post-content * {
                    font-family: var(--sf-font) !important;
                    font-size: var(--sf-post-text-size) !important;
                    color: var(--sf-text);
                    line-height: 1.7;
                }
            `}</style>

            <div style={{ maxWidth: 680, margin: '0 auto', padding: '0' }}>
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
                            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                        <button onClick={() => { setInternalSearch(''); setShowSearchBar(false); }}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-muted)', fontSize: 16, lineHeight: 1 }}>
                            ×
                        </button>
                    </div>
                )}

                {currentUser && (!filterUserId || filterUserId === currentUser.id) && (
                    <PostEditor currentUser={currentUser} spaceId={spaceId} onPostCreated={handlePostCreated} language={language} />
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
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--sf-text)', marginBottom: 6 }}>
                            {filterUserId ? translations[language].noUserPostsYet : translations[language].noPostsYet}
                        </div>
                        <div style={{ color: 'var(--sf-muted)', fontSize: 14 }}>
                            {filterUserId ? translations[language].shareSomething : translations[language].beFirst}
                        </div>
                    </div>
                ) : (
                    displayedPosts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={currentUser}
                            spaceId={spaceId}
                            onDelete={handleDeletePost}
                            onRepost={handlePostCreated}
                            onUserClick={onUserClick}
                            language={language}
                        />
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

    // Comments for selected photo post
    const [comments, setComments] = useState<SocialComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const commentInputRef = useRef<HTMLInputElement>(null);

    const t = {
        vi: { noPhotos: 'Chưa có ảnh nào', writeComment: 'Viết bình luận...', replyingTo: 'Đang phản hồi', send: 'Gửi', reply: 'Phản hồi', delete: 'Xóa', close: 'Đóng' },
        en: { noPhotos: 'No photos yet', writeComment: 'Write a comment...', replyingTo: 'Replying to', send: 'Send', reply: 'Reply', delete: 'Delete', close: 'Close' },
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
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [spaceId, userId]);

    const openPhoto = async (item: PhotoItem) => {
        setSelected(item);
        setComments([]);
        setLoadingComments(true);
        try {
            const data = await apiService.getSocialComments(spaceId, item.postId);
            setComments(data);
        } catch { /* silent */ }
        finally { setLoadingComments(false); }
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
        return (
            <React.Fragment key={c.id}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, marginLeft: depth * 20 }}>
                    <Avatar name={c.userName} url={c.userAvatarUrl} size={28} />
                    <div style={{ flex: 1, fontSize: 13, color: '#4a4a4a' }}>
                        <span style={{ fontWeight: 700, color: '#1a1a1a', marginRight: 4 }}>{c.userName}</span>
                        {c.content}
                        <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#a08b7a' }}>{timeAgo(c.createdAt, language)}</span>
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
            {!selected && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
                    {photos.map((item, i) => (
                        <div
                            key={i}
                            onClick={() => openPhoto(item)}
                            style={{ aspectRatio: '1', cursor: 'pointer', overflow: 'hidden', borderRadius: 4, position: 'relative' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Inline Photo + Comment Viewer */}
            {selected && (
                <div style={{ display: 'flex', gap: 0, background: 'var(--sf-card)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                    {/* Left: Image */}
                    <div style={{ flex: '0 0 55%', maxWidth: '55%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 320 }}>
                        <button
                            onClick={() => setSelected(null)}
                            style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                        >←</button>
                        <img src={selected.url} alt="" style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }} />
                    </div>

                    {/* Right: Comments */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, maxHeight: 480, overflowY: 'auto' }}>
                        {/* Author info */}
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--sf-border)' }}>
                            <Avatar name={selected.post.userName} url={selected.post.userAvatarUrl} size={36} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{selected.post.userName}</div>
                                <div style={{ fontSize: 11, color: '#a08b7a' }}>{timeAgo(selected.post.createdAt, language)}</div>
                            </div>
                        </div>

                        {/* Comments list */}
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                            {loadingComments ? (
                                <div style={{ textAlign: 'center', color: '#c4a482', fontSize: 13 }}>...</div>
                            ) : topLevel.length === 0 ? (
                                <div style={{ color: 'var(--sf-muted)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
                                    {language === 'vi' ? 'Chưa có bình luận' : 'No comments yet'}
                                </div>
                            ) : topLevel.map(c => renderComment(c, 0))}
                        </div>

                        {/* Comment input */}
                        {currentUser && (
                            <form onSubmit={handleSubmitComment} style={{ borderTop: '1px solid var(--sf-border)', paddingTop: 10 }}>
                                {replyTo && (
                                    <div style={{ fontSize: 11, color: '#8b4513', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span>{t.replyingTo} <strong>{replyTo.name}</strong></span>
                                        <button type="button" onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13 }}>×</button>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        ref={commentInputRef}
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        placeholder={t.writeComment}
                                        style={{ flex: 1, padding: '7px 12px', borderRadius: 20, border: '1px solid var(--sf-border)', background: 'var(--sf-input-bg)', fontSize: 13, outline: 'none', color: 'var(--sf-text)' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim() || submittingComment}
                                        style={{ padding: '7px 14px', borderRadius: 20, border: 'none', background: commentText.trim() ? '#8b4513' : 'var(--sf-border)', color: '#fff', cursor: commentText.trim() ? 'pointer' : 'default', fontWeight: 700, fontSize: 12 }}
                                    >{t.send}</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
