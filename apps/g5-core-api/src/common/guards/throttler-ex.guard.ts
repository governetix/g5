import { ExecutionContext, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class ThrottlerExceptionGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    context: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse<Response>();
    const retryAfter = this.getRetryAfterSeconds();
    res.setHeader('Retry-After', retryAfter.toString());
    res.status(429).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded',
      retryAfter,
    });
    return Promise.resolve();
  }

  private getRetryAfterSeconds(): number {
    return 60;
  }
}
