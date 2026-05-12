// server/utils/getApiKeyForAi.ts
import { AIConfig } from '../types/index.js';
import { spaceModel } from '../models/space.model.js';
import { userModel } from '../models/user.model.js';
import { systemModel } from '../models/system.model.js';

/**
 * Retrieves the API key for a specific AI model type.
 * Lookup chain:
 * 1. Space.apiKeys[provider] (if AI belongs to a space)
 * 2. Owner.apiKeys[provider] (fallback to creator's personal key)
 * 3. System.systemKeys[provider] (final fallback)
 */
export async function getApiKeyForAi(aiConfig: AIConfig, providerOverride?: string): Promise<string> {
    const provider = providerOverride || aiConfig.modelType;

    // 1. Try Space API Keys
    if (aiConfig.spaceId) {
        const space = await spaceModel.findById(aiConfig.spaceId);
        if (space?.apiKeys?.[provider]) {
            return space.apiKeys[provider];
        }
    }

    // 2. Fallback: Owner's personal keys
    if (aiConfig.ownerId) {
        const owner = await userModel.findById(aiConfig.ownerId);
        if (owner?.apiKeys?.[provider]) {
            return owner.apiKeys[provider];
        }
    }

    // 3. Fallback: System keys
    const systemConfig = await systemModel.getConfig();
    const systemKey = systemConfig?.systemKeys?.[provider];
    if (systemKey) {
        return systemKey;
    }

    // 4. Ultimate fallback (Environment variable - useful for local dev)
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`] || process.env[`VITE_${provider.toUpperCase()}_API_KEY`];
    if (envKey) {
        return envKey;
    }

    throw new Error(`API Key for ${provider.toUpperCase()} not configured in Space, Owner, or System.`);
}
