import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from './error-codes';

export class AppException extends HttpException {
  public readonly code: ErrorCodes;
  public readonly details?: string[];
  constructor(
    code: ErrorCodes,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    details?: string[],
  ) {
    super({ message, code, ...(details ? { details } : {}) }, status);
    this.code = code;
    this.details = details;
  }
}
