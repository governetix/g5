import { z } from 'zod';

export const EnvSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().regex(/^\d+$/),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASS: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  TENANT_RATE_LIMIT: z.string().regex(/^\d+$/).default('600'),
  TENANT_RATE_WINDOW_SEC: z.string().regex(/^\d+$/).default('60'),
  ENABLE_BACKUPS: z.enum(['true','false']).default('false'),
  AUDIT_RETENTION_DAYS: z.string().regex(/^\d+$/).default('30'),
  REVOKED_TOKEN_RETENTION_DAYS: z.string().regex(/^\d+$/).default('30'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error('Invalid environment configuration: ' + JSON.stringify(parsed.error.flatten()));
  }
  return parsed.data;
}
