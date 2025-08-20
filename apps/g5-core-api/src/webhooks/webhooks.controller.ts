import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { DlqJobData } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AppRequest } from '../types/request-context';

@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  @Get()
  list(
    @Req() req: AppRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('sort') sort?: string,
  ) {
    const q =
      limit || cursor || sort
        ? { limit: limit ? parseInt(limit, 10) : undefined, cursor, sort }
        : undefined;
    return this.svc.list(req.user!.tenantId, q);
  }

  @Post()
  create(@Req() req: AppRequest, @Body() body: { url: string; events: string[]; secret?: string }) {
    return this.svc.create(req.user!.tenantId, body.url, body.events, body.secret);
  }

  @Patch(':id')
  update(
    @Req() req: AppRequest,
    @Param('id') id: string,
    @Body() body: { url?: string; events?: string[]; rotateSecret?: boolean },
  ) {
    return this.svc.update(req.user!.tenantId, id, body);
  }

  @Delete(':id')
  disable(@Req() req: AppRequest, @Param('id') id: string) {
    return this.svc.disable(req.user!.tenantId, id);
  }

  @Get('dlq')
  listDlq(@Req() req: AppRequest): Promise<Array<{ id: string | number | null; data: DlqJobData }>> {
    return this.svc.listDlq(req.user!.tenantId);
  }

  @Post('dlq/:jobId/replay')
  replay(@Req() req: AppRequest, @Param('jobId') jobId: string): Promise<{ replayed: boolean }> {
    return this.svc.replayFromDlq(req.user!.tenantId, jobId);
  }
}
