// client/src/services/apiService.ts
import { 
    Message, User, Space, AIConfig, Role, SpacePage, 
    SocialPost, SocialComment, 
    SocialNotification, Tag, Transaction, WithdrawalRequest, PricingPlan 
} from '../types';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorData;
        try {
            errorData = await res.json();
        } catch (e) {
            errorData = { message: res.statusText };
        }
        throw new Error(errorData.message || 'API request failed');
    }
    if (res.status === 204) return null;
    return res.json();
};

const authedFetch = (url: string, options: RequestInit = {}) => {
    let token = localStorage.getItem('token');
    if (!token) {
        token = localStorage.getItem('apiToken'); // Fallback for old sessions
    }
    if (!token) {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                token = user.token || user.apiToken;
            }
        } catch (e) {}
    }
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
};

export type ModelProvider = 'gemini' | 'gpt' | 'grok' | 'vertex';
export type ModelType = ModelProvider;

export interface DashboardStats {
    totalUsers: number;
    totalSpaces: number;
    totalAiConfigs: number;
    totalMessages: number;
}

export const apiService = {
    // ── Auth & Profile ───────────────────────────────────────────────────────────
    login: (email: string, password?: string, context?: string, spaceSlug?: string) => fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, context, spaceSlug })
    }).then(handleResponse),

    register: (userData: any) => fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    }).then(handleResponse),

    getMe: () => authedFetch('/api/auth/me').then(handleResponse),
    getCurrentUserProfile: () => authedFetch('/api/auth/me').then(handleResponse),
    getUserProfile: () => authedFetch('/api/auth/me').then(handleResponse),
    regenerateApiToken: (userId: number) => authedFetch(`/api/users/${userId}/regenerate-token`, {
        method: 'POST'
    }).then(handleResponse),

    updateProfile: (data: Partial<User>) => authedFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),

    updateUser: (data: Partial<User> & { id: number | 'new' }) => authedFetch(`/api/users/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),

    changePassword: (userId: number, oldPassword?: string, newPassword?: string) => fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(() => {
                let t = localStorage.getItem('apiToken');
                if (!t) {
                    try {
                        const userStr = localStorage.getItem('user');
                        if (userStr) t = JSON.parse(userStr).apiToken;
                    } catch (e) {}
                }
                return t;
            })()}`
        },
        body: JSON.stringify({ oldPassword, newPassword, userId })
    }).then(handleResponse),

    resetPassword: (token: string, password?: string) => fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
    }).then(handleResponse),

    sendContactForm: (data: any) => fetch('/api/space-pages/1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(handleResponse),

    // ── Chat & AI Configs ───────────────────────────────────────────────────────
    getAiConfigs: (userId?: number | null | User): Promise<AIConfig[]> => authedFetch('/api/ai-configs', {
        method: 'POST',
        body: JSON.stringify({ userId: typeof userId === 'object' ? userId?.id : userId })
    }).then(handleResponse),

    getAiConfigsBySpaceId: (spaceId: number | string): Promise<AIConfig[]> => authedFetch(`/api/ai-configs/space/${spaceId}`).then(handleResponse),

    getManageableAiConfigs: (user?: any): Promise<AIConfig[]> => authedFetch('/api/ai-configs/manageable', {
        method: 'POST',
        body: JSON.stringify({ user })
    }).then(handleResponse),

    createAiConfig: (data: any): Promise<AIConfig> => authedFetch('/api/ai-configs/create', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),

    updateAiConfig: (id: number | string, data: any): Promise<AIConfig> => authedFetch(`/api/ai-configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),

    deleteAiConfig: (id: number | string) => authedFetch(`/api/ai-configs/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    getAiAccessList: (id: number | string): Promise<User[]> => authedFetch(`/api/ai-configs/${id}/access`).then(handleResponse),

    updateAiAccessList: (id: number | string, emails: string[]) => authedFetch(`/api/ai-configs/${id}/access`, {
        method: 'POST',
        body: JSON.stringify({ emails })
    }).then(handleResponse),

    setAiActive: (id: number | string, isActive: boolean) => authedFetch(`/api/ai-configs/${id}/active`, {
        method: 'PUT',
        body: JSON.stringify({ isActive })
    }).then(handleResponse),

    // ── Conversations ───────────────────────────────────────────────────────────
    getConversations: (options: number | { userId: number; aiConfigId?: number; page?: number; limit?: number; }): Promise<any> => {
        const params = new URLSearchParams();
        if (typeof options === 'number') {
            params.append('userId', String(options));
        } else {
            params.append('userId', String(options.userId));
            if (options.aiConfigId) params.append('aiConfigId', String(options.aiConfigId));
            if (options.page) params.append('page', String(options.page));
            if (options.limit) params.append('limit', String(options.limit));
        }
        return authedFetch(`/api/conversations?${params.toString()}`).then(handleResponse);
    },

    getConversation: (id: number | string): Promise<any> => authedFetch(`/api/conversations/${id}`).then(handleResponse),

    getAllConversations: (): Promise<any[]> => authedFetch('/api/conversations/all').then(handleResponse),

    createConversation: (aiId: number | string, messages: Message[], user?: any) => authedFetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ aiConfigId: aiId, messages, userId: user?.id })
    }).then(handleResponse),

    renameConversation: (id: number | string, title: string) => authedFetch(`/api/conversations/${id}/rename`, {
        method: 'PUT',
        body: JSON.stringify({ title })
    }).then(handleResponse),

    updateConversationTrainingStatus: (id: number | string, isTrained: boolean) => authedFetch(`/api/conversations/${id}/train-status`, {
        method: 'PUT',
        body: JSON.stringify({ isTrained })
    }).then(handleResponse),

    sendMessageStream: async (aiConfig: AIConfig, messages: Message[], user: any, conversationId?: number | string | null, callbacks?: any, _isTrial?: boolean, language?: string, clientAiMessageId?: string, guestTurnCount?: number) => {
        let token = localStorage.getItem('apiToken');
        if (!token) {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) token = JSON.parse(userStr).apiToken;
            } catch (e) {}
        }
        try {
            const response = await fetch('/api/conversations/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    aiConfigId: aiConfig.id,
                    messages,
                    userId: user?.id,
                    conversationId,
                    language,
                    clientAiMessageId,
                    guestTurnCount
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: response.statusText }));
                if (callbacks?.onError) callbacks.onError(err.message || 'API request failed');
                return;
            }

            const reader = response.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr.trim() === '') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.done) {
                                    if (callbacks?.onEnd) callbacks.onEnd(data.conversationId, data.updatedUser, { text: data.text, thought: data.thought });
                                    break;
                                }
                                if (data.text && callbacks?.onChunk) {
                                    callbacks.onChunk(data.text);
                                }
                                if (data.error && callbacks?.onError) {
                                    callbacks.onError(data.error);
                                }
                            } catch (e) { /* ignore partial */ }
                        }
                    }
                }
            }
        } catch (e: any) {
            if (callbacks?.onError) callbacks.onError(e.message || String(e));
        }
    },

    setMessageFeedback: (conversationId: number | string, messageId: number | string, feedback: string) => authedFetch(`/api/conversations/${conversationId}/messages/${messageId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
    }).then(handleResponse),

    deleteConversation: (id: number | string) => authedFetch(`/api/conversations/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    getLatestConversationByAiId: (aiId: number, userId?: number): Promise<any> => authedFetch(`/api/ai-configs/${aiId}/latest-conversation`, {
        method: 'POST',
        body: JSON.stringify({ userId })
    }).then(handleResponse),

    getTrainedConversationsByAiId: (aiId: number): Promise<any[]> => authedFetch(`/api/ai-configs/${aiId}/trained-conversations`).then(handleResponse),

    getTestConversationsForAI: (aiId: number | string, userId?: number): Promise<any[]> => authedFetch(`/api/ai-configs/${aiId}/test-conversations`, {
        method: 'POST',
        body: JSON.stringify({ userId })
    }).then(handleResponse),

    getTestConversationsByAiId: (aiId: number, userId?: number): Promise<any[]> => authedFetch(`/api/ai-configs/${aiId}/test-conversations`, {
        method: 'POST',
        body: JSON.stringify({ userId })
    }).then(handleResponse),

    CLAIM_MERITS_VND: 1000,

    // ── Users ──────────────────────────────────────────────────────────────────
    getAllUsers: (page: number = 1, limit: number = 10, search: string = ''): Promise<User[]> => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
        return authedFetch(`/api/users?${params.toString()}`).then(handleResponse);
    },

    createUser: (data: any): Promise<User> => authedFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),

    deleteUser: (id: number | string) => authedFetch(`/api/users/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    forgotPassword: (email: string, language: string = 'vi') => fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language })
    }).then(handleResponse),

    getUserSpaces: (userId: number): Promise<any[]> => authedFetch(`/api/users/${userId}/spaces`).then(handleResponse),

    // ── Billing & Payments ──────────────────────────────────────────────────────
    getPricingPlans: (spaceId?: number | string): Promise<PricingPlan[]> => {
        const query = spaceId ? `?spaceId=${spaceId}` : '';
        return authedFetch(`/api/billing/pricing-plans${query}`).then(handleResponse);
    },
    createPricingPlan: (data: any) => authedFetch('/api/billing/pricing-plans', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updatePricingPlan: (data: PricingPlan) => authedFetch(`/api/billing/pricing-plans/${data.id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deletePricingPlan: (id: number | string) => authedFetch(`/api/billing/pricing-plans/${id}`, { method: 'DELETE' }).then(handleResponse),
    getUserSubscription: (userId: number): Promise<any> => authedFetch(`/api/billing/transactions/user/${userId}`).then(handleResponse),

    getAllTransactions: (spaceId?: number | string): Promise<Transaction[]> => {
        const query = spaceId ? `?spaceId=${spaceId}` : '';
        return authedFetch(`/api/billing/transactions${query}`).then(handleResponse);
    },

    getTransactionsForUser: (userId: number): Promise<Transaction[]> => {
        return authedFetch(`/api/billing/transactions/user/${userId}`).then(handleResponse);
    },

    getSpaceTransactions: (spaceId: number | string, options?: any): Promise<Transaction[]> => {
        let url = `/api/billing/spaces/${spaceId}/transactions`;
        if (options) {
            const params = new URLSearchParams();
            Object.keys(options).forEach(k => {
                if (options[k] !== undefined && options[k] !== null && k !== 'signal') params.append(k, options[k]);
            });
            url += '?' + params.toString();
        }
        return authedFetch(url).then(handleResponse);
    },

    getSpaceEarningsStats: (spaceId: number | string, days: number = 30): Promise<any[]> => {
        return authedFetch(`/api/billing/stats/space-earnings?spaceId=${spaceId}&days=${days}`).then(handleResponse);
    },

    getWithdrawalRequests: (): Promise<WithdrawalRequest[]> => authedFetch('/api/billing/admin/withdrawals').then(handleResponse),

    processWithdrawalRequest: (id: number | string, action: 'approved' | 'rejected') => authedFetch(`/api/billing/admin/withdrawals/${id}/process`, {
        method: 'PUT',
        body: JSON.stringify({ action })
    }).then(handleResponse),

    createWithdrawalRequest: (userId: number, amount: number, spaceId?: number | string | null) => authedFetch('/api/billing/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, spaceId })
    }).then(handleResponse),

    exportSpaceTransactions: (spaceId?: number | string) => {
        const query = spaceId ? `?spaceId=${spaceId}` : '';
        window.location.href = `/api/billing/export/transactions${query}`;
    },

    // Stripe Connect
    createStripeConnectAccount: (spaceId?: number | string) => authedFetch('/api/billing/stripe/connect/account', {
        method: 'POST',
        body: JSON.stringify({ spaceId })
    }).then(handleResponse),

    getStripeConnectAccountStatus: (accountId: string) => authedFetch(`/api/billing/stripe/connect/account/${accountId}/status`).then(handleResponse),

    createStripeAccountLink: (accountId: string, spaceId?: number | string) => authedFetch('/api/billing/stripe/connect/account-link', {
        method: 'POST',
        body: JSON.stringify({ accountId, spaceId })
    }).then(handleResponse),

    createStripeLoginLink: (accountId: string) => authedFetch('/api/billing/stripe/connect/login-link', {
        method: 'POST',
        body: JSON.stringify({ accountId })
    }).then(handleResponse),

    disconnectStripeConnect: (spaceId: number | string) => authedFetch('/api/billing/stripe/connect/disconnect', {
        method: 'POST',
        body: JSON.stringify({ spaceId })
    }).then(handleResponse),

    createCheckoutSession: (userId: number, planId: number): Promise<any> => authedFetch('/api/billing/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ userId, planId }),
    }).then(handleResponse),
    createStripeCheckoutSession: (amount: number, message: string, spaceId: number | string, returnPath: string, type: string = 'offering', planId?: number) => authedFetch('/api/billing/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ amount, message, spaceId, returnPath, type, planId })
    }).then(handleResponse),
    createPayOSDonationLink: (amount: number, message: string, spaceId: number | string, returnPath: string) => authedFetch('/api/payos/create-donation-link', {
        method: 'POST',
        body: JSON.stringify({ amount, message, spaceId, returnPath })
    }).then(handleResponse),
    createPayOSPaymentLink: (planId: number | string, spaceId: number | string | null, returnPath: string) => authedFetch('/api/payos/create-payment-link', {
        method: 'POST',
        body: JSON.stringify({ planId, spaceId, returnPath })
    }).then(handleResponse),
    verifyCheckoutSession: (sessionId: string) => authedFetch('/api/billing/stripe/verify-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
    }).then(handleResponse),
    verifyPayOsOrder: (orderCode: string | number) => authedFetch(`/api/payos/verify-order?orderCode=${orderCode}`).then(handleResponse),
    getEnabledPaymentMethods: () => authedFetch('/api/billing/stripe/payment-methods').then(handleResponse),
    purchaseAi: (aiId: number | string, userId: number): Promise<{ updatedUser: User }> => authedFetch(`/api/ai-configs/${aiId}/purchase`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
    }).then(handleResponse),
    claimFreeAi: (aiId: number | string, userId: number): Promise<{ updatedUser: User }> => authedFetch(`/api/ai-configs/${aiId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
    }).then(handleResponse),

    // ── Comments ────────────────────────────────────────────────────────────────
    getComments: (filters: any): Promise<any> => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(k => {
            if (filters[k] !== undefined && filters[k] !== null) params.append(k, filters[k]);
        });
        return authedFetch(`/api/comments/admin/comments?${params.toString()}`).then(handleResponse);
    },
    updateCommentStatus: (id: number | string, status: string) => authedFetch(`/api/comments/admin/comments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    }).then(handleResponse),
    deleteComment: (id: number | string) => authedFetch(`/api/comments/admin/comments/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    // ── Dharma Talks ────────────────────────────────────────────────────────────
    getAllDharmaTalks: (options: any = {}): Promise<any> => {
        const params = new URLSearchParams();
        Object.keys(options).forEach(k => {
            if (options[k] !== undefined && options[k] !== null && k !== 'signal') params.append(k, options[k]);
        });
        return authedFetch(`/api/dharma-talks?${params.toString()}`).then(handleResponse);
    },
    getDharmaTalksBySpaceId: (spaceId: number | string): Promise<any[]> => authedFetch(`/api/spaces/${spaceId}/dharma-talks`).then(handleResponse),
    createDharmaTalk: (formData: FormData) => authedFetch('/api/dharma-talks', { method: 'POST', body: formData }).then(handleResponse),
    updateDharmaTalk: (id: number | string, formData: FormData) => authedFetch(`/api/dharma-talks/${id}`, { method: 'PUT', body: formData }).then(handleResponse),
    deleteDharmaTalk: (id: number | string) => authedFetch(`/api/dharma-talks/${id}`, { method: 'DELETE' }).then(handleResponse),
    incrementDharmaTalkView: (id: number | string) => authedFetch(`/api/dharma-talks/${id}/view`, { method: 'POST' }).then(handleResponse),
    likeDharmaTalk: (id: number | string) => authedFetch(`/api/dharma-talks/${id}/like`, { method: 'POST' }).then(handleResponse),

    // ── System & Tools ──────────────────────────────────────────────────────────
    getSystemConfig: () => fetch('/api/system/config').then(handleResponse),

    updateSystemConfig: (data: any) => authedFetch('/api/system/config', {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),

    getDashboardStats: (spaceId?: number | string): Promise<DashboardStats> => {
        let url = '/api/system/dashboard/stats';
        if (spaceId) url += `?spaceId=${spaceId}`;
        return authedFetch(url).then(handleResponse);
    },

    getPublicStats: () => fetch('/api/system/public/stats').then(handleResponse),

    request: (url: string, options?: RequestInit) => authedFetch(url, options).then(handleResponse),

    getAllTags: (): Promise<Tag[]> => authedFetch('/api/documents/tags').then(handleResponse),

    uploadFile: (formData: FormData) => authedFetch('/api/system/upload', {
        method: 'POST',
        body: formData
    }).then(handleResponse),

    uploadFiles: (formData: FormData) => authedFetch('/api/system/upload', {
        method: 'POST',
        body: formData
    }).then(handleResponse),

    getMediaLibrary: (spaceId: number | string, page: number = 1, limit: number = 20) => authedFetch(`/api/media/${spaceId}?page=${page}&limit=${limit}`).then(handleResponse),
    uploadMedia: (spaceId: number | string, formData: FormData) => authedFetch(`/api/media/${spaceId}/upload`, { method: 'POST', body: formData }).then(handleResponse),
    deleteMedia: (spaceId: number | string, filePaths: string[]) => authedFetch(`/api/media/${spaceId}`, { method: 'DELETE', body: JSON.stringify({ filePaths }) }).then(handleResponse),

    getAvailableModels: (provider: string, userId?: number) => {
        const query = userId ? `?userId=${userId}` : '';
        return authedFetch(`/api/system/models/${provider}${query}`).then(handleResponse);
    },

    generateTtsAudio: (
        text: string, provider: ModelType, model: string, voice: string, 
        lang: 'vi' | 'en', userId: number, styleInstruction?: string, 
        temperature?: number, aiId?: number | string
    ): Promise<{ audioContent: string, mimeType: string }> => {
        return authedFetch('/api/system/tts/generate', {
            method: 'POST',
            body: JSON.stringify({ text, provider, model, voice, lang, userId, styleInstruction, temperature, aiId }),
        }).then(handleResponse);
    },

    translateText: (text: string, provider: string, model: string, targetLanguage: string, userId: number, contextPrompt?: string) => {
        return authedFetch('/api/system/translate', {
            method: 'POST',
            body: JSON.stringify({ text, provider, model, targetLanguage, userId, contextPrompt }),
        }).then(handleResponse);
    },

    // ── Spaces ──────────────────────────────────────────────────────────────────
    getSpaces: (): Promise<Space[]> => authedFetch('/api/spaces').then(handleResponse),
    // Admin panel: get only spaces the current user owns or is a member of (requires auth)
    getMySpaces: (): Promise<Space[]> => authedFetch('/api/spaces/my-spaces').then(handleResponse),
    getSpace: (id: number | string): Promise<Space> => fetch(`/api/spaces/${id}`).then(handleResponse),
    getSpaceById: (id: number | string): Promise<Space> => fetch(`/api/spaces/${id}`).then(handleResponse),
    getSpaceBySlug: (slug: string): Promise<Space> => fetch(`/api/spaces/slug/${slug}`).then(handleResponse),
    getSpaceByDomain: (domain: string): Promise<Space> => fetch(`/api/spaces/domain/${domain}`).then(handleResponse),
    getManagedSpaces: (userId: number): Promise<Space[]> => authedFetch(`/api/spaces/managed/${userId}`).then(handleResponse),
    getSpaceOwners: (): Promise<User[]> => authedFetch('/api/spaces/owners').then(handleResponse),

    createSpace: (data: any) => authedFetch('/api/spaces', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),

    updateSpace: (id: number | string, data: any) => authedFetch(`/api/spaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),

    deleteSpace: (id: number | string) => authedFetch(`/api/spaces/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    getSpaceTypes: (): Promise<any[]> => authedFetch('/api/space-types').then(handleResponse),
    createSpaceType: (data: any) => authedFetch('/api/space-types', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateSpaceType: (id: number | string, data: any) => authedFetch(`/api/space-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteSpaceType: (id: number | string) => authedFetch(`/api/space-types/${id}`, { method: 'DELETE' }).then(handleResponse),
    getMySpaceOwnerData: (): Promise<any> => authedFetch('/api/spaces/owner-data').then(handleResponse),

    incrementSpaceView: (id: number | string) => authedFetch(`/api/spaces/${id}/view`, { method: 'POST' }).then(handleResponse),
    likeSpace: (id: number | string) => authedFetch(`/api/spaces/${id}/like`, { method: 'POST' }).then(handleResponse),

    // ── Space Members ───────────────────────────────────────────────────────────
    getSpaceMembers: (spaceId: number | string) => authedFetch(`/api/spaces/${spaceId}/members`).then(handleResponse),
    joinSpace: (spaceId: number | string, data: any) => authedFetch(`/api/spaces/${spaceId}/join`, {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),
    addSpaceMember: (spaceId: number | string, userId: number) => authedFetch(`/api/spaces/${spaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId })
    }).then(handleResponse),
    updateMemberRole: (spaceId: number | string, userId: number, roleId: number) => authedFetch(`/api/spaces/${spaceId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ roleId })
    }).then(handleResponse),
    removeMember: (spaceId: number | string, userId: number) => authedFetch(`/api/spaces/${spaceId}/members/${userId}`, {
        method: 'DELETE'
    }).then(handleResponse),
    removeSpaceMember: (spaceId: number | string, userId: number) => authedFetch(`/api/spaces/${spaceId}/members/${userId}`, {
        method: 'DELETE'
    }).then(handleResponse),

    // ── Roles ───────────────────────────────────────────────────────────────────
    getRoles: (): Promise<Role[]> => authedFetch('/api/roles').then(handleResponse),
    getAllRoles: (): Promise<Role[]> => authedFetch('/api/roles').then(handleResponse),
    getSpaceRoles: (spaceId: number | string): Promise<Role[]> => authedFetch(`/api/roles/space/${spaceId}`).then(handleResponse),
    createRole: (data: any) => authedFetch('/api/roles', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),
    updateRole: (data: Role) => authedFetch(`/api/roles/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),
    deleteRole: (id: number | string) => authedFetch(`/api/roles/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    // ── Space Pages ─────────────────────────────────────────────────────────────
    getSpacePages: (spaceId: number | string): Promise<SpacePage[]> => fetch(`/api/space-pages/space/${spaceId}`).then(handleResponse),
    getSpacePage: (id: number | string): Promise<SpacePage> => fetch(`/api/space-pages/${id}`).then(handleResponse),
    createSpacePage: (data: any) => authedFetch('/api/space-pages', {
        method: 'POST',
        body: JSON.stringify(data)
    }).then(handleResponse),
    updateSpacePage: (id: number | string, data: any) => authedFetch(`/api/space-pages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }).then(handleResponse),
    deleteSpacePage: (id: number | string) => authedFetch(`/api/space-pages/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),

    // ── Documents ───────────────────────────────────────────────────────────────
    getDocuments: (options?: any): Promise<any> => {
        let url = '/api/documents';
        if (options && typeof options === 'object') {
            const params = new URLSearchParams();
            Object.keys(options).forEach(key => {
                if (options[key] !== undefined && options[key] !== null && key !== 'signal') params.append(key, options[key]);
            });
            url += '?' + params.toString();
        } else if (typeof options === 'number') {
            url += `?spaceId=${options}`;
        }
        return authedFetch(url).then(handleResponse);
    },
    getLibraryDocuments: (options?: any): Promise<any> => {
        let url = '/api/library/documents';
        const fetchOptions: RequestInit = {};
        if (options && typeof options === 'object') {
            if (options.signal) fetchOptions.signal = options.signal;
            const params = new URLSearchParams();
            Object.keys(options).forEach(key => {
                if (options[key] !== undefined && options[key] !== null && key !== 'signal') params.append(key, options[key]);
            });
            url += '?' + params.toString();
        }
        return authedFetch(url, fetchOptions).then(handleResponse);
    },
    getLibraryTopics: (spaceIdentifier?: number | string | null, page = 1, limit = 15): Promise<any> => {
        let url = `/api/library/topics?page=${page}&limit=${limit}`;
        if (spaceIdentifier) {
            if (typeof spaceIdentifier === 'string' && spaceIdentifier !== 'global' && isNaN(Number(spaceIdentifier))) {
                url += `&spaceSlug=${spaceIdentifier}`;
            } else {
                url += `&spaceId=${spaceIdentifier}`;
            }
        }
        return authedFetch(url).then(handleResponse);
    },
    getLibraryFilters: (spaceIdentifier?: number | string | null, options?: any): Promise<any> => {
        let url = '/api/library/filters';
        const params = new URLSearchParams();
        if (spaceIdentifier) {
            if (typeof spaceIdentifier === 'string' && spaceIdentifier !== 'global' && isNaN(Number(spaceIdentifier))) {
                params.append('spaceSlug', spaceIdentifier);
            } else {
                params.append('spaceId', String(spaceIdentifier));
            }
        }
        if (options && typeof options === 'object') {
            Object.keys(options).forEach(key => {
                if (options[key] !== undefined && options[key] !== null && key !== 'signal') params.append(key, options[key]);
            });
        }
        if (params.toString()) url += '?' + params.toString();
        return authedFetch(url).then(handleResponse);
    },
    getDocumentDetail: (id: number | string): Promise<any> => authedFetch(`/api/documents/${id}`).then(handleResponse),
    getLibraryRecommended: (): Promise<any[]> => authedFetch('/api/documents/recommended').then(handleResponse),
    uploadDocument: (formData: FormData) => authedFetch('/api/documents', { method: 'POST', body: formData }).then(handleResponse),
    deleteDocument: (id: number | string) => authedFetch(`/api/documents/${id}`, { method: 'DELETE' }).then(handleResponse),
    likeDocument: (id: number | string) => authedFetch(`/api/documents/${id}/like`, { method: 'POST' }).then(handleResponse),
    linkDocumentsToAi: (aiId: number | string, documentIds: number[]) => authedFetch(`/api/ai-configs/${aiId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ documentIds })
    }).then(handleResponse),
    unlinkDocumentFromAi: (aiId: number | string, docId: number | string) => authedFetch(`/api/ai-configs/${aiId}/documents/${docId}`, {
        method: 'DELETE'
    }).then(handleResponse),

    getDocumentConfig: (): Promise<any> => authedFetch('/api/documents/config').then(handleResponse),
    updateDocumentConfig: (config: any): Promise<any> => authedFetch('/api/documents/config', {
        method: 'PUT',
        body: JSON.stringify(config)
    }).then(handleResponse),
    getDocumentAuthors: (spaceId?: number | string): Promise<any[]> => authedFetch(`/api/documents/authors${spaceId ? `?spaceId=${spaceId}` : ''}`).then(handleResponse),
    createDocumentAuthor: (data: any): Promise<any> => authedFetch('/api/documents/authors', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateDocumentAuthor: (id: number | string, data: any): Promise<any> => authedFetch(`/api/documents/authors/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteDocumentAuthor: (id: number | string): Promise<any> => authedFetch(`/api/documents/authors/${id}`, { method: 'DELETE' }).then(handleResponse),
    getDocumentTypes: (spaceId?: number | string): Promise<any[]> => authedFetch(`/api/documents/types${spaceId ? `?spaceId=${spaceId}` : ''}`).then(handleResponse),
    createDocumentType: (data: any): Promise<any> => authedFetch('/api/documents/types', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateDocumentType: (id: number | string, data: any): Promise<any> => authedFetch(`/api/documents/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteDocumentType: (id: number | string): Promise<any> => authedFetch(`/api/documents/types/${id}`, { method: 'DELETE' }).then(handleResponse),
    getDocumentTopics: (spaceId?: number | string): Promise<any[]> => authedFetch(`/api/documents/topics${spaceId ? `?spaceId=${spaceId}` : ''}`).then(handleResponse),
    createDocumentTopic: (data: any): Promise<any> => authedFetch('/api/documents/topics', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateDocumentTopic: (id: number | string, data: any): Promise<any> => authedFetch(`/api/documents/topics/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteDocumentTopic: (id: number | string): Promise<any> => authedFetch(`/api/documents/topics/${id}`, { method: 'DELETE' }).then(handleResponse),
    createDocument: (data: any): Promise<any> => authedFetch('/api/documents', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateDocument: (id: number | string, data: any): Promise<any> => authedFetch(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    extractTextFromFile: (provider: string, model: string, file: File, userId: number) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('provider', provider);
        formData.append('model', model);
        formData.append('userId', String(userId));
        return authedFetch('/api/documents/extract-text', { method: 'POST', body: formData }).then(handleResponse);
    },

    // ── Meditations ─────────────────────────────────────────────────────────────
    getMeditationBySpaceId: (spaceId: number | string): Promise<any[]> => authedFetch(`/api/meditation/space/${spaceId}`).then(handleResponse),
    getAllMeditations: (): Promise<any[]> => authedFetch('/api/meditation').then(handleResponse),
    createMeditation: (data: any) => authedFetch('/api/meditation', { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateMeditation: (id: number | string, data: any) => authedFetch(`/api/meditation/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteMeditation: (id: number | string) => authedFetch(`/api/meditation/${id}`, { method: 'DELETE' }).then(handleResponse),

    // ── Training Data ───────────────────────────────────────────────────────────
    getTrainingDataForAI: (aiId: number | string): Promise<any[]> => authedFetch(`/api/ai-configs/${aiId}/training-data`).then(handleResponse),
    createTrainingDataSourceForAI: (aiId: number | string, formData: FormData) => authedFetch(`/api/ai-configs/${aiId}/training-data`, {
        method: 'POST',
        body: formData
    }).then(handleResponse),
    createTrainingQaDataSource: (aiConfigId: number | string, question: string, answer: string, thought?: string) => authedFetch(`/api/ai-configs/${aiConfigId}/training-data`, {
        method: 'POST',
        body: JSON.stringify({ type: 'qa', question, answer, thought })
    }).then(handleResponse),
    deleteTrainingDataSource: (id: number | string) => authedFetch(`/api/training-data/${id}`, {
        method: 'DELETE'
    }).then(handleResponse),
    deleteTrainingQaDataSource: (aiConfigId: number | string, question: string, answer: string) => authedFetch(`/api/training-data/qa`, {
        method: 'DELETE',
        body: JSON.stringify({ aiConfigId, question, answer })
    }).then(handleResponse),
    generateSummaryForDataSource: (id: number | string) => authedFetch(`/api/training-data/${id}/summarize`, {
        method: 'POST'
    }).then(handleResponse),

    getAllQaTrainingData: (): Promise<any[]> => authedFetch('/api/training-data/qa/all').then(handleResponse),
    exportQaDataForFinetune: (data: any[]) => authedFetch('/api/training-data/qa/export', {
        method: 'POST',
        body: JSON.stringify({ sourcesToExport: data })
    }).then(handleResponse),

    // ── Koii ────────────────────────────────────────────────────────────────────
    getKoiiProgress: (aiId: number | string): Promise<any> => authedFetch(`/api/koii/progress/${aiId}`).then(handleResponse),
    submitKoiiTask: (aiConfigId: number | string): Promise<{ message: string }> => authedFetch(`/api/koii/submit-task`, {
        method: 'POST',
        body: JSON.stringify({ aiConfigId }),
    }).then(handleResponse),
    getKoiiTaskStatus: (aiConfigId: number | string): Promise<any | null> => authedFetch(`/api/koii/task-status/${aiConfigId}`).then(res => {
        if (res.status === 404) return null;
        return handleResponse(res);
    }),

    // ── AI Voice ────────────────────────────────────────────────────────────────
    getAiVoiceKey: (aiConfigId: number | string): Promise<{ ephemeralToken: string; geminiVoice?: string; geminiStyle?: string; geminiTemperature?: number }> => {
        return authedFetch(`/api/ai-configs/${aiConfigId}/voice-key`).then(handleResponse);
    },

    // ── Space Social ────────────────────────────────────────────────────────────
    getSocialPosts: (spaceId: number, page = 1, limit = 10): Promise<{ data: SocialPost[], total: number, page: number, limit: number }> => {
        return authedFetch(`/api/space-social/${spaceId}/social?page=${page}&limit=${limit}`).then(handleResponse);
    },
    createSocialPost: (spaceId: number, formData: FormData): Promise<SocialPost> => {
        return authedFetch(`/api/space-social/${spaceId}/social`, { method: 'POST', body: formData }).then(handleResponse);
    },
    updateSocialPost: (spaceId: number, postId: number, formData: FormData | any): Promise<{ success: boolean }> => {
        const options: RequestInit = { method: 'PUT', body: formData instanceof FormData ? formData : JSON.stringify(formData) };
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}`, options).then(handleResponse);
    },
    deleteSocialPost: (spaceId: number, postId: number): Promise<void> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}`, { method: 'DELETE' }).then(handleResponse);
    },
    toggleSocialLike: (spaceId: number, postId: number): Promise<{ liked: boolean, likesCount: number }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/like`, { method: 'POST' }).then(handleResponse);
    },
    getPostLikers: (spaceId: number | string, postId: number | string): Promise<any[]> => authedFetch(`/api/space-social/${spaceId}/social/${postId}/likes`).then(handleResponse),
    getSocialComments: (spaceId: number, postId: number): Promise<SocialComment[]> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/comments`).then(handleResponse);
    },
    addSocialComment: (spaceId: number, postId: number, content: string, parentCommentId?: number, imageUrl?: string): Promise<SocialComment> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content, parentCommentId, imageUrl }),
        }).then(handleResponse);
    },
    deleteSocialComment: (spaceId: number, postId: number, commentId: number): Promise<void> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/comments/${commentId}`, { method: 'DELETE' }).then(handleResponse);
    },
    toggleCommentLike: (spaceId: number, postId: number, commentId: number): Promise<{ liked: boolean, likesCount: number }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/comments/${commentId}/like`, { method: 'POST' }).then(handleResponse);
    },
    getSocialNotifications: (spaceId: number): Promise<SocialNotification[]> => {
        return authedFetch(`/api/space-social/${spaceId}/social/notifications`).then(handleResponse);
    },
    markNotificationsRead: (spaceId: number): Promise<{ success: boolean }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/notifications/read`, { method: 'POST' }).then(handleResponse);
    },
    getUnreadNotificationCount: (spaceId: number): Promise<{ count: number }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/notifications/count`).then(handleResponse);
    },
    toggleSocialFollow: (spaceId: number, targetUserId: number): Promise<{ following: boolean, followersCount: number }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/follow/${targetUserId}`, { method: 'POST' }).then(handleResponse);
    },
    getUserSocialStats: (spaceId: number, userId: number): Promise<{ postCount: number, followersCount: number, followingCount: number, isFollowing: boolean }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/users/${userId}/stats`).then(handleResponse);
    },
    toggleBookmark: (spaceId: number | string, postId: number | string): Promise<{ bookmarked: boolean }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/bookmark`, { method: 'POST' }).then(handleResponse);
    },
    toggleSocialBookmark: (spaceId: number | string, postId: number | string) => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/bookmark`, { method: 'POST' }).then(handleResponse);
    },
    getSavedPosts: (spaceId: number): Promise<SocialPost[]> => {
        return authedFetch(`/api/space-social/${spaceId}/social/saved`).then(handleResponse);
    },
    togglePinPost: (spaceId: number, postId: number): Promise<{ pinned: boolean }> => {
        return authedFetch(`/api/space-social/${spaceId}/social/${postId}/pin`, { method: 'POST' }).then(handleResponse);
    },

    // ── CMS Articles ────────────────────────────────────────────────────────────
    getCmsArticles: (spaceId: number | string, filters?: any): Promise<any> => {
        const params = new URLSearchParams();
        if (filters) {
            Object.keys(filters).forEach(k => {
                if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') params.append(k, filters[k]);
            });
        }
        return authedFetch(`/api/cms/${spaceId}/articles?${params.toString()}`).then(handleResponse);
    },
    getCmsArticle: (spaceId: number | string, id: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${id}`).then(handleResponse),
    createCmsArticle: (spaceId: number | string, data: any): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles`, { method: 'POST', body: JSON.stringify(data) }).then(handleResponse),
    updateCmsArticle: (spaceId: number | string, id: number | string, data: any): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(handleResponse),
    deleteCmsArticle: (spaceId: number | string, id: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${id}`, { method: 'DELETE' }).then(handleResponse),
    permanentDeleteCmsArticle: (spaceId: number | string, id: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${id}/permanent`, { method: 'DELETE' }).then(handleResponse),
    publishCmsArticle: (spaceId: number | string, id: number | string, platforms?: string[]): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${id}/publish`, { method: 'POST', body: JSON.stringify({ platforms }) }).then(handleResponse),
    importDocumentToCms: (spaceId: number | string, documentId: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/import-document`, { method: 'POST', body: JSON.stringify({ documentId }) }).then(handleResponse),
    shareCmsToSocialFeed: (spaceId: number | string, articleId: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/articles/${articleId}/share-to-feed`, { method: 'POST' }).then(handleResponse),

    // ── CMS Social Connections ──────────────────────────────────────────────────
    getCmsConnections: (spaceId: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/connections`).then(handleResponse),
    deleteCmsConnection: (spaceId: number | string, connectionId: number | string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/connections/${connectionId}`, { method: 'DELETE' }).then(handleResponse),
    getCmsOAuthUrl: (spaceId: number | string, platform: string): Promise<{ url: string }> =>
        authedFetch(`/api/cms/${spaceId}/oauth/${platform}/url`).then(handleResponse),
    getFacebookPages: (spaceId: number | string): Promise<any[]> =>
        authedFetch(`/api/cms/${spaceId}/connections/facebook/pages`).then(handleResponse),
    updateFacebookConnection: (spaceId: number | string, data: { pageName: string, accessToken: string }): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/connections/facebook`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(handleResponse),

    // ─────────────────────────────────────────────────────────────────────────────
    // FB Albums
    // ─────────────────────────────────────────────────────────────────────────────
    getCmsFbAlbums: (spaceId: number | string): Promise<any[]> =>
        authedFetch(`/api/cms/${spaceId}/fb-albums`).then(handleResponse),
    createCmsFbAlbum: (spaceId: number | string, name: string, albumId: string): Promise<any> =>
        authedFetch(`/api/cms/${spaceId}/fb-albums`, { method: 'POST', body: JSON.stringify({ name, album_id: albumId }) }).then(handleResponse),
};
