// client/src/components/admin/PricingPlansAdmin.tsx
import React, { useState, useEffect } from 'react';
import { PricingPlan, AIConfig, Space } from '../../types';
import { apiService } from '../../services/apiService';
import { useToast } from '../ToastProvider';
import { TrashIcon, PlusIcon } from '../Icons';
import { MediaPickerModal } from './MediaPickerModal';

interface PricingPlansAdminProps {
    language: 'vi' | 'en';
    space?: Space | null;
}

const t = {
    vi: {
        title: 'Quản lý Gieo duyên',
        addBtn: 'Thêm gói mới',
        name: 'Gieo duyên',
        price: 'Cúng dường (USD)',
        meritCost: 'Cúng dường (Merits)',
        limit: 'Giới hạn requests',
        dailyLimit: 'Giới hạn chat ngày',
        bonusLimit: 'Cộng thêm chat ngày',
        duration: 'Thời hạn (ngày)',
        active: 'Hoạt động',
        appliesTo: 'Áp dụng cho AI',
        actions: 'Hành động',
        save: 'Lưu',
        cancel: 'Hủy',
        edit: 'Sửa',
        delete: 'Xóa',
        features: 'Tính năng (mỗi dòng 1 tính năng)',
        confirmDelete: 'Bạn có chắc muốn xóa gói này?',
        successMsg: 'Lưu gói thành công',
        errorMsg: 'Lỗi khi lưu gói',
        deleteSuccess: 'Xóa gói thành công',
    },
    en: {
        title: 'Pricing Plans Management',
        addBtn: 'Add New Plan',
        name: 'Plan Name',
        price: 'Price (USD)',
        meritCost: 'Price (Merits)',
        limit: 'Request Limit',
        dailyLimit: 'Daily Chat Limit',
        bonusLimit: 'Daily Bonus',
        duration: 'Duration (days)',
        active: 'Active',
        appliesTo: 'Applies to AI',
        actions: 'Actions',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        features: 'Features (one per line)',
        confirmDelete: 'Are you sure you want to delete this plan?',
        successMsg: 'Plan saved successfully',
        errorMsg: 'Error saving plan',
        deleteSuccess: 'Plan deleted successfully',
    }
};

export const PricingPlansAdmin: React.FC<PricingPlansAdminProps> = ({ language, space }) => {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
    const [isEditing, setIsEditing] = useState<PricingPlan | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);
    const { showToast } = useToast();
    const tx = t[language];

    const fetchData = async () => {
        try {
            const [plansData, aiData] = await Promise.all([
                apiService.getPricingPlans(typeof space?.id === 'number' ? space.id : undefined),
                apiService.getAiConfigs(null)
            ]);
            setPlans(plansData);
            setAiConfigs(aiData);
        } catch (e: any) {
            console.error('Failed to load pricing plans:', e?.message || e);
        }
    };

    useEffect(() => {
        fetchData();
    }, [space?.id]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const featuresText = formData.get('features') as string;
        const featuresTextEn = formData.get('featuresEn') as string;
        
        const planData: Partial<PricingPlan> = {
            planName: formData.get('planName') as string,
            planNameEn: formData.get('planNameEn') as string,
            price: formData.get('price') as string,
            priceEn: formData.get('priceEn') as string,
            meritCost: parseInt(formData.get('meritCost') as string) || 0,
            requestLimit: parseInt(formData.get('requestLimit') as string) || 0,
            dailyMsgLimit: parseInt(formData.get('dailyMsgLimit') as string) || 0,
            dailyLimitBonus: parseInt(formData.get('dailyLimitBonus') as string) || 0,
            durationDays: parseInt(formData.get('durationDays') as string) || 30,
            features: featuresText.split('\n').map(l => l.trim()).filter(Boolean),
            featuresEn: featuresTextEn ? featuresTextEn.split('\n').map(l => l.trim()).filter(Boolean) : [],
            aiConfigIds: Array.from(formData.getAll('aiConfigIds')).map(id => parseInt(id as string)),
            isActive: formData.get('isActive') === 'on',
            spaceId: typeof space?.id === 'number' ? space.id : null
        };

        try {
            if (isEditing && isEditing.imageUrl) {
                planData.imageUrl = isEditing.imageUrl;
            }

            if (isEditing && isEditing.id) {
                await apiService.updatePricingPlan({ ...isEditing, ...planData } as PricingPlan);
            } else {
                await apiService.createPricingPlan(planData);
            }
            showToast(tx.successMsg, 'success');
            setIsEditing(null);
            fetchData();
        } catch (err: any) {
            showToast(tx.errorMsg + ': ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number | string) => {
        try {
            await apiService.deletePricingPlan(id);
            showToast(tx.deleteSuccess, 'success');
            setConfirmDeleteId(null);
            fetchData();
        } catch (err: any) {
            showToast(tx.errorMsg + ': ' + err.message, 'error');
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-main">{tx.title}</h2>
                <button
                    onClick={() => {
                        setIsEditing({ 
                            id: '', planName: '', planNameEn: '', price: '0', priceEn: '', meritCost: 0, 
                            requestLimit: 100, features: [], featuresEn: [], aiConfigIds: [], isActive: true,
                            dailyMsgLimit: 20, dailyLimitBonus: 0, durationDays: 30
                        });
                        setPreviewUrl(null);
                    }}
                    className="flex items-center gap-2 bg-primary text-text-on-primary px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    {tx.addBtn}
                </button>
            </div>

            <div className="bg-background-panel rounded-xl shadow border border-border-color overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-background-light text-text-light text-sm">
                        <tr>
                            <th className="p-4 border-b border-border-color">{tx.name}</th>
                            <th className="p-4 border-b border-border-color">{tx.price} / {tx.meritCost}</th>
                            <th className="p-4 border-b border-border-color">{tx.appliesTo}</th>
                            <th className="p-4 border-b border-border-color">Bonus / {tx.duration}</th>
                            <th className="p-4 border-b border-border-color">{tx.active}</th>
                            <th className="p-4 border-b border-border-color text-right">{tx.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map(p => (
                            <tr key={p.id} className="hover:bg-background-light border-b border-border-color last:border-0">
                                <td className="p-4 text-text-main font-medium">{p.planName}</td>
                                <td className="p-4 text-text-secondary">${p.price} / {p.meritCost} M</td>
                                <td className="p-4 text-text-secondary text-sm">
                                    {p.aiConfigIds?.length ? (
                                        <div className="flex flex-wrap gap-1">
                                            {p.aiConfigIds.map(id => {
                                                const ai = aiConfigs.find(a => a.id.toString() === id.toString());
                                                return <span key={id} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{ai ? ai.name : `AI ${id}`}</span>;
                                            })}
                                        </div>
                                    ) : <span className="text-text-light text-xs italic">Không có</span>}
                                </td>
                                <td className="p-4 text-text-secondary">+{p.dailyLimitBonus || 0} / {p.durationDays || 30}d</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {p.isActive ? 'Active' : 'Draft'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {confirmDeleteId === p.id ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-red-600 font-medium">Xóa gói này?</span>
                                            <button onClick={() => handleDelete(p.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                                                Xác nhận
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100">
                                                Hủy
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setIsEditing(p); setPreviewUrl(null); }} className="p-2 text-text-light hover:text-primary transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(p.id)} className="p-2 text-text-light hover:text-accent-red transition-colors">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background-panel rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{isEditing.id ? tx.edit : tx.addBtn}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Row 0: Ảnh đại diện — full width, on top */}
                                <div className="col-span-2">
                                    <label className="block text-sm text-text-secondary mb-1">Ảnh đại diện (tuỳ chọn)</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsMediaPickerOpen(true)}
                                            className="px-4 py-2 bg-background-light border border-border-color rounded-lg text-sm font-medium hover:bg-border-color transition-colors"
                                        >
                                            Chọn từ thư viện...
                                        </button>
                                        {(previewUrl || isEditing.imageUrl) && (
                                            <div className="shrink-0 bg-background-light p-1 rounded border border-border-color shadow-sm">
                                                <img src={previewUrl || isEditing.imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Row 1: Tên */}
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.name}</label>
                                    <input name="planName" defaultValue={isEditing.planName} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Tên Tiếng Anh (EN Name)</label>
                                    <input name="planNameEn" defaultValue={isEditing.planNameEn || ''} className="w-full p-2 border border-border-color rounded-lg bg-background-light" placeholder="English Name" />
                                </div>

                                {/* Row 2: Giá */}
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.price}</label>
                                    <input name="price" defaultValue={isEditing.price} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Giá Tiếng Anh (EN Price)</label>
                                    <input name="priceEn" defaultValue={isEditing.priceEn || ''} className="w-full p-2 border border-border-color rounded-lg bg-background-light" placeholder="e.g. $5" />
                                </div>

                                {/* Row 3: Merit + Legacy */}
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.meritCost}</label>
                                    <input name="meritCost" type="number" defaultValue={isEditing.meritCost} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.limit} (Legacy)</label>
                                    <input name="requestLimit" type="number" defaultValue={isEditing.requestLimit} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>

                                {/* Row 4: Bonus + Thời hạn */}
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.bonusLimit}</label>
                                    <input name="dailyLimitBonus" type="number" defaultValue={isEditing.dailyLimitBonus || 0} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.duration}</label>
                                    <input name="durationDays" type="number" defaultValue={isEditing.durationDays || 30} required className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-text-secondary mb-2">{tx.appliesTo}</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border-color p-3 rounded-lg bg-background-light max-h-40 overflow-y-auto">
                                    {aiConfigs.filter(ai => ai.isPublic).map(ai => (
                                        <label key={ai.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary">
                                            <input 
                                                type="checkbox" 
                                                name="aiConfigIds" 
                                                value={ai.id} 
                                                defaultChecked={isEditing.aiConfigIds?.some(id => id.toString() === ai.id.toString())}
                                                className="rounded text-primary focus:ring-primary"
                                            />
                                            {ai.name}
                                        </label>
                                    ))}
                                    {aiConfigs.filter(ai => ai.isPublic).length === 0 && <span className="text-sm text-text-light italic">Đang tải danh sách AI...</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">{tx.features}</label>
                                    <textarea name="features" defaultValue={isEditing.features?.join('\n')} rows={4} className="w-full p-2 border border-border-color rounded-lg bg-background-light" />
                                </div>
                                <div>
                                    <label className="block text-sm text-text-secondary mb-1">Tính năng Tiếng Anh (EN Features)</label>
                                    <textarea name="featuresEn" defaultValue={isEditing.featuresEn?.join('\n')} rows={4} className="w-full p-2 border border-border-color rounded-lg bg-background-light" placeholder="One feature per line" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActive" name="isActive" defaultChecked={isEditing.isActive} className="w-5 h-5 rounded" />
                                <label htmlFor="isActive" className="text-sm font-medium">{tx.active}</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditing(null)} className="px-4 py-2 border border-border-color rounded-lg hover:bg-background-light transition-colors">
                                    {tx.cancel}
                                </button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-text-on-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50">
                                    {loading ? '...' : tx.save}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isMediaPickerOpen && (
                <MediaPickerModal
                    isOpen={isMediaPickerOpen}
                    space={space || null}
                    language={language}
                    onSelect={(url) => {
                        setIsEditing(prev => prev ? { ...prev, imageUrl: url } : null);
                        setPreviewUrl(url);
                        setIsMediaPickerOpen(false);
                    }}
                    onClose={() => setIsMediaPickerOpen(false)}
                />
            )}
        </div>
    );
};
