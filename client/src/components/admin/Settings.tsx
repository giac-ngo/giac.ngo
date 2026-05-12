
// client/src/components/admin/Settings.tsx
import React, { useState, useEffect } from 'react';
import { SystemConfig, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { EyeIcon, EyeOffIcon, SpinnerIcon, CopyIcon, UsersIcon, KeyIcon, SpeakerWaveIcon } from '../Icons';
// Official Gemini TTS voice list
const GEMINI_VOICES = [
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus',
    'Perseus', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Alathea',
    'Erinome', 'Algieba', 'Despina', 'Callirrhoe', 'Zubenelgenubi',
    'Vindemiatrix', 'Sadachbia', 'Sulafat', 'Schedar', 'Achird', 'Gacrux',
    'Rasalgethi', 'Chara', 'Alnilam', 'Pulcherrima',
];

const translations = {
    vi: {
        title: 'Cài đặt',
        guestSettings: 'Cài đặt Khách',
        guestMessageLimit: 'Giới hạn tin nhắn cho khách',
        guestMessageLimitDesc: 'Số lượng tin nhắn một khách có thể gửi trước khi được yêu cầu đăng nhập.',
        personalApiKeys: 'Khóa API Cá nhân',
        personalApiKeysDesc: 'Các khóa này được sử dụng riêng cho tài khoản của bạn để thực hiện yêu cầu AI.',
        personalAccessToken: 'Personal Access Token',
        personalAccessTokenDesc: 'Sử dụng token này để xác thực các yêu cầu API từ ứng dụng bên ngoài.',
        aiStudioKey: 'AiStudio API Key',
        geminiVoice: 'Giọng đọc Gemini',
        geminiStyle: 'Phong cách đọc',
        geminiStyleDesc: 'Hướng dẫn cách AI đọc (VD: Read aloud in a warm and friendly tone:)',
        geminiStylePlaceholder: 'VD: Read aloud in a warm and friendly tone:',
        geminiTemperature: 'Nhiệt độ giọng đọc (Temperature)',
        geminiTemperatureDesc: 'Giá trị thấp = giọng ổn định, giá trị cao = sáng tạo hơn. Mặc định: 1',
        geminiVoiceDesc: 'Giọng đọc được dùng khi nghe phản hồi AI trong Practice Space.',
        vertexKey: 'Vertex API Key',
        gptKey: 'GPT API Key',
        grokKey: 'Grok API Key',
        saveAll: 'Lưu Cài đặt',
        saving: 'Đang lưu...',
        saveSuccess: 'Cài đặt đã được cập nhật thành công!',
        saveError: 'Lỗi khi lưu cài đặt: {message}',
        show: 'Hiển thị',
        hide: 'Ẩn',
        copy: 'Sao chép',
        copied: 'Đã sao chép!',
        regenerateToken: 'Tạo token mới',
        regenerateTokenConfirm: 'Bạn có chắc muốn tạo token mới không? Token cũ sẽ bị vô hiệu hóa ngay lập tức.',
        groupMailServer: '📧 Cấu hình Mail Server (Không gian hiện tại)',
        mailServerHint: 'Cấu hình SMTP gửi mail riêng cho Không gian này. Nếu để trống, hệ thống sẽ cố gắng dùng mail mặc định.',
        smtpHost: 'SMTP Host (vd: smtp.gmail.com)',
        smtpPort: 'SMTP Port (vd: 465)',
        smtpUser: 'SMTP Email (Tài khoản gửi)',
        smtpPass: 'SMTP Password (Mật khẩu ứng dụng)',
        smtpFromName: 'Tên người gửi (vd: Thiền Viện ABC)',
    },
    en: {
        title: 'Settings',
        guestSettings: 'Guest Settings',
        guestMessageLimit: 'Guest Message Limit',
        guestMessageLimitDesc: 'The number of messages a guest can send before being prompted to log in.',
        personalApiKeys: 'Personal API Keys',
        personalApiKeysDesc: 'These keys are used specifically for your account to perform AI requests.',
        personalAccessToken: 'Personal Access Token',
        personalAccessTokenDesc: 'Use this token to authenticate API requests from external applications.',
        aiStudioKey: 'AiStudio API Key',
        geminiVoice: 'Gemini TTS Voice',
        geminiStyle: 'Style instructions',
        geminiStyleDesc: 'Guide how the AI reads the text (e.g. Read aloud in a warm and friendly tone:)',
        geminiStylePlaceholder: 'e.g. Read aloud in a warm and friendly tone:',
        geminiTemperature: 'Temperature',
        geminiTemperatureDesc: 'Lower = more stable voice, Higher = more expressive. Default: 1',
        geminiVoiceDesc: 'Voice used when listening to AI responses in Practice Space.',
        vertexKey: 'Vertex API Key',
        gptKey: 'GPT API Key',
        grokKey: 'Grok API Key',
        saveAll: 'Save Settings',
        saving: 'Saving...',
        saveSuccess: 'Settings updated successfully!',
        saveError: 'Failed to save settings: {message}',
        show: 'Show',
        hide: 'Hide',
        copy: 'Copy',
        copied: 'Copied!',
        regenerateToken: 'Regenerate Token',
        regenerateTokenConfirm: 'Are you sure you want to regenerate your token? The old token will be invalidated immediately.',
        groupMailServer: '📧 Mail Server Configuration (Current Space)',
        mailServerHint: 'SMTP config for this specific space. Leave blank to fallback to a default system mail.',
        smtpHost: 'SMTP Host (e.g. smtp.gmail.com)',
        smtpPort: 'SMTP Port (e.g. 465)',
        smtpUser: 'SMTP Email Address',
        smtpPass: 'SMTP Password (App Password)',
        smtpFromName: 'Sender Name (e.g. The Monastery)',
    }
};

interface SettingsProps {
    user: User;
    language: 'vi' | 'en';
    systemConfig: SystemConfig;
    onSystemConfigUpdate: (newConfig: SystemConfig) => void;
    onUserUpdate: (updatedData: Partial<User>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, language, systemConfig, onSystemConfigUpdate, onUserUpdate }) => {
    const t = translations[language];
    const { showToast } = useToast();

    const [localUser, setLocalUser] = useState<User>(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showToken, setShowToken] = useState(false);

    useEffect(() => { setLocalUser(user); }, [user]);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const promises = [];

            // 1. Cập nhật User Keys (Personal Token)
            const userPayload: Partial<User> = {
                id: localUser.id,
                apiKeys: localUser.apiKeys || {},
            };
            promises.push(apiService.updateUser(userPayload as any).then(onUserUpdate));

            await Promise.all(promises);
            showToast(t.saveSuccess, 'success');
        } catch (error: any) {
            showToast(t.saveError.replace('{message}', error?.message || String(error)), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!window.confirm(t.regenerateTokenConfirm)) return;
        try {
            const updatedUser = await apiService.regenerateApiToken(user.id as number);
            setLocalUser(updatedUser);
            onUserUpdate(updatedUser);
            showToast(t.copied, 'success');
        } catch (error: any) {
            showToast(error?.message || String(error), 'error');
        }
    };

    const handleCopy = async (text: string) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        showToast(t.copied, 'info');
    };

    const isAdmin = user.permissions?.includes('settings');

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 font-serif text-primary">{t.title}</h1>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                {/* Personal Token Card */}
                <div className="bg-background-panel shadow-md rounded-xl p-6 border border-border-color">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <KeyIcon className="w-5 h-5 text-primary" />
                        {t.personalAccessToken}
                    </h2>
                    <p className="text-sm text-text-light mb-4">{t.personalAccessTokenDesc}</p>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                            <input
                                type={showToken ? 'text' : 'password'}
                                readOnly
                                value={localUser.apiToken || ''}
                                className="w-full p-2.5 bg-background-light border border-border-color rounded-lg pr-12 font-mono text-sm"
                            />
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-primary"
                            >
                                {showToken ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <button onClick={() => handleCopy(localUser.apiToken || '')} className="p-2.5 border border-border-color rounded-lg hover:bg-background-light transition-colors" title={t.copy}>
                            <CopyIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <button onClick={handleRegenerateToken} className="mt-4 text-xs font-bold text-accent-red hover:underline uppercase tracking-wider">{t.regenerateToken}</button>
                </div>
            </div>


            {/* Single Save Button at Bottom Right */}
            <div className="flex justify-end sticky bottom-8 z-20 mt-12">
                <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-10 py-3.5 bg-primary text-text-on-primary rounded-full font-bold shadow-2xl hover:bg-primary-hover transform transition-all active:scale-95 disabled:opacity-70"
                >
                    {isSaving ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : null}
                    {isSaving ? t.saving : t.saveAll}
                </button>
            </div>
        </div>
    );
};
