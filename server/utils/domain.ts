// server/utils/domain.ts
import { spaceModel } from '../models/space.model.js';
import { Space } from '../types/index.js';

export const getMainDomain = (): string => {
    return (process.env.MAIN_DOMAIN || 'bodhilab.io').toLowerCase().trim();
};

export const getAdminHost = (): string => {
    return (process.env.ADMIN_HOST || 'login.bodhilab.io').toLowerCase().trim();
};

export const isAdminHost = (host?: string): boolean => {
    if (!host) return false;
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return cleanHost === getAdminHost();
};

export const isLocalhost = (host?: string): boolean => {
    if (!host) return false;
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    return cleanHost === 'localhost' || cleanHost === '127.0.0.1';
};

/**
 * Resolves a Space from request host:
 * 1. Checks spaces by custom_domain (e.g. giac.ngo)
 * 2. Checks spaces by subdomain of MAIN_DOMAIN (e.g. tathata.bodhilab.io -> slug: tathata)
 */
export const resolveSpaceFromHost = async (host?: string): Promise<Space | null> => {
    if (!host || isAdminHost(host) || isLocalhost(host)) return null;
    const cleanHost = host.split(':')[0].toLowerCase().trim();
    const mainDomain = getMainDomain();

    if (cleanHost === mainDomain) return null;

    // 1. Check custom_domain
    const spaceByDomain = await spaceModel.findByCustomDomain(cleanHost);
    if (spaceByDomain) return spaceByDomain;

    // 2. Check subdomain of MAIN_DOMAIN (e.g. tathata.bodhilab.io)
    if (cleanHost.endsWith('.' + mainDomain)) {
        const subSlug = cleanHost.slice(0, -(mainDomain.length + 1));
        if (subSlug && subSlug !== 'login' && subSlug !== 'www') {
            const spaceBySlug = await spaceModel.findBySlug(subSlug);
            if (spaceBySlug) return spaceBySlug;
        }
    }

    return null;
};
