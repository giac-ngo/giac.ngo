const fs = require('fs');
let code = fs.readFileSync('client/src/components/social/SocialFeed.tsx', 'utf8');

code = code.replace('{currentUser.name} ơi, bạn đang nghĩ gì vậy?', '{currentUser ? `${currentUser.name} ${translations[language || "vi"].thinking}` : translations[language || "vi"].thinkingAnonymous}');
code = code.replace(/Tạo bài viết/g, '{language === "vi" ? "Tạo bài viết" : "Create post"}');
code = code.replace(/Ảnh\/Video/g, '{translations[language || "vi"].photoVideo.replace(/📸 /g, "")}');
code = code.replace(/Cảm xúc/g, '{translations[language || "vi"].feeling.replace(/😊 /g, "")}');
code = code.replace(/>Hủy</g, '>{translations[language || "vi"].cancel}<');
code = code.replace(/{submitting \? 'Đang đăng\.\.\.' : 'Đăng'}/g, '{submitting ? translations[language || "vi"].posting : translations[language || "vi"].post}');

fs.writeFileSync('client/src/components/social/SocialFeed.tsx', code);
