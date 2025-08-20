import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi, { ObjectSchema } from 'joi';

// Centralized environment validation & default values
// Allow skipping hard DB/Redis requirements when generating docs (SKIP_DB / SKIP_QUEUES)
const skipDb = process.env.SKIP_DB === 'true';
const skipQueues = process.env.SKIP_QUEUES === 'true';

const baseSchema: Record<string, any> = {
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  PUBLIC_BASE_URL: Joi.string().uri().optional(),
  ENABLE_BACKUPS: Joi.string().valid('true', 'false').default('false'),
  BACKUP_RETENTION_DAYS: Joi.number().default(7),
  AUDIT_RETENTION_DAYS: Joi.number().default(30),
  REVOKED_TOKEN_RETENTION_DAYS: Joi.number().default(30),
  TENANT_RATE_LIMIT: Joi.number().default(600),
  TENANT_RATE_WINDOW_SEC: Joi.number().default(60),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().optional(),
  OTEL_SERVICE_NAME: Joi.string().optional(),
  OTEL_DISABLED: Joi.string().valid('true', 'false').optional(),
};

if (skipDb) {
  baseSchema.DB_HOST = Joi.string().default('localhost');
  baseSchema.DB_PORT = Joi.number().default(5432);
  baseSchema.DB_USER = Joi.string().default('dummy');
  baseSchema.DB_PASS = Joi.string().default('dummy');
  baseSchema.DB_NAME = Joi.string().default('dummy');
} else {
  baseSchema.DB_HOST = Joi.string().required();
  baseSchema.DB_PORT = Joi.number().default(5432);
  baseSchema.DB_USER = Joi.string().required();
  baseSchema.DB_PASS = Joi.string().required();
  baseSchema.DB_NAME = Joi.string().required();
}

if (skipQueues) {
  baseSchema.REDIS_HOST = Joi.string().default('localhost');
  baseSchema.REDIS_PORT = Joi.number().default(6379);
} else {
  baseSchema.REDIS_HOST = Joi.string().default('localhost');
  baseSchema.REDIS_PORT = Joi.number().default(6379);
}

const validationSchema: ObjectSchema = Joi.object(baseSchema);
@Module({
  imports: [
  ConfigModule.forRoot({ isGlobal: true, validationSchema }),
  ],
})
export class GConfigModule {}
