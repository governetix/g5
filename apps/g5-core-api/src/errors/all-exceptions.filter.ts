import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes } from './error-codes';
import { getTraceId } from '../common/correlation/correlation.provider';
import { AppException } from './app-exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = ErrorCodes.UNKNOWN;
    let details: string[] | undefined = undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      const resp: any = exception.getResponse();
      message = resp?.message || message;
      code = resp?.code || exception.code || code;
      if (resp?.details && Array.isArray(resp.details)) details = resp.details.map(String);
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else if (typeof r === 'object' && r) {
        const maybeMsg = (r as { message?: unknown }).message;
        if (Array.isArray(maybeMsg)) {
          details = maybeMsg.map(String);
          message = 'Validation failed';
          code = ErrorCodes.VALIDATION;
        } else if (typeof maybeMsg === 'string') {
          message = maybeMsg;
        }
      }
      code = mapStatusToCode(status, code);
    } else if (isPgUniqueViolation(exception)) {
      status = HttpStatus.CONFLICT;
      code = ErrorCodes.CONFLICT;
      message = 'Resource conflict';
    } else if (isTypeOrmQueryFailedError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query failed';
    }

    const traceId =
      getTraceId() ||
      request.correlationId ||
      (request.headers['x-correlation-id'] as string | undefined) ||
      undefined;
    const body: {
      success: false;
      code: ErrorCodes;
      message: string;
      details?: string[];
      traceId?: string;
      status: number;
    } = {
      success: false,
      code,
      message,
      status,
      ...(details ? { details } : {}),
      ...(traceId ? { traceId } : {}),
    }; // do not expose stack
    response.status(status).json(body);
  }
}

function mapStatusToCode(status: number, fallback: ErrorCodes): ErrorCodes {
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION;
    case 401:
      return ErrorCodes.AUTH_UNAUTHORIZED;
    case 403:
      return ErrorCodes.AUTH_FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 409:
      return ErrorCodes.CONFLICT;
    case 413:
      return ErrorCodes.PAYLOAD_TOO_LARGE;
    case 429:
      return ErrorCodes.RATE_LIMIT;
    default:
      return fallback;
  }
}

function isPgUniqueViolation(e: unknown): e is { code?: string } {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === '23505';
}

function isTypeOrmQueryFailedError(e: unknown): e is { name?: string } {
  return (
    typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'QueryFailedError'
  );
}
