
// client/src/types.ts

export type ViewMode = 'chat' | 'meditationtimer' | 'community' | 'dharmatalks' | 'library' | 'about';

export interface LibraryFilters {
    typeId?: number;
    authorId?: number;
    topicId?: number;
    search?: string;
}


export interface Message {
  id?: string | number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  imageUrl?: string;
  fileAttachment?: {
    name: string;
    url: string;
  };
  thought?: string;
  feedback?: 'liked' | 'disliked' | null;
}

export type ModelType = 'gemini' | 'gpt' | 'grok' | 'vertex';

export interface AIConfig {
  id: string | number;
  spaceId: number | null;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  avatarUrl?: string;
  modelType: ModelType;
  modelName: string;
  trainingContent: string;
  suggestedQuestions: string[];
  suggestedQuestionsEn?: string[];
  tags: string[];
  isPublic: boolean;
  isContactForAccess?: boolean;
  purchaseCost?: number;
  oldPurchaseCost?: number;
  isOnSale?: boolean;
  requestsGrantedOnPurchase?: number;
  views?: number;
  likes?: number;
  rating?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number;
  isTrialAllowed: boolean;
  requiresSubscription: boolean;
  ownerId?: number;
  meritCost?: number;
  accessType?: 'free' | 'per_use_merit';
  baseDailyLimit?: number | null;
}

export interface User {
  id: number | 'new';
  email: string;
  name:string;
  avatarUrl: string;
  bio?: string;
  isActive: boolean;
  merits: number | null;
  ownedAis?: { aiConfigId: number; requestsRemaining: number; }[];
  grantedAiConfigIds?: number[];
  apiToken?: string;
  apiKeys?: {
    gemini?: string;
    geminiVoice?: string;
    gpt?: string;
    grok?: string;
    vertex?: string;
  };
  requestsRemaining: number;
  roleIds?: number[];
  permissions?: string[];
  template?: TemplateName;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  subscriptionPlanId?: number | null;
  dailyMsgUsed?: number;
  dailyLimitBonus?: number;
}

export interface Role {
    id: number | 'new';
    name: string;
    permissions: string[];
}

export interface Transaction {
    id: number;
    userId: number;
    userName?: string;
    adminId: number;
    adminName?: string;
    merits: number;
    timestamp: number;
    type: 'manual' | 'payment' | 'ai_purchase' | 'ai_usage' | 'offering' | 'withdrawal' | 'subscription' | 'crypto' | 'stripe' | 'stripe_deposit' | 'qr_offering';
    destinationSpaceId?: number;
    spaceName?: string;
    details?: {
      aiConfigId?: number;
      withdrawalRequestId?: number;
      message?: string;
    };
    stripeChargeId?: string;
}

export type TemplateName = 'giacngo';

export interface SystemConfig {
    guestMessageLimit: number;
    template: TemplateName;
    templateSettings: {
        [key in TemplateName]: {
            logoUrl: string;
        }
    };
    withdrawalSettings?: {
        minWithdrawal: number;
        holdDays: number;
    };
    platformFeePercent?: number;
}

export interface Conversation {
    id: number;
    userId: number | null;
    userName: string;
    aiConfigId: string | number;
    aiName?: string;
    startTime: number;
    messages: Message[];
    isTestChat?: boolean;
    isTrained?: boolean;
}

export interface PricingPlan {
    id: number | string;
    planName: string;
    planNameEn?: string;
    price: string;
    priceEn?: string;
    meritCost: number;
    requestLimit: number;
    aiConfigIds: number[];
    features: string[];
    featuresEn?: string[];
    isActive: boolean;
    dailyMsgLimit?: number;
    dailyLimitBonus?: number;
    durationDays?: number;
    imageUrl?: string;
    spaceId?: number | null;
}

export interface DashboardStats {
    totalUsers: number;
    totalAiConfigs: number;
    totalConversations: number;
    interactingUsers: number;
    topAIs: {
        name: string;
        avatarUrl: string;
        conversationCount: string;
        totalLikes: number;
        totalDislikes: number;
    }[];
    recentConversations: {
        id: number;
        userName: string;
        aiName: string;
        startTime: number;
    }[];
    totalDocuments: number;
    totalSpaces: number;
    totalDharmaTalks: number;
    topDocuments: {
        id: number;
        title: string;
        titleEn?: string;
        thumbnailUrl: string;
        views: number;
        likes: number;
    }[];
    topSpaces: {
        id: number;
        name: string;
        nameEn?: string;
        slug: string;
        imageUrl: string;
        membersCount: number;
        views: number;
        likes: number;
    }[];
    topDharmaTalks: {
        id: number;
        title: string;
        titleEn?: string;
        speaker: string;
        views: number;
        likes: number;
    }[];
}

export interface TrainingDataSource {
    id: number | 'new';
    aiConfigId: number | string;
    type: 'qa' | 'file' | 'document';
    question?: string;
    answer?: string;
    thought?: string;
    fileUrl?: string;
    fileName?: string;
    summary?: string;
    description?: string;
    createdAt?: string;
    isTrained?: boolean;
    indexedProviders?: string[]; // Changed from isIndexed to support multiple providers
    isIndexed?: boolean; // Keep for backward compatibility or generic logic
    lastExportedAt?: string;
    aiName?: string;
    documentId?: number; 
    documentName?: string;
}

export interface FineTuningJob {
    id: string;
    status: 'VALIDATING_FILES' | 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    fineTunedModelId?: string;
    createdAt: string;
}

export interface KoiiTask {
    id?: number;
    aiConfigId?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'idle';
    createdAt?: string;
    updatedAt: string;
    errorMessage?: string;
}

export interface DocumentAuthor {
    id: number;
    name: string;
    nameEn?: string;
    spaceId?: number | null;
}
export interface DocumentType {
    id: number;
    name: string;
    nameEn?: string;
    spaceId?: number | null;
}
export interface DocumentTopic {
    id: number;
    name: string;
    nameEn?: string;
    typeId: number | null;
    spaceId?: number | null;
    authorId?: number | null;
    numberIndex?: number | null;
}

export interface Document {
  id: number | 'new';
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  author: string;
  authorEn?: string;
  authorId: number;
  type: string;
  typeEn?: string;
  typeId: number;
  topic: string;
  topicEn?: string;
  topicId: number;
  spaceId?: number | null;
  spaceName?: string | null;
  spaceSlug?: string | null;
  content: string;
  contentEn?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  audioUrlEn?: string;
  duration?: number;
  createdAt: string;
  tags: string[];
  views?: number;
  likes?: number;
  rating?: number;
  comments?: Comment[];
  prevId?: number | null;
  nextId?: number | null;
  prevTitle?: string | null;
  nextTitle?: string | null;
  prevTitleEn?: string | null;
  nextTitleEn?: string | null;
}

export interface DocumentConfig {
    id: number;
    translationProvider: ModelType;
    translationModel: string;
    ttsProvider: ModelType;
    ttsModel: string;
    ttsVoice: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface QuotedPost {
  id: number;
  userId?: number | null;
  userName: string;
  userAvatarUrl?: string | null;
  content: string;
  imageUrls: string[];
  createdAt: string;
  metadata?: any;
}

export interface SocialPost {
  id: number;
  spaceId: number;
  userId: number | null;
  userName: string;
  userAvatarUrl?: string | null;
  content: string;
  imageUrls: string[];
  likesCount: number;
  commentsCount: number;
  retweetsCount?: number;
  isLikedByMe?: boolean;
  isFollowedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
  quotedPost?: QuotedPost | null;
  metadata?: {
    type: 'ai_share';
    aiName: string;
    userQuestion: string;
    aiResponse: string;
  } | null;
}

export interface SocialComment {
  id: number;
  postId: number;
  userId: number | null;
  userName: string;
  userAvatarUrl?: string | null;
  content: string;
  parentCommentId?: number | null;
  createdAt: string;
}

export interface Comment {
  id: number;
  userId: number;
  userName: string;
  userAvatarUrl?: string;
  commentType: 'document' | string;
  sourceId: string;
  sourceTitle?: string;
  parentId?: number | null;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SpaceType {
    id: number;
    name: string;
    nameEn?: string;
    icon: string;
}

export interface Space {
  id: number | 'new';
  userId: number | null;
  spaceSort?: number;
  slug: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl?: string;
  locationText?: string;
  locationTextEn?: string;
  membersCount?: number;
  views?: number;
  likes?: number;
  rating?: number;
  rank?: number;
  tags: string[];
  tagsEn?: string[];
  typeId?: number | null;
  spaceTypeName?: string;
  spaceTypeNameEn?: string;
  spaceTypeIcon?: string;
  spaceColor?: string;
  status: string;
  statusEn?: string;
  merits: number;
  meritsSold: number;
  event?: string;
  eventEn?: string;
  website?: string;
  phoneNumber?: string;
  email?: string;
  payosClientId?: string;
  payosApiKey?: string;
  payosChecksumKey?: string;
  stripeAccountId?: string;
  venmoHandle?: string;
  // Custom domain
  customDomain?: string;
  faviconUrl?: string;
  // Per-space mail server
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  // Feature toggles
  hasMeditation?: boolean;
  hasLibrary?: boolean;
  hasDharmaTalks?: boolean;
  smtpFromName?: string;
  emailTemplate?: string;
}

export interface SpacePage {
  id: number | 'new';
  spaceId: number;
  title: string;
  slug: string;
  pageType: 'home' | 'about' | 'contact' | 'custom';
  html?: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpacePageAsset {
  id: number;
  spaceId: number;
  fileType: 'css' | 'js' | 'image' | 'other';
  filename: string;
  url: string;
  createdAt?: string;
}

export interface DharmaTalk {
  id: number | 'new';
  spaceId: number | null;
  title: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  speaker?: string;
  speakerAvatarUrl?: string;
  url?: string;
  urlEn?: string;
  duration?: number;
  date?: string;
  views?: number;
  likes?: number;
  rating?: number;
  tags?: string[];
  tagsEn?: string[];
  status?: string;
  statusEn?: string;
  notifications?: number;
  createdAt?: string;
}

export interface MeditationSession {
  id: number;
  spaceId: number;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  audioUrl: string;
  audioUrlEn?: string;
  endAudioUrl?: string;
  endAudioUrlEn?: string;
  duration: number; // in seconds
  spaceName?: string;
}

export interface WithdrawalRequest {
  id: number;
  userId: number;
  userName?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  stripeTransferId?: string;
  spaceId?: number;
  spaceName?: string;
}

export interface SpaceOwnerData {
    totalEarnings: number;
    stripeAccountId?: string;
    ownedSpaces: { id: number; name: string }[];
    revenueHistory: Transaction[];
    withdrawalHistory: WithdrawalRequest[];
}

export interface OfferingPlan {
    id: string;
    name: string;
    headerSubtitle: string;
    subtitle: string;
    subtext: string;
    features: string[];
    buttonTextKey: string;
    isPopular?: boolean;
    topLabel?: string;
    suggestedAmount?: number;
}
