// client/src/components/admin/NotificationManagement.tsx
// Giao diện Admin quản lý gửi thông báo hàng loạt đến thành viên qua Email
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { User, Space } from '../../types';
import { MailServerSettings } from './MailServerSettings';
import { useToast } from '../ToastProvider';

interface Member {
    id: number;
    name: string;
    email: string;
}

// ─── Modal chọn thành viên ───────────────────────────────────────────────────
const MemberPickerModal: React.FC<{
    spaceId?: number | null;
    onConfirm: (selected: Member[]) => void;
    onClose: () => void;
    initialSelected?: Member[];
}> = ({ spaceId, onConfirm, onClose, initialSelected = [] }) => {
    const [members, setMembers] = useState<Member[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set(initialSelected.map(m => m.id)));
    const [isLoading, setIsLoading] = useState(false);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        searchRef.current?.focus();
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            let url = '/notifications/members-list';
            if (spaceId) url += `?spaceId=${spaceId}`;
            const data = await apiService.request(url);
            setAllMembers(data.members || []);
            setMembers(data.members || []);
        } catch (err) {
            console.error('Failed to load members:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!search.trim()) {
            setMembers(allMembers);
        } else {
            const q = search.toLowerCase();
            setMembers(allMembers.filter(m =>
                m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
            ));
        }
    }, [search, allMembers]);

    const toggle = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const visibleIds = members.map(m => m.id);
        const allChecked = visibleIds.every(id => selected.has(id));
        setSelected(prev => {
            const next = new Set(prev);
            if (allChecked) {
                visibleIds.forEach(id => next.delete(id));
            } else {
                visibleIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selectedMembers = allMembers.filter(m => selected.has(m.id));
        onConfirm(selectedMembers);
    };

    const visibleAllChecked = members.length > 0 && members.every(m => selected.has(m.id));
    const visibleSomeChecked = members.some(m => selected.has(m.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background-panel border border-border-color rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-color flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-text-main">👥 Chọn thành viên</h2>
                        <p className="text-xs text-text-light mt-0.5">
                            Đã chọn <span className="text-primary font-semibold">{selected.size}</span> / {allMembers.length} thành viên
                        </p>
                    </div>
                    <button onClick={onClose} className="text-text-light hover:text-text-main w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-light transition-colors">
                        ✕
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-border-color flex-shrink-0">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light text-sm">🔍</span>
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm kiếm theo tên hoặc email..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-border-color rounded-lg bg-background-light text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Select All */}
                {members.length > 0 && (
                    <div className="px-4 py-2 border-b border-border-color bg-background-light flex-shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={visibleAllChecked}
                                ref={el => { if (el) el.indeterminate = visibleSomeChecked && !visibleAllChecked; }}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded accent-primary"
                            />
                            <span className="text-xs font-semibold text-text-main">
                                {visibleAllChecked ? 'Bỏ chọn tất cả' : `Chọn tất cả (${members.length})`}
                            </span>
                        </label>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto px-2 py-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-text-light text-sm">⏳ Đang tải danh sách...</div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-text-light text-sm">
                            {search ? `Không tìm thấy "${search}"` : 'Không có thành viên nào'}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {members.map(member => (
                                <label
                                    key={member.id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                        selected.has(member.id)
                                            ? 'bg-primary-light'
                                            : 'hover:bg-background-light'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(member.id)}
                                        onChange={() => toggle(member.id)}
                                        className="w-4 h-4 rounded accent-primary flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium truncate ${selected.has(member.id) ? 'text-primary' : 'text-text-main'}`}>
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-text-light truncate">{member.email}</p>
                                    </div>
                                    {selected.has(member.id) && (
                                        <span className="text-primary text-xs flex-shrink-0">✓</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border-color flex items-center justify-between gap-3 flex-shrink-0">
                    <button
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-text-light hover:text-text-main underline"
                        disabled={selected.size === 0}
                    >
                        Xóa chọn lựa
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm border border-border-color rounded-lg hover:bg-background-light transition-colors text-text-main">
                            Hủy
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.size === 0}
                            className="px-5 py-2 text-sm bg-primary text-text-on-primary font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Xác nhận ({selected.size})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface NotificationLog {
    id: number;
    title: string;
    body: string;
    channel: string;
    targetGroup: string;
    sentCount: number;
    failedCount: number;
    createdByName?: string;
    createdAt: string;
}

interface RecipientPreview {
    count: number;
    preview: { name: string; email: string }[];
}

const TARGET_GROUP_LABELS: Record<string, string> = {
    test: 'Gửi Test (Nhập Email)'
};

const CHANNEL_LABELS: Record<string, string> = {
    email: '📧 Email',
    both: '📧 Email',
};

interface NotificationManagementProps {
    user: User;
    space?: Space | null;
    language: 'vi' | 'en';
    onSpaceUpdate: (space: Space) => void;
}

export const NotificationManagement: React.FC<NotificationManagementProps> = ({ user, space, language, onSpaceUpdate }) => {
    const isSuperAdmin = user.permissions?.includes('users') || user.permissions?.includes('roles');
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'smtp' | 'template'>('compose');
    const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');

    // SMTP state
    const [localSpaceData, setLocalSpaceData] = useState<Partial<Space>>({});
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);

    const handleSaveSmtp = async () => {
        if (!space || typeof space.id !== 'number') return;
        setIsSavingSmtp(true);
        try {
            const updatedSpace = await apiService.updateSpace({ id: space.id, spaceData: localSpaceData });
            onSpaceUpdate(updatedSpace);
            showToast('Lưu Cấu hình SMTP thành công!', 'success');
        } catch (e: any) {
            showToast('Lưu SMTP thất bại: ' + (e?.message || String(e)), 'error');
        } finally {
            setIsSavingSmtp(false);
        }
    };

    // Compose form state
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetGroup, setTargetGroup] = useState<'space_owners' | 'test' | 'custom'>('custom');
    const [testEmails, setTestEmails] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string; sent?: number; failed?: number } | null>(null);
    const [recipientPreview, setRecipientPreview] = useState<RecipientPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Member picker state
    const [showMemberPicker, setShowMemberPicker] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
    const [customEmails, setCustomEmails] = useState('');

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        message: string;
        resolve: (ok: boolean) => void;
    } | null>(null);

    const askConfirm = (message: string): Promise<boolean> =>
        new Promise(resolve => setConfirmModal({ message, resolve }));

    const handleConfirmModalClose = (ok: boolean) => {
        confirmModal?.resolve(ok);
        setConfirmModal(null);
    };

    // Khi chọn thành viên xong → điền email vào textbox
    const handleMemberPickerConfirm = (members: Member[]) => {
        setSelectedMembers(members);
        setCustomEmails(members.map(m => m.email).join(', '));
        setShowMemberPicker(false);
        setTargetGroup('custom');
    };

    // History state
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotalPages, setLogsTotalPages] = useState(1);

    // Lấy preview số người nhận khi đổi targetGroup
    useEffect(() => {
        setRecipientPreview(null);
        setShowPreview(false);
    }, [targetGroup]);

    const fetchRecipientPreview = useCallback(async () => {
        setIsLoadingPreview(true);
        try {
            let url = `/notifications/recipients-preview?targetGroup=${targetGroup}`;
            if (space?.id) {
                url += `&spaceId=${space.id}`;
            }
            if (targetGroup === 'test') {
                const emailsList = testEmails.split(',').map(e => e.trim()).filter(e => e);
                url += `&testEmails=${encodeURIComponent(JSON.stringify(emailsList))}`;
            }
            const data = await apiService.request(url);
            setRecipientPreview(data);
            setShowPreview(true);
        } catch (err) {
            console.error('Failed to load preview:', err);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [targetGroup]);

    const fetchLogs = useCallback(async (page = 1) => {
        setIsLoadingLogs(true);
        try {
            const data = await apiService.request(`/notifications/logs?page=${page}&limit=10`);
            setLogs(data.logs || []);
            setLogsTotalPages(data.totalPages || 1);
            setLogsPage(page);
        } catch (err) {
            console.error('Failed to load notification logs:', err);
        } finally {
            setIsLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchLogs(1);
        }
    }, [activeTab, fetchLogs]);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            setSendResult({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung thông báo.' });
            return;
        }

        // Luôn lấy danh sách email từ customEmails textbox (trừ mode test của superadmin)
        const emailList = targetGroup === 'test'
            ? testEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e)
            : customEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e);

        if (emailList.length === 0) {
            setSendResult({ success: false, message: 'Vui lòng nhập ít nhất 1 email vào danh sách người nhận.' });
            return;
        }

        const confirmed = await askConfirm(
            `Bạn sắp gửi email đến ${emailList.length} địa chỉ.\n\nBạn có chắc chắn muốn tiếp tục?`
        );
        if (!confirmed) return;

        setIsSending(true);
        setSendResult(null);

        try {
            const bodyPayload: any = {
                title: title.trim(),
                body: body.trim(),
                channel: 'email',
                targetGroup: 'test',
                testEmails: emailList,
            };
            if (space?.id) {
                bodyPayload.spaceId = space.id;
            }

            const result = await apiService.request('/notifications/broadcast', {
                method: 'POST',
                body: JSON.stringify(bodyPayload),
            });
            setSendResult({ success: true, message: result.message, sent: result.sent, failed: result.failed });
            // Reset form
            setTitle('');
            setBody('');
            setCustomEmails('');
            setSelectedMembers([]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi thông báo.';
            setSendResult({ success: false, message });
        } finally {
            setIsSending(false);
        }
    };


    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-text-main">📢 Gửi Thông Báo {space ? `(Không gian: ${space.name})` : ''}</h1>
                <p className="text-text-light mt-1 text-sm">
                    Gửi email thông báo hàng loạt đến thành viên qua SMTP <code className="bg-background-light px-1 rounded text-xs">smtp.larksuite.com</code>
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-border-color">
                <button
                    onClick={() => setActiveTab('compose')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'compose'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-light hover:text-text-main'
                        }`}
                >
                    ✏️ Soạn thông báo
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-light hover:text-text-main'
                        }`}
                >
                    📋 Lịch sử gửi
                </button>
                <button
                    onClick={() => setActiveTab('smtp')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'smtp'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-light hover:text-text-main'
                        }`}
                >
                    ⚙️ Cấu hình SMTP
                </button>
                <button
                    onClick={() => setActiveTab('template')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'template'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-text-light hover:text-text-main'
                        }`}
                >
                    ✉️ Template Email
                </button>
            </div>

            {/* ─── TAB: COMPOSE ─── */}
            {activeTab === 'compose' && (
                <div className="space-y-5">
                    {/* Textbox email người nhận */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-semibold text-text-main">
                                Danh sách email người nhận
                                <span className="ml-2 text-xs font-normal text-text-light">(cách nhau bằng dấu phẩy)</span>
                            </label>
                            <button
                                onClick={() => setShowMemberPicker(true)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                👥 Chọn từ danh sách
                            </button>
                        </div>
                        <textarea
                            value={customEmails}
                            onChange={e => setCustomEmails(e.target.value)}
                            placeholder="email1@example.com, email2@example.com"
                            rows={3}
                            className="w-full border border-border-color rounded-lg px-4 py-2.5 text-sm text-text-main bg-background-panel focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-light"
                        />
                        <p className="text-xs text-text-light">
                            {customEmails.split(',').map(e => e.trim()).filter(e => e).length} email · Nhập trực tiếp hoặc chọn từ danh sách thành viên
                        </p>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1">
                            Tiêu đề <span className="text-accent-red">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="VD: Thông báo lịch tu tập tháng 3/2026"
                            maxLength={200}
                            className="w-full border border-border-color rounded-lg px-4 py-2.5 text-sm text-text-main bg-background-panel focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-light"
                        />
                        <p className="text-xs text-text-light mt-1">{title.length}/200 ký tự</p>
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main mb-1">
                            Nội dung <span className="text-accent-red">*</span>
                        </label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={10}
                            placeholder={`Viết nội dung thông báo ở đây...\n\nVí dụ:\nKính gửi quý đạo hữu,\n\nChùa xin thông báo lịch tu học tháng 3/2026:\n- Ngày 15/3: Khóa tu thiền định\n- Ngày 22/3: Buổi pháp thoại\n\nTrân trọng.`}
                            className="w-full border border-border-color rounded-lg px-4 py-3 text-sm text-text-main bg-background-panel focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-text-light resize-none font-mono leading-relaxed"
                        />
                        <p className="text-xs text-text-light mt-1">{body.length} ký tự · Xuống dòng (Enter) sẽ được giữ nguyên trong email</p>
                    </div>

                    {/* Channel info */}
                    <div className="p-3 bg-background-light border border-border-color rounded-lg flex items-center gap-2 text-sm text-text-light">
                        <span>📧</span>
                        <span>Gửi qua <strong>SMTP LarkSuite</strong> (<code className="text-xs">admin@giac.ngo</code>) · Tốc độ: ~4 email/giây</span>
                    </div>

                    {/* Result */}
                    {sendResult && (
                        <div className={`p-4 rounded-lg border text-sm ${sendResult.success
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                            <div className="flex items-start gap-2">
                                <span className="text-lg">{sendResult.success ? '✅' : '❌'}</span>
                                <div>
                                    <p className="font-semibold">{sendResult.message}</p>
                                    {sendResult.sent !== undefined && (
                                        <p className="mt-1 text-xs opacity-80">
                                            Thành công: {sendResult.sent} · Thất bại: {sendResult.failed}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Send button */}
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-text-light">
                            💡 Email được gửi từng cái một để tránh bị đánh dấu spam
                        </p>
                        <button
                            onClick={handleSend}
                            disabled={isSending || !title.trim() || !body.trim()}
                            className="px-6 py-2.5 bg-primary text-text-on-primary text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {isSending ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang gửi...
                                </>
                            ) : (
                                <>📨 Gửi Thông Báo</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── TAB: HISTORY ─── */}
            {activeTab === 'history' && (
                <div>
                    {isLoadingLogs ? (
                        <div className="text-center py-12 text-text-light">Đang tải lịch sử...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-text-light">
                            <p className="text-4xl mb-3">📭</p>
                            <p>Chưa có thông báo nào được gửi.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {logs.map(log => (
                                    <div key={log.id} className="p-4 bg-background-panel border border-border-color rounded-lg">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full font-medium">
                                                        {CHANNEL_LABELS[log.channel] || log.channel}
                                                    </span>
                                                    <span className="text-xs bg-background-light text-text-light px-2 py-0.5 rounded-full">
                                                        {TARGET_GROUP_LABELS[log.targetGroup] || log.targetGroup}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-text-main text-sm truncate">{log.title}</h3>
                                                <p className="text-text-light text-xs mt-1 line-clamp-2">{log.body}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs text-text-light">{formatDate(log.createdAt)}</p>
                                                <p className="text-xs mt-1">
                                                    <span className="text-green-600 font-semibold">✓ {log.sentCount}</span>
                                                    {log.failedCount > 0 && (
                                                        <span className="text-red-500 ml-2">✗ {log.failedCount}</span>
                                                    )}
                                                </p>
                                                {log.createdByName && (
                                                    <p className="text-xs text-text-light mt-0.5">bởi {log.createdByName}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {logsTotalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    <button
                                        onClick={() => fetchLogs(logsPage - 1)}
                                        disabled={logsPage <= 1}
                                        className="px-3 py-1 text-xs border border-border-color rounded disabled:opacity-40 hover:bg-background-light"
                                    >
                                        ← Trước
                                    </button>
                                    <span className="px-3 py-1 text-xs text-text-light">
                                        {logsPage} / {logsTotalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchLogs(logsPage + 1)}
                                        disabled={logsPage >= logsTotalPages}
                                        className="px-3 py-1 text-xs border border-border-color rounded disabled:opacity-40 hover:bg-background-light"
                                    >
                                        Sau →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── TAB: SMTP ─── */}
            {activeTab === 'smtp' && (
                <div className="space-y-6">
                    {space ? (
                        <>
                            <div className="bg-background-panel shadow-md rounded-xl p-6 border border-border-color">
                                <MailServerSettings space={space} language={language} onChange={(data) => setLocalSpaceData(prev => ({...prev, ...data}))} />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSaveSmtp}
                                    disabled={isSavingSmtp}
                                    className="px-6 py-2 bg-primary text-text-on-primary rounded-lg font-bold shadow hover:bg-primary-hover transition-colors disabled:opacity-70"
                                >
                                    {isSavingSmtp ? 'Đang lưu...' : 'Lưu Cấu hình SMTP'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-text-light">
                            Vui lòng chọn một Không gian cụ thể để cấu hình SMTP riêng.
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB: TEMPLATE ─── */}
            {activeTab === 'template' && (
                <div className="space-y-6">
                    <div className="bg-background-panel shadow-md rounded-xl p-6 border border-border-color mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Cấu hình Template Email</h2>
                        </div>
                        <p className="text-sm text-text-light mb-6 text-justify leading-relaxed">
                            Sử dụng HTML/CSS nội tuyến (inline styles) để thiết kế khung Email cho Không gian hiện tại. <br/>
                            Bạn bắt buộc phải đặt biến <code className="bg-background-light border border-border-color px-1.5 py-0.5 rounded text-primary text-xs">{"{{content}}"}</code> vào nơi bạn muốn hệ thống chèn nội dung văn bản tự động.
                        </p>

                        <div className="border border-border-color rounded-lg overflow-hidden flex flex-col">
                            <div className="flex bg-background-light border-b border-border-color">
                                <button
                                    onClick={() => setViewMode('code')}
                                    className={`px-6 py-3 text-sm font-semibold transition-colors ${viewMode === 'code' ? 'bg-background-panel text-primary border-b-2 border-primary' : 'text-text-light hover:text-text-main hover:bg-white'}`}
                                >
                                    💻 Mã HTML
                                </button>
                                <button
                                    onClick={() => setViewMode('preview')}
                                    className={`px-6 py-3 text-sm font-semibold transition-colors ${viewMode === 'preview' ? 'bg-background-panel text-primary border-b-2 border-primary' : 'text-text-light hover:text-text-main hover:bg-white'}`}
                                >
                                    👁️ Xem trước
                                </button>
                            </div>
                            
                            <div className="bg-background-panel">
                                {viewMode === 'code' ? (
                                    <textarea
                                        className="w-full h-[500px] p-5 font-mono text-sm leading-relaxed bg-black/5 focus:outline-none resize-none"
                                        placeholder="Nhập mã HTML..."
                                        value={localSpaceData.emailTemplate ?? space?.emailTemplate ?? `<div style="font-family: Arial, sans-serif; padding: 40px 20px; background: #f9f9f9;">\n  <div style="max-w: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">\n    \n    <div style="text-align: center; margin-bottom: 30px;">\n        <h2 style="color: #630F13;">${space?.name || 'Tên Không gian'}</h2>\n    </div>\n    \n    <!-- Nội dung sẽ được chèn vào đây -->\n    {{content}}\n    \n    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">\n       Hệ thống được vận hành bởi Bodhilab\n    </div>\n  </div>\n</div>`}
                                        onChange={(e) => setLocalSpaceData(prev => ({...prev, emailTemplate: e.target.value}))}
                                    />
                                ) : (
                                    <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center p-8 overflow-y-auto">
                                        <div dangerouslySetInnerHTML={{ 
                                            __html: (localSpaceData.emailTemplate ?? space?.emailTemplate ?? `<div style="font-family: Arial, sans-serif; padding: 40px 20px; background: #f9f9f9;">\n  <div style="max-w: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">\n    \n    <div style="text-align: center; margin-bottom: 30px;">\n        <h2 style="color: #630F13;">${space?.name || 'Tên Không gian'}</h2>\n    </div>\n    \n    <!-- Nội dung sẽ được chèn vào đây -->\n    {{content}}\n    \n    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">\n       Hệ thống được vận hành bởi Bodhilab\n    </div>\n  </div>\n</div>`).replace('{{content}}', '<div style="padding: 20px; border: 2px dashed #ff0000; background: #fff5f5; text-align: center; color: #cc0000;">Nội dung của thông báo sẽ hiển thị ở vị trí này</div>') 
                                        }} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-6">
                            <button
                                onClick={handleSaveSmtp}
                                disabled={isSavingSmtp}
                                className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-bold shadow transition-colors disabled:opacity-70"
                            >
                                {isSavingSmtp ? 'Đang lưu...' : 'Lưu Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chọn thành viên */}
            {showMemberPicker && (
                <MemberPickerModal
                    spaceId={space?.id ?? null}
                    initialSelected={selectedMembers}
                    onConfirm={handleMemberPickerConfirm}
                    onClose={() => setShowMemberPicker(false)}
                />
            )}

            {/* Modal xác nhận gửi */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-background-panel border border-border-color rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-start gap-3 mb-5">
                            <span className="text-2xl flex-shrink-0">📨</span>
                            <div>
                                <h3 className="font-bold text-text-main text-base mb-1">Xác nhận gửi thông báo</h3>
                                <p className="text-sm text-text-light whitespace-pre-line">{confirmModal.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleConfirmModalClose(false)}
                                className="px-4 py-2 text-sm border border-border-color rounded-lg hover:bg-background-light transition-colors text-text-main"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleConfirmModalClose(true)}
                                className="px-5 py-2 text-sm bg-primary text-text-on-primary font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                            >
                                Xác nhận gửi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
