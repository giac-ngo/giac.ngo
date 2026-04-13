import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Better Auth Core Tables ───

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").notNull().default("temple_admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ─── Better Auth Organization Plugin Tables ───

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("invitation_organizationId_idx").on(table.organizationId)]
);

// ─── Leads Table (unchanged) ───

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  interests: text("interests"),
  package: text("package").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // ─── Billing columns ───
  paymentStatus: text("payment_status").default("unpaid"),
  planTier: text("plan_tier"),
  monthlyAmount: integer("monthly_amount"),
  nextBillingDate: timestamp("next_billing_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  notes: text("notes"),
});

// ─── Subscriptions Table (synced from Autumn webhooks) ───

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(), // basic, standard, premium
    productName: text("product_name"),
    status: text("status").notNull().default("active"), // active, scheduled, cancelled, expired, past_due
    scenario: text("scenario"), // new, upgrade, downgrade, renew, cancel, expired, past_due, scheduled
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    scheduledProductId: text("scheduled_product_id"), // For scheduled downgrades
    scheduledProductName: text("scheduled_product_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscriptions_userId_idx").on(table.userId),
    index("subscriptions_productId_idx").on(table.productId),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  paymentStatus: true,
  planTier: true,
  monthlyAmount: true,
  nextBillingDate: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  notes: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type User = typeof user.$inferSelect;

export const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  paymentStatus: z.enum(["unpaid", "active", "overdue", "cancelled"]).optional(),
  planTier: z.enum(["basic", "standard", "premium"]).optional(),
  monthlyAmount: z.number().int().positive().optional(),
  nextBillingDate: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  notes: z.string().optional(),
});

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  email: z.email("Invalid email address").max(255),
  role: z.string().max(255).optional().default(""),
  organizationName: z.string().max(255).optional().default(""),
  organizationType: z.string().max(100).optional().default(""),
  communitySize: z.string().max(50).optional().default(""),
  message: z.string().max(5000).optional().default(""),
});

// ─── Giác Ngộ Sync Log Table ───

export const giacNgoSyncLog = pgTable(
  "giac_ngo_sync_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: text("payload").notNull(),
    responseOk: boolean("response_ok").notNull(),
    responseStatus: integer("response_status"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("giac_ngo_sync_log_userId_idx").on(table.userId),
    index("giac_ngo_sync_log_createdAt_idx").on(table.createdAt),
  ]
);

export type GiacNgoSyncLog = typeof giacNgoSyncLog.$inferSelect;
export type InsertGiacNgoSyncLog = typeof giacNgoSyncLog.$inferInsert;

// ─── Temple Onboarding Table ───

export const templeOnboarding = pgTable(
  "temple_onboarding",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    templeName: text("temple_name").notNull().default(""),
    tradition: text("tradition").notNull().default("[]"),
    location: text("location"),
    language: text("language").notNull().default("vi"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    theme: text("theme"),
    contentDriveUrl: text("content_drive_url"),
    spaceType: text("space_type").notNull().default("dedicated"),
    customDomain: text("custom_domain"),
    existingWebsite: text("existing_website"),
    doctrinalMode: text("doctrinal_mode"),
    responseStyle: text("response_style"),
    aiNotes: text("ai_notes"),
    notes: text("notes"),
    status: text("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("temple_onboarding_userId_idx").on(table.userId),
    index("temple_onboarding_status_idx").on(table.status),
  ]
);

export type TempleOnboarding = typeof templeOnboarding.$inferSelect;
export type InsertTempleOnboarding = typeof templeOnboarding.$inferInsert;

export const onboardingSchema = z.object({
  templeName: z.string().max(255).optional(),
  tradition: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
  language: z.enum(["vi", "en"]).optional(),
  logoUrl: z.string().max(3_000_000).optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  theme: z.string().max(50).optional().nullable(),
  contentDriveUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  spaceType: z.enum(["dedicated", "full-whitelabel"]).optional(),
  customDomain: z.string().max(255).optional().nullable(),
  existingWebsite: z.string().max(500).optional().nullable(),
  doctrinalMode: z.string().max(50).optional().nullable(),
  responseStyle: z.string().max(50).optional().nullable(),
  aiNotes: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// ─── Temple API Keys Table ───

export const templeApiKeys = pgTable(
  "temple_api_keys",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    apiKey: text("api_key").notNull().unique(),
    domain: text("domain"), // client website domain
    label: text("label"), // friendly name e.g. "Production"
    revokedAt: timestamp("revoked_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("temple_api_keys_userId_idx").on(table.userId),
    index("temple_api_keys_apiKey_idx").on(table.apiKey),
  ]
);

export type TempleApiKey = typeof templeApiKeys.$inferSelect;
export type InsertTempleApiKey = typeof templeApiKeys.$inferInsert;

// ─── Temple Site Metrics Table ───

export const templeSiteMetrics = pgTable(
  "temple_site_metrics",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(), // snapshot date
    // User metrics
    totalUsers: integer("total_users").notNull().default(0),
    paidUsers: integer("paid_users").notNull().default(0),
    activeUsers: integer("active_users").notNull().default(0), // active in last 30 days
    newUsersToday: integer("new_users_today").notNull().default(0),
    // Engagement metrics
    totalSessions: integer("total_sessions").notNull().default(0),
    pageViews: integer("page_views").notNull().default(0),
    avgSessionDuration: integer("avg_session_duration").notNull().default(0), // seconds
    // Content metrics
    totalSutras: integer("total_sutras").notNull().default(0),
    totalDharmaContent: integer("total_dharma_content").notNull().default(0),
    aiConversations: integer("ai_conversations").notNull().default(0),
    // Revenue metrics
    monthlyRevenue: integer("monthly_revenue").notNull().default(0), // cents
    totalDonations: integer("total_donations").notNull().default(0), // cents
    // Storage
    storageUsedMb: integer("storage_used_mb").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("temple_site_metrics_userId_idx").on(table.userId),
    index("temple_site_metrics_date_idx").on(table.date),
    index("temple_site_metrics_userId_date_idx").on(table.userId, table.date),
  ]
);

export type TempleSiteMetrics = typeof templeSiteMetrics.$inferSelect;
export type InsertTempleSiteMetrics = typeof templeSiteMetrics.$inferInsert;

// ─── Plan Limits Configuration ───

export const PLAN_LIMITS: Record<string, {
  maxUsers: number;
  maxStorageMb: number;
  maxAiConversations: number;
  maxDharmaContent: number;
  maxSutras: number;
  label: string;
}> = {
  basic: {
    maxUsers: 100,
    maxStorageMb: 500,
    maxAiConversations: 500,
    maxDharmaContent: 50,
    maxSutras: 20,
    label: "Lay Practitioner",
  },
  standard: {
    maxUsers: 500,
    maxStorageMb: 2000,
    maxAiConversations: 2000,
    maxDharmaContent: 200,
    maxSutras: 100,
    label: "Devoted Practitioner",
  },
  premium: {
    maxUsers: -1, // unlimited
    maxStorageMb: 10000,
    maxAiConversations: -1,
    maxDharmaContent: -1,
    maxSutras: -1,
    label: "Sangha Community",
  },
};

// Zod schema for metrics push from client sites
export const siteMetricsPushSchema = z.object({
  totalUsers: z.number().int().min(0),
  paidUsers: z.number().int().min(0),
  activeUsers: z.number().int().min(0),
  newUsersToday: z.number().int().min(0),
  totalSessions: z.number().int().min(0),
  pageViews: z.number().int().min(0),
  avgSessionDuration: z.number().int().min(0),
  totalSutras: z.number().int().min(0),
  totalDharmaContent: z.number().int().min(0),
  aiConversations: z.number().int().min(0),
  monthlyRevenue: z.number().int().min(0),
  totalDonations: z.number().int().min(0),
  storageUsedMb: z.number().int().min(0),
});

// ─── Temple External API Configuration Table ───

export const templeExternalApis = pgTable(
  "temple_external_apis",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    templeName: text("temple_name").notNull(),
    slug: text("slug").notNull().unique(), // e.g., "tathata"
    baseUrl: text("base_url").notNull(), // e.g., "https://tathata.bodhilab.io"
    statsEndpoint: text("stats_endpoint").notNull().default("/api/dashboard/stats"),
    authType: text("auth_type").notNull().default("bearer"), // bearer, api_key, none
    authToken: text("auth_token"), // encrypted token
    isActive: boolean("is_active").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at"),
    lastSyncStatus: text("last_sync_status"), // success, error
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("temple_external_apis_userId_idx").on(table.userId),
    index("temple_external_apis_slug_idx").on(table.slug),
  ]
);

export type TempleExternalApi = typeof templeExternalApis.$inferSelect;
export type InsertTempleExternalApi = typeof templeExternalApis.$inferInsert;

export const templeExternalApiSchema = z.object({
  templeName: z.string().min(1).max(255),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  baseUrl: z.string().url().max(500),
  statsEndpoint: z.string().max(255).default("/api/dashboard/stats"),
  authType: z.enum(["bearer", "api_key", "none"]).default("bearer"),
  authToken: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

// ─── Temple External API Cached Stats Table ───

export const templeExternalStats = pgTable(
  "temple_external_stats",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    apiId: varchar("api_id")
      .notNull()
      .references(() => templeExternalApis.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    // Cached stats from external API
    totalUsers: integer("total_users").default(0),
    paidUsers: integer("paid_users").default(0),
    activeUsers: integer("active_users").default(0),
    totalSessions: integer("total_sessions").default(0),
    pageViews: integer("page_views").default(0),
    aiConversations: integer("ai_conversations").default(0),
    monthlyRevenue: integer("monthly_revenue").default(0),
    totalDonations: integer("total_donations").default(0),
    storageUsedMb: integer("storage_used_mb").default(0),
    // Raw response for debugging
    rawResponse: text("raw_response"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("temple_external_stats_apiId_idx").on(table.apiId),
    index("temple_external_stats_date_idx").on(table.date),
  ]
);

export type TempleExternalStats = typeof templeExternalStats.$inferSelect;
export type InsertTempleExternalStats = typeof templeExternalStats.$inferInsert;
