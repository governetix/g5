import { Request } from 'express';
import { ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export function getUserId(user: AuthUser | undefined | null): string | undefined {
  if (!user) return undefined;
  return user.id; // Adjusted to return user.id since sub is not defined
}

export interface ApiKeyAuthContext {
  keyId: string;
  tenantId: string;
}

export interface AppRequest extends Request {
  user?: AuthUser;
  tenantId?: string;
  correlationId?: string;
  apiKeyAuth?: ApiKeyAuthContext;
}

export function getReq(context: ExecutionContext): AppRequest {
  return context.switchToHttp().getRequest<AppRequest>();
}
