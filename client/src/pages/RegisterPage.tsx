
// client/src/pages/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { apiService } from '../services/apiService';
import { User, Space } from '../types';
import { GoogleIcon } from '../components/Icons';
import { isCustomDomain } from '../utils/domain';

const translations = {
    vi: {
        backToHome: 'Quay về trang chủ',
        title: 'Tạo tài khoản của bạn',
        fullNameLabel: 'Họ và tên',
        fullNamePlaceholder: 'Nhập họ và tên của bạn',
        emailLabel: 'Email',
        emailPlaceholder: 'Nhập email của bạn',
        passwordLabel: 'Mật khẩu',
        passwordPlaceholder: 'Tạo mật khẩu',
        confirmPasswordLabel: 'Xác nhận Mật khẩu',
        confirmPasswordPlaceholder: 'Xác nhận mật khẩu của bạn',
        createAccountButton: 'Tạo tài khoản',
        creatingAccountButton: 'Đang tạo tài khoản...',
        continueWith: 'Hoặc tiếp tục với',
        haveAccount: 'Đã có tài khoản?',
        signIn: 'Đăng nhập',
        terms: 'Bằng cách tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi.',
        passwordMismatch: 'Mật khẩu xác nhận không khớp.',
        defaultSpaceJoin: 'Tài khoản của bạn sẽ tham gia Không gian: Giác Ngộ',
        customSpaceJoin: 'Tài khoản sẽ được liên kết với Không gian của tên miền này',
    },
    en: {
        backToHome: 'Back to Home',
        title: 'Create your account',
        fullNameLabel: 'Full Name',
        fullNamePlaceholder: 'Enter your full name',
        emailLabel: 'Email',
        emailPlaceholder: 'Enter your email',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Create a password',
        confirmPasswordLabel: 'Confirm Password',
        confirmPasswordPlaceholder: 'Confirm your password',
        createAccountButton: 'Create account',
        creatingAccountButton: 'Creating account...',
        continueWith: 'Or continue with',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in',
        terms: 'By continuing, you agree to our Terms of Service and Privacy Policy.',
        passwordMismatch: 'Passwords do not match.',
        defaultSpaceJoin: 'You are explicitly joining Space: Giác Ngộ',
        customSpaceJoin: 'You are joining this custom domain\'s Space',
    }
};

interface RegisterPageProps {
    onRegister: (userData: User) => void;
    language: 'vi' | 'en';
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister, language }) => {
    const t = translations[language];
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [customSpace, setCustomSpace] = useState<Space | null>(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const params = useParams<{ spaceSlug?: string }>();

    const targetSpaceSlug = params.spaceSlug || customSpace?.slug;
    const from = (location.state as any)?.from?.pathname || (targetSpaceSlug ? `/${targetSpaceSlug}/chat` : '/giac-ngo/chat');

    useEffect(() => {
        const host = window.location.hostname;
        
        if (isCustomDomain(host)) {
            apiService.getSpaceByDomain(host).then(space => {
                if (space) {
                    setCustomSpace(space);
                    document.title = space.name;
                    if (space.imageUrl) {
                        const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
                        link.rel = 'icon';
                        link.href = space.imageUrl;
                        document.head.appendChild(link);
                    }
                } else {
                    const parts = host.split('.');
                    const subSlug = parts.length >= 2 ? parts[0] : '';
                    if (subSlug) {
                        apiService.getSpaceBySlug(subSlug).then(spaceBySlug => {
                            if (spaceBySlug) {
                                setCustomSpace(spaceBySlug);
                                document.title = spaceBySlug.name;
                                if (spaceBySlug.imageUrl) {
                                    const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
                                    link.rel = 'icon';
                                    link.href = spaceBySlug.imageUrl;
                                    document.head.appendChild(link);
                                }
                            }
                        }).catch(() => {});
                    }
                }
            }).catch(() => {});
        } else if (params.spaceSlug) {
            apiService.getSpaceBySlug(params.spaceSlug).then(space => {
                if (space) {
                    setCustomSpace(space);
                    document.title = space.name;
                    if (space.imageUrl) {
                        const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
                        link.rel = 'icon';
                        link.href = space.imageUrl;
                        document.head.appendChild(link);
                    }
                }
            }).catch(() => {});
        }
    }, [params.spaceSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast(t.passwordMismatch, 'error');
            return;
        }
        setLoading(true);
        try {
            const userData = await apiService.register({ 
                name, 
                email, 
                password,
                spaceSlug: targetSpaceSlug,
                spaceId: customSpace?.id
            });
            onRegister(userData);
            
            if (targetSpaceSlug) {
                navigate(`/${targetSpaceSlug}/chat`, { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            showToast((err as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegisterClick = () => {
        const redirectTarget = targetSpaceSlug ? `/${targetSpaceSlug}/chat` : from;
        sessionStorage.setItem('redirectPath', redirectTarget);
    };

    return (
        <div className="login-page-grid">
            <div className="login-form-container">
                <div className="w-full max-w-md">
                    <Link to="/" className="text-sm text-text-main hover:underline mb-8 block">&larr; {t.backToHome}</Link>

                    <h1 className="text-3xl font-serif font-bold mb-8 text-primary">{t.title}</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-text-main">{t.fullNameLabel}</label>
                            <input
                                id="fullName"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t.fullNamePlaceholder}
                                className="auth-input-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-main">{t.emailLabel}</label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.emailPlaceholder}
                                className="auth-input-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-main">{t.passwordLabel}</label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t.passwordPlaceholder}
                                className="auth-input-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-main">{t.confirmPasswordLabel}</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t.confirmPasswordPlaceholder}
                                className="auth-input-white"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-text-on-primary py-2.5 px-4 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50"
                            >
                                {loading ? t.creatingAccountButton : t.createAccountButton}
                            </button>
                        </div>
                    </form>

                    <div className="login-divider">
                        <span></span>
                        <span>{t.continueWith}</span>
                        <span></span>
                    </div>

                    <div className="space-y-3">
                        <a href={`/api/auth/google?returnTo=${encodeURIComponent(window.location.origin)}${targetSpaceSlug ? `&spaceSlug=${encodeURIComponent(targetSpaceSlug)}` : ''}`} onClick={handleGoogleRegisterClick} className="social-login-btn">
                            <GoogleIcon className="w-5 h-5" />
                            <span>Google</span>
                        </a>
                    </div>

                    <p className="mt-8 text-center text-sm text-text-light">
                        {t.haveAccount} <Link to={targetSpaceSlug ? `/${targetSpaceSlug}/login` : '/login'} className="font-semibold text-primary hover:underline">{t.signIn}</Link>
                    </p>

                    <p className="mt-8 text-center text-xs text-gray-400">
                        {t.terms}
                    </p>

                    <div className="mt-6 text-center text-xs font-semibold text-primary bg-primary/10 py-2.5 px-4 rounded border border-primary/20">
                        {customSpace 
                            ? (language === 'vi' ? `Tài khoản sẽ được liên kết với Không gian: ${customSpace.name}` : `You will be registered to Space: ${customSpace.name}`)
                            : (language === 'vi' ? 'Vui lòng chọn Không gian để đăng ký thành viên.' : 'Please register through a designated Space.')}
                    </div>
                </div>
            </div>
            <div className="login-logo-container" style={customSpace?.spaceColor ? { backgroundColor: customSpace.spaceColor } : {}}>
                {customSpace?.imageUrl ? (
                    <img src={customSpace.imageUrl} alt={customSpace.name} className="w-full h-full object-contain p-8" />
                ) : (
                    <img src="/themes/giacngo/giac-ngo-login1.png" alt="Giác Ngộ AI Logo" className="w-full h-full object-contain" />
                )}
            </div>
        </div>
    );
};
