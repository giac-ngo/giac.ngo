import crypto from 'crypto';
import { getJwtSecret } from './jwtSecret.js';

type OAuthState = { returnTo: string; issuedAt: number; nonce: string };

export function signOAuthState(state: OAuthState): string {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const signature = crypto.createHmac('sha256', getJwtSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export function verifyOAuthState(value: unknown): OAuthState | null {
    if (typeof value !== 'string') return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', getJwtSecret()).update(payload).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    try {
        const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
        if (!state.returnTo || !Number.isFinite(state.issuedAt) || Date.now() - state.issuedAt > 10 * 60 * 1000 || Date.now() < state.issuedAt - 60_000) return null;
        return state;
    } catch { return null; }
}

export type CmsOAuthState = {
    spaceId: number;
    platform: string;
    userId: number;
    issuedAt: number;
    nonce: string;
};

export function signCmsOAuthState(state: CmsOAuthState): string {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const signature = crypto.createHmac('sha256', getJwtSecret()).update(`cms:${payload}`).digest('base64url');
    return `${payload}.${signature}`;
}

export function verifyCmsOAuthState(value: unknown): CmsOAuthState | null {
    if (typeof value !== 'string') return null;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', getJwtSecret()).update(`cms:${payload}`).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    try {
        const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CmsOAuthState;
        if (!state.spaceId || !state.platform || !Number.isFinite(state.issuedAt)) return null;
        if (Date.now() - state.issuedAt > 15 * 60 * 1000 || Date.now() < state.issuedAt - 60_000) return null;
        return state;
    } catch { return null; }
}

