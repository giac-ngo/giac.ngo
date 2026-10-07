// client/src/constants/permissions.ts
// Standard Unified Permission Catalog across GiacNgoVN platform

export const SYSTEM_PERMISSIONS = [
    'system',
    'manual-billing',
    'finetune',
    'mail-server',
] as const;

export const SPACE_PERMISSIONS = [
    'dashboard',
    'spaces',
    'roles',
    'users',
    'pricing',
    'files',
    'media-library',
    'cms_write',
    'cms_approve',
    'social',
    'social-moderate',
    'notifications',
    'space-billing',
    'payment-settings',
    'withdrawals',
    'dharma-talks',
    'meditation',
    'ai',
    'conversations',
    'comments',
    'templates',
    'domain',
] as const;

export type SystemPermission = typeof SYSTEM_PERMISSIONS[number];
export type SpacePermission = typeof SPACE_PERMISSIONS[number];
export type StandardPermission = SystemPermission | SpacePermission;

export const GLOBAL_ONLY_PERMISSIONS: Set<string> = new Set(SYSTEM_PERMISSIONS);

export function isGlobalOnlyPermission(permission: string): boolean {
    return GLOBAL_ONLY_PERMISSIONS.has(permission);
}
