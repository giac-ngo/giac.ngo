import { User } from '../types/index.js';

/**
 * Strict whitelist sanitizer for user objects returned via API.
 * NEVER exposes password, apiToken, resetToken, resetTokenExpires or internal database secrets.
 */
export function toPublicUser(user: Partial<User> | null | undefined): Record<string, unknown> | null {
    if (!user || !user.id) return null;

    return {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        isGlobalAdmin: !!user.isGlobalAdmin,
        roleIds: user.roleIds || [],
        permissions: user.permissions || [],
        merits: typeof user.merits === 'number' ? user.merits : 0,
        requestsRemaining: typeof user.requestsRemaining === 'number' ? user.requestsRemaining : 0,
        subscriptionPlanId: user.subscriptionPlanId || null,
        dailyMsgUsed: typeof user.dailyMsgUsed === 'number' ? user.dailyMsgUsed : 0,
        dailyLimitBonus: typeof user.dailyLimitBonus === 'number' ? user.dailyLimitBonus : 0,
        createdAt: user.createdAt || null
    };
}

/**
 * Minimal public profile for authors, community members, mentions
 */
export function toMinimalUser(user: Partial<User> | null | undefined): Record<string, unknown> | null {
    if (!user || !user.id) return null;

    return {
        id: user.id,
        name: user.name || '',
        avatarUrl: user.avatarUrl || null,
        bio: user.bio || ''
    };
}
