
// client/src/components/admin/UserManagement.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role, Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { PlusIcon, PencilIcon, TrashIcon } from '../Icons';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { MediaPickerModal } from './MediaPickerModal';
import UserAvatar from '../UserAvatar';

const translations = {
    vi: {
        title: 'Quản lý Người dùng',
        newUser: 'Người dùng Mới',
        searchPlaceholder: 'Tìm theo tên hoặc email...',
        filterByRole: 'Lọc theo quyền',
        filterByStatus: 'Lọc theo trạng thái',
        allRoles: 'Tất cả Quyền',
        allStatuses: 'Tất cả Trạng thái',
        allSpaces: 'Tất cả Không gian',
        active: 'Hoạt động',
        inactive: 'Không hoạt động',
        table: { name: 'Tên', email: 'Email', roles: 'Quyền', merits: 'Merits', status: 'Trạng thái', actions: 'Hành động' },

        // Pagination (Standardized with DharmaTalks)
        showing: 'Hiển thị',
        to: 'tới',
        of: 'trên',
        prev: 'Trước',
        next: 'Sau',

        modal: {
            createTitle: 'Tạo Người dùng Mới',
            editTitle: 'Chỉnh sửa Người dùng',
            name: 'Tên',
            email: 'Email',
            password: 'Mật khẩu',
            passwordNew: 'Bắt buộc khi tạo mới',
            passwordEdit: 'Để trống nếu không đổi',
            avatar: 'Ảnh bìa',
            changeAvatar: 'Đổi ảnh',
            merits: 'Merits',
            roles: 'Quyền',
            spaces: 'Không gian',
            active: 'Hoạt động',
            save: 'Lưu',
            saving: 'Đang lưu...',
            cancel: 'Hủy',
            delete: 'Xóa',
        },
        feedback: {
            loading: 'Đang tải người dùng...',
            noUsers: 'Không tìm thấy người dùng.',
            fetchError: 'Tải người dùng thất bại.',
            saveSuccess: 'Lưu người dùng thành công!',
            saveError: 'Lưu thất bại: {message}',
            deleteConfirm: 'Bạn có chắc muốn xóa "{name}" khỏi toàn bộ nền tảng?',
            removeFromSpaceConfirm: 'Bạn có chắc muốn loại "{name}" khỏi Không gian này?',
            deleteSuccess: 'Xóa người dùng thành công!',
            removeSuccess: 'Đã loại người dùng khỏi Không gian thành công!',
            deleteError: 'Thao tác thất bại: {message}',
            cannotDeleteSelf: 'Bạn không thể thao tác lên chính mình.',
            errorAvatarRequired: 'Vui lòng cung cấp ảnh đại diện.',
        }
    },
    en: {
        title: 'User Management',
        newUser: 'New User',
        searchPlaceholder: 'Search by name or email...',
        filterByRole: 'Filter by role',
        filterByStatus: 'Filter by status',
        allRoles: 'All Roles',
        allStatuses: 'All Statuses',
        allSpaces: 'All Spaces',
        active: 'Active',
        inactive: 'Inactive',
        table: { name: 'Name', email: 'Email', roles: 'Roles', merits: 'Merits', status: 'Status', actions: 'Actions' },

        // Pagination
        showing: 'Showing',
        to: 'to',
        of: 'of',
        prev: 'Previous',
        next: 'Next',

        modal: {
            createTitle: 'Create New User',
            editTitle: 'Edit User',
            name: 'Name',
            email: 'Email',
            password: 'Password',
            passwordNew: 'Required for new user',
            passwordEdit: 'Leave blank to keep unchanged',
            avatar: 'Avatar',
            changeAvatar: 'Change Avatar',
            merits: 'Merits',
            roles: 'Roles',
            spaces: 'Spaces',
            active: 'Active',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel',
            delete: 'Delete',
        },
        feedback: {
            loading: 'Loading users...',
            noUsers: 'No users found.',
            fetchError: 'Failed to load users.',
            saveSuccess: 'User saved successfully!',
            saveError: 'Save failed: {message}',
            deleteConfirm: 'Are you sure you want to delete "{name}" from the system?',
            removeFromSpaceConfirm: 'Are you sure you want to remove "{name}" from this Space?',
            deleteSuccess: 'User deleted successfully!',
            removeSuccess: 'User removed from Space successfully!',
            deleteError: 'Operation failed: {message}',
            cannotDeleteSelf: 'You cannot perform actions on yourself.',
            errorAvatarRequired: 'Please provide an avatar.',
        }
    }
};

const ITEMS_PER_PAGE = 10;

// FIX: Destructure onUserUpdate from props to update global user state
export const UserManagement: React.FC<{ user: User, language: 'vi' | 'en', onUserUpdate: (data: Partial<User>) => void, space?: Space | null }> = ({ user: adminUser, language, onUserUpdate, space }) => {
    const t = translations[language];
    const { showToast } = useToast();

    // Global Admin = người có permission 'roles' (theo isAdmin() trong authMiddleware)
    // Space Owner = có space context NHƯNG không phải Global Admin
    const isGlobalAdmin = adminUser.permissions?.includes('roles') ?? false;
    const isSpaceOwner = !!space?.id && !isGlobalAdmin;

    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [spaceFilter, setSpaceFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [spaces, setSpaces] = useState<Space[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [userSpaceId, setUserSpaceId] = useState<number | null>(null);
    useEscapeKey(() => setIsModalOpen(false), isModalOpen);

    useEffect(() => {
        // Space Owner không có quyền gọi /roles và /spaces
        if (!isSpaceOwner) {
            apiService.getAllRoles().then(setRoles).catch(err => showToast(err.message, 'error'));
            apiService.getSpaces().then(setSpaces).catch(console.error);
        }
    }, [showToast, isSpaceOwner]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            if (space?.id) {
                const spaceUsers = await apiService.getSpaceMembers(space.id as number);
                setUsers(spaceUsers);
            } else {
                if (spaceFilter) {
                    const spaceUsers = await apiService.getSpaceMembers(Number(spaceFilter));
                    setUsers(spaceUsers);
                } else {
                    const allUsers = await apiService.getAllUsers(1, 9999, '');
                    setUsers(allUsers);
                }
            }
        } catch (error) {
            showToast(translations[language].feedback.fetchError, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [language, showToast, space?.id, spaceFilter]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers, spaceFilter]);

    const filteredUsers = useMemo(() => {
        return users.filter((u: User) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = u.name.toLowerCase().includes(searchLower) || u.email.toLowerCase().includes(searchLower);
            const matchesRole = !roleFilter || u.roleIds?.includes(Number(roleFilter));
            const matchesStatus = statusFilter === '' || String(u.isActive) === statusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchTerm, roleFilter, statusFilter]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const openModal = async (user: Partial<User> | null) => {
        setEditingUser(user ? { ...user } : { id: 'new', name: '', email: '', password: '', isActive: true, merits: 0, roleIds: [] });
        // Reset space first to avoid stale value
        setUserSpaceId(null);
        if (user && typeof user.id === 'number') {
            try {
                // Load spaces list and user's space membership in parallel
                const [memberSpaces, spacesList] = await Promise.all([
                    apiService.getUserSpaces(user.id),
                    spaces.length === 0 ? apiService.getSpaces() : Promise.resolve(spaces),
                ]);
                if (spacesList !== spaces) setSpaces(spacesList);
                setUserSpaceId(memberSpaces.length > 0 ? memberSpaces[0].spaceId : null);
            } catch {
                setUserSpaceId(null);
            }
        } else {
            setUserSpaceId(space?.id ? (space.id as number) : null);
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editingUser) return;
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'checkbox') processedValue = (e.target as HTMLInputElement).checked;
        if (type === 'number') processedValue = value === '' ? 0 : Number(value);
        setEditingUser(prev => prev ? { ...prev, [name]: processedValue } : null);
    };

    const handleRoleChange = (roleId: number) => {
        if (!editingUser) return;
        const currentRoles = editingUser.roleIds || [];
        const newRoles = currentRoles.includes(roleId) ? currentRoles.filter(id => id !== roleId) : [...currentRoles, roleId];
        setEditingUser(prev => prev ? { ...prev, roleIds: newRoles } : null);
    };

    const handleAvatarSelect = (url: string) => {
        setEditingUser(prev => prev ? { ...prev, avatarUrl: url } : null);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        if (!editingUser.avatarUrl) {
            showToast(t.feedback.errorAvatarRequired, 'error');
            return;
        }

        setIsSaving(true);
        try {
            const payload = { ...editingUser };
            // Remove derived/enriched fields that the backend doesn't accept
            delete (payload as any).permissions;
            delete (payload as any).ownedAis;
            delete (payload as any).grantedAiConfigIds;
            delete (payload as any).dailyMsgUsed;
            delete (payload as any).dailyLimitBonus;
            delete (payload as any).refreshToken;
            delete (payload as any).apiToken;
            delete (payload as any).createdAt;
            delete (payload as any).updatedAt;

            let savedUser;
            if (payload.id === 'new') {
                savedUser = await apiService.createUser(payload);
                if (space?.id && savedUser?.id) {
                    await apiService.addSpaceMember(space.id as number, savedUser.id as number);
                }
            } else {
                if (payload.password === '') delete payload.password;
                savedUser = await apiService.updateUser(payload);
            }

            // FIX: If the updated user is the currently logged-in admin, propagate the changes globally
            if (savedUser && savedUser.id === adminUser.id) {
                onUserUpdate(savedUser);
            }

            // Sync space membership BEFORE showing success toast so errors are visible
            const savedUserId = savedUser?.id;
            if (savedUserId && typeof savedUserId === 'number' && !space?.id) {
                const currentMemberSpaces = await apiService.getUserSpaces(savedUserId);
                const currentSpaceId = currentMemberSpaces.length > 0 ? currentMemberSpaces[0].spaceId : null;

                if (currentSpaceId !== userSpaceId) {
                    // Remove from old space
                    if (currentSpaceId) {
                        await apiService.removeSpaceMember(currentSpaceId, savedUserId);
                    }
                    // Add to new space
                    if (userSpaceId) {
                        await apiService.addSpaceMember(userSpaceId, savedUserId);
                    }
                }
            }

            showToast(t.feedback.saveSuccess, 'success');

            setIsModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            showToast(t.feedback.saveError.replace('{message}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (userToDelete: Partial<User>) => {
        if (!userToDelete || typeof userToDelete.id !== 'number') return;
        if (userToDelete.id === adminUser.id) {
            showToast(t.feedback.cannotDeleteSelf, 'error');
            return;
        }

        const confirmMsg = space?.id 
            ? (t.feedback as any).removeFromSpaceConfirm.replace('{name}', userToDelete.name || '')
            : t.feedback.deleteConfirm.replace('{name}', userToDelete.name || '');

        if (window.confirm(confirmMsg)) {
            try {
                if (space?.id) {
                    await apiService.removeSpaceMember(space.id as number, userToDelete.id);
                    showToast((t.feedback as any).removeSuccess, 'success');
                } else {
                    await apiService.deleteUser(userToDelete.id);
                    showToast(t.feedback.deleteSuccess, 'success');
                }
                fetchUsers();
            } catch (error: any) {
                showToast(t.feedback.deleteError.replace('{message}', error.message), 'error');
            }
        }
    };


    const getRoleNames = (roleIds: number[] | undefined) => {
        if (!roleIds) return '';
        return roleIds.map(id => roles.find(r => r.id === id)?.name).filter(Boolean).join(', ');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-background-panel">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold font-serif">{t.title}</h1>
                {/* Nút Tạo mới chỉ hiện với Global Admin */}
                {!isSpaceOwner && (
                    <button onClick={() => openModal(null)} className="px-4 py-2 bg-primary text-text-on-primary rounded-md flex items-center gap-2 font-semibold">
                        <PlusIcon className="w-5 h-5" /> {t.newUser}
                    </button>
                )}
            </div>

            <div className={`mb-4 grid grid-cols-1 ${!space?.id ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 p-4 border rounded-lg bg-background-light border-border-color flex-shrink-0`}>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder} autoComplete="off" className="p-2 border rounded-md bg-background-panel border-border-color" />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="p-2 border rounded-md bg-background-panel border-border-color"><option value="">{t.allRoles}</option>{roles.map(r => <option key={r.id as number} value={r.id as number}>{r.name}</option>)}</select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md bg-background-panel border-border-color"><option value="">{t.allStatuses}</option><option value="true">{t.active}</option><option value="false">{t.inactive}</option></select>
                {!space?.id && (
                    <select value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)} className="p-2 border rounded-md bg-background-panel border-border-color">
                        <option value="">{(t as any).allSpaces}</option>
                        {spaces.map(s => <option key={s.id as number} value={s.id as number}>{s.name}</option>)}
                    </select>
                )}
            </div>

            <div className="flex-1 overflow-auto border border-border-color rounded-lg shadow-sm bg-background-panel">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-background-light sticky top-0"><tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{t.table.name}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{t.table.email}</th>
                        {!isSpaceOwner && <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{t.table.roles}</th>}
                        {!isSpaceOwner && <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{t.table.merits}</th>}
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{t.table.status}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase">{t.table.actions}</th>
                    </tr></thead>
                    <tbody className="bg-background-panel divide-y divide-border-color">
                        {isLoading ? (<tr><td colSpan={isSpaceOwner ? 4 : 6} className="text-center p-4">{t.feedback.loading}</td></tr>) : paginatedUsers.length === 0 ? (<tr><td colSpan={isSpaceOwner ? 4 : 6} className="text-center p-4">{t.feedback.noUsers}</td></tr>) : (
                            paginatedUsers.map((u: User) => (
                                <tr key={u.id} className="hover:bg-background-light">
                                    {/* Avatar + Name */}
                                    <td className="px-4 py-3 flex items-center gap-3">
                                        <UserAvatar name={u.name} url={u.avatarUrl} size={40} />
                                        {u.name}
                                    </td>
                                    <td className="px-4 py-3">{u.email}</td>

                                    {/* Global Admin only columns */}
                                    {!isSpaceOwner && <td className="px-4 py-3 text-sm text-gray-500">{getRoleNames(u.roleIds)}</td>}
                                    {!isSpaceOwner && <td className="px-4 py-3">{u.merits === null ? '∞' : u.merits}</td>}

                                    {/* Status badge */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.isActive ? t.active : t.inactive}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {isSpaceOwner ? (
                                            // Space Owner: chỉ nút Edit (mở modal giới hạn)
                                            <button onClick={() => openModal(u)} className="p-2 rounded-full hover:bg-gray-200" title={language === 'vi' ? 'Xem & đặt lại mật khẩu' : 'View & reset password'}>
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            // Global Admin: full edit + delete
                                            <>
                                                <button onClick={() => openModal(u)} className="p-2 rounded-full hover:bg-gray-200"><PencilIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleDelete(u)} className="p-2 rounded-full hover:bg-gray-200"><TrashIcon className="w-5 h-5 text-red-600" /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 flex-shrink-0">
                    <p className="text-sm text-text-light">{t.showing} {(currentPage - 1) * ITEMS_PER_PAGE + 1} {t.to} {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} {t.of} {filteredUsers.length}</p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                        >
                            {t.prev}
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-gray-50"
                        >
                            {t.next}
                        </button>
                    </div>
                </div>
            )}

            <MediaPickerModal
                isOpen={isMediaPickerOpen}
                onClose={() => setIsMediaPickerOpen(false)}
                onSelect={handleAvatarSelect}
                space={space ?? null}
                language={language}
                defaultFileType="image"
            />

            {/* Reset Password Modal — Space Owner only: removed, now uses edit modal */}

            {/* Full Edit Modal — Global Admin + Space Owner (Space Owner sees limited fields) */}
            {isModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-background-panel rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold p-4 border-b border-border-color">{editingUser.id === 'new' ? t.modal.createTitle : t.modal.editTitle}</h2>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Avatar: Global Admin có thể đổi, Space Owner chỉ xem */}
                            <div className="flex items-center gap-4">
                                <img src={editingUser.avatarUrl || `https://i.pravatar.cc/150?u=${editingUser.email}`} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                                <div>
                                    <label className="block text-sm font-medium">{t.modal.avatar}</label>
                                    {!isSpaceOwner && (
                                        <button type="button" onClick={() => setIsMediaPickerOpen(true)} className="text-sm text-primary hover:underline">{t.modal.changeAvatar}</button>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Tên: cả 2 đều sửa được */}
                                <div>
                                    <label className="block text-sm font-medium">{t.modal.name}</label>
                                    <input name="name" value={editingUser.name || ''} onChange={handleFormChange}
                                        className="mt-1 w-full p-2 border rounded-md border-border-color bg-background-light" />
                                </div>
                                {/* Email: luôn luôn readonly */}
                                <div>
                                    <label className="block text-sm font-medium">{t.modal.email}</label>
                                    <input type="email" name="email" value={editingUser.email || ''} onChange={handleFormChange}
                                        className="mt-1 w-full p-2 border rounded-md bg-background-light border-border-color disabled:bg-gray-200 disabled:text-gray-500"
                                        disabled={editingUser.id !== 'new'} />
                                </div>
                            </div>
                            {/* Mật khẩu: cả 2 đều có, Space Owner đặt lại được */}
                            <div>
                                <label className="block text-sm font-medium">{t.modal.password}</label>
                                <input type="password" name="password" value={editingUser.password || ''} onChange={handleFormChange}
                                    placeholder={editingUser.id === 'new' ? t.modal.passwordNew : t.modal.passwordEdit}
                                    className="mt-1 w-full p-2 border rounded-md bg-background-light border-border-color" />
                            </div>
                            {/* Merits: chỉ Global Admin */}
                            {!isSpaceOwner && (
                                <div><label className="block text-sm font-medium">{t.modal.merits}</label><input type="number" name="merits" value={editingUser.merits ?? ''} onChange={handleFormChange} className="mt-1 w-full p-2 border rounded-md bg-background-light border-border-color" /></div>
                            )}
                            {/* Roles: chỉ Global Admin */}
                            {!isSpaceOwner && (
                                <div>
                                    <label className="block text-sm font-medium">{t.modal.roles}</label>
                                    <div className="mt-2 grid grid-cols-3 gap-2 p-4 border rounded-md bg-background-light border-border-color">
                                        {roles.map(role => <label key={role.id as number} className="flex items-center gap-2"><input type="checkbox" checked={editingUser.roleIds?.includes(role.id as number) || false} onChange={() => handleRoleChange(role.id as number)} className="h-4 w-4" /><span>{role.name}</span></label>)}
                                    </div>
                                </div>
                            )}
                            {/* Không gian: chỉ Global Admin khi không có space context */}
                            {!isSpaceOwner && !space?.id && (
                                <div>
                                    <label className="block text-sm font-medium">{(t.modal as any).spaces}</label>
                                    <select
                                        value={userSpaceId ?? ''}
                                        onChange={e => setUserSpaceId(e.target.value ? Number(e.target.value) : null)}
                                        className="mt-1 w-full p-2 border rounded-md bg-background-light border-border-color"
                                    >
                                        <option value="">{language === 'vi' ? '-- Không thuộc không gian nào --' : '-- No space --'}</option>
                                        {spaces.map(s => (
                                            <option key={s.id as number} value={s.id as number}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {/* Trạng thái: cả 2 đều có */}
                            <div className="flex items-center"><input id="isActive" name="isActive" type="checkbox" checked={editingUser.isActive ?? true} onChange={handleFormChange} className="h-4 w-4 mr-2" /><label htmlFor="isActive">{t.modal.active}</label></div>
                        </div>
                        <div className="p-4 border-t border-border-color flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-background-light border border-border-color rounded-md hover:bg-gray-200">{t.modal.cancel}</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-70">{isSaving ? t.modal.saving : t.modal.save}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
