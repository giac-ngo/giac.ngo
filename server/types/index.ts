// server/types/index.ts

export interface User {
    id: number;
    email: string;
    name: string;
    roleId?: number;
    spaceId?: number;
    passwordHash?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    status?: string;
    isActive?: boolean;
    isGlobalAdmin?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    role?: {
        id: number;
        name: string;
        permissions: string[];
    };
    permissions: string[];
    roleIds?: number[];
    ownedAis?: { aiConfigId: number; requestsRemaining: number }[];
    grantedAiConfigIds?: number[];
    dailyMsgUsed?: number;
    dailyLimitBonus?: number;
    requestsRemaining?: number;
    merits?: number;
    [key: string]: any;
}

declare global {
    namespace Express {
        interface Request {
            user?: User | null;
            files?: Express.Multer.File[];
        }
    }
}

export interface Space {
    id: number;
    userId?: number;
    slug?: string;
    name: string;
    description?: string;
    imageUrl?: string;
    membersCount?: number;
    views?: number;
    likes?: number;
    merits?: number;
    apiKeys?: Record<string, string>;
    guestMessageLimit?: number;
    guestDailyLimit?: number;
    [key: string]: any;
}

export interface AIConfig {
    id: number;
    spaceId?: number;
    ownerId?: number;
    name: string;
    description?: string;
    avatarUrl?: string;
    modelType: 'gemini' | 'gpt' | 'grok' | 'vertex';
    modelName?: string;
    isPublic?: boolean;
    views?: number;
    likes?: number;
    trainingContent?: string;
    purchaseCost?: number;
    meritCost?: number;
    baseDailyLimit?: number;
    isContactForAccess?: boolean;
    maxOutputTokens?: number;
    thinkingBudget?: number;
    [key: string]: any;
}

export interface Comment {
    id: number;
    userId: number;
    commentType: string;
    sourceId: string;
    content: string;
    status: string;
    createdAt?: Date | string;
    userName?: string;
    userAvatarUrl?: string;
    [key: string]: any;
}

export interface DharmaTalk {
    id: number;
    spaceId?: number;
    title: string;
    speaker?: string;
    url?: string;
    status?: string;
    likes?: number;
    views?: number;
    [key: string]: any;
}
