type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClientOptions {
  baseUrl?: string;
  getAuthToken?: () => string | undefined; // from memory (not cookie) to avoid RSC issues
  getTenantId?: () => string | undefined;
  onUnauthorized?: () => void;
}

export interface RequestOptions<TBody = any> {
  method?: HttpMethod;
  path: string;
  body?: TBody;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  auth?: boolean; // default true
  tenant?: boolean; // default true
}

export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(message: string, status: number, payload: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function createApiClient(opts: ApiClientOptions) {
  let base = (
    opts.baseUrl?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    'http://localhost:3001'
  );
  if (!/\/v1$/.test(base)) {
    base = base.replace(/\/$/, '') + '/v1';
  }

  async function request<TResponse = any, TBody = any>(options: RequestOptions<TBody>): Promise<TResponse> {
    const { method = 'GET', path, body, query, signal, headers = {}, auth = true, tenant = true } = options;

    const q = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}${q ? `?${q}` : ''}`;

    const finalHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };

    if (auth) {
      const token = opts.getAuthToken?.();
      if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (tenant) {
      const t = opts.getTenantId?.();
      if (t) finalHeaders['X-Tenant-Id'] = t;
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include',
      cache: 'no-store'
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => undefined) : await res.text();

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        opts.onUnauthorized?.();
      }
      throw new ApiError(`Request failed with status ${res.status}`, res.status, payload);
    }
    return payload as TResponse;
  }

  // Theme helpers
  async function listThemes() {
    return request<any[]>({ path: '/themes' });
  }
  async function createTheme(body: { name: string; primaryColor?: string }) {
    return request<any>({ path: '/themes', method: 'POST', body });
  }
  async function updateTheme(id: string, body: any) {
    return request<any>({ path: `/themes/${id}`, method: 'PATCH', body });
  }
  async function deleteTheme(id: string) {
    return request<any>({ path: `/themes/${id}`, method: 'DELETE' });
  }
  async function listThemeSnapshots(themeId: string) {
    return request<any[]>({ path: `/themes/${themeId}/snapshots` });
  }
  async function createThemeSnapshot(themeId: string, tokens: any, options?: { label?: string; activate?: boolean }) {
    return request({ path: `/themes/${themeId}/snapshots`, method: 'POST', body: { tokens, label: options?.label, activate: options?.activate ?? true } });
  }
  async function rollbackTheme(themeId: string, snapshotId: string) {
    return request({ path: `/themes/${themeId}/rollback`, method: 'POST', body: { snapshotId } });
  }

  async function importTheme(name: string, tokens: any) {
    return request({ path: '/themes/import', method: 'POST', body: { name, tokens } });
  }

  async function exportTheme(id: string) {
    return request({ path: `/themes/${id}/export` });
  }

  return { request, listThemes, createTheme, updateTheme, deleteTheme, listThemeSnapshots, createThemeSnapshot, rollbackTheme, importTheme, exportTheme, baseUrl: base };
}

// Default singleton (client-side only). To avoid RSC pitfalls, wrap usage in hooks.
export const apiClient = createApiClient({
  getAuthToken: () => (typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') || undefined : undefined),
  getTenantId: () => {
    if (typeof window === 'undefined') return undefined;
    return (
      sessionStorage.getItem('tenant_id') ||
      process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ||
      undefined
    );
  },
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }
});
