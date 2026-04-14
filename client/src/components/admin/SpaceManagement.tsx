
// client/src/components/admin/SpaceManagement.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Space, User, SpaceType } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, XIcon, EyeIcon, HeartIcon, UsersIcon, PhotoIcon } from '../Icons';
import { SpacePagesManager } from './SpacePagesManager';
import { MediaPickerModal } from './MediaPickerModal';

const translations = {
    vi: {
        title: 'Quản lý Không gian',
        newSpace: 'Không gian Mới',
        loading: 'Đang tải...',
        save: 'Lưu',
        saving: 'Đang lưu...',
        delete: 'Xóa',
        edit: 'Sửa',
        cancel: 'Hủy',
        confirmDeleteTitle: 'Xác nhận xóa',
        confirmDeleteBody: 'Bạn có chắc muốn xóa "{name}" không?',
        saveSuccess: 'Lưu không gian thành công!',
        saveError: 'Lưu thất bại: {message}',
        deleteSuccess: 'Xóa không gian thành công!',
        deleteError: 'Xóa thất bại: {message}',
        errorImageRequired: 'Vui lòng cung cấp ảnh bìa cho không gian.',
        // Form Fields
        groupGeneral: 'Thông tin chung',
        groupContent: 'Nội dung chi tiết',
        groupConfig: 'Cấu hình & Chỉ số',
        groupContact: 'Thông tin liên hệ',
        groupDomain: '🌐 Custom Domain',
        customDomain: 'Domain riêng (vd: thienvienabc.com)',
        customDomainHint: 'Trỏ A record DNS về IP server trước.',
        faviconUrl: 'Favicon (Icon tab trình duyệt)',
        faviconHint: 'URL ảnh .png / .svg / .ico',
        setAsMainOption: '🌟 Đặt Không gian này làm Mặc định cho Tên miền chính (giac.ngo)',
        setAsMainHint: 'Khi chọn tùy chọn này, những User mới đăng ký từ trang chủ sẽ tự động được gán làm Thành viên của Không gian này. Tên miền custom sẽ bị ghi đè thành Tên miền chính.',
        groupMailServer: '📧 Mail Server (Space)',
        mailServerHint: 'Cấu hình SMTP riêng cho space. Nếu để trống, hệ thống dùng mail chung.',

        name: 'Tên (VI)',
        nameEn: 'Tên (EN)',
        slug: 'Slug (URL)',
        description: 'Mô tả (VI)',
        descriptionEn: 'Mô tả (EN)',
        event: 'Sự kiện (VI)',
        eventEn: 'Sự kiện (EN)',
        imageUrl: 'Ảnh bìa',
        uploadImage: 'Tải ảnh lên',
        location: 'Địa điểm (VI)',
        locationEn: 'Địa điểm (EN)',
        members: 'Thành viên',
        views: 'Lượt xem',
        likes: 'Lượt thích',
        rating: 'Đánh giá',
        tags: 'Thẻ (VI, cách nhau dấu phẩy)',
        tagsEn: 'Thẻ (EN, cách nhau dấu phẩy)',
        type: 'Loại hình',
        color: 'Màu sắc',
        status: 'Trạng thái (VI)',
        statusEn: 'Trạng thái (EN)',
        rank: 'Thứ hạng',
        owner: 'Chủ sở hữu',
        selectPlaceholder: '-- Chọn --',
        noOwner: '-- Không có --',
        manageTypes: 'Quản lý Loại hình',
        website: 'Trang web',
        phone: 'Số điện thoại',
        email: 'Email liên hệ',


        // PayOS Section
        groupPayOS: '💳 PayOS Thanh Toán',
        payosHint: 'Nhập thông tin xác thực PayOS để kích hoạt thanh toán tự động.',
        payosClientId: 'Client ID',
        payosApiKey: 'API Key',
        payosChecksumKey: 'Checksum Key',

        // Table Headers
        colImage: 'Ảnh',
        colName: 'Tên / Slug',
        colType: 'Loại hình',
        colOwner: 'Sở hữu',
        colStats: 'Thống kê',
        colRank: 'Thứ hạng',
        colActions: 'Hành động',

        // Filters
        filterSearch: 'Tìm theo tên, slug...',
        filterType: 'Tất cả loại hình',
        filterOwner: 'Tất cả chủ sở hữu',

        // Type Manager Modal
        manageTypesTitle: 'Quản lý Loại hình Không gian',
        typeName: 'Tên (VI)',
        typeNameEn: 'Tên (EN)',
        icon: 'Icon',
        addNewType: 'Thêm mới',
        update: 'Cập nhật',

        // Pagination
        showing: 'Hiển thị',
        to: 'tới',
        of: 'trên',
        prev: 'Trước',
        next: 'Sau',
    },
    en: {
        title: 'Spaces Management',
        newSpace: 'New Space',
        loading: 'Loading...',
        save: 'Save',
        saving: 'Saving...',
        delete: 'Delete',
        edit: 'Edit',
        cancel: 'Cancel',
        confirmDeleteTitle: 'Confirm Deletion',
        confirmDeleteBody: 'Are you sure you want to delete "{name}"?',
        saveSuccess: 'Space saved successfully!',
        saveError: 'Save failed: {message}',
        deleteSuccess: 'Space deleted successfully!',
        deleteError: 'Delete failed: {message}',
        errorImageRequired: 'Please provide a cover image for the space.',
        // Form Fields
        groupGeneral: 'General Info',
        groupContent: 'Content Details',
        groupConfig: 'Configuration & Stats',
        groupContact: 'Contact Information',
        groupDomain: '🌐 Custom Domain',
        customDomain: 'Custom Domain (e.g. thienvienabc.com)',
        customDomainHint: 'Point DNS A record to your server IP first.',
        faviconUrl: 'Favicon (Browser tab icon)',
        faviconHint: 'URL to .png / .svg / .ico file',
        setAsMainOption: '🌟 Set this Space as the Default for the Main Domain (giac.ngo)',
        setAsMainHint: 'When selected, new Users registering from the homepage will automatically be assigned as Members of this Space. The custom domain will be overwritten as the Main Domain.',
        groupMailServer: '📧 Mail Server (Space)',
        mailServerHint: 'SMTP config for this space. Leave empty to use the global mail server.',

        name: 'Name (VI)',
        nameEn: 'Name (EN)',
        slug: 'Slug (URL)',
        description: 'Description (VI)',
        descriptionEn: 'Description (EN)',
        event: 'Event (VI)',
        eventEn: 'Event (EN)',
        imageUrl: 'Cover Image',
        uploadImage: 'Upload Image',
        location: 'Location (VI)',
        locationEn: 'Location (EN)',
        members: 'Members',
        views: 'Views',
        likes: 'Likes',
        rating: 'Rating',
        tags: 'Tags (VI, comma-separated)',
        tagsEn: 'Tags (EN, comma-separated)',
        type: 'Type',
        color: 'Color',
        status: 'Status (VI)',
        statusEn: 'Status (EN)',
        rank: 'Rank',
        owner: 'Owner',
        selectPlaceholder: '-- Select --',
        noOwner: '-- None --',
        manageTypes: 'Manage Types',
        website: 'Website',
        phone: 'Phone Number',
        email: 'Contact Email',


        // PayOS Section
        groupPayOS: '💳 PayOS Payment',
        payosHint: 'Enter PayOS credentials to enable automatic payment processing.',
        payosClientId: 'Client ID',
        payosApiKey: 'API Key',
        payosChecksumKey: 'Checksum Key',

        // Table Headers
        colImage: 'Image',
        colName: 'Name / Slug',
        colType: 'Type',
        colOwner: 'Owner',
        colStats: 'Stats',
        colRank: 'Rank',
        colActions: 'Actions',

        // Filters
        filterSearch: 'Search by name, slug...',
        filterType: 'All Types',
        filterOwner: 'All Owners',

        // Type Manager Modal
        manageTypesTitle: 'Manage Space Types',
        typeName: 'Name (VI)',
        typeNameEn: 'Name (EN)',
        icon: 'Icon',
        addNewType: 'Add New',
        update: 'Update',

        // Pagination
        showing: 'Showing',
        to: 'to',
        of: 'of',
        prev: 'Previous',
        next: 'Next',
    }
}

const ITEMS_PER_PAGE = 10;

const SpaceTypeManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    language: 'vi' | 'en';
}> = ({ isOpen, onClose, onUpdate, language }) => {
    const t = translations[language];
    const { showToast } = useToast();
    const [types, setTypes] = useState<SpaceType[]>([]);
    const [editingType, setEditingType] = useState<Partial<SpaceType> | null>(null);

    useEffect(() => {
        if (isOpen) {
            apiService.getSpaceTypes().then(setTypes);
        }
    }, [isOpen]);

    const handleSave = async (typeToSave: Partial<SpaceType>) => {
        if (!typeToSave.name) return;
        try {
            if ('id' in typeToSave) {
                await apiService.updateSpaceType(typeToSave.id as number, typeToSave);
            } else {
                await apiService.createSpaceType(typeToSave);
            }
            setEditingType(null);
            onUpdate();
            apiService.getSpaceTypes().then(setTypes);
        } catch (e: any) {
            showToast(e.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure? This action cannot be undone.')) {
            try {
                await apiService.deleteSpaceType(id);
                onUpdate();
                apiService.getSpaceTypes().then(setTypes);
            } catch (e: any) {
                showToast(e.message, 'error');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background-panel rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-border-color">
                    <h2 className="text-xl font-bold">{t.manageTypesTitle}</h2>
                    <button onClick={onClose}><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-2">
                    {types.map(type => (
                        <div key={type.id} className="p-2 bg-background-light rounded-md flex items-center gap-2">
                            <span className="text-xl w-8 text-center">{type.icon}</span>
                            <span className="font-medium flex-grow">{type.name} / {type.nameEn}</span>
                            <button onClick={() => setEditingType(type)} className="p-1 hover:bg-gray-200 rounded"><PencilIcon className="w-4 h-4 text-text-light" /></button>
                            <button onClick={() => handleDelete(type.id)} className="p-1 hover:bg-gray-200 rounded"><TrashIcon className="w-4 h-4 text-accent-red" /></button>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-border-color space-y-2 bg-background-light">
                    <h3 className="font-semibold text-sm">{editingType?.id ? t.update : t.addNewType}</h3>
                    <div className="flex items-center gap-2">
                        <input type="text" value={editingType?.icon || ''} onChange={e => setEditingType(prev => ({ ...prev, icon: e.target.value }))} placeholder={t.icon} className="p-2 border rounded-md w-16 text-center" />
                        <input type="text" value={editingType?.name || ''} onChange={e => setEditingType(prev => ({ ...prev, name: e.target.value }))} placeholder={t.typeName} className="p-2 border rounded-md flex-grow" />
                        <input type="text" value={editingType?.nameEn || ''} onChange={e => setEditingType(prev => ({ ...prev, nameEn: e.target.value }))} placeholder={t.typeNameEn} className="p-2 border rounded-md flex-grow" />
                        <button onClick={() => handleSave(editingType || {})} className="px-4 py-2 bg-primary text-white rounded-md text-sm whitespace-nowrap">{editingType?.id ? t.update : t.addNewType}</button>
                        {editingType && <button onClick={() => setEditingType(null)} className="px-4 py-2 bg-gray-200 rounded-md text-sm whitespace-nowrap">{t.cancel}</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SpaceManagement: React.FC<{ language: 'vi' | 'en', user: User }> = ({ language, user }) => {
    const t = translations[language];
    const { showToast } = useToast();

    // Data State
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [isFaviconPickerOpen, setIsFaviconPickerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterOwner, setFilterOwner] = useState('');

    // Editing State
    const [editingSpace, setEditingSpace] = useState<Partial<Space> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [pagesSpaceId, setPagesSpaceId] = useState<number | null>(null);

    const isSuperAdmin = user.permissions?.includes('roles');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [spaceData, userData, typeData] = await Promise.all([
                apiService.getSpaces(),
                isSuperAdmin ? apiService.getAllUsers(1, 999, '') : Promise.resolve([user]),
                apiService.getSpaceTypes()
            ]);
            setSpaces(spaceData || []);
            setAllUsers(userData || []);
            setSpaceTypes(typeData || []);
        } catch (error) {
            showToast('Failed to load initial data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, user, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtering
    const filteredSpaces = useMemo(() => {
        return spaces.filter(space => {
            const matchSearch = space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                space.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const matchType = !filterType || String(space.typeId) === filterType;
            const matchOwner = !filterOwner || String(space.userId) === filterOwner;

            return matchSearch && matchType && matchOwner;
        });
    }, [spaces, searchQuery, filterType, filterOwner]);

    // Pagination
    const totalPages = Math.ceil(filteredSpaces.length / ITEMS_PER_PAGE);
    const paginatedSpaces = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSpaces.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredSpaces, currentPage]);

    // Handlers
    const handleOpenModal = (space?: Space) => {
        if (space) {
            setEditingSpace({
                ...space,
                tags: Array.isArray(space.tags) ? space.tags : [],
                tagsEn: Array.isArray(space.tagsEn) ? space.tagsEn : []
            });
        } else {
            setEditingSpace({
                id: 'new',
                name: '', slug: '', spaceSort: 0,
                tags: [], tagsEn: [], imageUrl: '',
                userId: isSuperAdmin ? null : user.id as number,
                spaceColor: '#ffffff',
                hasMeditation: false,
                hasLibrary: false,
                hasDharmaTalks: false
            });
        }
        setIsModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editingSpace) return;
        const { name, value, type } = e.target;
        let processedValue: any = value;

        if (type === 'number') processedValue = value === '' ? 0 : Number(value);
        if (type === 'checkbox') processedValue = (e.target as HTMLInputElement).checked;
        if (name === 'userId' && value === '') processedValue = null;
        if (name === 'typeId' && value === '') processedValue = null;

        setEditingSpace(prev => prev ? { ...prev, [name]: processedValue } : null);
    };

    const handleSave = async () => {
        if (!editingSpace) return;
        if (!editingSpace.imageUrl) {
            showToast(t.errorImageRequired, 'error');
            return;
        }

        setIsSaving(true);
        try {
            let finalPayload = { ...editingSpace };

            if (editingSpace.id === 'new') {
                const { id: tempId, ...createPayload } = finalPayload;
                const newSpace = await apiService.createSpace(createPayload);
                setSpaces(prev => [newSpace, ...prev]);
            } else {
                const updatedSpace = await apiService.updateSpace({
                    id: editingSpace.id as number,
                    spaceData: finalPayload
                });
                setSpaces(prev => prev.map(s => s.id === updatedSpace.id ? updatedSpace : s));
            }

            showToast(t.saveSuccess, 'success');
            setIsModalOpen(false);
            setEditingSpace(null);
        } catch (error: any) {
            showToast(t.saveError.replace('{message}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (space: Space) => {
        if (window.confirm(t.confirmDeleteBody.replace('{name}', space.name))) {
            try {
                await apiService.deleteSpace(space.id as number);
                setSpaces(prev => prev.filter(s => s.id !== space.id));
                showToast(t.deleteSuccess, 'success');
            } catch (error: any) {
                showToast(t.deleteError.replace('{message}', error.message), 'error');
            }
        }
    };

    const getUserName = (userId: number | null) => allUsers.find(u => u.id === userId)?.name || t.noOwner;
    const getTypeName = (typeId: number | null) => {
        const type = spaceTypes.find(t => t.id === typeId);
        return type ? `${type.icon} ${language === 'en' ? type.nameEn : type.name}` : '-';
    };

    return (
        <div className="p-6 h-full flex flex-col bg-background-panel">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-2xl font-bold font-serif">{t.title}</h1>
                <div className="flex gap-2">
                    {isSuperAdmin && (
                        <button onClick={() => setIsTypeManagerOpen(true)} className="px-4 py-2 border border-border-color bg-background-panel rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                            <PencilIcon className="w-4 h-4" /> {t.manageTypes}
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-text-on-primary rounded-md flex items-center gap-2 font-semibold hover:bg-primary-hover">
                            <PlusIcon className="w-5 h-5" /> {t.newSpace}
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-background-light p-4 rounded-lg border border-border-color flex-shrink-0">
                <div className="relative">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.filterSearch} className="w-full pl-9 pr-3 py-2 border rounded-md focus:ring-primary focus:border-primary bg-background-panel" />
                    <SearchIcon className="w-4 h-4 text-text-light absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 border rounded-md bg-background-panel">
                    <option value="">{t.filterType}</option>
                    {spaceTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
                {isSuperAdmin && (
                    <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="w-full p-2 border rounded-md bg-background-panel">
                        <option value="">{t.filterOwner}</option>
                        {allUsers.map(user => <option key={user.id as number} value={user.id as number}>{user.name}</option>)}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto border border-border-color rounded-lg shadow-sm bg-background-panel">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background-light sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-text-light uppercase">{t.colImage}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-text-light uppercase">{t.colName}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-text-light uppercase">{t.colType}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-text-light uppercase">{t.colOwner}</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-text-light uppercase">{t.colStats}</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-text-light uppercase">{t.colRank}</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-text-light uppercase">{t.colActions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-background-panel divide-y divide-border-color">
                        {isLoading ? (
                            <tr><td colSpan={7} className="text-center p-8 text-text-light">{t.loading}</td></tr>
                        ) : paginatedSpaces.map((space) => (
                            <tr key={space.id} className="hover:bg-background-light">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="w-16 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                        <img src={space.imageUrl || '/placeholder.png'} alt={space.name} className="w-full h-full object-cover" />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-text-main">{space.name}</p>
                                    <p className="text-xs text-text-light">{space.slug}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {getTypeName(space.typeId ?? null)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">
                                    {getUserName(space.userId)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-text-light">
                                    <div className="flex gap-3">
                                        <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> {space.membersCount}</span>
                                        <span className="flex items-center gap-1"><EyeIcon className="w-3 h-3" /> {space.views}</span>
                                        <span className="flex items-center gap-1"><HeartIcon className="w-3 h-3" /> {space.likes}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-mono text-sm">
                                    {space.spaceSort}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">

                                        <button onClick={() => handleOpenModal(space)} className="p-1.5 text-text-light hover:text-primary hover:bg-primary-light rounded-md transition-colors"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(space)} className="p-1.5 text-text-light hover:text-accent-red hover:bg-red-50 rounded-md transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 flex-shrink-0">
                    <p className="text-sm text-text-light">
                        {t.showing} {filteredSpaces.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} {t.to} {Math.min(currentPage * ITEMS_PER_PAGE, filteredSpaces.length)} {t.of} {filteredSpaces.length}
                    </p>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                        >
                            {t.prev}
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                        >
                            {t.next}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {/* Media picker for cover image */}
            <MediaPickerModal
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={(url) => {
                    setEditingSpace(prev => prev ? { ...prev, imageUrl: url } : null);
                }}
                space={editingSpace as Space}
                language={language}
                defaultFileType="image"
            />
            {/* Media picker for favicon */}
            <MediaPickerModal
                isOpen={isFaviconPickerOpen}
                onClose={() => setIsFaviconPickerOpen(false)}
                onSelect={(url) => {
                    setEditingSpace(prev => prev ? { ...prev, faviconUrl: url } : null);
                }}
                space={editingSpace as Space}
                language={language}
                defaultFileType="image"
            />

            {isModalOpen && editingSpace && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-background-panel rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b border-border-color">
                            <h2 className="text-xl font-bold">{editingSpace.id === 'new' ? t.newSpace : t.edit}</h2>
                            <button onClick={() => setIsModalOpen(false)}><XIcon className="w-6 h-6 text-text-light hover:text-text-main" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Image & Config */}
                                <div className="space-y-6">
                                    <div className="bg-background-light p-4 rounded-lg border border-border-color">
                                        <label className="block text-sm font-bold mb-2">{t.imageUrl}</label>
                                        <div className="aspect-video w-full bg-background-panel rounded-md border border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3 relative group">
                                            {editingSpace.imageUrl ? (
                                                <img src={editingSpace.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-text-light text-sm">No Image</span>
                                            )}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                                        </div>
                                        <button onClick={() => setIsMediaPickerOpen(true)} className="w-full py-2 border border-border-color bg-background-panel rounded-md text-sm font-medium hover:bg-background-light flex items-center justify-center gap-2">
                                            <PhotoIcon className="w-5 h-5" />
                                            {t.uploadImage || 'Thư viện Media'}
                                        </button>
                                    </div>

                                    {/* Favicon */}
                                    <div className="bg-background-light p-4 rounded-lg border border-border-color">
                                        <label className="block text-sm font-bold mb-3">🌐 {t.faviconUrl}</label>
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-lg border-2 border-dashed border-border-color bg-background-panel flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {(editingSpace as any).faviconUrl ? (
                                                    <img src={(editingSpace as any).faviconUrl} alt="favicon" className="w-full h-full object-contain p-1" />
                                                ) : (
                                                    <span className="text-2xl opacity-30">🔖</span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsFaviconPickerOpen(true)}
                                                    className="w-full py-2 border border-border-color bg-background-panel rounded-md text-sm font-medium hover:bg-background-light flex items-center justify-center gap-2"
                                                >
                                                    <PhotoIcon className="w-4 h-4" />
                                                    {t.uploadImage || 'Chọn ICO/PNG'}
                                                </button>
                                                {(editingSpace as any).faviconUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingSpace(prev => prev ? { ...prev, faviconUrl: undefined } : null)}
                                                        className="w-full py-1 text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-md"
                                                    >✕ Xóa favicon</button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-text-light mt-2">Icon hiện trên tab trình duyệt</p>
                                    </div>

                                    <div className="bg-background-panel p-4 rounded-lg border border-border-color space-y-4">
                                        <h3 className="font-bold border-b pb-2 mb-2 text-text-main">{t.groupConfig}</h3>
                                        


                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.type}</label>
                                            <select name="typeId" value={editingSpace.typeId || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light">
                                                <option value="">{t.selectPlaceholder}</option>
                                                {spaceTypes.map(type => <option key={type.id} value={type.id}>{type.name} / {type.nameEn}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.color}</label>
                                            <div className="flex gap-2 items-center">
                                                <input type="color" name="spaceColor" value={editingSpace.spaceColor || '#ffffff'} onChange={handleInputChange} className="h-9 w-16 p-0.5 rounded cursor-pointer bg-background-light" />
                                                <input type="text" name="spaceColor" value={editingSpace.spaceColor || ''} onChange={handleInputChange} className="flex-1 p-2 border rounded-md text-sm font-mono uppercase bg-background-light" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.rank}</label><input type="number" name="spaceSort" value={editingSpace.spaceSort ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.rating}</label><input type="number" step="0.1" name="rating" value={editingSpace.rating ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light" /></div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.owner}</label>
                                            <select name="userId" value={editingSpace.userId ?? ''} onChange={handleInputChange} disabled={!isSuperAdmin} className="w-full p-2 border rounded-md text-sm bg-gray-50 disabled:cursor-not-allowed">
                                                <option value="">{t.noOwner}</option>
                                                {allUsers.map(u => <option key={u.id as number} value={u.id as number}>{u.name}</option>)}
                                            </select>
                                        </div>

                                        {/* Feature Toggles */}
                                        <div className="border-t border-border-color pt-3">
                                            <label className="block text-sm font-bold mb-2">✨ Tính năng Space</label>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="hasMeditation"
                                                        checked={editingSpace.hasMeditation === true}
                                                        onChange={handleInputChange}
                                                        className="w-4 h-4 rounded accent-primary"
                                                    />
                                                    <span className="text-sm">🧘 Thiền</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="hasDharmaTalks"
                                                        checked={editingSpace.hasDharmaTalks === true}
                                                        onChange={handleInputChange}
                                                        className="w-4 h-4 rounded accent-primary"
                                                    />
                                                    <span className="text-sm">🎙️ Pháp Thoại</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="hasLibrary"
                                                        checked={editingSpace.hasLibrary === true}
                                                        onChange={handleInputChange}
                                                        className="w-4 h-4 rounded accent-primary"
                                                    />
                                                    <span className="text-sm">📚 Thư Viện</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Info Group */}
                                    <div className="bg-background-panel p-4 rounded-lg border border-border-color space-y-4">
                                        <h3 className="font-bold border-b pb-2 mb-2 text-text-main">{t.groupContact}</h3>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.website}</label>
                                            <input type="text" name="website" value={editingSpace.website || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light" placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.phone}</label>
                                            <input type="text" name="phoneNumber" value={editingSpace.phoneNumber || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">{t.email}</label>
                                            <input type="email" name="email" value={editingSpace.email || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md text-sm bg-background-light" />
                                        </div>
                                    </div>



                                </div>


                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-background-panel p-6 rounded-lg border border-border-color space-y-4">
                                        <h3 className="font-bold border-b pb-2 mb-2 text-text-main">{t.groupGeneral}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.name}</label><input type="text" name="name" value={editingSpace.name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.nameEn}</label><input type="text" name="nameEn" value={editingSpace.nameEn || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>

                                        {isSuperAdmin && (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-3">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label className="block text-sm font-medium text-blue-900">{t.customDomain}</label>
                                                        <span className="text-xs text-blue-600/70">{t.customDomainHint}</span>
                                                    </div>
                                                    <input type="text" name="customDomain" value={editingSpace.customDomain || ''} onChange={handleInputChange} className="w-full p-2 border border-blue-200 rounded-md text-sm bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400" placeholder="thienvienabc.com" />
                                                </div>
                                            </div>
                                        )}

                                        {isSuperAdmin && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">{t.slug}</label>
                                                <input 
                                                    type="text" 
                                                    name="slug" 
                                                    value={editingSpace.slug || ''} 
                                                    onChange={handleInputChange} 
                                                    className="w-full p-2 border rounded-md font-mono text-sm bg-background-light" 
                                                    placeholder="Để trống để tự động lấy ID"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.location}</label><input type="text" name="locationText" value={editingSpace.locationText || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.locationEn}</label><input type="text" name="locationTextEn" value={editingSpace.locationTextEn || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.members}</label><input type="number" name="membersCount" value={editingSpace.membersCount ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.views}</label><input type="number" name="views" value={editingSpace.views ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.likes}</label><input type="number" name="likes" value={editingSpace.likes ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>
                                    </div>

                                    <div className="bg-background-panel p-6 rounded-lg border border-border-color space-y-4">
                                        <h3 className="font-bold border-b pb-2 mb-2 text-text-main">{t.groupContent}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.description}</label><textarea name="description" value={editingSpace.description || ''} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.descriptionEn}</label><textarea name="descriptionEn" value={editingSpace.descriptionEn || ''} onChange={handleInputChange} rows={3} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.event}</label><textarea name="event" value={editingSpace.event || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.eventEn}</label><textarea name="eventEn" value={editingSpace.eventEn || ''} onChange={handleInputChange} rows={2} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.tags}</label><input type="text" value={(editingSpace.tags || []).join(', ')} onChange={e => setEditingSpace(prev => prev ? { ...prev, tags: e.target.value.split(',').map(t => t.trim()) } : null)} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.tagsEn}</label><input type="text" value={(editingSpace.tagsEn || []).join(', ')} onChange={e => setEditingSpace(prev => prev ? { ...prev, tagsEn: e.target.value.split(',').map(t => t.trim()) } : null)} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">{t.status}</label><input type="text" name="status" value={editingSpace.status || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                            <div><label className="block text-sm font-medium mb-1">{t.statusEn}</label><input type="text" name="statusEn" value={editingSpace.statusEn || ''} onChange={handleInputChange} className="w-full p-2 border rounded-md bg-background-light" /></div>
                                        </div>
                                    </div>

                                </div>

                            </div>

                        </div>

                        <div className="p-5 border-t border-border-color bg-background-light flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-background-panel border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-background-light">{t.cancel}</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-70 flex items-center gap-2">
                                {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                {t.save}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SpaceTypeManagerModal isOpen={isTypeManagerOpen} onClose={() => setIsTypeManagerOpen(false)} onUpdate={fetchData} language={language} />

            {/* Pages Manager Modal - opens when 📄 button clicked on a space with custom domain */}
            {pagesSpaceId && (() => {
                const space = spaces.find(s => s.id === pagesSpaceId);
                return space ? (
                    <SpacePagesManager
                        spaceId={pagesSpaceId}
                        spaceName={space.name}
                        onClose={() => setPagesSpaceId(null)}
                    />
                ) : null;
            })()}
        </div>
    );
};
