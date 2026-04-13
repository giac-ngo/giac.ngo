// server/utils/exchangeRate.js
// Fetches USD/VND rate from open.er-api.com (free, no API key needed)
// Caches result for 1 hour to avoid excessive requests

let cachedRate = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 25000;

export async function getUsdVndRate() {
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
        console.log(`[ExchangeRate] USD/VND rate updated: ${cachedRate}`);
        return cachedRate;
    } catch (err) {
        console.warn(`[ExchangeRate] Failed to fetch rate, using fallback ${FALLBACK_RATE}:`, err.message);
        // Cache fallback for 5 min so we don't spam on errors
        cachedRate = FALLBACK_RATE;
        cacheExpiry = now + 5 * 60 * 1000;
        return FALLBACK_RATE;
    }
}
