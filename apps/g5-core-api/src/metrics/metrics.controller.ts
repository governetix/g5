import { Controller, Get, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metrics: MetricsService) {}
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metricsEndpoint(@Res() res: Response) {
    const output = await this.metrics.registry.metrics();
    res.send(output);
  }
}
