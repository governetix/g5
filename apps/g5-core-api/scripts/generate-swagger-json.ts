import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fs from 'fs';
import { AppModule } from '../src/app.module';
import { ensureGlobalTenantHeader, ensureStandardErrorSchema } from '../src/swagger/swagger-util';

(async () => {
  process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_USER = process.env.DB_USER || 'g5_user';
  process.env.DB_PASS = process.env.DB_PASS || 'g5_pass';
  process.env.DB_NAME = process.env.DB_NAME || 'g5_db';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const app = await NestFactory.create(AppModule, { logger: false });
  const cfg = new DocumentBuilder().setTitle('G5 Core API').setVersion('1.0.0').build();
  const doc = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });
  ensureGlobalTenantHeader(doc, { requiredTagsExclude: ['auth'] });
  ensureStandardErrorSchema(doc);
  fs.mkdirSync('openapi', { recursive: true });
  fs.writeFileSync('openapi/openapi.json', JSON.stringify(doc, null, 2));
  await app.close();
  console.log('openapi/openapi.json written');
})();
