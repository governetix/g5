import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { correlationStorage } from './correlation.provider';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const incoming = (req.headers['x-correlation-id'] as string) || uuid();
    req.correlationId = incoming;
    res.setHeader('X-Correlation-Id', incoming);
    correlationStorage.run({ traceId: incoming }, () => next());
  }
}
