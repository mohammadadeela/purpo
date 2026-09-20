import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_MASTER_KEY: z.string().min(32),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_DEFAULT_MODEL: z.string().default("gpt-5"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_DEFAULT_MODEL: z.string().default("gemini-2.5-pro"),
  GEMINI_VIDEO_MODEL: z.string().default("veo-3.1-generate-preview"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_ANNUAL: z.string().optional(),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.url(),
  ADMIN_EMAIL: z.email().optional()
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
