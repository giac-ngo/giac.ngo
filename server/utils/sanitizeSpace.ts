import { Space } from '../types/index.js';

const maskSecret = (val: unknown): string => {
    if (!val || typeof val !== 'string') return '';
    if (val.length <= 8) return '••••••••';
    return '••••••••' + val.slice(-4);
};

/**
 * Strips all secrets from Space object for general, member, and public responses.
 */
export function toPublicSpace(space: Space | null | undefined): Record<string, unknown> | null {
    if (!space) return null;
    const { apiKeys, smtpPass, payosApiKey, payosChecksumKey, ...sanitizedSpace } = space;
    return sanitizedSpace;
}

/**
 * Returns space with masked secrets for Space Owner / Admin in settings view.
 */
export function toAdminSpace(space: Space | null | undefined): Record<string, unknown> | null {
    if (!space) return null;
    const sanitized = { ...space };

    if (sanitized.apiKeys && typeof sanitized.apiKeys === 'object') {
        const maskedKeys: Record<string, string> = {};
        for (const k in sanitized.apiKeys) {
            maskedKeys[k] = maskSecret(sanitized.apiKeys[k]);
        }
        sanitized.apiKeys = maskedKeys;
    }

    if (sanitized.payosApiKey) sanitized.payosApiKey = maskSecret(sanitized.payosApiKey);
    if (sanitized.payosChecksumKey) sanitized.payosChecksumKey = maskSecret(sanitized.payosChecksumKey);
    if (sanitized.smtpPass) sanitized.smtpPass = maskSecret(sanitized.smtpPass);

    return sanitized;
}
