// server/utils/exchangeRate.ts
// Fetches USD/VND rate from open.er-api.com (free, no API key needed)
// Caches result for 1 hour to avoid excessive requests
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

let cachedRate: number | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 25000;

export async function getUsdVndRate(): Promise<number> {
    const now = Date.now();
    if (cachedRate && now < cacheExpiry) {
        return cachedRate;
    }

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rate = data?.rates?.VND;
        if (!rate || typeof rate !== 'number' || rate < 1000) {
            throw new Error('Invalid rate');
        }
        cachedRate = Math.round(rate);
        cacheExpiry = now + CACHE_TTL_MS;
        logger.info(`[ExchangeRate] USD/VND rate updated: ${cachedRate}`);
        return cachedRate;
    } catch (err: unknown) {
        logger.warn(`[ExchangeRate] Failed to fetch rate, using fallback ${FALLBACK_RATE}:`, (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) : String(err)) : String(err)));
        // Cache fallback for 5 min so we don't spam on errors
        cachedRate = FALLBACK_RATE;
        cacheExpiry = now + 5 * 60 * 1000;
        return FALLBACK_RATE;
    }
}
