// client/src/utils/domain.ts

export const ADMIN_HOST = (import.meta.env.VITE_ADMIN_HOST || 'login.bodhilab.io').toLowerCase().trim();
export const MAIN_DOMAIN = (import.meta.env.VITE_MAIN_DOMAIN || 'bodhilab.io').toLowerCase().trim();

/**
 * Checks if a hostname is a local development host (localhost or 127.0.0.1)
 */
export const isLocalhost = (host: string = window.location.hostname): boolean => {
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return cleanHost === 'localhost' || cleanHost === '127.0.0.1';
};

/**
 * Checks if a hostname is an admin/root platform domain (login.bodhilab.io or bare bodhilab.io)
 */
export const isAdminDomain = (host: string = window.location.hostname): boolean => {
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return cleanHost === ADMIN_HOST || cleanHost === MAIN_DOMAIN;
};

/**
 * Checks if a hostname is the root platform domain or localhost (not a tenant space domain)
 */
export const isRootDomain = (host: string = window.location.hostname): boolean => {
    return isLocalhost(host) || isAdminDomain(host);
};

/**
 * Checks if a hostname is a tenant custom domain or tenant subdomain
 */
export const isCustomDomain = (host: string = window.location.hostname): boolean => {
    return !isRootDomain(host);
};
