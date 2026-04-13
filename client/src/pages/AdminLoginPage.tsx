// client/src/pages/AdminLoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { apiService } from '../services/apiService';
import { User } from '../types';

const translations = {
    vi: {
        title: 'Quản Trị Hệ Thống',
        subtitle: 'Chỉ tài khoản Super Admin mới có thể đăng nhập tại đây.',
        emailLabel: 'Email',
        passwordLabel: 'Mật khẩu',
        signInButton: 'Đăng nhập',
        signingInButton: 'Đang xác thực...',
        backToHome: 'Quay về trang chủ',
        terms: 'Hệ thống quản trị nội bộ — Giác Ngộ Platform'
    },
    en: {
        title: 'System Administration',
        subtitle: 'Only Super Admin accounts can sign in here.',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        signInButton: 'Sign in',
        signingInButton: 'Authenticating...',
        backToHome: 'Back to Home',
        terms: 'Internal Administration System — Giác Ngộ Platform'
    }
};

interface AdminLoginPageProps {
    onLogin: (userData: User) => void;
    language: 'vi' | 'en';
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin, language }) => {
    const t = translations[language];
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        document.title = "Bodhilab Admin";
        const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = 'https://www.bodhilab.io/assets/bodhi-technology-lab-logo-DRtZYi2v.webp';
        document.head.appendChild(link);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userData = await apiService.login(email, password, 'admin');
            onLogin(userData);
            navigate('/admin', { replace: true });
        } catch (err) {
            showToast((err as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-grid">
            <div className="login-form-container">
                <div className="w-full max-w-md">
                    <a href="https://www.bodhilab.io/" className="text-sm text-text-main hover:underline mb-8 flex items-center gap-1 w-fit">
                        &larr; {t.backToHome}
                    </a>

                    <div className="mb-8">
                        <h1 className="text-3xl font-serif font-bold text-primary">{t.title}</h1>
                        <p className="text-sm text-text-light mt-2">{t.subtitle}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="admin-email" className="block text-sm font-medium text-text-main">
                                {t.emailLabel}
                            </label>
                            <input
                                id="admin-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@giac.ngo"
                                className="login-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="admin-password" className="block text-sm font-medium text-text-main">
                                {t.passwordLabel}
                            </label>
                            <input
                                id="admin-password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="login-input"
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-text-on-primary py-2.5 px-4 rounded-md font-semibold hover:bg-primary-hover disabled:opacity-50"
                            >
                                {loading ? t.signingInButton : t.signInButton}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <div className="login-logo-container bg-white">
                <img src="https://www.bodhilab.io/assets/bodhi-technology-lab-logo-DRtZYi2v.webp" alt="Bodhilab" className="w-full h-full object-contain p-8" />
            </div>
        </div>
    );
};
