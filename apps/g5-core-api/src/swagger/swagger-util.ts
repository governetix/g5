import { OpenAPIObject } from '@nestjs/swagger';

// Local light type aliases since @nestjs/swagger does not export these directly
interface OperationObjectLike {
  tags?: string[];
  parameters?: ParameterObjectLike[];
  responses?: Record<string, unknown>;
}
interface ParameterObjectLike {
  name: string;
  in: string;
  required?: boolean;
  schema?: unknown;
  description?: string;
}

interface EnsureTenantHeaderOptions {
  headerName?: string;
  description?: string;
  requiredTagsExclude?: string[]; // tags where header should NOT be auto-added (e.g., auth)
}

export function ensureGlobalTenantHeader(doc: OpenAPIObject, opts?: EnsureTenantHeaderOptions) {
  const headerName = opts?.headerName || 'X-Tenant-Id';
  const exclude = new Set((opts?.requiredTagsExclude || ['auth']).map((t) => t.toLowerCase()));
  const paramTemplate: ParameterObjectLike = {
    name: headerName,
    in: 'header',
    required: true,
    schema: { type: 'string' },
    description:
      opts?.description ||
      'Tenant ID (omit only for auth/login/register/health/docs/metrics endpoints)',
  };
  for (const pathKey of Object.keys(doc.paths || {})) {
    const item = doc.paths[pathKey];
    const methods: (keyof typeof item)[] = [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'options',
      'head',
    ];
    for (const m of methods) {
      const op = (item as Record<string, unknown>)[m] as OperationObjectLike | undefined;
      if (!op) continue;
      const opTags = (op.tags || []).map((t) => t.toLowerCase());
      if (opTags.some((t) => exclude.has(t))) continue;
      if (!op.parameters) op.parameters = [];
      const exists = op.parameters.some((p) => p.name === headerName);
      if (!exists) op.parameters.push({ ...paramTemplate });
    }
  }
}

export function ensureStandardErrorSchema(doc: OpenAPIObject) {
  // Defensive optional chaining for partial types
  const c = ensureComponents(doc);
  if (!c.schemas.StandardError) {
    c.schemas.StandardError = {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION' },
        message: { type: 'string', example: 'Validation failed' },
        details: { type: 'array', items: { type: 'string' }, nullable: true },
        traceId: { type: 'string', nullable: true },
      },
    } as Record<string, unknown>;
  }
  const commonCodes = ['400', '401', '403', '404'];
  for (const pathKey of Object.keys(doc.paths || {})) {
    const item = doc.paths[pathKey];
    const methods: (keyof typeof item)[] = [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'options',
      'head',
    ];
    for (const m of methods) {
      const op = (item as Record<string, unknown>)[m] as OperationObjectLike | undefined;
      if (!op || !op.responses) continue;
      for (const code of commonCodes) {
        if (!op.responses[code]) {
          op.responses[code] = {
            description: 'Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          } as Record<string, unknown>;
        }
      }
    }
  }
}

// Ensure components object with schemas exists and return it strongly typed
function ensureComponents(doc: OpenAPIObject): { schemas: Record<string, any> } {
  if (!doc.components) {
    doc.components = { schemas: {} };
  } else if (!doc.components.schemas) {
    doc.components.schemas = {};
  }
  return doc.components as { schemas: Record<string, any> };
}
