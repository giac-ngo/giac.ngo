// server/services/payosService.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PayOS } = require('@payos/node');

/**
 * Create a PayOS client using credentials from a space
 */
export function createPayOSClient({ clientId, apiKey, checksumKey }) {
    if (!clientId || !apiKey || !checksumKey) {
        throw new Error('PayOS credentials are not configured for this space.');
    }
    // PayOS constructor requires an options object
    return new PayOS({ clientId, apiKey, checksumKey });
}

/**
 * Create a PayOS payment link
 * @param {object} credentials - { clientId, apiKey, checksumKey }
 * @param {object} paymentData - { orderCode, amount, description, cancelUrl, returnUrl, planId, userId }
 * @returns {Promise<{ checkoutUrl: string, paymentLinkId: string }>}
 */
export async function createPaymentLink(credentials, { orderCode, amount, description, cancelUrl, returnUrl, planId, userId }) {
    const payos = createPayOSClient(credentials);

    // PayOS requires amount in VND as a positive integer
    const amountInt = Math.max(1, Math.round(Number(amount) || 1));

    const payload = {
        orderCode,
        amount: amountInt,
        description,   // max 25 chars, no special chars – used for webhook matching
        items: [
            {
                name: description,
                quantity: 1,
                price: amountInt,   // must equal amount
            }
        ],
        cancelUrl,
        returnUrl,
        // Note: buyerNote is NOT supported in this PayOS API version
    };
    const link = await payos.paymentRequests.create(payload);
    return { checkoutUrl: link.checkoutUrl, paymentLinkId: link.paymentLinkId, orderCode };
}

/**
 * Verify webhook data from PayOS
 */
export function verifyWebhook(payos, body) {
    return payos.webhooks.verify(body);
}
