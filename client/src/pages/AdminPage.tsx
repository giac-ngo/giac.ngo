

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { User, SystemConfig, Space } from '../types';
import { apiService } from '../services/apiService';
import { Dashboard } from '../components/admin/Dashboard';
import { AiManagement } from '../components/admin/AiManagement';
import { UserManagement } from '../components/admin/UserManagement';
import { ConversationManagement } from '../components/admin/ConversationManagement';
import { Settings } from '../components/admin/Settings';
import { BillingManagement } from '../components/admin/BillingManagement';
import { TemplateManagement } from '../components/admin/TemplateManagement';

import { FineTuneManagement } from '../components/admin/FineTuneManagement';
import { UserBillingManagement } from '../components/admin/UserBillingManagement';
import { RoleManagement } from '../components/admin/RoleManagement';
import { PaymentSettings } from '../components/admin/PaymentSettings';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { ChangePasswordModal } from '../components/user/ChangePasswordModal';
import { EditProfileModal } from '../components/user/EditProfileModal';
import { DocumentTextIcon, DashboardIcon, AiIcon, UserIcon, SettingsIcon, ConversationIcon, PricingIcon, BillingIcon, TemplateIcon, FineTuneIcon, CryptoIcon, RoleIcon, ChatBubbleIcon, MapPinIcon, RadioIcon, MeditationIcon, BellIcon, PhotoIcon } from '../components/Icons';
import { FilesAndDocuments } from '../components/admin/FilesAndDocuments';
import { CommentManagement } from '../components/admin/CommentManagement';
import { SpaceManagement } from '../components/admin/SpaceManagement';
import { DharmaTalksManagement } from '../components/admin/DharmaTalksManagement';
import { MeditationManagement } from '../components/admin/MeditationManagement';
import { SpaceOwnerBilling } from '../components/admin/SpaceOwnerBilling';
import { WithdrawalManagement } from '../components/admin/WithdrawalManagement';
import { NotificationManagement } from '../components/admin/NotificationManagement';
import { PricingPlansAdmin } from '../components/admin/PricingPlansAdmin';
import { MediaLibrary } from '../components/admin/MediaLibrary';




const translations = {
  vi: {
    dashboard: 'Dashboard',
    aiManagement: 'Quản lý AI',
    userManagement: 'Quản lý Người dùng',
    roleManagement: 'Phân quyền',
    commentManagement: 'Quản lý Bình luận',
    filesAndDocuments: 'Tệp & Tài liệu',
    spaceManagement: 'Quản lý Không gian',
    dharmaTalkManagement: 'Quản lý Pháp Thoại',
    meditationManagement: 'Quản lý Thiền',
    templateManagement: 'Quản lý Page',
    fineTuneManagement: 'Fine-tune Dữ liệu',
    settings: 'Cài đặt',
    conversationManagement: 'Quản lý Hội thoại',
    pricingManagement: 'Quản lý Gieo duyên',
    manualBilling: 'Lịch sử Giao dịch',

    withdrawalManagement: 'Yêu cầu rút tiền',
    notificationManagement: 'Thông Báo',
    toAppPage: 'Về không gian thực hành',
    logout: 'Đăng xuất',
    language: 'English',
    transactionsAndTopUp: 'Ví Merit',
    spaceBilling: 'Ví Space',
    paymentSettings: 'Cấu hình thanh toán',
    domainSettings: 'Cấu hình tên miền',
    mailServerSettings: 'Cấu hình Mail Server',
    mediaLibrary: 'Thư viện Media',
    changePassword: 'Đổi mật khẩu',
    editProfile: 'Sửa thông tin',
  },

  en: {
    dashboard: 'Dashboard',
    aiManagement: 'AI Management',
    userManagement: 'User Management',
    roleManagement: 'Permissions',
    commentManagement: 'Comment Management',
    filesAndDocuments: 'Files & Documents',
    spaceManagement: 'Space Management',
    dharmaTalkManagement: 'Dharma Talk Management',
    meditationManagement: 'Meditation Management',
    templateManagement: 'Page Management',
    fineTuneManagement: 'Fine-tune Data',
    settings: 'Settings',
    conversationManagement: 'Conversation',
    pricingManagement: 'Pricing Plans',
    manualBilling: 'Transaction History',
    withdrawalManagement: 'Withdrawal Requests',
    notificationManagement: 'Notifications',
    toAppPage: 'Back to Practice Space',
    logout: 'Logout',
    language: 'Tiếng Việt',
    transactionsAndTopUp: 'Merit Wallet',
    spaceBilling: 'Space Wallet',
    paymentSettings: 'Payment Settings',
    domainSettings: 'Domain Settings',
    mailServerSettings: 'Mail Server Settings',
    mediaLibrary: 'Media Library',
    changePassword: 'Change Password',
    editProfile: 'Edit Profile',
  }
};

type AdminTab = 'dashboard' | 'ai' | 'users' | 'roles' | 'settings' | 'domain' | 'mail-server' | 'media-library' | 'conversations' | 'pricing' | 'manual-billing' | 'payment-settings' | 'templates' | 'finetune' | 'user-billing' | 'files' | 'comments' | 'spaces' | 'dharma-talks' | 'meditation' | 'space-billing' | 'withdrawals' | 'notifications';


const getFirstAllowedTab = (user: User): AdminTab => {
  // A super admin (who can manage roles) defaults to dashboard
  // Prioritize dashboard if the user has permission for it
  if (user.permissions?.includes('dashboard')) return 'dashboard';

  const allowedTabs: AdminTab[] = [
    'dashboard', 'user-billing', 'space-billing', 'ai', 'users', 'conversations', 'pricing', 'manual-billing', 'payment-settings',
    'templates', 'finetune', 'settings', 'media-library', 'roles', 'files', 'comments', 'spaces', 'dharma-talks', 'meditation', 'withdrawals', 'notifications'
  ];



  return allowedTabs.find(tab => user.permissions?.includes(tab)) || 'dashboard';
};

interface AdminPageProps {
  user: User;
  onLogout: () => void;
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
  systemConfig: SystemConfig | null;
  onSystemConfigUpdate: (newConfig: SystemConfig) => void;
  onUserUpdate: (updatedData: Partial<User>) => void;
  inferredSpaceSlug?: string;
  isGlobalAdmin?: boolean;
}

const AdminPage: React.FC<AdminPageProps> = ({ user, onLogout, language, setLanguage, systemConfig, onSystemConfigUpdate, onUserUpdate, inferredSpaceSlug, isGlobalAdmin }) => {
  const params = useParams<{ section?: AdminTab, spaceSlug?: string }>();
  // On custom domains (e.g. mirror.bodhilab.io/admin), params.spaceSlug is empty
  // so we detect the slug from the subdomain hostname
  const hostnameSlug = (() => {
    const host = window.location.hostname;
    const isRoot = host === 'localhost' || host === '127.0.0.1' || host === 'login.bodhilab.io';
    if (isRoot) return '';
    // e.g. 'mirror' from 'mirror.bodhilab.io'; skip if it's a pure custom domain (no dots in subdomain part)
    const parts = host.split('.');
    return parts.length >= 2 ? parts[0] : '';
  })();
  const spaceSlug = params.spaceSlug || inferredSpaceSlug || (isGlobalAdmin ? '' : (hostnameSlug || 'giac-ngo'));
  const section = params.section;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>(section || getFirstAllowedTab(user));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [colorMode] = useState<'light' | 'dark'>(() => (localStorage.getItem('spaceColorMode_v3') as 'light' | 'dark') || 'light');

  // Inject dark mode style tag for admin page
  useEffect(() => {
    let styleEl = document.getElementById('gn-admin-dark-mode');
    if (colorMode === 'dark') {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'gn-admin-dark-mode';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        .admin-page-container, .admin-page-container aside, .admin-page-container main {
            background-color: hsl(28, 20%, 13%) !important;
            color: hsl(44, 45%, 82%) !important;
            border-color: hsl(28, 15%, 22%) !important;
        }
        .admin-page-container .bg-background-light,
        .admin-page-container [class*="bg-background"] {
            background-color: hsl(28, 22%, 9%) !important;
        }
        .admin-page-container nav button {
            color: hsl(44, 35%, 65%) !important;
        }
        .admin-page-container nav button:hover {
            background-color: hsl(28, 18%, 18%) !important;
        }
        .admin-page-container nav button.bg-primary-light {
            background-color: hsl(0, 40%, 20%) !important;
            color: hsl(0, 65%, 65%) !important;
        }
        .admin-page-container table,
        .admin-page-container th,
        .admin-page-container td {
            border-color: hsl(28, 15%, 22%) !important;
            color: hsl(44, 45%, 82%) !important;
        }
        .admin-page-container thead tr {
            background-color: hsl(28, 18%, 16%) !important;
        }
        .admin-page-container tbody tr:hover {
            background-color: hsl(28, 18%, 16%) !important;
        }
        .admin-page-container input, .admin-page-container select, .admin-page-container textarea {
            background-color: hsl(28, 18%, 16%) !important;
            color: hsl(44, 45%, 82%) !important;
            border-color: hsl(28, 15%, 22%) !important;
        }
        .admin-page-container .bg-white, .admin-page-container [class*="bg-gray"] {
            background-color: hsl(28, 20%, 15%) !important;
        }
        .admin-page-container .text-gray-900, .admin-page-container .text-gray-800,
        .admin-page-container .text-gray-700, .admin-page-container .text-gray-600 {
            color: hsl(44, 45%, 82%) !important;
        }
        .admin-page-container .text-gray-500, .admin-page-container .text-gray-400 {
            color: hsl(38, 20%, 55%) !important;
        }
      `;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [colorMode]);

  const t = translations[language];


  useEffect(() => {
    if (!spaceSlug) return;
    apiService.getSpaceBySlug(spaceSlug)
      .then((space: Space) => setCurrentSpace(space))
      .catch((err: Error) => console.error('Failed to load space:', err));
  }, [spaceSlug]);

  useEffect(() => {
    if (!spaceSlug && !isGlobalAdmin) return;
    const newTab = section || getFirstAllowedTab(user);
    const isPermitted = user.permissions?.includes(newTab);

    if (isPermitted) {
      setActiveTab(newTab);
    } else {
      const firstAllowed = getFirstAllowedTab(user);
      setActiveTab(firstAllowed);
      const getBaseUrl = () => (!spaceSlug || spaceSlug === 'giac-ngo') ? '' : `/${spaceSlug}`;
      navigate(`${getBaseUrl()}/admin/${firstAllowed}`, { replace: true });
    }
  }, [section, user, navigate, spaceSlug]);


  const renderContent = () => {
    if (!systemConfig) return null;

    const currentTabAllowed = user.permissions?.includes(activeTab);
    if (!currentTabAllowed) {
      return <div className="p-8">Bạn không có quyền truy cập vào mục này.</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard language={language} />;
      case 'files':
        return <FilesAndDocuments language={language} user={user} />;
      case 'media-library':
        return <MediaLibrary space={currentSpace} language={language} />;
      case 'spaces':
        return <SpaceManagement language={language} user={user} />;
      case 'meditation':
        return <MeditationManagement language={language} />;
      case 'dharma-talks':
        return <DharmaTalksManagement language={language} />;
      case 'user-billing':
        return <UserBillingManagement user={user} language={language} onUserUpdate={onUserUpdate} spaceId={typeof currentSpace?.id === 'number' ? currentSpace.id : undefined} />;
      case 'space-billing':
        return <SpaceOwnerBilling user={user} language={language} />;
      case 'ai':
        return <AiManagement language={language} user={user} />;
      case 'users':
        return <UserManagement user={user} language={language} onUserUpdate={onUserUpdate} space={currentSpace} />;
      case 'roles':
        return <RoleManagement language={language} user={user} onUserUpdate={onUserUpdate} />;
      case 'comments':
        return <CommentManagement language={language} />;
      case 'conversations':
        return <ConversationManagement user={user} language={language} />;
      case 'pricing':
        return <PricingPlansAdmin language={language} space={currentSpace} />;
      case 'manual-billing':
        return <BillingManagement user={user} language={language} onUserUpdate={onUserUpdate} />;
      case 'payment-settings':
        return <PaymentSettings space={currentSpace} language={language} onSpaceUpdate={setCurrentSpace} />;
      case 'withdrawals':
        return <WithdrawalManagement language={language} user={user} />;
      case 'notifications':
        return <NotificationManagement user={user} space={currentSpace} language={language} onSpaceUpdate={setCurrentSpace} />;
      case 'templates':
        return <TemplateManagement space={currentSpace} language={language} />;
      case 'finetune':
        return <FineTuneManagement language={language} />;
      case 'settings':
        return <Settings user={user} language={language} systemConfig={systemConfig} onSystemConfigUpdate={onSystemConfigUpdate} onUserUpdate={onUserUpdate} />;
      default:
        return null;
    }
  };

  const NavItem: React.FC<{ tab: AdminTab; label: string; icon: React.ReactElement<{ className?: string }> }> = ({ tab, label, icon }) => (
    <button
      onClick={() => navigate(!spaceSlug ? `/admin/${tab}` : `/${spaceSlug}/admin/${tab}`)}
      className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
        ? 'bg-primary-light text-primary'
        : 'text-text-light hover:bg-background-light'
        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
    >
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
      {!isSidebarCollapsed && <span className="ml-4">{label}</span>}
    </button>
  );

  const hasPermission = (tab: AdminTab) => user.permissions?.includes(tab);
  const effectiveSpaceSlug = spaceSlug || '';
  // Bodhi global admin → Bodhi logo | Space admin → space cover image (imageUrl only, no Bodhi fallback)
  const logoUrl = isGlobalAdmin
    ? 'https://www.bodhilab.io/assets/bodhi-technology-lab-logo-DRtZYi2v.webp'
    : (currentSpace?.imageUrl || '');

  return (
    <div className="admin-page-container flex h-screen overflow-hidden bg-background-light" data-color-mode={colorMode}>
      <aside className={`bg-background-panel border-r border-border-color flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="h-[73px] flex items-center justify-center relative border-b border-border-color px-4 flex-shrink-0">
          {!isSidebarCollapsed && logoUrl && (
            <Link to={!spaceSlug ? '/admin/dashboard' : `/${effectiveSpaceSlug}/admin/dashboard`} className="flex items-center">
              <img src={logoUrl} alt="Logo" className={isGlobalAdmin ? "h-10" : "h-12"} />
            </Link>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-2 rounded-md hover:bg-background-light text-text-light transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : 'absolute right-4'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {hasPermission('dashboard') && <NavItem tab="dashboard" label={t.dashboard} icon={<DashboardIcon />} />}
          {hasPermission('notifications') && <NavItem tab="notifications" label={t.notificationManagement} icon={<BellIcon />} />}
          {hasPermission('files') && <NavItem tab="files" label={t.filesAndDocuments} icon={<DocumentTextIcon />} />}
          {hasPermission('media-library') && <NavItem tab="media-library" label={t.mediaLibrary} icon={<PhotoIcon />} />}
          {hasPermission('spaces') && <NavItem tab="spaces" label={t.spaceManagement} icon={<MapPinIcon />} />}
          {hasPermission('templates') && <NavItem tab="templates" label={t.templateManagement} icon={<TemplateIcon />} />}
          {hasPermission('meditation') && <NavItem tab="meditation" label={t.meditationManagement} icon={<MeditationIcon />} />}
          {hasPermission('dharma-talks') && <NavItem tab="dharma-talks" label={t.dharmaTalkManagement} icon={<RadioIcon />} />}
          {hasPermission('comments') && <NavItem tab="comments" label={t.commentManagement} icon={<ChatBubbleIcon />} />}
          {hasPermission('ai') && <NavItem tab="ai" label={t.aiManagement} icon={<AiIcon />} />}
          {hasPermission('conversations') && <NavItem tab="conversations" label={t.conversationManagement} icon={<ConversationIcon />} />}
          {hasPermission('finetune') && <NavItem tab="finetune" label={t.fineTuneManagement} icon={<FineTuneIcon />} />}
          {hasPermission('pricing') && <NavItem tab="pricing" label={t.pricingManagement} icon={<PricingIcon />} />}
          {hasPermission('user-billing') && <NavItem tab="user-billing" label={t.transactionsAndTopUp} icon={<BillingIcon />} />}

          {hasPermission('space-billing') && <NavItem tab="space-billing" label={t.spaceBilling} icon={<BillingIcon />} />}
          {hasPermission('manual-billing') && <NavItem tab="manual-billing" label={t.manualBilling} icon={<CryptoIcon />} />}
          {hasPermission('payment-settings') && <NavItem tab="payment-settings" label={t.paymentSettings} icon={<SettingsIcon />} />}
          {hasPermission('withdrawals') && <NavItem tab="withdrawals" label={t.withdrawalManagement} icon={<BillingIcon />} />}
          {hasPermission('users') && <NavItem tab="users" label={t.userManagement} icon={<UserIcon />} />}
          {hasPermission('roles') && <NavItem tab="roles" label={t.roleManagement} icon={<RoleIcon />} />}
          {hasPermission('settings') && <NavItem tab="settings" label={t.settings} icon={<SettingsIcon />} />}
        </nav>

        <div className="p-4 border-t border-border-color flex-shrink-0">
          {isSidebarCollapsed ? (
            <div className="flex justify-center">
              <button onClick={() => setIsSidebarCollapsed(false)} title={user.name}>
                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-full p-2 text-sm font-medium text-text-main border border-border-color rounded-md">
                <div className="flex items-center">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-3" />
                  <div className="overflow-hidden">
                    <p className="font-semibold truncate text-sm">{user.name}</p>
                    <p className="text-xs text-text-light truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setIsEditProfileModalOpen(true)}
                        className="text-xs text-primary hover:underline p-0 bg-transparent border-none cursor-pointer"
                      >
                        {t.editProfile}
                      </button>
                      <span className="text-xs text-border-color">|</span>
                      <button
                        onClick={() => setIsChangePasswordModalOpen(true)}
                        className="text-xs text-primary hover:underline p-0 bg-transparent border-none cursor-pointer"
                      >
                        {t.changePassword}
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              <div className="user-menu-language-switcher">
                <div className="user-menu-language-switcher-pill">
                  <button onClick={() => setLanguage('vi')} className={language === 'vi' ? 'active' : ''}>VIE</button>
                  <button onClick={() => setLanguage('en')} className={language === 'en' ? 'active' : ''}>ENG</button>
                </div>
              </div>

              {isGlobalAdmin ? (
                <a href="https://www.bodhilab.io/" className="block w-full text-center px-4 py-2 text-sm font-medium text-text-main border border-border-color rounded-md hover:bg-background-light">
                  {language === 'vi' ? 'Trang chủ' : 'Home'}
                </a>
              ) : (
                <Link to={`/${effectiveSpaceSlug}/chat`} className="block w-full text-center px-4 py-2 text-sm font-medium text-text-main border border-border-color rounded-md hover:bg-background-light">
                  {t.toAppPage}
                </Link>
              )}
              <button onClick={onLogout} className="w-full px-4 py-2 text-sm font-medium text-text-on-primary bg-accent-red rounded-md hover:bg-accent-red-hover">
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-background-panel">
        {renderContent()}
      </main>

      {systemConfig && (
        <>
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            user={user}
            language={language}
            onUserUpdate={onUserUpdate}
            space={currentSpace}
          />
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onClose={() => setIsChangePasswordModalOpen(false)}
            user={user}
            language={language}
            onOpenForgotPassword={() => {
              setIsChangePasswordModalOpen(false);
              setIsForgotPasswordModalOpen(true);
            }}
          />
          <ForgotPasswordModal
            isOpen={isForgotPasswordModalOpen}
            onClose={() => setIsForgotPasswordModalOpen(false)}
            language={language}
          />
        </>
      )}
    </div>
  );
};

export default AdminPage;