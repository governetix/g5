import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('feature-flags')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private svc: FeatureFlagsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Roles('OWNER', 'ADMIN')
  @Patch()
  set(@Body() body: { key: string; enabled: boolean; description?: string }) {
    return this.svc.upsert(body.key, body.enabled, body.description);
  }
}
