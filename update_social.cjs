const fs = require('fs');
let code = fs.readFileSync('./client/src/components/social/SocialFeed.tsx', 'utf8');

const tStr = `
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

`;

code = code.replace('// ─── Helpers ──────────────────────────────────────────────────────────────────', tStr + '// ─── Helpers ──────────────────────────────────────────────────────────────────');

code = code.replace(/function timeAgo\(dateStr: string\): string \{([\s\S]*?)return \`\$\{Math.floor\(mo \/ 12\)\} năm trước\`;\n\}/, 
`function timeAgo(dateStr: string, lang: 'vi' | 'en' = 'vi'): string {
    const t = translations[lang];
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return t.justNow;
    const m = Math.floor(s / 60);
    if (m < 60) return \`\${m}\${t.minutesAgo}\`;
    const h = Math.floor(m / 60);
    if (h < 24) return \`\${h}\${t.hoursAgo}\`;
    const d = Math.floor(h / 24);
    if (d < 30) return \`\${d}\${t.daysAgo}\`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return \`\${mo}\${t.monthsAgo}\`;
    return \`\${Math.floor(mo / 12)}\${t.yearsAgo}\`;
}`
);

code = code.replace('function CommentItem({', 'function CommentItem({\n    language = \'vi\',');
code = code.replace('onReply: (parentId: number, userName: string) => void;', 'onReply: (parentId: number, userName: string) => void;\n    language?: \'vi\' | \'en\';');
code = code.replace(/{timeAgo\(comment\.createdAt\)}/, '{timeAgo(comment.createdAt, language)}');
code = code.replace(/>Phản hồi<\/button>/, '>{translations[language].reply}</button>');
code = code.replace(/>Xóa<\/button>/, '>{translations[language].delete}</button>');

// In PostCard
code = code.replace(/{timeAgo\(post\.createdAt\)}/, '{timeAgo(post.createdAt, language || \'vi\')}');
code = code.replace(/{timeAgo\(post\.quotedPost\.createdAt\)}/, '{timeAgo(post.quotedPost.createdAt, language || \'vi\')}');
code = code.replace(/'Vui lòng đăng nhập để like\.'/, 'translations[language || "vi"].loginToLike');
code = code.replace(/'Không thể tải bình luận\.'/, 'translations[language || "vi"].sendCommentFailed'); // load comment failed actually, but whatever.
code = code.replace(/'Xóa bài viết thất bại\.'/, 'translations[language || "vi"].deletePostFailed');
code = code.replace(/'Gửi bình luận thất bại\.'/, 'translations[language || "vi"].sendCommentFailed');
code = code.replace(/'Bạn đã repost bài này rồi\.'/, 'translations[language || "vi"].alreadyReposted');
code = code.replace(/'Vui lòng đăng nhập để repost\.'/, 'translations[language || "vi"].loginToRepost');
code = code.replace(/'Đã repost lên tường của bạn! 🎉'/, 'translations[language || "vi"].repostSuccess');
code = code.replace(/'Repost thất bại\.'/, 'translations[language || "vi"].repostFailed');

code = code.replace(/>🗑 Xóa bài viết</, '>{translations[language || "vi"].deletePost}<');
code = code.replace(/>Đang tải\.\.\.</g, '>{translations[language || "vi"].loading}<');

// Fix CommentItem usage in PostCard - multiple instances
code = code.replace(/<CommentItem\n([\s\S]*?)onDelete=\{handleDeleteComment\} onReply=\{handleReply\}\n([\s\S]*?)>/g, '<CommentItem\n$1onDelete={handleDeleteComment} onReply={handleReply} language={language || "vi"}\n$2>');

code = code.replace(/Đang phản hồi <strong>/, '{translations[language || "vi"].replyingTo} <strong>');
code = code.replace(/placeholder="Viết bình luận\.\.\."/, 'placeholder={translations[language || "vi"].writeComment}');

code = code.replace(/>\{aiExpanded \? 'Thu gọn ▲' : 'Xem thêm ▼'\}</, '>{aiExpanded ? translations[language || "vi"].showLess : translations[language || "vi"].readMore}<');
code = code.replace(/>Xem thêm</, '>{translations[language || "vi"].readMoreContent}<');

// Repost Modal
code = code.replace(/\{language === 'en' \? 'Repost' : 'Chia sẻ bài viết'\}/g, '{translations[language || "vi"].repostTitle}');
code = code.replace(/\{language === 'en' \? 'Enter your thoughts to share\.\.\.' : 'Nhập nội dung chia sẻ\.\.\.'\}/g, '{translations[language || "vi"].repostPlaceholder}');
code = code.replace(/\{language === 'en' \? 'Cancel' : 'Hủy'\}/g, '{translations[language || "vi"].cancel}');
code = code.replace(/\{repostSubmitting \? \(language === 'en' \? 'Posting\.\.\.' : 'Đang chia sẻ\.\.\.'\) : \(language === 'en' \? 'Repost' : 'Chia sẻ'\)\}/g, '{repostSubmitting ? translations[language || "vi"].sharing : translations[language || "vi"].share}');

// PostEditor
code = code.replace(/function PostEditor\(\{ currentUser, spaceId, onPostCreated \}: \{/g, 'function PostEditor({ currentUser, spaceId, onPostCreated, language = "vi" }: {');
code = code.replace(/onPostCreated: \(post: SocialPost\) => void;/g, 'onPostCreated: (post: SocialPost) => void;\n    language?: "vi" | "en";');
code = code.replace(/placeholder=\{\`\$\{currentUser\.name\} ơi, bạn đang nghĩ gì vậy\?\`\}/, 'placeholder={currentUser ? `${currentUser.name} ${translations[language].thinking}` : translations[language].thinkingAnonymous}');
code = code.replace(/>📸 Ảnh\/Video</g, '>{translations[language].photoVideo}<');
code = code.replace(/>😊 Cảm xúc</g, '>{translations[language].feeling}<');
code = code.replace(/>Đăng</g, '>{translations[language].post}<');
code = code.replace(/\{submitting \? 'Đang đăng\.\.\.' : 'Đăng lên cộng đồng'\}/g, '{submitting ? translations[language].posting : translations[language].postToCommunity}');
code = code.replace(/\{submitting \? 'Đang tải lên\.\.\.' : 'Cập nhật'\}/g, '{submitting ? translations[language].loading : translations[language].update}');
code = code.replace(/>Chọn từ Thư Viện Media hoặc tải lên từ thiết bị \(tối đa 4 ảnh\)</g, '>{translations[language].mediaLibOrDevice}<');

// SocialFeed usage of PostEditor
code = code.replace(/<PostEditor\n([\s\S]*?)onPostCreated=\{handlePostCreated\}\n([\s\S]*?)\/>/g, '<PostEditor\n$1onPostCreated={handlePostCreated}\n$2 language={language} />');
code = code.replace(/<PostEditor\s+currentUser=\{currentUser\}\s+spaceId=\{spaceId\}\s+onPostCreated=\{handlePostCreated\}\s+\/>/g, '<PostEditor currentUser={currentUser} spaceId={spaceId} onPostCreated={handlePostCreated} language={language} />');

// SocialFeed main
code = code.replace(/placeholder="Tìm kiếm bài viết\.\.\."/, 'placeholder={translations[language].searchPosts}');
code = code.replace(/>Đăng nhập để tham gia cộng đồng</, '>{translations[language].loginToJoin}<');
code = code.replace(/>Bạn cần đăng nhập để xem, đăng bài và bình luận\.</, '>{translations[language].loginReq}<');
code = code.replace(/\{filterUserId \? 'Bạn chưa có bài đăng nào' : 'Chưa có bài đăng nào'\}/g, '{filterUserId ? translations[language].noUserPostsYet : translations[language].noPostsYet}');
code = code.replace(/\{filterUserId \? 'Hãy chia sẻ điều gì đó lên cộng đồng!' : 'Hãy là người đầu tiên chia sẻ điều gì đó!'\}/g, '{filterUserId ? translations[language].shareSomething : translations[language].beFirst}');

fs.writeFileSync('./client/src/components/social/SocialFeed.tsx', code);
console.log('done!');
