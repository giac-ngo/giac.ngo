// client/src/components/MediaLibraryPicker.tsx
// Lightweight modal wrapper around the full MediaLibrary component.

import React from 'react';
import { MediaLibrary } from './admin/MediaLibrary';
import { Space } from '../types';

interface MediaLibraryPickerProps {
    /** Called with the selected file URL when user picks a file */
    onSelect: (url: string) => void;
    /** Called when the modal is closed without selection */
    onClose: () => void;
    /** The current space (for scoping uploads). Pass null for global. */
    space: Space | null;
    /** Accept string hint shown in title, e.g. "ảnh" | "âm thanh" | "video" */
    acceptLabel?: string;
    /** Pre-select file type tab: 'all' | 'image' | 'audio' | 'video' | 'document' */
    defaultFileType?: string;
}

export const MediaLibraryPicker: React.FC<MediaLibraryPickerProps> = ({
    onSelect,
    onClose,
    space,
    acceptLabel = 'file',
    defaultFileType,
}) => {
    const handleSelect = (url: string) => {
        onSelect(url);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--color-background-panel, #fff)',
                    borderRadius: 18,
                    width: '100%',
                    maxWidth: 860,
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px 14px',
                    borderBottom: '1px solid var(--color-border-color, #e5e7eb)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #7c3d3d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary, #7c3d3d)', fontFamily: "'EB Garamond', serif" }}>
                            Thư viện Media — Chọn {acceptLabel}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-light)', padding: 4, borderRadius: 6, display: 'flex' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* MediaLibrary in selectable mode */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <MediaLibrary
                        space={space}
                        language="vi"
                        onSelect={handleSelect}
                        selectable
                        defaultFileType={defaultFileType}
                    />
                </div>
            </div>
        </div>
    );
};

export default MediaLibraryPicker;
