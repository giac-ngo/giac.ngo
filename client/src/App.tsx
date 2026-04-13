// client/src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PracticeSpacePage } from './pages/PracticeSpacePage';
import { SpaceCustomPageResolver } from './components/SpaceCustomPageResolver';
import { CustomDomainPageResolver } from './components/CustomDomainPageResolver';
import AdminPage from './pages/AdminPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { HomePage } from './pages/HomePage';

import DocumentDetailPage from './pages/DocumentDetailPage';
import { User, SystemConfig } from './types';
import { apiService } from './services/apiService';
import { ToastProvider } from './components/ToastProvider';
import { UserBillingManagement } from './components/admin/UserBillingManagement'; // Added import
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CareerPage from './pages/CareerPage';
import { DonationPage } from './pages/DonationPage';
import { DonationSuccessPage } from './pages/DonationSuccessPage';
import { DocsLayout } from './layouts/DocsLayout';
import Manifesto from './pages/docs/Manifesto';
import MandalaMerit from './pages/docs/MandalaMerit';
import MeritTokenomics from './pages/docs/MeritTokenomics';
import PathOfUnraveling from './pages/docs/PathOfUnraveling';
import TechStack from './pages/docs/TechStack';
import Overview from './pages/docs/Overview';
import AgentModels from './pages/docs/AgentModels';
import QuickStart from './pages/docs/QuickStart';
import TokenPricing from './pages/docs/TokenPricing';


const ProtectedRoute: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};
// Helper: check if we're on the root/admin domain
const isRootDomain = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === 'login.bodhilab.io';
};

// On custom domains (e.g. tathata.bodhilab.io), redirect logged-in users to the space's chat
// using the subdomain as the space slug: tathata.bodhilab.io → /tathata/chat
const LoginRedirect: React.FC = () => {
  const host = window.location.hostname;
  const isCustomDomain = !isRootDomain();
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  
  // If URL is /:spaceSlug/login, redirect to that space's chat
  if (pathParts.length >= 2 && pathParts[1] === 'login') {
    const spaceSlug = pathParts[0];
    return <Navigate to={`/${spaceSlug}/chat`} replace />;
  }
  
  // Admin user on root domain → go to admin
  if (!isCustomDomain) {
    return <Navigate to="/admin" replace />;
  }
  
  const slug = host.split('.')[0]; // 'tathata' from 'tathata.bodhilab.io'
  return <Navigate to={`/${slug}/chat`} replace />;
};

// On custom subdomains: redirect bare paths like /chat → /mirror/chat
const SlugRedirect: React.FC<{ path: string }> = ({ path }) => {
  const host = window.location.hostname;
  const slug = host.split('.')[0]; // 'mirror' from 'mirror.bodhilab.io'
  return <Navigate to={`/${slug}/${path}`} replace />;
};

// Redirect /:spaceSlug/donation back to /:spaceSlug (donation handled as modal in homepage)
const SpaceDonationRedirect: React.FC = () => {
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  return <Navigate to={`/${spaceSlug}`} replace />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [language, setLanguage] = useState<'vi' | 'en'>(() => {
    return (localStorage.getItem('language') as 'vi' | 'en') || 'vi';
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Global fix for hash-based routing
    if (location.hash.startsWith('#/')) {
      const path = location.hash.substring(1); // remove the '#'
      navigate(path, { replace: true });
    }
  }, [location, navigate]);


  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    if (!systemConfig) return;
    const themeToApply = user?.template || systemConfig.template || 'giacngo';
    document.documentElement.setAttribute('data-theme', themeToApply);
  }, [user, systemConfig]);

  // On custom domains: update tab title + favicon once to match the space
  useEffect(() => {
    const host = window.location.hostname;
    const isCustomDomain = !isRootDomain();
    if (!isCustomDomain) return;
    apiService.getSpaceByDomain(host).then((space: any) => {
      if (!space) return;
      document.title = space.name;
      // Use dedicated faviconUrl, NOT cover image (imageUrl)
      const iconHref = space.faviconUrl;
      if (iconHref) {
        const link: HTMLLinkElement = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = iconHref;
        if (!link.parentNode) document.head.appendChild(link);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    apiService.getSystemConfig()
      .then(config => {
        if (!config) {
          throw new Error("System configuration not found or is null.");
        }
        setSystemConfig(config);
      })
      .catch(err => {
        console.error("Failed to load system config", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Could not load system configuration. Please try again later. (${message})`);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Save current path to redirect back after login
    navigate('/login', { state: { from: location } });
  };

  const handleGoToLogin = (spaceSlug?: string) => {
    if (spaceSlug) {
      navigate(`/${spaceSlug}/login`, { state: { from: location } });
    } else {
      navigate('/login', { state: { from: location } });
    }
  };

  const handleSystemConfigUpdate = (newConfig: SystemConfig) => {
    setSystemConfig(newConfig);
  };

  const handleUserUpdate = (updatedData: Partial<User>) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const newUser = { ...currentUser, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  if (isLoading) {
    return <div className="page-loader">Loading application...</div>;
  }

  if (error) {
    return <div className="page-loader text-accent-red">{error}</div>;
  }

  return (
    <ToastProvider>
      <div className="App">
        {systemConfig ? (
          <Routes>
            {/* Static & Auth Routes */}
            <Route path="/about" element={<AboutPage language={language} />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/career" element={<CareerPage />} />
            <Route path="/donation" element={<DonationPage user={user} onUserUpdate={handleUserUpdate} />} />
            <Route path="/donation/success" element={<DonationSuccessPage onUserUpdate={handleUserUpdate} />} />
            <Route path="/login" element={
              user ? <LoginRedirect /> : 
              isRootDomain() ? <Navigate to="/" replace /> : 
              <LoginPage onLogin={handleLogin} language={language} />
            } />
            <Route path="/:spaceSlug/login" element={
              user ? <LoginRedirect /> : 
              <LoginPage onLogin={handleLogin} language={language} />
            } />
            <Route path="/register" element={
              user ? <LoginRedirect /> :
              isRootDomain() ? <Navigate to="/login" replace /> :
              <RegisterPage onRegister={handleLogin} language={language} />
            } />
            <Route path="/:spaceSlug/register" element={
              user ? <LoginRedirect /> :
              <RegisterPage onRegister={handleLogin} language={language} />
            } />
            <Route path="/reset-password" element={<ResetPasswordPage language={language} />} />
            <Route path="/auth/callback" element={<AuthCallbackPage onLogin={handleLogin} />} />

            {/* User Finance Route */}
            <Route path="/finance" element={
              <ProtectedRoute user={user}>
                {user && (
                  <div className="h-screen bg-background-light overflow-y-auto">
                    <div className="max-w-7xl mx-auto py-8">
                      {/* Reusing the Admin Layout or just the Component? 
                                Ideally, we should wrap it in a layout. For now, let's just render the component with a back button. 
                             */}
                      <div className="px-4 mb-4 flex items-center justify-between">
                        <button onClick={() => navigate(-1)} className="text-text-light hover:text-primary flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                          {language === 'vi' ? 'Quay lại' : 'Back'}
                        </button>
                      </div>
                      <UserBillingManagement user={user} language={language} onUserUpdate={handleUserUpdate} />
                    </div>
                  </div>
                )}
              </ProtectedRoute>
            } />

            {/* Docs Routes - Nested structure for Outlet */}
            <Route path="/docs" element={<DocsLayout language={language} setLanguage={setLanguage} />}>
              <Route index element={<Navigate to="quick-start" replace />} />
              <Route path="manifesto" element={<Manifesto />} />
              <Route path="mandala-merit" element={<MandalaMerit />} />
              <Route path="merit-tokenomics" element={<MeritTokenomics />} />
              <Route path="path-of-unraveling" element={<PathOfUnraveling />} />
              <Route path="tech-stack" element={<TechStack />} />
              <Route path="overview" element={<Overview />} />
              <Route path="models" element={<AgentModels />} />
              <Route path="quick-start" element={<QuickStart />} />
              <Route path="pricing" element={<TokenPricing />} />
            </Route>

            {/* Admin Route (must be before dynamic slug routes) */}
            <Route path="/:spaceSlug/admin/:section?" element={
              <ProtectedRoute user={user}>
                {user && <AdminPage
                  user={user}
                  onLogout={handleLogout}
                  language={language}
                  setLanguage={setLanguage}
                  systemConfig={systemConfig}
                  onSystemConfigUpdate={handleSystemConfigUpdate}
                  onUserUpdate={handleUserUpdate}
                />}
              </ProtectedRoute>
            } />

            {/* Content Routes */}
            <Route path="/:spaceSlug/library/:id" element={<DocumentDetailPage user={user} />} />
            {/* Top Level Main Space Routes (Hidden Slug for giac-ngo) */}
            <Route path="/chat" element={isRootDomain() ? <PracticeSpacePage user={user} systemConfig={systemConfig} onLogout={handleLogout} onGoToLogin={handleGoToLogin} language={language} setLanguage={setLanguage} onUserUpdate={handleUserUpdate} inferredSpaceSlug="giac-ngo" inferredView="chat" /> : <SlugRedirect path="chat" />} />
            <Route path="/library" element={isRootDomain() ? <PracticeSpacePage user={user} systemConfig={systemConfig} onLogout={handleLogout} onGoToLogin={handleGoToLogin} language={language} setLanguage={setLanguage} onUserUpdate={handleUserUpdate} inferredSpaceSlug="giac-ngo" inferredView="library" /> : <SlugRedirect path="library" />} />
            <Route path="/dharmatalks" element={isRootDomain() ? <PracticeSpacePage user={user} systemConfig={systemConfig} onLogout={handleLogout} onGoToLogin={handleGoToLogin} language={language} setLanguage={setLanguage} onUserUpdate={handleUserUpdate} inferredSpaceSlug="giac-ngo" inferredView="dharmatalks" /> : <SlugRedirect path="dharmatalks" />} />
            <Route path="/meditationtimer" element={isRootDomain() ? <PracticeSpacePage user={user} systemConfig={systemConfig} onLogout={handleLogout} onGoToLogin={handleGoToLogin} language={language} setLanguage={setLanguage} onUserUpdate={handleUserUpdate} inferredSpaceSlug="giac-ngo" inferredView="meditationtimer" /> : <SlugRedirect path="meditationtimer" />} />
            <Route path="/admin/:section?" element={
              isRootDomain()
                ? <ProtectedRoute user={user}>{user && <AdminPage user={user} onLogout={handleLogout} language={language} setLanguage={setLanguage} systemConfig={systemConfig} onSystemConfigUpdate={handleSystemConfigUpdate} onUserUpdate={handleUserUpdate} isGlobalAdmin={true} />}</ProtectedRoute>
                : <ProtectedRoute user={user}><SlugRedirect path="admin" /></ProtectedRoute>
            } />

            {/* Redirect /spaceSlug/donation back to space home (donation is handled as modal in homepage) */}
            <Route path="/:spaceSlug/donation" element={<SpaceDonationRedirect />} />

            {/* Dynamic Slug-based Routes (Order is important) */}
            <Route path="/:spaceSlug/:view" element={
              <PracticeSpacePage
                user={user}
                systemConfig={systemConfig}
                onLogout={handleLogout}
                onGoToLogin={handleGoToLogin}
                language={language}
                setLanguage={setLanguage}
                onUserUpdate={handleUserUpdate}
              />
            } />
            <Route path="/:spaceSlug/page/:pageSlug" element={<SpaceCustomPageResolver />} />
            <Route path="/:spaceSlug" element={<SpaceCustomPageResolver />} />

            {/* Home and Fallback */}
            <Route path="/" element={
              isRootDomain() 
                ? (user ? <Navigate to="/admin" replace /> : <AdminLoginPage onLogin={handleLogin} language={language} />)
                : <CustomDomainPageResolver fallback={<HomePage user={user} language={language} setLanguage={setLanguage} systemConfig={systemConfig} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <div className="page-loader">Loading configuration...</div>
        )}
      </div>
    </ToastProvider>
  );
};

export default App;