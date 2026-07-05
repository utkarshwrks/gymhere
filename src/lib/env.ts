import { z } from "zod";

/**
 * Env is validated but tolerant: in demo mode services may be unconfigured
 * (placeholder keys). Feature code checks `isConfigured.*` before calling out.
 * Production swaps real keys — no code changes. See BUILD-PLAN.md §2.
 */
const schema = z.object({
  APP_MODE: z.enum(["demo", "production"]).default("demo"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().optional(),

  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),

  RAZORPAY_MODE: z.enum(["test", "live"]).default("test"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  UPLOADTHING_TOKEN: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("GymHere <noreply@gymhere.app>"),

  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  CRON_SECRET: z.string().optional(),

  // 32-byte key (hex or base64) for AES-256-GCM encryption of tenant credentials.
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export const env = schema.parse(process.env);

export const isDemo = env.APP_MODE === "demo";

function real(v: string | undefined): boolean {
  return !!v && !/^(pk_test_xxx|sk_test_xxx|.*_xxx|xxx)$/i.test(v) && !v.includes("xxxx");
}

export const isConfigured = {
  db: real(env.DATABASE_URL),
  clerk: real(env.CLERK_SECRET_KEY) && real(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  razorpay: real(env.RAZORPAY_KEY_ID) && real(env.RAZORPAY_KEY_SECRET),
  uploadthing: real(env.UPLOADTHING_TOKEN),
  resend: real(env.RESEND_API_KEY),
  upstash: real(env.UPSTASH_REDIS_REST_URL) && real(env.UPSTASH_REDIS_REST_TOKEN),
} as const;
