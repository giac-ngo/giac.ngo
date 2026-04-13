// client/src/components/admin/SpacePagesManager.tsx
import React, { useState, useEffect, useRef } from 'react';
import { SpacePage, SpacePageAsset } from '../../types';
import { useToast } from '../ToastProvider';
import { PlusIcon, PhotoIcon, PencilIcon, TrashIcon } from '../Icons';

const API_BASE = '/api/spaces';

const SHORTCODES = [
    { code: '{{dharma_talks}}', label: 'Pháp thoại' },
    { code: '{{library}}', label: 'Thư viện' },
    { code: '{{events}}', label: 'Sự kiện' },
    { code: '{{agents}}', label: 'AI Agents', hint: 'Thêm ID: {{agents:1,5,8}}' },
    { code: '{{members_count}}', label: 'Số thành viên' },
    { code: '{{contact_form}}', label: 'Form liên hệ' },
];

interface Props {
    spaceId: number;
    spaceName: string;
    onClose: () => void;
    inline?: boolean;
}

export const SpacePagesManager: React.FC<Props> = ({ spaceId, inline = false }) => {
    const { showToast } = useToast();
    const [pages, setPages] = useState<SpacePage[]>([]);
    const [assets, setAssets] = useState<SpacePageAsset[]>([]);
    
    // View modes: 'list' | 'editor'
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
    
    // Editor State
    const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ title: '', slug: '/', isHomepage: true, isPublished: false });
    const [htmlDraft, setHtmlDraft] = useState('');
    const [activeTab, setActiveTab] = useState<'html' | 'assets' | 'preview'>('html');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const token = (() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u)?.apiToken : null;
        } catch { return null; }
    })();

    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/${spaceId}/pages`, { headers: authHeaders });
            const data = await res.json();
            setPages(data.pages || []);
            setAssets(data.assets || []);
        } catch {
            showToast('Không thể tải dữ liệu pages.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [spaceId]);

    const openCreateMode = () => {
        setSelectedPageId(null);
        setEditForm({ title: '', slug: '/', isHomepage: pages.length === 0, isPublished: false });
        setHtmlDraft('<!-- Nhập HTML của bạn vào đây -->\n\n');
        setActiveTab('html');
        setViewMode('editor');
    };

    const openEditMode = (page: SpacePage) => {
        setSelectedPageId(page.id as number);
        setEditForm({ 
            title: page.title, 
            slug: page.slug, 
            isHomepage: page.pageType === 'home',
            isPublished: page.isPublished 
        });
        setHtmlDraft(page.html || '');
        setActiveTab('html');
        setViewMode('editor');
    };

    const handleSavePage = async () => {
        if (!editForm.title || !editForm.slug) {
            showToast('Vui lòng nhập Tên page và Slug', 'error');
            return;
        }
        
        setIsSaving(true);
        const payload = {
            title: editForm.title,
            slug: editForm.slug.startsWith('/') ? editForm.slug : '/' + editForm.slug,
            pageType: editForm.isHomepage ? 'home' : 'custom',
            html: htmlDraft,
            isPublished: editForm.isPublished
        };

        try {
            if (selectedPageId) {
                // Update
                const res = await fetch(`${API_BASE}/${spaceId}/pages/${selectedPageId}`, {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error((await res.json()).message);
                const updated = await res.json();
                setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
                showToast('Đã lưu thành công!', 'success');
            } else {
                // Create
                const res = await fetch(`${API_BASE}/${spaceId}/pages`, {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error((await res.json()).message);
                const created = await res.json();
                setPages(prev => [...prev, created]);
                setSelectedPageId(created.id);
                showToast('Đã tạo page mới!', 'success');
            }
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePage = async (pageId: number) => {
        if (!window.confirm('Xoá page này? Không thể hoàn tác.')) return;
        try {
            await fetch(`${API_BASE}/${spaceId}/pages/${pageId}`, { method: 'DELETE', headers: authHeaders });
            setPages(prev => prev.filter(p => p.id !== pageId));
            showToast('Đã xoá page.', 'success');
        } catch {
            showToast('Không thể xoá page.', 'error');
        }
    };

    const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_BASE}/${spaceId}/page-assets`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).message);
            const asset = await res.json();
            setAssets(prev => [asset, ...prev]);
            showToast('Upload Asset thành công!', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        }
        e.target.value = '';
    };

    const handleDeleteAsset = async (assetId: number) => {
        if (!window.confirm('Xoá asset này?')) return;
        try {
            await fetch(`${API_BASE}/${spaceId}/page-assets/${assetId}`, { method: 'DELETE', headers: authHeaders });
            setAssets(prev => prev.filter(a => a.id !== assetId));
            showToast('Đã xoá asset.', 'success');
        } catch {
            showToast('Không thể xoá.', 'error');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Đã copy!', 'success');
    };

    const renderListMode = () => (
        <div className={`w-full flex flex-col ${inline ? "h-[calc(100vh-10rem)]" : "h-[90vh] rounded-xl shadow-2xl overflow-hidden"}`}>
            <div className="flex-1 bg-background-panel border border-border-color rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="flex justify-between items-center p-6 border-b border-border-color">
                    <div>
                        <h2 className="text-2xl font-bold font-serif text-text-main">Quản lý Page</h2>
                        <p className="text-sm text-text-light mt-1">Kéo thả và chỉnh sửa giao diện HTML cho các trang (Pages) thuộc không gian này.</p>
                    </div>
                    <button
                        onClick={openCreateMode}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-text-on-primary rounded-md font-medium hover:bg-primary-hover shadow-sm transition-all"
                    >
                        <PlusIcon className="w-5 h-5" /> Tạo Page Mới
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-background-light border-b border-border-color text-sm text-text-light font-medium">
                                <th className="px-6 py-4">Tên Page</th>
                                <th className="px-6 py-4">URL Slug</th>
                                <th className="px-6 py-4">Loại</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-text-light">Đang tải...</td></tr>
                            ) : pages.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-text-light">Chưa có page nào được tạo.</td></tr>
                            ) : (
                                pages.map(page => (
                                    <tr key={page.id as number} className="hover:bg-background-light/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <button onClick={() => openEditMode(page)} className="font-semibold text-primary hover:underline text-left">
                                                {page.title}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-text-light">
                                            {page.slug}
                                        </td>
                                        <td className="px-6 py-4">
                                            {page.pageType === 'home' 
                                                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">🏠 Homepage</span> 
                                                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200">📝 Custom URL</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {page.isPublished 
                                                ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Đã xuất bản</span>
                                                : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Bản nháp</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button onClick={() => openEditMode(page)} className="inline-flex text-text-light hover:text-primary hover:bg-primary-light p-1.5 rounded-md transition-colors" title="Chỉnh sửa"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeletePage(page.id as number)} className="inline-flex text-text-light hover:text-accent-red hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Xóa"><TrashIcon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderEditorMode = () => (
        <div className={`flex flex-col w-full bg-background-panel border border-border-color rounded-xl shadow-sm overflow-hidden ${inline ? "h-[calc(100vh-10rem)]" : "h-[90vh]"}`}>
            {/* Editor Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-color bg-background-light/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('list')} className="text-text-light hover:text-text-main flex items-center font-medium text-sm gap-1 transition-colors">
                        ← Danh sách
                    </button>
                    <div className="h-4 w-px bg-border-color"></div>
                    <h2 className="text-lg font-bold text-text-main">
                        {selectedPageId ? 'Chỉnh sửa Page' : 'Tạo Page mới'}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text-main hover:bg-background-light px-3 py-1.5 rounded-md transition-colors border border-transparent hover:border-border-color">
                        <input 
                            type="checkbox" 
                            checked={editForm.isPublished} 
                            onChange={e => setEditForm(prev => ({...prev, isPublished: e.target.checked}))}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        Xuất bản (Public)
                    </label>
                    <button
                        onClick={handleSavePage}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-text-on-primary rounded-md font-semibold hover:bg-primary-hover shadow-sm disabled:opacity-70 flex items-center gap-2 transition-all"
                    >
                        {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {selectedPageId ? 'Cập nhật' : 'Tạo & Lưu'}
                    </button>
                </div>
            </div>

            {/* Editor Form (Top Panel) */}
            <div className="p-6 border-b border-border-color bg-white grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-text-main mb-1.5">Tên Page</label>
                    <input 
                        type="text" 
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({...prev, title: e.target.value}))}
                        placeholder="Ví dụ: Trang Chủ"
                        className="w-full px-3 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-text-main mb-1.5">URL Slug</label>
                    <input 
                        type="text" 
                        value={editForm.slug}
                        onChange={e => setEditForm(prev => ({...prev, slug: e.target.value}))}
                        placeholder="Ví dụ: /gioi-thieu"
                        className="w-full px-3 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-mono shadow-sm"
                    />
                </div>
                <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={editForm.isHomepage} 
                            onChange={e => setEditForm(prev => ({...prev, isHomepage: e.target.checked}))}
                            className="w-5 h-5 cursor-pointer rounded border-2 border-border-color text-primary focus:ring-primary transition-all"
                        />
                        <div className="select-none">
                            <span className="block text-sm font-semibold text-text-main">Đặt làm Trang chủ (Homepage)</span>
                            <span className="block text-xs text-text-light group-hover:text-text-main transition-colors">Hiển thị khi truy cập vào thư mục gốc.</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* Code & Assets Workspace */}
            <div className="flex-1 flex flex-col min-h-0 bg-background-panel">
                <div className="flex items-center px-4 pt-4 border-b border-border-color gap-1 bg-background-light/30">
                    <button 
                        onClick={() => setActiveTab('html')} 
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-md transition-colors ${activeTab === 'html' ? 'border-primary text-primary bg-white' : 'border-transparent text-text-light hover:text-text-main hover:bg-black/5'}`}
                    >
                        HMTL & CSS/JS
                    </button>
                    <button 
                        onClick={() => setActiveTab('assets')} 
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-md transition-colors ${activeTab === 'assets' ? 'border-primary text-primary bg-white' : 'border-transparent text-text-light hover:text-text-main hover:bg-black/5'}`}
                    >
                        Assets (Hình ảnh, CSS, JS)
                    </button>
                    <button 
                        onClick={() => setActiveTab('preview')} 
                        className={`px-5 py-2.5 text-sm font-semibold border-b-2 rounded-t-md transition-colors ${activeTab === 'preview' ? 'border-primary text-primary bg-white' : 'border-transparent text-text-light hover:text-text-main hover:bg-black/5'}`}
                    >
                        Preview (Bản xem trước)
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0 relative">
                    {activeTab === 'html' && (
                        <div className="flex flex-1 w-full bg-background-panel">
                            <textarea
                                className="code-editor-textarea flex-1 p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar bg-background-panel text-text-main"
                                value={htmlDraft}
                                onChange={e => setHtmlDraft(e.target.value)}
                                placeholder="Viết mã HTML, <style> CSS, hoặc <script> JS của bạn vào đây..."
                                spellCheck={false}
                            />
                            {/* Shortcodes Sidebar */}
                            <div className="w-64 border-l border-border-color p-4 flex flex-col overflow-y-auto bg-background-light">
                                <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-text-main"><span className="text-primary text-lg">⚡</span> Shortcodes</h3>
                                <p className="text-xs mb-4 text-text-light">Click vào shortcode để thêm trực tiếp vào vị trí con trỏ.</p>
                                <div className="space-y-2">
                                    {SHORTCODES.map(sc => (
                                        <button
                                            key={sc.code}
                                            onClick={() => { setHtmlDraft(prev => prev + '\n' + sc.code); copyToClipboard(sc.code); }}
                                            className="w-full text-left p-3 rounded hover:bg-black/5 border border-border-color transition-colors group bg-background-panel"
                                        >
                                            <span className="block text-sm font-medium mb-1 text-text-main">{sc.label}</span>
                                            <span className="block text-xs font-mono opacity-90 group-hover:opacity-100 text-primary">{sc.code}</span>
                                            {(sc as any).hint && <span className="block text-xs mt-1 text-text-light italic">{(sc as any).hint}</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assets Tab */}
                    {activeTab === 'assets' && (
                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-border-color shadow-sm flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-text-main mb-1">Tải lên file CSS, JS hoặc Hình ảnh</h3>
                                        <p className="text-sm text-text-light">Các file sẽ được tự động đính kèm vào Page khi render.</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleUploadAsset} className="hidden" />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()} 
                                        className="px-4 py-2 bg-primary-light text-primary font-semibold rounded-md border border-primary/20 hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Chọn file
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {assets.map(asset => (
                                        <div key={asset.id as number} className="bg-white border border-border-color rounded-lg p-4 flex flex-col shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm ${asset.fileType === 'css' ? 'bg-blue-100 text-blue-700' : asset.fileType === 'js' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {asset.fileType.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-text-main truncate" title={asset.filename}>{asset.filename}</p>
                                                    <p className="text-xs text-text-light truncate">{asset.url}</p>
                                                </div>
                                            </div>
                                            <div className="mt-auto flex items-center gap-2 pt-3 border-t border-gray-100">
                                                <button onClick={() => copyToClipboard(asset.url)} className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded transition-colors">Copy URL</button>
                                                <button onClick={() => handleDeleteAsset(asset.id as number)} className="flex-1 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-semibold rounded transition-colors">Xoá</button>
                                            </div>
                                        </div>
                                    ))}
                                    {assets.length === 0 && (
                                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-3"><PhotoIcon className="w-6 h-6" /></div>
                                            <p className="text-sm font-medium text-gray-500 text-center">Chưa có Asset nào được tải lên.<br/>Click "Chọn file" để thêm CSS, JS hoặc Hình ảnh.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Tab */}
                    {activeTab === 'preview' && (
                        <div className="flex-1 bg-gray-100 p-4 overflow-y-auto">
                            <div className="max-w-5xl mx-auto min-h-full bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
                                <iframe
                                    className="w-full min-h-[800px] border-none"
                                    srcDoc={`
                                        <!DOCTYPE html>
                                        <html>
                                            <head>
                                                <meta charset="utf-8">
                                                <title>Preview: ${editForm.title}</title>
                                                <style>body{margin:0;font-family:system-ui,sans-serif;}</style>
                                                ${assets.filter(a => a.fileType === 'css').map(a => `<link rel="stylesheet" href="${a.url}">`).join('\n')}
                                            </head>
                                            <body>
                                                ${htmlDraft}
                                                ${assets.filter(a => a.fileType === 'js').map(a => `<script src="${a.url}"></script>`).join('\n')}
                                            </body>
                                        </html>
                                    `}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <React.Fragment>
            {viewMode === 'list' ? renderListMode() : renderEditorMode()}
        </React.Fragment>
    );
};
