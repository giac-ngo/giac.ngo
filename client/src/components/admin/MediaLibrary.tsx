import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { DocumentTextIcon, TrashIcon, SearchIcon, PlusIcon, PhotoIcon, FilmIcon, MusicalNoteIcon, XIcon, CopyIcon } from '../Icons';

interface MediaLibraryProps {
    space: Space | null;
    language: 'vi' | 'en';
    onSelect?: (url: string) => void;
    selectable?: boolean;
}

interface MediaFile {
    name: string;
    url: string;
    size: number;
    createdAt: string;
    modifiedAt: string;
    type: 'image' | 'video' | 'audio' | 'document';
    ext: string;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ space, language, onSelect, selectable = false }) => {
    const { showToast } = useToast();
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [activeFile, setActiveFile] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const PAGE_LIMIT = 60;

    const spaceId = space?.id || 'global';

    // Initial load — resets list
    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        setFiles([]);
        setCurrentPage(1);
        setHasMore(true);
        try {
            const data = await apiService.getMediaLibrary(spaceId, 1, PAGE_LIMIT);
            setFiles(data?.files ?? []);
            setHasMore(data?.hasMore ?? false);
            setCurrentPage(1);
        } catch (error: any) {
            showToast(error.message || 'Failed to load media files.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [spaceId, showToast]);

    // Load next page — appends to list
    const loadMore = useCallback(async (page: number) => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const data = await apiService.getMediaLibrary(spaceId, page, PAGE_LIMIT);
            const incoming: MediaFile[] = data?.files ?? [];
            setFiles(prev => {
                const existingUrls = new Set((prev ?? []).map(f => f.url));
                const newFiles = incoming.filter((f: MediaFile) => !existingUrls.has(f.url));
                return [...(prev ?? []), ...newFiles];
            });
            setHasMore(data?.hasMore ?? false);
            setCurrentPage(page);
        } catch (error: any) {
            showToast(error.message || 'Failed to load more.', 'error');
        } finally {
            setIsLoadingMore(false);
        }
    }, [spaceId, showToast, isLoadingMore]);

    useEffect(() => { fetchMedia(); }, [fetchMedia]);

    // IntersectionObserver for scroll sentinel
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                    loadMore(currentPage + 1);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, currentPage, loadMore]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const form = new FormData();
        Array.from(e.target.files).forEach(file => form.append('files', file));
        setIsUploading(true);
        try {
            await apiService.uploadMedia(spaceId, form);
            showToast('Tải lên thành công!', 'success');
            fetchMedia();
        } catch (error: any) {
            showToast(error.message || 'Lỗi tải lên', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        // selectedFiles has priority (multi-select via Ctrl+click);
        // fall back to activeFile for single-file panel selection
        const toDelete = selectedFiles.size > 0
            ? Array.from(selectedFiles)
            : activeFile ? [activeFile.url] : [];

        if (toDelete.length === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${toDelete.length} file đã chọn?`)) return;
        try {
            await apiService.deleteMedia(spaceId, toDelete);
            showToast('Đã xóa file thành công', 'success');
            setSelectedFiles(new Set());
            if (activeFile && toDelete.includes(activeFile.url)) setActiveFile(null);
            fetchMedia();
        } catch (error: any) {
            showToast(error.message || 'Lỗi khi xóa file', 'error');
        }
    };

    const handleThumbnailClick = (file: MediaFile, e: React.MouseEvent) => {
        if (selectable) {
            onSelect?.(file.url);
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd+click → toggle multi-select
            setSelectedFiles(prev => {
                const next = new Set(prev);
                if (next.has(file.url)) { next.delete(file.url); }
                else { next.add(file.url); }
                return next;
            });
            // If this is the first selection, also show detail panel
            if (!selectedFiles.has(file.url)) setActiveFile(file);
        } else {
            // Normal click → single active + clear multi-select
            setSelectedFiles(new Set());
            setActiveFile(prev => prev?.url === file.url ? null : file);
        }
    };

    // Colorful icon by file extension
    const FileTypeIcon = ({ ext, size = 'w-8 h-8' }: { ext: string; size?: string }) => {
        const e = ext.toLowerCase();
        if (e === '.pdf') return (
            <div className={`${size} flex flex-col items-center justify-center rounded`} style={{ background: '#fee2e2', color: '#dc2626' }}>
                <span style={{ fontSize: '0.55em', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>PDF</span>
                <DocumentTextIcon className="w-4 h-4" />
            </div>
        );
        if (e === '.xlsx' || e === '.xls' || e === '.csv') return (
            <div className={`${size} flex flex-col items-center justify-center rounded`} style={{ background: '#dcfce7', color: '#16a34a' }}>
                <span style={{ fontSize: '0.55em', fontWeight: 800, lineHeight: 1 }}>XLS</span>
                <DocumentTextIcon className="w-4 h-4" />
            </div>
        );
        if (e === '.docx' || e === '.doc') return (
            <div className={`${size} flex flex-col items-center justify-center rounded`} style={{ background: '#dbeafe', color: '#2563eb' }}>
                <span style={{ fontSize: '0.55em', fontWeight: 800, lineHeight: 1 }}>DOC</span>
                <DocumentTextIcon className="w-4 h-4" />
            </div>
        );
        if (e === '.pptx' || e === '.ppt') return (
            <div className={`${size} flex flex-col items-center justify-center rounded`} style={{ background: '#ffedd5', color: '#ea580c' }}>
                <span style={{ fontSize: '0.55em', fontWeight: 800, lineHeight: 1 }}>PPT</span>
                <DocumentTextIcon className="w-4 h-4" />
            </div>
        );
        if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(e)) return (
            <div className={`${size} flex items-center justify-center rounded`} style={{ background: '#ede9fe', color: '#7c3aed' }}>
                <MusicalNoteIcon className="w-6 h-6" />
            </div>
        );
        if (['.mp4', '.webm', '.mov', '.avi'].includes(e)) return (
            <div className={`${size} flex items-center justify-center rounded`} style={{ background: '#fef3c7', color: '#d97706' }}>
                <FilmIcon className="w-6 h-6" />
            </div>
        );
        return <DocumentTextIcon className={`${size} text-gray-400`} />;
    };


    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return dateStr; }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép link!', 'success'));
    };

    const filteredFiles = (files ?? []).filter(f => {
        if (filterType !== 'all' && f.type !== filterType) return false;
        if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const fullUrl = activeFile ? `${window.location.origin}${activeFile.url}` : '';

    return (
        <div className="flex flex-col h-full bg-background-panel">
            {/* Header Toolbar */}
            <div className="px-5 py-4 border-b border-border-color flex-shrink-0">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="text-xl font-bold font-serif text-text-main">
                        {language === 'vi' ? 'Thư viện Media' : 'Media Library'}
                    </h1>
                    <div className="flex gap-2">
                        {(selectedFiles.size > 0 || activeFile) && !selectable && (
                            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-red text-white text-sm rounded-lg hover:bg-red-700 transition">
                                <TrashIcon className="w-4 h-4" />
                                {language === 'vi' ? 'Xóa' : 'Delete'}
                                {selectedFiles.size > 1 && ` (${selectedFiles.size})`}
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,video/*,audio/*" />
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-text-on-primary text-sm font-bold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition shadow-sm"
                        >
                            {isUploading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <PlusIcon className="w-4 h-4" />
                            )}
                            + {language === 'vi' ? 'Tải lên' : 'Upload'}
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1 max-w-xs">
                        <SearchIcon className="w-4 h-4 text-text-light absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={language === 'vi' ? 'Tìm kiếm...' : 'Search...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-background-light border border-border-color rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                    <div className="flex bg-background-light p-0.5 rounded-lg border border-border-color shadow-sm shrink-0">
                        {['all', 'image', 'video', 'audio', 'document'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filterType === type
                                    ? 'bg-white shadow border border-border-color text-primary'
                                    : 'text-text-secondary hover:text-text-main hover:bg-black/5'}`}
                            >
                                {type === 'all' && (language === 'vi' ? 'Tất cả' : 'All')}
                                {type === 'image' && (language === 'vi' ? 'Hình ảnh' : 'Images')}
                                {type === 'video' && 'Video'}
                                {type === 'audio' && (language === 'vi' ? 'Âm thanh' : 'Audio')}
                                {type === 'document' && (language === 'vi' ? 'Tài liệu' : 'Docs')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content: Grid + Detail Panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Grid Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-background-light">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-text-light">
                            <span className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col h-full items-center justify-center text-text-light opacity-60">
                            <PhotoIcon className="w-16 h-16 mb-3" />
                            <p className="text-base font-medium">
                                {language === 'vi' ? 'Chưa có file media nào' : 'No media files yet'}
                            </p>
                            <p className="text-xs mt-1">
                                {language === 'vi' ? 'Nhấn Tải lên để bắt đầu' : 'Click Upload to get started'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                            {filteredFiles.map((file) => {
                                const isActive = activeFile?.url === file.url;
                                const isSelected = selectedFiles.has(file.url);
                                return (
                                    <div
                                        key={file.url}
                                        onClick={(e) => handleThumbnailClick(file, e)}
                                        title={file.name}
                                        className={`
                                            group relative rounded-lg border overflow-hidden cursor-pointer aspect-square
                                            transition-all duration-150 select-none
                                            ${isActive
                                                ? 'border-primary ring-2 ring-primary shadow-md'
                                                : isSelected
                                                    ? 'border-blue-400 ring-2 ring-blue-400 shadow-sm'
                                                    : 'border-border-color hover:border-primary/50 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {file.type === 'image' ? (
                                                <img src={file.url} alt={file.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <FileTypeIcon ext={file.ext} size="w-10 h-10" />
                                            )}
                                        </div>
                                        {/* File name label at bottom */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5 text-white text-[9px] truncate leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
                                            {file.name}
                                        </div>
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute', top: 4, right: 4,
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: 'hsl(0, 55%, 42%)', border: '2px solid #fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, color: '#fff', fontWeight: 700,
                                                pointerEvents: 'none',
                                            }}>✓</div>
                                        )}
                                        {/* Multi-select badge */}
                                        {isSelected && !isActive && (
                                            <div style={{
                                                position: 'absolute', top: 4, right: 4,
                                                width: 18, height: 18, borderRadius: '50%',
                                                background: '#3b82f6', border: '2px solid #fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, color: '#fff', fontWeight: 700,
                                                pointerEvents: 'none',
                                            }}>✓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} style={{ height: 16, marginTop: 8 }}>
                        {isLoadingMore && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                                <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                {activeFile && !selectable && (
                    <div className="w-64 flex-shrink-0 border-l border-border-color bg-background-panel flex flex-col overflow-y-auto">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color">
                            <span className="text-sm font-semibold text-text-main">
                                {language === 'vi' ? 'Thuộc tính' : 'Properties'}
                            </span>
                            <button onClick={() => setActiveFile(null)} className="text-text-light hover:text-text-main transition-colors">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="p-4 border-b border-border-color">
                            {activeFile.type === 'image' ? (
                                <img
                                    src={activeFile.url}
                                    alt={activeFile.name}
                                    className="w-full rounded-lg object-contain max-h-40 bg-gray-100"
                                />
                            ) : (
                                <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                                    {activeFile.type === 'video' && <FilmIcon className="w-10 h-10 text-gray-400" />}
                                    {activeFile.type === 'audio' && <MusicalNoteIcon className="w-10 h-10 text-gray-400" />}
                                    {activeFile.type === 'document' && <DocumentTextIcon className="w-10 h-10 text-gray-400" />}
                                </div>
                            )}
                        </div>

                        {/* File Info */}
                        <div className="p-4 space-y-3 text-sm flex-1">
                            {/* File name */}
                            <div>
                                <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                    {language === 'vi' ? 'Tên file' : 'File name'}
                                </p>
                                <p className="text-text-main font-medium break-all leading-snug">{activeFile.name}</p>
                            </div>

                            {/* Type & Size */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                        {language === 'vi' ? 'Loại' : 'Type'}
                                    </p>
                                    <p className="text-text-main font-medium uppercase text-xs">{activeFile.ext.replace('.', '')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                        {language === 'vi' ? 'Kích thước' : 'Size'}
                                    </p>
                                    <p className="text-text-main font-medium text-xs">{formatBytes(activeFile.size)}</p>
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                    {language === 'vi' ? 'Ngày tải lên' : 'Uploaded'}
                                </p>
                                <p className="text-text-main text-xs">{formatDate(activeFile.createdAt)}</p>
                            </div>

                            {/* URL */}
                            <div>
                                <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                    {language === 'vi' ? 'Đường dẫn' : 'URL'}
                                </p>
                                <div className="flex items-stretch gap-1">
                                    <input
                                        readOnly
                                        value={fullUrl}
                                        className="flex-1 text-xs p-1.5 bg-background-light border border-border-color rounded-l-md text-text-main min-w-0 truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(fullUrl)}
                                        title={language === 'vi' ? 'Sao chép' : 'Copy'}
                                        className="px-2 bg-primary text-text-on-primary rounded-r-md hover:bg-primary-hover transition flex items-center"
                                    >
                                        <CopyIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Relative path */}
                            <div>
                                <p className="text-xs text-text-light uppercase tracking-wide mb-1">
                                    {language === 'vi' ? 'Đường dẫn tương đối' : 'Relative path'}
                                </p>
                                <div className="flex items-stretch gap-1">
                                    <input
                                        readOnly
                                        value={activeFile.url}
                                        className="flex-1 text-xs p-1.5 bg-background-light border border-border-color rounded-l-md text-text-main min-w-0 truncate"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(activeFile.url)}
                                        title={language === 'vi' ? 'Sao chép' : 'Copy'}
                                        className="px-2 bg-background-light border border-border-color border-l-0 text-text-light rounded-r-md hover:bg-border-color transition flex items-center"
                                    >
                                        <CopyIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-border-color space-y-2">
                            {selectable && (
                                <button
                                    onClick={() => onSelect?.(activeFile.url)}
                                    className="w-full px-3 py-2 bg-primary text-text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover transition"
                                >
                                    {language === 'vi' ? 'Chọn ảnh này' : 'Select this image'}
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-accent-red border border-accent-red/40 rounded-lg hover:bg-accent-red hover:text-white transition"
                            >
                                <TrashIcon className="w-4 h-4" />
                                {language === 'vi' ? 'Xóa file' : 'Delete file'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
