import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('queues')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('queues')
export class QueuesController {
  constructor(@InjectQueue('webhooks-dlq') private dlq: Queue) {}

  @Get('webhooks-dlq')
  @Permissions('queue.dlq.read')
  async listDlq() {
    const jobs = await this.dlq.getJobs(['waiting', 'delayed', 'failed'], 0, 100);
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      attemptsMade: j.attemptsMade,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
      data: j.data,
    }));
  }

  @Post('webhooks-dlq/:id/retry')
  @Permissions('queue.dlq.retry')
  async retryJob(@Param('id') id: string) {
    const job = await this.dlq.getJob(id);
    if (!job) return { success: false, message: 'Job not found' };
    await job.retry();
    return { success: true };
  }
}
