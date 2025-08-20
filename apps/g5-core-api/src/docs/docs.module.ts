import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { AssetsModule } from '../assets/assets.module';
// NOTE: We intentionally do NOT import JobsModule / Bull / DB layer here.
@Module({
  imports: [
    // These modules may internally require DB; to truly skip DB, a further refactor would isolate controllers.
    // For now we rely on environment SKIP_DB logic (TypeOrm imports conditional) already added.
    AuthModule,
    WebhooksModule,
    ApiKeysModule,
    TenantsModule,
    UsersModule,
    ProjectsModule,
    AssetsModule,
  ],
})
export class DocsModule {}
