// client/src/components/admin/TemplateManagement.tsx
import React, { useState, useEffect } from 'react';
import { Space } from '../../types';
import { SpacePagesManager } from './SpacePagesManager';
import { apiService } from '../../services/apiService';

interface TemplateManagementProps {
    space: Space | null;
    language: 'vi' | 'en';
    user?: any; // passed from AdminPage
}

export const TemplateManagement: React.FC<TemplateManagementProps> = ({ space, language, user }) => {
    const isSuperAdmin = !space; // super admin has no associated space

    // For super admin: list of all spaces + selected space
    const [allSpaces, setAllSpaces] = useState<Space[]>([]);
    const [filterQuery, setFilterQuery] = useState('');
    const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);

    // For space admin: use their own space directly
    const activeSpace = isSuperAdmin ? selectedSpace : space;

    useEffect(() => {
        if (!isSuperAdmin) return;
        setIsLoadingSpaces(true);
        apiService.getSpaces()
            .then(spaces => setAllSpaces(spaces))
            .catch(() => {})
            .finally(() => setIsLoadingSpaces(false));
    }, [isSuperAdmin]);

    const filteredSpaces = allSpaces.filter(s =>
        s.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
        s.slug?.toLowerCase().includes(filterQuery.toLowerCase())
    );

    return (
        <div className="template-management-container p-6 h-full flex flex-col gap-4">
            {/* Super Admin: Space selector bar */}
            {isSuperAdmin && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-background-panel border border-border-color rounded-xl p-4 shadow-sm flex-shrink-0">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-text-main font-serif">Quản lý Page</h2>
                        <p className="text-sm text-text-light mt-0.5">
                            Chọn không gian để khởi tạo hoặc chỉnh sửa các trang (Pages).
                        </p>
                    </div>

                    <div className="flex gap-2 items-center w-full sm:w-auto">
                        {/* Filter input */}
                        <div className="relative flex-1 sm:w-64">
                            <input
                                type="text"
                                value={filterQuery}
                                onChange={e => setFilterQuery(e.target.value)}
                                placeholder="Tìm space theo tên..."
                                className="w-full pl-4 pr-4 py-2 border border-border-color rounded-lg text-sm bg-background-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>

                        {/* Dropdown */}
                        <select
                            className="py-2 px-3 border border-border-color rounded-lg text-sm bg-background-panel focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                            value={selectedSpace?.id ?? ''}
                            onChange={e => {
                                const id = Number(e.target.value);
                                const found = allSpaces.find(s => s.id === id) || null;
                                setSelectedSpace(found);
                            }}
                        >
                            <option value="">-- Chọn Space --</option>
                            {filteredSpaces.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.slug})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Loading spaces */}
            {isSuperAdmin && isLoadingSpaces && (
                <div className="flex-1 flex items-center justify-center text-text-light text-sm">
                    Đang tải danh sách không gian...
                </div>
            )}

            {/* Placeholder when no space selected (super admin) */}
            {isSuperAdmin && !selectedSpace && !isLoadingSpaces && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <div className="text-5xl mb-4">📄</div>
                        <h3 className="text-lg font-bold text-text-main mb-2">Chọn một Space để bắt đầu</h3>
                        <p className="text-sm text-text-light">
                            Sử dụng bộ lọc và dropdown phía trên để chọn không gian bạn muốn quản lý pages.
                        </p>
                        {allSpaces.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {allSpaces.slice(0, 6).map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSpace(s)}
                                        className="px-3 py-1.5 bg-primary-light text-primary text-sm rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-colors font-medium"
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SpacePagesManager */}
            {activeSpace && activeSpace.id !== undefined && (
                <div className="flex-1 min-h-0 overflow-hidden">
                    {isSuperAdmin && selectedSpace && (
                        <div className="mb-3 flex items-center gap-2 text-sm text-text-light">
                            <span className="font-semibold text-text-main">{selectedSpace.name}</span>
                            <span>·</span>
                            <span className="font-mono text-xs bg-background-light px-2 py-0.5 rounded">{selectedSpace.slug}</span>
                            <button
                                onClick={() => setSelectedSpace(null)}
                                className="ml-auto text-text-light hover:text-primary text-xs underline"
                            >
                                Đổi space khác
                            </button>
                        </div>
                    )}
                    <SpacePagesManager
                        key={activeSpace.id}
                        spaceId={activeSpace.id as number}
                        spaceName={activeSpace.name || ''}
                        onClose={() => isSuperAdmin && setSelectedSpace(null)}
                        inline={true}
                    />
                </div>
            )}
        </div>
    );
};