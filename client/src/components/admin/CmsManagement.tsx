import React, { useState, useEffect, useCallback } from 'react';
import { Space, CmsArticle, CmsSocialConnection, FbAlbum } from '../../types';
import { apiService } from '../../services/apiService';
import { MediaPickerModal } from './MediaPickerModal';
import { PencilIcon, TrashIcon } from '../Icons';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', scheduled: '#f59e0b',
  published: '#10b981', failed: '#ef4444', pending: '#9ca3af', success: '#10b981', deleted: '#dc2626'
};
const STATUS_LABELS_VI: Record<string, string> = {
  draft: 'Nháp', scheduled: 'Đã lên lịch', published: 'Đã đăng', failed: 'Thất bại', deleted: 'Thùng rác'
};
const STATUS_LABELS_EN: Record<string, string> = {
  draft: 'Draft', scheduled: 'Scheduled', published: 'Published', failed: 'Failed', deleted: 'Trash'
};

const FbIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const IgIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100-2.881 1.44 1.44 0 000 2.881z"/></svg>;
const ThIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M14.502 10.364c-.815-.316-1.785-.458-3.08-.458-1.558 0-2.906.27-3.957.65-1.1.4-1.92.893-2.32 1.343l.034-.055c.783-1.218 2.378-2.072 4.417-2.316.59-.071 1.23-.087 1.954-.047 1.84.102 3.68.795 4.887 1.637l.08.058c.954.72 1.572 1.644 1.776 2.585.122.56.136 1.144.037 1.764a5.534 5.534 0 01-2.052 3.42 5.163 5.163 0 01-3.155 1.055c-.562 0-1.1-.093-1.602-.278-1.792-.663-2.73-2.585-2.28-4.63.157-.714.514-1.378.966-1.93.072-.088.16-.188.267-.3a16.892 16.892 0 012.39-2.007c.882-.62 2.357-1.42 3.753-1.85a18.237 18.237 0 012.283-.548c.15-.028.32-.054.512-.08v-.004c.156-.02.32-.04.5-.057-.59-.286-1.36-.453-2.348-.523zm-2.032 7.744a3.172 3.172 0 001.916-.62c.76-.583 1.258-1.464 1.385-2.428.1-.758-.094-1.474-.526-2.046a3.86 3.86 0 00-1.298-1.04l-.066-.03c-.2-.08-.413-.146-.636-.2a13.333 13.333 0 00-3.32.96 15.651 15.651 0 00-1.97 1.008c-.705.418-1.31.848-1.767 1.25-.337.297-.61.614-.794.94.1.283.334.614.735.918.49.37 1.13.613 1.874.7 1.056.124 2.105-.187 2.47-.406z M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/></svg>;

const PLATFORM_ICONS: Record<string, React.ReactNode> = { facebook: <FbIcon />, instagram: <IgIcon />, threads: <ThIcon /> };
const PLATFORMS = ['facebook', 'instagram', 'threads'] as const;

interface Props { user: any; space: Space | null; language: 'vi' | 'en'; }

export const CmsManagement: React.FC<Props> = ({ space, language }) => {
  const t = (vi: string, en: string) => language === 'vi' ? vi : en;
  const spaceId = space?.id;

  const [tab, setTab] = useState<'articles' | 'connections'>('articles');
  const [apiKey, setApiKey] = useState<string>('YOUR_SECRET');
  const [articles, setArticles] = useState<CmsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterMain, setFilterMain] = useState('pending');
  const [filterSub, setFilterSub] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<CmsSocialConnection[]>([]);
  const [fbPages, setFbPages] = useState<any[] | null>(null);
  const [loadingFbPages, setLoadingFbPages] = useState(false);
  const [editArticle, setEditArticle] = useState<CmsArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importDocs, setImportDocs] = useState<any[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importPage, setImportPage] = useState(1);
  const [importTotal, setImportTotal] = useState(0);
  const IMPORT_LIMIT = 30;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [importingBulk, setImportingBulk] = useState(false);

  const [toast, setToast] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // FB Albums states
  const [fbAlbums, setFbAlbums] = useState<FbAlbum[]>([]);
  const [showFbAlbumModal, setShowFbAlbumModal] = useState(false);
  const [newFbAlbumName, setNewFbAlbumName] = useState('');
  const [newFbAlbumId, setNewFbAlbumId] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadArticles = useCallback(async () => {
    if (!spaceId) return;
    setLoading(true);
    try {
      let status = '';
      let platform = '';
      let platformStatus = '';

      if (['success', 'failed'].includes(filterMain)) {
          if (filterSub !== 'all') {
              platform = filterSub;
              platformStatus = filterMain;
          } else {
              status = filterMain === 'success' ? 'published' : 'failed';
          }
      } else {
          status = filterMain;
          if (filterMain === 'pending' && filterSub !== 'all') {
              platform = filterSub;
          }
      }
      const res = await apiService.getCmsArticles(spaceId, { 
        page, 
        limit: 15, 
        search, 
        status, 
        platform, 
        platformStatus 
      });
      setArticles(res.data || []);
      setTotal(res.total || 0);
    } catch (e: any) { showToast(e.message); }
    setLoading(false);
  }, [spaceId, page, filterMain, filterSub, search]);

  const loadConnections = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await apiService.getCmsConnections(spaceId);
      if (res && res.connections && Array.isArray(res.connections)) {
        setConnections(res.connections);
        setApiKey(res.apiKey || 'YOUR_SECRET');
      } else if (Array.isArray(res)) {
        setConnections(res);
      } else {
        setConnections([]);
      }
    } catch (e: any) { console.error(e); }
  }, [spaceId]);

  const loadFbAlbums = useCallback(async () => {
    if (!spaceId) return;
    try {
      const res = await apiService.getCmsFbAlbums(spaceId);
      setFbAlbums(res || []);
    } catch (e: any) { console.error('Error loading FB albums', e); }
  }, [spaceId]);

  useEffect(() => { loadArticles(); }, [loadArticles]);
  useEffect(() => { loadConnections(); }, [loadConnections]);
  useEffect(() => { loadFbAlbums(); }, [loadFbAlbums]);

  // Check OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      showToast(t(`Kết nối ${params.get('platform')} thành công!`, `${params.get('platform')} connected!`));
      setTab('connections');
      loadConnections();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async (platform: string) => {
    if (!spaceId) return;
    try {
      const { url } = await apiService.getCmsOAuthUrl(spaceId, platform);
      window.location.href = url;
    } catch (e: any) { showToast(e.message); }
  };

  const handleDisconnect = async (connId: number) => {
    if (!spaceId) return;
    setConfirmDialog({
      message: t('Bạn chắc chắn muốn ngắt kết nối?', 'Are you sure you want to disconnect?'),
      onConfirm: async () => {
        try {
          await apiService.deleteCmsConnection(spaceId, connId);
          loadConnections();
          showToast(t('Đã ngắt kết nối', 'Disconnected'));
        } catch (e: any) { showToast(e.message); }
      }
    });
  };

  const fetchFbPages = async () => {
    if (!spaceId) return;
    setLoadingFbPages(true);
    try {
      const pages = await apiService.getFacebookPages(spaceId);
      setFbPages(pages);
    } catch (e: any) {
      showToast(e.message || t('Không thể lấy danh sách Page', 'Failed to fetch pages'));
    }
    setLoadingFbPages(false);
  };

  const handleSelectFbPage = async (pageName: string, accessToken: string, pageId: string) => {
    if (!spaceId) return;
    try {
      await apiService.updateFacebookConnection(spaceId, { pageName, accessToken, pageId } as any);
      showToast(t('Đã cập nhật Token', 'Token updated'));
      setFbPages(null);
      loadConnections();
    } catch (e: any) {
      showToast(e.message || t('Cập nhật thất bại', 'Update failed'));
    }
  };

  const openNewArticle = () => {
    setEditArticle({ id: 'new', spaceId: spaceId as number, title: '', content: '', imageUrls: [], status: 'draft', targetPlatforms: [], tags: [], createdAt: '' });
    setShowEditor(true);
  };

  const openEditArticle = async (id: number) => {
    if (!spaceId) return;
    try {
      const a = await apiService.getCmsArticle(spaceId, id);
      setEditArticle(a);
      setShowEditor(true);
    } catch (e: any) { showToast(e.message); }
  };

  const handleCreateFbAlbum = async () => {
    if (!spaceId || !newFbAlbumName.trim() || !newFbAlbumId.trim()) {
      showToast(t('Vui lòng nhập đầy đủ Tên và ID', 'Name and ID are required'));
      return;
    }
    setSaving(true);
    try {
      const res = await apiService.createCmsFbAlbum(spaceId, newFbAlbumName, newFbAlbumId);
      setFbAlbums([res, ...fbAlbums]); // Add to top of list
      if (editArticle) {
        setEditArticle({ ...editArticle, fbAlbumId: res.album_id });
      }
      setShowFbAlbumModal(false);
      setNewFbAlbumName('');
      setNewFbAlbumId('');
      showToast(t('Thêm FB Album thành công', 'Added FB Album successfully'));
    } catch (e: any) {
      showToast(e.message);
    }
    setSaving(false);
  };

  const handleSave = async (status?: string) => {
    if (!spaceId || !editArticle || !editArticle.title.trim()) { showToast(t('Tiêu đề không được trống', 'Title is required')); return; }
    setSaving(true);
    try {
      const data = { ...editArticle, status: status || editArticle.status || 'draft' };
      if (editArticle.id === 'new') {
        await apiService.createCmsArticle(spaceId, data);
      } else {
        await apiService.updateCmsArticle(spaceId, editArticle.id, data);
      }
      setShowEditor(false);
      setEditArticle(null);
      loadArticles();
      showToast(t('Đã lưu', 'Saved'));
    } catch (e: any) { showToast(e.message); }
    setSaving(false);
  };

  const handlePublish = async (articleId: number, targetPlatforms: string[]) => {
    if (!spaceId) return;
    const connectedPlatforms = connections.filter(c => c.isActive && targetPlatforms.includes(c.platform)).map(c => c.platform);
    if (connectedPlatforms.length === 0) { showToast(t('Chưa chọn nền tảng nào hoặc chưa kết nối', 'No valid platforms selected')); return; }
    try {
      await apiService.publishCmsArticle(spaceId, articleId, connectedPlatforms);
      showToast(t('Đã gửi đăng bài', 'Publishing...'));
      loadArticles();
    } catch (e: any) { showToast(e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!spaceId) return;
    setConfirmDialog({
      message: t('Xóa bài viết này?', 'Delete this article?'),
      onConfirm: async () => {
        try {
          await apiService.deleteCmsArticle(spaceId, id);
          loadArticles();
          showToast(t('Đã xóa', 'Deleted'));
        } catch (e: any) { showToast(e.message); }
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === articles.length && articles.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(articles.map(a => a.id as number));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePublishMass = async (platform: string) => {
    if (!spaceId || selectedIds.length === 0) return;
    const conn = connections.find(c => c.platform === platform && c.isActive);
    if (!conn) { showToast(t(`Chưa kết nối ${platform}`, `Not connected to ${platform}`)); return; }
    
    setConfirmDialog({
      message: t(`Gửi đăng ${selectedIds.length} bài viết lên ${platform}?`, `Publish ${selectedIds.length} articles to ${platform}?`),
      onConfirm: async () => {
        setLoading(true);
        let successCount = 0;
        for (const id of selectedIds) {
          try {
            await apiService.publishCmsArticle(spaceId, id, [platform]);
            successCount++;
          } catch (e: any) { console.error(e); }
        }
        showToast(t(`Đã gửi đăng ${successCount}/${selectedIds.length} bài`, `Published ${successCount}/${selectedIds.length} articles`));
        setSelectedIds([]);
        loadArticles();
      }
    });
  };

  const handleDeleteMass = async () => {
    if (!spaceId || selectedIds.length === 0) return;
    setConfirmDialog({
      message: t(`Xóa ${selectedIds.length} bài viết vào thùng rác?`, `Move ${selectedIds.length} articles to trash?`),
      onConfirm: async () => {
        setLoading(true);
        for (const id of selectedIds) {
          try { await apiService.deleteCmsArticle(spaceId, id); } catch (e: any) { console.error(e); }
        }
        showToast(t(`Đã xóa ${selectedIds.length} bài`, `Deleted ${selectedIds.length} articles`));
        setSelectedIds([]);
        loadArticles();
      }
    });
  };

  const handlePermanentDelete = async (id: number) => {
    if (!spaceId) return;
    setConfirmDialog({
      message: t('Xóa vĩnh viễn bài này? Không thể khôi phục!', 'Permanently delete? Cannot be undone!'),
      onConfirm: async () => {
        try {
          await apiService.permanentDeleteCmsArticle(spaceId, id);
          loadArticles();
          showToast(t('Đã xóa vĩnh viễn', 'Permanently deleted'));
        } catch (e: any) { showToast(e.message); }
      }
    });
  };

  const handlePermanentDeleteMass = async () => {
    if (!spaceId || selectedIds.length === 0) return;
    setConfirmDialog({
      message: t(`Xóa vĩnh viễn ${selectedIds.length} bài? Không thể khôi phục!`, `Permanently delete ${selectedIds.length} articles? Cannot be undone!`),
      onConfirm: async () => {
        setLoading(true);
        for (const id of selectedIds) {
          try { await apiService.permanentDeleteCmsArticle(spaceId, id); } catch (e: any) { console.error(e); }
        }
        showToast(t(`Đã xóa vĩnh viễn ${selectedIds.length} bài`, `Permanently deleted ${selectedIds.length} articles`));
        setSelectedIds([]);
        loadArticles();
      }
    });
  };

  // const handleShareToFeed = async (articleId: number) => {
  //   if (!spaceId) return;
  //   try {
  //     await apiService.shareCmsToSocialFeed(spaceId, articleId);
  //     showToast(t('Đã chia sẻ lên Cộng đồng!', 'Shared to Social Feed!'));
  //   } catch (e: any) { showToast(e.message); }
  // };

  const loadImportDocs = async (pageNum: number = 1) => {
    if (!spaceId) return;
    try {
      const res = await apiService.getLibraryDocuments({ spaceId, search: importSearch, limit: IMPORT_LIMIT, page: pageNum, excludeCmsSpaceId: spaceId });
      setImportDocs(res.data || []);
      setImportTotal(res.total || 0);
      setImportPage(pageNum);
    } catch (e: any) { showToast(e.message); }
  };

  const handleImportSearch = async () => {
    setImportSelectedIds([]);
    await loadImportDocs(1);
  };

  const handleImportDoc = async (docId: number) => {
    if (!spaceId) return;
    try {
      await apiService.importDocumentToCms(spaceId, docId);
      setImportDocs(prev => prev.filter((d: any) => d.id !== docId));
      setImportTotal(prev => prev - 1);
      showToast(t('Đã import', 'Imported'));
    } catch (e: any) { showToast(e.message); }
  };

  const handleImportBulk = async () => {
    if (!spaceId || importSelectedIds.length === 0) return;
    setImportingBulk(true);
    let successCount = 0;
    for (const docId of importSelectedIds) {
      try {
        await apiService.importDocumentToCms(spaceId, docId);
        successCount++;
      } catch (e: any) { console.error(e); }
    }
    showToast(t(`Đã import ${successCount}/${importSelectedIds.length} bài`, `Imported ${successCount}/${importSelectedIds.length} articles`));
    setImportSelectedIds([]);
    setImportingBulk(false);
    loadArticles();
    // Reload current page
    await loadImportDocs(importPage);
  };

  const toggleImportSelect = (id: number) => {
    setImportSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleImportSelectAll = () => {
    if (importSelectedIds.length === importDocs.length && importDocs.length > 0) {
      setImportSelectedIds([]);
    } else {
      setImportSelectedIds(importDocs.map((d: any) => d.id));
    }
  };

  const toggleImageUrl = (url: string) => {
    if (!editArticle) return;
    const urls = editArticle.imageUrls.includes(url)
      ? editArticle.imageUrls.filter(u => u !== url)
      : [...editArticle.imageUrls, url];
    setEditArticle({ ...editArticle, imageUrls: urls });
  };

  
  const togglePlatform = (p: string) => {
    if (!editArticle) return;
    const platforms = editArticle.targetPlatforms.includes(p)
      ? editArticle.targetPlatforms.filter(x => x !== p)
      : [...editArticle.targetPlatforms, p];
    setEditArticle({ ...editArticle, targetPlatforms: platforms });
  };

  if (!spaceId) return <div className="p-8 text-center text-text-light">{t('Đang tải...', 'Loading...')}</div>;

  const sLabel = language === 'vi' ? STATUS_LABELS_VI : STATUS_LABELS_EN;
  const totalPages = Math.ceil(total / 15);

  
  // ── Styles (Tailwind mapping) ──
  const btnBase = "px-6 py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
  const btnPrimaryClass = btnBase + " bg-primary text-text-on-primary hover:bg-primary-hover";
  const btnOutlineClass = btnBase + " bg-background-panel border border-border-color text-text-main hover:bg-background-light";
  const btnDangerClass = btnBase + " border border-red-200 bg-red-50 text-red-600 hover:bg-red-100";
  const badgeClass = "px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1";
  const inputClass = "w-full px-4 py-2.5 text-sm border border-border-color rounded-lg bg-background-panel text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-light";
  const overlayClass = "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4";
  const modalClass = "bg-background-panel w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col";

  return (
    <div className="p-6 overflow-y-auto h-full">
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1f2937', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>{toast}</div>}

      <h1 className="text-2xl font-bold mb-1">{t('Quản Lý Tin Tức', 'News CMS')}</h1>
      <p className="text-text-light text-sm mb-6">{t('Soạn và đăng bài lên Facebook, Instagram, Threads qua n8n', 'Create and publish articles to social platforms via n8n')}</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('articles')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'articles' ? 'border-primary text-primary' : 'border-transparent text-text-light hover:text-text-main'}`}>{t('📝 Bài Viết', '📝 Articles')}</button>
        <button onClick={() => setTab('connections')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'connections' ? 'border-primary text-primary' : 'border-transparent text-text-light hover:text-text-main'}`}>{t('🔗 Kết Nối MXH', '🔗 Social Connections')}</button>
      </div>

      {/* ═══ CONNECTIONS TAB ═══ */}
      {tab === 'connections' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">{t('Kết nối Mạng Xã Hội', 'Social Media Connections')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORMS.map(p => {
              const conn = connections.find(c => c.platform === p && c.isActive);
              return (
                <div key={p} className="bg-background-panel border rounded-xl p-5 shadow-sm" style={{ borderColor: conn ? STATUS_COLORS.success : "var(--color-border-color)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl text-primary">{PLATFORM_ICONS[p]}</span>
                    <div>
                      <h3 className="font-semibold capitalize">{p}</h3>
                      {conn ? <span style={{ backgroundColor: STATUS_COLORS.success+"22", color: STATUS_COLORS.success }} className={badgeClass}>✅ {t('Đã kết nối', 'Connected')}</span> : <span style={{ backgroundColor: "#6b728022", color: "#6b7280" }} className={badgeClass}>{t('Chưa kết nối', 'Not connected')}</span>}
                    </div>
                  </div>
                  {conn && <p className="text-sm text-text-light mb-2">{conn.pageName || ''} · Token: {conn.accessToken}</p>}
                  {conn ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleDisconnect(conn.id)} className={btnDangerClass}>{t('Ngắt kết nối', 'Disconnect')}</button>
                      {p === 'facebook' && (
                        <button onClick={fetchFbPages} disabled={loadingFbPages} className={btnOutlineClass}>
                          {loadingFbPages ? '...' : t('Chọn Page', 'Select Page')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => handleConnect(p)} className={btnPrimaryClass}>{t(`Kết nối ${p}`, `Connect ${p}`)}</button>
                  )}
                  {conn && (
                    <div className="mt-4 pt-3 border-t border-border-color">
                      <p className="text-[11px] font-medium text-text-light mb-1">API Webhook n8n (GET):</p>
                      <div className="flex gap-1">
                        <input readOnly value={`${window.location.origin}/api/cms/${space?.slug || ''}/webhook/pending-articles?apiKey=${apiKey}`} className="flex-1 text-[11px] bg-background-light border border-border-color rounded px-2 py-1 outline-none text-text-main" onFocus={e => e.target.select()} />
                        <button onClick={() => { 
                          navigator.clipboard.writeText(`${window.location.origin}/api/cms/${space?.slug || ''}/webhook/pending-articles?apiKey=${apiKey}`); 
                          showToast('Đã copy API n8n!'); 
                        }} className="text-xs text-primary hover:underline whitespace-nowrap">Copy</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ARTICLES TAB ═══ */}
      {tab === 'articles' && (
        <div>
          {/* Toolbar */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-3 flex-wrap">
              <button onClick={openNewArticle} className={btnPrimaryClass}>✏️ {t('Tạo bài mới', 'New Article')}</button>
              <button onClick={() => { setShowImport(true); loadImportDocs(1); }} className={btnOutlineClass}>📥 {t('Import từ Thư viện', 'Import from Library')}</button>
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 border-y border-border-color py-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {/* <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="filterMain" value="" checked={filterMain === ''} onChange={e => { setFilterMain(e.target.value); setFilterSub('all'); setPage(1); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm font-medium">{t('Tất cả', 'All')}</span>
                  </label> */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="filterMain" value="pending" checked={filterMain === 'pending'} onChange={e => { setFilterMain(e.target.value); setFilterSub('all'); setPage(1); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm">{t('Chờ đăng', 'Pending')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="filterMain" value="success" checked={filterMain === 'success'} onChange={e => { setFilterMain(e.target.value); setFilterSub('all'); setPage(1); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm">{t('Đã đăng', 'Published')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="filterMain" value="failed" checked={filterMain === 'failed'} onChange={e => { setFilterMain(e.target.value); setFilterSub('all'); setPage(1); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm">{t('Thất bại', 'Failed')}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-4">
                    <input type="radio" name="filterMain" value="deleted" checked={filterMain === 'deleted'} onChange={e => { setFilterMain(e.target.value); setFilterSub('all'); setPage(1); }} className="accent-primary w-4 h-4" />
                    <span className="text-sm text-text-light">{t('Thùng rác', 'Trash')}</span>
                  </label>
                </div>
                {['pending', 'success', 'failed'].includes(filterMain) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pl-4 border-l-2 border-border-color mt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="filterSub" value="all" checked={filterSub === 'all'} onChange={e => { setFilterSub(e.target.value); setPage(1); }} className="accent-primary w-3.5 h-3.5" />
                      <span className="text-xs text-text-light">{t('Tất cả', 'All')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="filterSub" value="facebook" checked={filterSub === 'facebook'} onChange={e => { setFilterSub(e.target.value); setPage(1); }} className="accent-primary w-3.5 h-3.5" />
                      <span className="text-xs text-text-main">Facebook</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="filterSub" value="instagram" checked={filterSub === 'instagram'} onChange={e => { setFilterSub(e.target.value); setPage(1); }} className="accent-primary w-3.5 h-3.5" />
                      <span className="text-xs text-text-main">Instagram</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="filterSub" value="threads" checked={filterSub === 'threads'} onChange={e => { setFilterSub(e.target.value); setPage(1); }} className="accent-primary w-3.5 h-3.5" />
                      <span className="text-xs text-text-main">Threads</span>
                    </label>
                  </div>
                )}
              </div>
              <input placeholder={t('Tìm kiếm...', 'Search...')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={inputClass + " md:max-w-xs"} />
            </div>
          </div>

          {/* Article list */}
          {loading ? <div className="text-center py-8"><span className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div> : articles.length === 0 ? (
            <div className="text-center py-12 text-text-light">{t('Chưa có bài viết nào', 'No articles yet')}</div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 px-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary" checked={selectedIds.length === articles.length && articles.length > 0} onChange={toggleSelectAll} />
                  <span className="text-sm font-medium">{t('Chọn tất cả', 'Select all')}</span>
                </label>
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium mr-2">{selectedIds.length} {t('đã chọn', 'selected')}:</span>
                    {filterMain !== 'deleted' && (
                      <>
                        <button onClick={() => handlePublishMass('facebook')} className={btnOutlineClass + " !px-3 !py-1 !text-xs border-primary text-primary hover:bg-primary hover:text-white transition-colors"}>FB</button>
                        <button onClick={() => handlePublishMass('instagram')} className={btnOutlineClass + " !px-3 !py-1 !text-xs border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors"}>IG</button>
                        <button onClick={() => handlePublishMass('threads')} className={btnOutlineClass + " !px-3 !py-1 !text-xs border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition-colors"}>Threads</button>
                        <button onClick={handleDeleteMass} className={btnDangerClass + " !px-3 !py-1 !text-xs"}>🗑️ {t('Xóa', 'Delete')}</button>
                      </>
                    )}
                    {filterMain === 'deleted' && (
                      <button onClick={handlePermanentDeleteMass} className={btnDangerClass + " !px-3 !py-1 !text-xs"}>✕ {t('Xóa vĩnh viễn', 'Permanently Delete')}</button>
                    )}
                  </div>
                )}
              </div>
              {articles.map(a => (
                <div key={a.id} className="bg-background-panel border border-border-color rounded-xl p-5 mb-4 shadow-sm flex items-start gap-4 transition-colors" style={{ backgroundColor: selectedIds.includes(a.id as number) ? 'var(--color-primary-light)' : undefined }}>
                  <input type="checkbox" className="w-5 h-5 mt-1 accent-primary flex-shrink-0 cursor-pointer" checked={selectedIds.includes(a.id as number)} onChange={() => toggleSelect(a.id as number)} />
                  <div className="flex-1 flex items-start gap-4 min-w-0">
                    {a.imageUrls?.[0] && <img src={a.imageUrls[0]} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{a.title}</h3>
                        <span style={{ backgroundColor: (STATUS_COLORS[a.status] || "#6b7280")+"22", color: STATUS_COLORS[a.status] || "#6b7280" }} className={badgeClass}>{sLabel[a.status] || a.status}</span>
                      </div>
                      <p className="text-sm text-text-light truncate mb-1">{a.content?.substring(0, 120) || ''}</p>
                      <div className="flex items-center gap-3 text-xs text-text-light mb-2">
                        <span>📅 {new Date(a.createdAt || '').toLocaleDateString()}</span>
                        {a.author && <span>✍️ {a.author}</span>}
                        {a.sourceDocumentTitle && <span>📚 {a.sourceDocumentTitle}</span>}
                      </div>

                      {/* Social Platforms Status */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PLATFORMS.map(p => {
                          const log = a.publishLogs?.find((l: any) => l.platform === p);
                          if (!a.targetPlatforms?.includes(p) && !log) return null;
                          return (
                            <div key={p} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background-light border border-border-color text-xs">
                              <span className="text-base">{PLATFORM_ICONS[p]}</span>
                              <span className="capitalize font-medium">{p}</span>
                              {log ? (
                                <>
                                  <span style={{ backgroundColor: (STATUS_COLORS[log.status] || "#6b7280")+"22", color: STATUS_COLORS[log.status] || "#6b7280" }} className={badgeClass + " !px-2 !py-0.5"}>{log.status}</span>
                                  {log.errorMessage && <span className="text-red-500 font-medium ml-1" title={log.errorMessage}>⚠️ Lỗi</span>}
                                </>
                              ) : (
                                <span className="text-text-light italic">Chưa đăng</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 self-start">
                      {filterMain !== 'deleted' && (
                        <button onClick={() => openEditArticle(a.id as number)} className={btnOutlineClass + " !p-2"} title={t('Sửa', 'Edit')}>
                          <PencilIcon className="w-5 h-5 text-text-main" />
                        </button>
                      )}
                      {filterMain === 'deleted' ? (
                        <button onClick={() => handlePermanentDelete(a.id as number)} className={btnDangerClass + " !p-2"} title={t('Xóa vĩnh viễn', 'Permanent Delete')}>
                          <span className="text-red-600 font-bold text-lg">✕</span>
                        </button>
                      ) : (
                        <button onClick={() => handleDelete(a.id as number)} className={btnDangerClass + " !p-2"} title={t('Xóa', 'Delete')}>
                          <TrashIcon className="w-5 h-5 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-color">
                  <span className="text-xs text-text-light">{t(`Tổng: ${total} bài`, `Total: ${total} articles`)}</span>
                  <div className="flex gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={btnOutlineClass + " !px-3 !py-1 !text-xs"}>&laquo;</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-text-light self-center">…</span>}
                          <button onClick={() => setPage(p)} className={(page === p ? btnPrimaryClass : btnOutlineClass) + " !px-3 !py-1 !text-xs"}>{p}</button>
                        </React.Fragment>
                      ))}
                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={btnOutlineClass + " !px-3 !py-1 !text-xs"}>&raquo;</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ EDITOR MODAL ═══ */}
      {showEditor && editArticle && (
        <div className={overlayClass}>
          <div className={modalClass}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color flex-shrink-0"><h2 className="text-xl font-bold text-text-main">{editArticle.id === 'new' ? t('📝 Tạo bài viết', '📝 New Article') : t('✏️ Sửa bài viết', '✏️ Edit Article')}</h2><button onClick={() => setShowEditor(false)} className="text-text-light hover:text-text-main text-2xl leading-none">&times;</button></div><div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('Tiêu đề', 'Title')} *</label>
                <input value={editArticle.title} onChange={e => setEditArticle({ ...editArticle, title: e.target.value })} className={inputClass} placeholder={t('Nhập tiêu đề...', 'Enter title...')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Tác giả', 'Author')}</label>
                <input value={editArticle.author || ''} onChange={e => setEditArticle({ ...editArticle, author: e.target.value })} className={inputClass} placeholder={t('Nhập tác giả...', 'Enter author...')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Nội dung', 'Content')}</label>
                <textarea value={editArticle.content || ''} onChange={e => setEditArticle({ ...editArticle, content: e.target.value })} className={inputClass + " min-h-[160px] resize-none"} placeholder={t('Nhập nội dung...', 'Enter content...')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Hình ảnh', 'Images')}</label>
                <button onClick={() => setShowMediaPicker(true)} className={btnOutlineClass + " !px-4 !py-2 !inline-flex !w-auto"}>🖼️ {t('Chọn từ Thư viện Media', 'Select from Media Library')}</button>
                {editArticle.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editArticle.imageUrls.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                        <button onClick={() => toggleImageUrl(url)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', lineHeight: '18px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Nền tảng đăng', 'Target Platforms')}</label>
                <div className="flex gap-3">
                  {PLATFORMS.map(p => {
                    const conn = connections.find(c => c.platform === p && c.isActive);
                    return (
                      <label key={p} className="flex items-center gap-2 cursor-pointer" style={{ opacity: conn ? 1 : 0.4 }}>
                        <input type="checkbox" checked={editArticle.targetPlatforms.includes(p)} onChange={() => togglePlatform(p)} disabled={!conn} />
                        <span>{PLATFORM_ICONS[p]} {p}</span>
                        {!conn && <span className="text-xs text-text-light">({t('chưa kết nối', 'not connected')})</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">FB Album</label>
                <div className="flex gap-2">
                  <select 
                    value={editArticle.fbAlbumId || ''} 
                    onChange={e => setEditArticle({ ...editArticle, fbAlbumId: e.target.value })} 
                    className={`${inputClass} flex-1`}
                  >
                    <option value="">-- {t('Không chọn', 'None')} --</option>
                    {fbAlbums.map(album => (
                      <option key={album.id} value={album.album_id}>{album.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setShowFbAlbumModal(true)} 
                    className="bg-primary text-white px-3 py-2 rounded-lg flex-shrink-0 hover:bg-primary-dark transition-colors"
                    title={t('Thêm Album mới', 'Add new Album')}
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Lên lịch đăng', 'Schedule')}</label>
                <input type="datetime-local" value={editArticle.scheduledAt?.slice(0, 16) || ''} onChange={e => setEditArticle({ ...editArticle, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className={inputClass} />
              </div>
            </div>
            </div><div className="px-6 py-4 border-t border-border-color flex gap-3 justify-end flex-shrink-0">
              <button onClick={() => setShowEditor(false)} className={btnOutlineClass}>{t('Hủy', 'Cancel')}</button>
              <button onClick={() => handleSave('draft')} disabled={saving} className={btnOutlineClass}>{saving ? '...' : t('Lưu nháp', 'Save Draft')}</button>
              <button onClick={() => { handleSave(editArticle.scheduledAt ? 'scheduled' : 'draft').then(() => { if (editArticle.id !== 'new') handlePublish(editArticle.id as number, editArticle.targetPlatforms); }); }} disabled={saving} className={btnPrimaryClass}>{t('Lưu và Chờ đăng', 'Save & Pending')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IMPORT MODAL ═══ */}
      {showImport && (
        <div className={overlayClass}>
          <div className={modalClass}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color flex-shrink-0">
              <h2 className="text-xl font-bold text-text-main">{t('📥 Import từ Thư viện', '📥 Import from Library')}</h2>
              <button onClick={() => setShowImport(false)} className="text-text-light hover:text-text-main text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-4">
                <input value={importSearch} onChange={e => setImportSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleImportSearch()} className={inputClass} placeholder={t('Tìm kiếm tài liệu...', 'Search documents...')} />
                <button onClick={handleImportSearch} className={btnPrimaryClass}>{t('Tìm', 'Search')}</button>
              </div>
              {importDocs.length === 0 ? <p className="text-center text-text-light py-4">{t('Không có kết quả', 'No results')}</p> : (
                <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-primary" checked={importSelectedIds.length === importDocs.length && importDocs.length > 0} onChange={toggleImportSelectAll} />
                      <span className="text-sm font-medium">{t('Chọn tất cả trang này', 'Select all on page')} ({importDocs.length})</span>
                    </label>
                    {importSelectedIds.length > 0 && (
                      <button onClick={handleImportBulk} disabled={importingBulk} className={btnPrimaryClass + " !px-4 !py-1.5 !text-sm"}>
                        {importingBulk ? `${t('Đang import...', 'Importing...')}` : `📥 ${t('Import', 'Import')} ${importSelectedIds.length} ${t('bài', 'articles')}`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {importDocs.map((doc: any) => (
                      <div key={doc.id} className="flex items-center gap-3 bg-background-panel border border-border-color rounded-xl p-3 shadow-sm" style={{ backgroundColor: importSelectedIds.includes(doc.id) ? 'var(--color-primary-light)' : undefined }}>
                        <input type="checkbox" className="w-4 h-4 accent-primary flex-shrink-0 cursor-pointer" checked={importSelectedIds.includes(doc.id)} onChange={() => toggleImportSelect(doc.id)} />
                        {doc.thumbnailUrl && <img src={doc.thumbnailUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-text-light">{doc.author} · {doc.type}</p>
                        </div>
                        <button onClick={() => handleImportDoc(doc.id)} className={btnPrimaryClass + " !px-3 !py-1"}>📥</button>
                      </div>
                    ))}
                  </div>
                  {/* Pagination */}
                  {Math.ceil(importTotal / IMPORT_LIMIT) > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-color">
                      <span className="text-xs text-text-light">{t(`Tổng: ${importTotal} tài liệu`, `Total: ${importTotal} documents`)}</span>
                      <div className="flex gap-1">
                        <button disabled={importPage <= 1} onClick={() => loadImportDocs(importPage - 1)} className={btnOutlineClass + " !px-3 !py-1 !text-xs"}>&laquo;</button>
                        {Array.from({ length: Math.ceil(importTotal / IMPORT_LIMIT) }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === Math.ceil(importTotal / IMPORT_LIMIT) || Math.abs(p - importPage) <= 2)
                          .map((p, idx, arr) => (
                            <React.Fragment key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-text-light">…</span>}
                              <button onClick={() => loadImportDocs(p)} className={(importPage === p ? btnPrimaryClass : btnOutlineClass) + " !px-3 !py-1 !text-xs"}>{p}</button>
                            </React.Fragment>
                          ))}
                        <button disabled={importPage >= Math.ceil(importTotal / IMPORT_LIMIT)} onClick={() => loadImportDocs(importPage + 1)} className={btnOutlineClass + " !px-3 !py-1 !text-xs"}>&raquo;</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border-color flex gap-3 justify-end flex-shrink-0">
              <button onClick={() => { setShowImport(false); loadArticles(); }} className={btnOutlineClass}>{t('Đóng', 'Close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MEDIA PICKER MODAL ═══ */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => { if (editArticle) setEditArticle({ ...editArticle, imageUrls: [...(editArticle.imageUrls || []), url] }) }}
        space={space}
        language={language}
        defaultFileType="image"
      />
      {/* ═══ CONFIRM DIALOG ═══ */}
      {confirmDialog && (
        <div className={overlayClass}>
          <div className="bg-background-panel w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">{t('Xác nhận', 'Confirm')}</h3>
            <p className="text-text-main mb-6 text-sm">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className={btnOutlineClass}>{t('Hủy', 'Cancel')}</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className={btnDangerClass}>{t('Đồng ý', 'Confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* FB Album Modal */}
      {showFbAlbumModal && (
        <div className={overlayClass}>
          <div className="bg-background-panel w-full max-w-sm rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{t('Thêm FB Album mới', 'Add new FB Album')}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">{t('Tên Album', 'Album Name')}</label>
                <input 
                  value={newFbAlbumName} 
                  onChange={e => setNewFbAlbumName(e.target.value)} 
                  className={inputClass} 
                  placeholder={t('Ví dụ: Khóa Tu Mùa Hè 2024', 'E.g: Summer Retreat 2024')} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">FB Album ID</label>
                <input 
                  value={newFbAlbumId} 
                  onChange={e => setNewFbAlbumId(e.target.value)} 
                  className={inputClass} 
                  placeholder="123456789012345" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowFbAlbumModal(false)} className={btnOutlineClass}>{t('Hủy', 'Cancel')}</button>
              <button onClick={handleCreateFbAlbum} disabled={saving} className={btnPrimaryClass}>{saving ? '...' : t('Thêm', 'Add')}</button>
            </div>
          </div>
        </div>
      )}

      {/* FB Pages Modal */}
      {fbPages !== null && (
        <div className={overlayClass}>
          <div className="bg-background-panel w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-border-color">
              <h3 className="text-lg font-bold">{t('Chọn Facebook Page', 'Select Facebook Page')}</h3>
              <p className="text-sm text-text-light mt-1">Chọn trang bạn muốn dùng để đăng bài tự động</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {fbPages.length === 0 ? (
                <div className="text-center py-6 text-text-light">
                  <p>Không tìm thấy Page nào hoặc Token hiện tại không phải là Token cá nhân (đã là Page token).</p>
                  <p className="mt-2 text-xs">Để đổi Page, vui lòng Ngắt kết nối và kết nối lại Facebook.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fbPages.map(page => (
                    <div 
                      key={page.id} 
                      onClick={() => handleSelectFbPage(page.name, page.access_token, page.id)}
                      className="p-3 border border-border-color rounded-lg cursor-pointer hover:bg-background-light hover:border-primary transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium">{page.name}</div>
                        <div className="text-xs text-text-light mt-0.5">ID: {page.id}</div>
                      </div>
                      <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                        Chọn &rarr;
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-border-color bg-background flex justify-end">
              <button onClick={() => setFbPages(null)} className={btnOutlineClass}>{t('Đóng', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
