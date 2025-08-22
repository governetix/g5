import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProjectsModule } from './projects/projects.module';
import { AssetsModule } from './assets/assets.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { MembershipsModule } from './memberships/memberships.module';
import { UsersModule } from './users/users.module';
import { ThemesModule } from './themes/themes.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
// Removed unused direct entity imports (autoLoadEntities handles discovery)
import { getTraceId } from './common/correlation/correlation.provider';
import { EntitiesModule } from './entities/entities.module';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ApiKeyAuthGuard } from './common/guards/api-key.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuditLogModule } from './audit/audit-log.module';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerExceptionGuard } from './common/guards/throttler-ex.guard';
import { JobsModule } from './jobs/jobs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EventsModule } from './events/events.module';
import { MetricsModule } from './metrics/metrics.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';
import { TenantRateLimitGuard } from './common/rate-limit/tenant-rate.guard';
import { BullModule } from '@nestjs/bullmq';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { QueueStubsModule } from './queues/queue-stubs.module';

@Module({
  imports: [
    GConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
        customProps: () => {
          const traceId = getTraceId();
          return traceId ? { traceId } : {};
        },
      },
    }),
    AuthModule,
    TenantsModule,
    ProjectsModule,
    AssetsModule,
    ApiKeysModule,
    MembershipsModule,
    UsersModule,
    AuditLogModule,
    JobsModule,
    WebhooksModule,
    ThemesModule,
    EventsModule,
    MetricsModule,
    IdempotencyModule,
  FeatureFlagsModule,
    ...(process.env.SKIP_QUEUES === 'true'
      ? [QueueStubsModule]
      : [
          BullModule.forRootAsync({
            imports: [GConfigModule],
            useFactory: (cfg: ConfigService) => ({
              connection: {
                host: cfg.get<string>('REDIS_HOST') || '127.0.0.1',
                port: parseInt(cfg.get<string>('REDIS_PORT') || '6379', 10),
              },
            }),
            inject: [ConfigService],
          }),
        ]),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60, limit: 100 },
      { name: 'login', ttl: 60, limit: 10 },
      { name: 'register', ttl: 300, limit: 5 },
      { name: 'refresh', ttl: 60, limit: 30 },
      { name: 'logout', ttl: 60, limit: 30 },
      { name: 'invite', ttl: 3600, limit: 20 },
      { name: 'acceptInvite', ttl: 3600, limit: 10 },
      { name: 'forgotPassword', ttl: 1800, limit: 5 },
      { name: 'resetPassword', ttl: 600, limit: 10 },
    ]),
    ...(
      process.env.SKIP_DB === 'true'
        ? []
        : [
            TypeOrmModule.forRootAsync({
              imports: [GConfigModule],
              useFactory: (cfg: ConfigService) => {
                const password = (cfg.get<string>('DB_PASS') || '').trim();
                if (process.env.DB_DEBUG === 'true') {
                  // eslint-disable-next-line no-console
                  console.log('[DB_CONFIG]', {
                    host: cfg.get('DB_HOST'),
                    port: cfg.get('DB_PORT'),
                    user: cfg.get('DB_USER'),
                    passLen: password.length,
                    db: cfg.get('DB_NAME'),
                  });
                }
                return {
                  type: 'postgres',
                  host: cfg.get('DB_HOST') || '127.0.0.1',
                  port: parseInt(cfg.get('DB_PORT') ?? '5432', 10),
                  username: cfg.get('DB_USER'),
                  password,
                  database: cfg.get('DB_NAME'),
                  autoLoadEntities: true,
                  synchronize: false,
                  migrationsRun: true,
                  migrations: [__dirname + '/migrations/*.{ts,js}'],
                  retryAttempts: 2,
                  logging: ['error'],
                };
              },
              inject: [ConfigService],
            }),
          ]
    ),
    EntitiesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerExceptionGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_GUARD, useClass: PermissionsGuard },
    {
      provide: APP_GUARD,
      useClass: ApiKeyAuthGuard,
    },
    { provide: APP_GUARD, useClass: TenantRateLimitGuard },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
