import z from 'zod';

const envSchema = z.object({
    BOT_TOKEN: z.string(),
    WEBHOOK_URL: z.string().url().optional(),
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    MONGODB_URI: z.string().min(1),

    REDIS_URL: z.string().min(1),

    OPENROUTER_API_KEY: z.string().min(1),

    ENCRYPTION_KEY: z.string().length(64),

    SUPER_ADMIN_IDS: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;