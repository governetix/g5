// OpenTelemetry bootstrap (conditional) must be first to patch modules
if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT && process.env.OTEL_DISABLED !== 'true') {
  void import('./telemetry/otel.bootstrap').catch((e) =>
    console.error('[otel] dynamic import failed', e),
  );
}
// Prevent accidental .env usage in production (basic check)
if (process.env.NODE_ENV === 'production') {
  void import('fs').then((fs) => {
    if (fs.existsSync('.env')) {
      console.error('Refusing to start: .env file present in production environment');
      process.exit(1);
    }
  });
}
import { NestFactory } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import type { Express } from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet, { HelmetOptions } from 'helmet';
import express from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ensureGlobalTenantHeader, ensureStandardErrorSchema } from './swagger/swagger-util';
import { CorrelationMiddleware } from './common/correlation/correlation.middleware';
import { z } from 'zod';

async function bootstrap() {
  // Environment validation (subset critical for startup)
  const EnvSchema = z.object({
    DB_HOST: z.string().optional(),
    DB_PORT: z.string().optional(),
    DB_NAME: z.string().optional(),
    DB_USER: z.string().optional(),
    DB_PASS: z.string().optional(),
    REDIS_URL: z.string().optional(),
    TENANT_RATE_LIMIT: z.string().regex(/^\d+$/).optional(),
    TENANT_RATE_WINDOW_SEC: z.string().regex(/^\d+$/).optional(),
    ENABLE_BACKUPS: z.enum(['true','false']).optional(),
  });
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten());
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Body size limit (default 1mb) configurable via BODY_LIMIT
  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
  // LoggerModule provides a logger automatically; register correlation middleware early
  const corr = new CorrelationMiddleware();
  app.use((req: Request & { correlationId?: string }, res: Response, next: NextFunction) =>
    corr.use(req, res, next),
  );
  // Dynamic CORS whitelist
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  let corsOrigins:
    | true
    | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void) =
    true;
  if (allowedOriginsEnv) {
    const list = allowedOriginsEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    corsOrigins = (origin, cb) => {
      if (!origin || list.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    };
  }
  app.enableCors({ origin: corsOrigins, credentials: true });
  // Security headers via helmet with optional CSP, HSTS, COOP/COEP toggles
  const enableHsts = (process.env.ENABLE_HSTS || '').toLowerCase() === 'true';
  const enableCOOP = (process.env.ENABLE_COOP || '').toLowerCase() === 'true';
  const enableCOEP = (process.env.ENABLE_COEP || '').toLowerCase() === 'true';
  const cspDefault =
    process.env.CSP_DEFAULT ||
    "default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests";
  const helmetOptions: HelmetOptions = {
    contentSecurityPolicy: process.env.DISABLE_CSP
      ? false
      : {
          useDefaults: false,
          directives: parseCspDirectives(cspDefault),
        },
    crossOriginOpenerPolicy: enableCOOP ? { policy: 'same-origin' } : false,
    crossOriginEmbedderPolicy: enableCOEP ? true : false,
    hsts: enableHsts ? { maxAge: 31536000, includeSubDomains: true } : false,
  };
  app.use(helmet(helmetOptions));
  // Remove powered-by
  const instance = app.getHttpAdapter().getInstance() as Express;
  instance.disable('x-powered-by');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('G5 Core API')
    .setDescription('Core multi-tenant SaaS API')
    .setVersion('1.0.0')
    .addServer('/v1', 'Version 1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token (Authorization: Bearer <token>)',
      },
      'jwt',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API-Key',
        description: 'API Key (Authorization: Bearer gk_xxx...)',
      },
      'apiKey',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Tenant-Id',
        description: 'Tenant context (required for most endpoints)',
      },
      'tenant',
    )
    .addTag('auth', 'Authentication & session management')
    .addTag('tenants', 'Tenant management')
    .addTag('projects', 'Projects & related assets')
    .addTag('assets', 'Assets')
    .addTag('api-keys', 'API Keys management')
    .addTag('memberships', 'Tenant memberships & invitations')
    .addTag('webhooks', 'Outgoing webhooks')
    .addTag('themes', 'Themes / customization')
    .build();
  const doc = SwaggerModule.createDocument(app, config, { extraModels: [], deepScanRoutes: true });
  ensureGlobalTenantHeader(doc, { requiredTagsExclude: ['auth'] });
  ensureStandardErrorSchema(doc);
  SwaggerModule.setup('docs', app, doc);

  app.setGlobalPrefix('v1', { exclude: ['health', 'docs', 'metrics'] });
  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
}
void bootstrap();

function parseCspDirectives(csp: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  for (const seg of csp.split(';')) {
    const s = seg.trim();
    if (!s) continue;
    const [k, ...rest] = s.split(/\s+/);
    if (!k) continue;
    directives[k] = rest;
  }
  return directives;
}
