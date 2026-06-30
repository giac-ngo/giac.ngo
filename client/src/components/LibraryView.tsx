// client/src/components/LibraryView.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Link } from 'react-router-dom';
import { Document } from '../types';
import { SearchIcon, BookOpenIcon, EyeIcon, ThumbsUpIcon, SpinnerIcon, ShareIcon } from './Icons';

interface LibraryFilters {
    typeId?: number;
    authorId?: number;
    topicId?: number;
    search?: string;
}

interface LibraryViewProps {
    filters: LibraryFilters;
    onFiltersChange: (filters: LibraryFilters) => void;
    language: 'vi' | 'en';
    spaceId?: number | null;
    spaceSlug?: string | null;
    onShare?: (text: string, libraryDoc?: { title: string; author: string; content: string }) => void;
}

const translations = {
    vi: {
        searchPlaceholder: 'Tìm kiếm kinh sách, kệ, câu chuyện...',
        noResults: 'Không tìm thấy tài liệu nào.',
        loading: 'Đang tải tài liệu...',
        by: 'Bởi',
        loadMore: 'Tải thêm',
        loadingMore: 'Đang tải...',
    },
    en: {
        searchPlaceholder: 'Search for scriptures, verses, stories...',
        noResults: 'No documents found.',
        loading: 'Loading documents...',
        by: 'By',
        loadMore: 'Load More',
        loadingMore: 'Loading...',
    }
};

const DocumentCardSkeleton = () => (
    <div className="doc-card skeleton-card">
        <div className="skeleton skeleton-doc-thumb"></div>
        <div className="doc-card-content">
            <div className="skeleton skeleton-title small"></div>
            <div className="skeleton skeleton-text short"></div>
        </div>
    </div>
);

const PAGE_SIZE = 6;

export const LibraryView: React.FC<LibraryViewProps> = ({ filters, onFiltersChange, language, spaceId, spaceSlug, onShare }) => {
    const t = translations[language];
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [isGlobalSearch, setIsGlobalSearch] = useState(true);
    const debounceTimeoutRef = useRef<number | null>(null);
    const [suggestions, setSuggestions] = useState<Document[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const suggestionsTimeoutRef = useRef<number | null>(null);

    const handleShareClick = async (e: React.MouseEvent, doc: Document) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onShare) return;
        
        const stripHtml = (html: string) => {
            if (!html) return '';
            const formattedHtml = html
                .replace(/<br\s*[/]?>/gi, '\n')
                .replace(/<\/p>/gi, '\n\n')
                .replace(/<\/h[1-6]>/gi, '\n\n')
                .replace(/<\/div>/gi, '\n');
            const tmp = document.createElement("DIV");
            tmp.innerHTML = formattedHtml;
            return (tmp.textContent || tmp.innerText || "").replace(/\n{3,}/g, '\n\n').trim();
        };

        try {
            const detail = await apiService.getDocumentDetail(doc.id as number);
            const title = language === 'en' && detail.titleEn ? detail.titleEn : detail.title;
            const author = language === 'en' && detail.authorEn ? detail.authorEn : detail.author;
            const content = stripHtml(language === 'en' && detail.contentEn ? detail.contentEn : detail.content || '');
            const summary = stripHtml(language === 'en' && detail.summaryEn ? detail.summaryEn : detail.summary || '');
            
            const shareText = `📖 **${title}**\n👤 Tác giả: ${author}\n\n${content || summary || ''}`;
            onShare(shareText, { title, author, content: content || summary || '' });
        } catch (error) {
            console.error('Failed to get doc detail for sharing', error);
            const title = language === 'en' && doc.titleEn ? doc.titleEn : doc.title;
            const author = language === 'en' && doc.authorEn ? doc.authorEn : doc.author;
            const summary = stripHtml(language === 'en' && doc.summaryEn ? doc.summaryEn : doc.summary || '');
            const shareText = `📖 **${title}**\n👤 Tác giả: ${author}\n\n${summary || ''}`;
            onShare(shareText, { title, author, content: summary || '' });
        }
    };

    const fetchDocuments = useCallback(async (pageNum: number, currentFilters: LibraryFilters, currentSpaceId: number | null | undefined, currentSpaceSlug: string | null | undefined, abortSignal: AbortSignal) => {
        if (pageNum === 1) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const { data, total } = await apiService.getLibraryDocuments({
                ...currentFilters,
                spaceId: typeof currentSpaceId === 'number' ? currentSpaceId : undefined,
                spaceSlug: currentSpaceSlug || undefined,
                page: pageNum,
                limit: PAGE_SIZE,
                signal: abortSignal
            });

            if (abortSignal.aborted) return;

            setDocuments(prev => pageNum === 1 ? data : [...prev, ...data]);
            setHasMore((pageNum * PAGE_SIZE) < total);
            setPage(pageNum);

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Failed to load documents:', err);
            }
        } finally {
            if (!abortSignal.aborted) {
                if (pageNum === 1) {
                    setIsLoading(false);
                } else {
                    setIsLoadingMore(false);
                }
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setPage(1);

        // Only fetch if spaceId is resolved (not null/undefined)
        if (typeof spaceId === 'number' || spaceSlug) {
            setDocuments([]);
            setHasMore(true);
            const finalFilters = (isGlobalSearch && filters.search?.trim())
                ? { search: filters.search }
                : filters;
            fetchDocuments(1, finalFilters, spaceId, spaceSlug, controller.signal);
        } else {
            // If spaceId is null and no spaceSlug, show empty state
            setDocuments([]);
            setHasMore(false);
            setIsLoading(false);
        }

        return () => controller.abort();
    }, [filters, spaceId, spaceSlug, fetchDocuments, isGlobalSearch]);

    const handleLoadMore = () => {
        if (!isLoading && !isLoadingMore && hasMore) {
            const controller = new AbortController();
            const finalFilters = (isGlobalSearch && filters.search?.trim())
                ? { search: filters.search }
                : filters;
            fetchDocuments(page + 1, finalFilters, spaceId, spaceSlug, controller.signal);
        }
    };

    useEffect(() => {
        setSearchTerm(filters.search || '');
    }, [filters.search]);

    const fetchSuggestions = useCallback(async (q: string) => {
        if (!q.trim() || !(typeof spaceId === 'number' || spaceSlug)) {
            setSuggestions([]);
            return;
        }
        setIsFetchingSuggestions(true);
        try {
            const { data } = await apiService.getLibraryDocuments({
                search: q,
                spaceId: typeof spaceId === 'number' ? spaceId : undefined,
                spaceSlug: spaceSlug || undefined,
                page: 1,
                limit: 5,
            });
            setSuggestions(data || []);
        } catch (e) {
            console.error('Failed to fetch suggestions', e);
        } finally {
            setIsFetchingSuggestions(false);
        }
    }, [spaceId, spaceSlug]);

    const selectSuggestion = (doc: Document) => {
        const title = language === 'en' && doc.titleEn ? doc.titleEn : doc.title;
        setSearchTerm(title);
        setShowSuggestions(false);
        setSuggestions([]);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
        onFiltersChange({ ...filters, search: title });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
                e.preventDefault();
                selectSuggestion(suggestions[focusedIndex]);
            } else {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = e.target.value;
        setSearchTerm(newSearchTerm);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        if (suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current);
        }

        if (newSearchTerm.trim().length >= 2) {
            setShowSuggestions(true);
            setFocusedIndex(-1);
            suggestionsTimeoutRef.current = window.setTimeout(() => {
                fetchSuggestions(newSearchTerm);
            }, 250);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }

        debounceTimeoutRef.current = window.setTimeout(() => {
            onFiltersChange({ ...filters, search: newSearchTerm });
        }, 500);
    };

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
            if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
        };
    }, []);

    return (
        <div className="library-view-container">
            <div className="library-search-bar" style={{ marginBottom: searchTerm.trim() !== '' ? '8px' : '24px', position: 'relative' }} ref={suggestionsRef}>
                <SearchIcon className="search-icon" />
                <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (searchTerm.trim().length >= 2) {
                            setShowSuggestions(true);
                            if (suggestions.length === 0) fetchSuggestions(searchTerm);
                        }
                    }}
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && (suggestions.length > 0 || isFetchingSuggestions) && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            backgroundColor: 'var(--color-background-panel, #ffffff)',
                            border: '1px solid var(--color-border-color, #e2e8f0)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            maxHeight: '260px',
                            overflowY: 'auto',
                            marginTop: '4px',
                        }}
                    >
                        {isFetchingSuggestions && suggestions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-text-light italic flex items-center gap-2" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                <span className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" style={{ display: 'inline-block', width: '1rem', height: '1rem', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                                {language === 'vi' ? 'Đang tìm gợi ý...' : 'Finding suggestions...'}
                            </div>
                        ) : (
                            suggestions.map((doc, idx) => {
                                const docTitle = language === 'en' && doc.titleEn ? doc.titleEn : doc.title;
                                const docType = language === 'en' && doc.typeEn ? doc.typeEn : doc.type;
                                const docAuthor = language === 'en' && doc.authorEn ? doc.authorEn : doc.author;
                                const isFocused = idx === focusedIndex;
                                return (
                                    <div
                                        key={doc.id}
                                        onClick={() => selectSuggestion(doc)}
                                        onMouseEnter={() => setFocusedIndex(idx)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            backgroundColor: isFocused ? 'var(--color-primary-light, #fcf8ef)' : 'transparent',
                                            borderBottom: '1px solid var(--color-border-color, rgba(0, 0, 0, 0.05))',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {docTitle}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.15rem' }}>
                                            <span style={{ padding: '0.1rem 0.35rem', borderRadius: '0.25rem', backgroundColor: 'var(--color-background-light, #f8fafc)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                {docType}
                                            </span>
                                            {docAuthor && <span>{t.by} {docAuthor}</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {searchTerm.trim() !== '' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', marginBottom: '24px', fontSize: '12px', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        id="global-search"
                        checked={isGlobalSearch}
                        onChange={e => setIsGlobalSearch(e.target.checked)}
                        className="cursor-pointer"
                        style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px', margin: 0 }}
                    />
                    <label htmlFor="global-search" className="cursor-pointer" style={{ cursor: 'pointer', color: 'var(--color-text-light)' }}>
                        {language === 'vi' 
                            ? 'Tìm kiếm toàn bộ thư viện (không giới hạn theo Chủ đề/Tác giả)' 
                            : 'Search entire library (no Topic/Author limits)'}
                    </label>
                </div>
            )}

            <div className="library-grid">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <DocumentCardSkeleton key={i} />)
                ) : documents.length === 0 ? (
                    <div className="no-results-message">{t.noResults}</div>
                ) : (
                    documents.map(doc => (
                        <Link to={`/${spaceSlug || doc.spaceSlug || 'giac-ngo'}/library/${doc.id}`} key={doc.id} className="doc-card" onClick={() => {
                            sessionStorage.setItem('libraryFilters', JSON.stringify(filters));
                        }}>
                            <div className="doc-card-thumb">
                                {doc.thumbnailUrl && doc.thumbnailUrl !== '' ? <img src={doc.thumbnailUrl} alt={doc.title} loading="lazy" /> : <BookOpenIcon />}
                            </div>
                            <div className="doc-card-content">
                                <span className="doc-card-type">{language === 'en' && doc.typeEn ? doc.typeEn : doc.type}</span>
                                <h3 className="doc-card-title">{language === 'en' && doc.titleEn ? doc.titleEn : doc.title}</h3>
                                <p className="doc-card-summary">
                                    {(() => {
                                        const summary = language === 'en' && doc.summaryEn ? doc.summaryEn : doc.summary;
                                        if (summary && summary.trim() !== '') {
                                            return summary;
                                        }
                                        const content = language === 'en' && doc.contentEn ? doc.contentEn : doc.content;
                                        if (!content) return '';
                                        // Strip HTML tags and replace multiple whitespace characters
                                        const cleanText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                                        return cleanText.length > 150 ? cleanText.substring(0, 150) + '...' : cleanText;
                                    })()}
                                </p>
                                <i><p className="doc-card-author">{t.by} {language === 'en' && doc.authorEn ? doc.authorEn : doc.author}</p></i>
                                <div className="doc-card-stats">
                                    <span><EyeIcon className="w-4 h-4" /> {doc.views || 0}</span>
                                    <span><ThumbsUpIcon className="w-4 h-4" /> {doc.likes || 0}</span>
                                    {onShare && (
                                        <button 
                                            className="share-btn-library hover:text-primary transition-colors"
                                            onClick={(e) => handleShareClick(e, doc)} 
                                            title={language === 'vi' ? 'Chia sẻ' : 'Share'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}
                                        >
                                            <ShareIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {!isLoading && hasMore && (
                <div className="library-load-more">
                    <button
                        className="btn-load-more"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                    >
                        {isLoadingMore ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 animate-spin" />
                                {t.loadingMore}
                            </>
                        ) : (
                            t.loadMore
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};