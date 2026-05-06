// server/services/payosService.ts
import { Request, Response, NextFunction } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PayOS } = require('@payos/node');

interface PayOSCredentials {
    clientId: string;
    apiKey: string;
    checksumKey: string;
}

interface PaymentData {
    orderCode: number;
    amount: number;
    description: string;
    cancelUrl: string;
    returnUrl: string;
    planId?: number | string;
    userId?: number | string;
}

/**
 * Create a PayOS client using credentials from a space
 */
export function createPayOSClient({ clientId, apiKey, checksumKey }: PayOSCredentials) {
    if (!clientId || !apiKey || !checksumKey) {
        throw new Error('PayOS credentials are not configured for this space.');
    }
    // PayOS constructor requires an options object
    return new PayOS({ clientId, apiKey, checksumKey });
}

/**
 * Create a PayOS payment link
 * @param credentials - { clientId, apiKey, checksumKey }
 * @param paymentData - { orderCode, amount, description, cancelUrl, returnUrl, planId, userId }
 * @returns Promise<{ checkoutUrl: string, paymentLinkId: string }>
 */
export async function createPaymentLink(credentials: PayOSCredentials, { orderCode, amount, description, cancelUrl, returnUrl, planId, userId }: PaymentData) {
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
export function verifyWebhook(payos: any, body: Record<string, any>) {
    return payos.webhooks.verify(body);
}
