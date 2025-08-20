import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DocsModule } from '../src/docs/docs.module';
import { ensureGlobalTenantHeader, ensureStandardErrorSchema } from '../src/swagger/swagger-util';
import fs from 'fs';

(async () => {
  process.env.SKIP_DB = 'true';
  process.env.SKIP_QUEUES = 'true';
  const app = await NestFactory.create(DocsModule, { logger: false });
  const cfg = new DocumentBuilder()
    .setTitle('G5 Core API')
    .setDescription('Core multi-tenant SaaS API')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Tenant-Id' }, 'tenant')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });
  ensureGlobalTenantHeader(doc, { requiredTagsExclude: ['auth'] });
  ensureStandardErrorSchema(doc);
  fs.mkdirSync('openapi', { recursive: true });
  fs.writeFileSync('openapi/openapi.json', JSON.stringify(doc, null, 2));
  await app.close();
  console.log('openapi/openapi.json written (lite)');
})();
