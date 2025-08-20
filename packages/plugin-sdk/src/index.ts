import type { paths } from './client/index';

export * from './client/index';

export interface SdkClientOptions {
  baseUrl: string; // e.g. https://api.example.com/v1
  tenantId?: string;
  accessToken?: string; // JWT or API key
  fetchImpl?: typeof fetch;
  userAgent?: string;
  onAuthRefresh?: () => Promise<string> | string; // callback to lazily refresh access token
}

export class G5Client {
  private baseUrl: string;
  private tenantId?: string;
  private accessToken?: string;
  private fetchImpl: typeof fetch;
  private userAgent?: string;
  private onAuthRefresh?: () => Promise<string> | string;

  constructor(opts: SdkClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.tenantId = opts.tenantId;
    this.accessToken = opts.accessToken;
    this.fetchImpl = opts.fetchImpl || fetch;
    this.userAgent = opts.userAgent;
    this.onAuthRefresh = opts.onAuthRefresh;
  }

  setAccessToken(token: string) { this.accessToken = token; }
  setTenantId(tenantId: string) { this.tenantId = tenantId; }

  private async request<T = any>(method: string, path: string, body?: any, initHeaders?: Record<string,string>): Promise<T> {
    const url = this.baseUrl + path;
    let token = this.accessToken;
    const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(initHeaders||{}) };
    if (this.tenantId && !headers['X-Tenant-Id']) headers['X-Tenant-Id'] = this.tenantId;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (this.userAgent) headers['User-Agent'] = this.userAgent;

    const res = await this.fetchImpl(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401 && this.onAuthRefresh) {
      try {
        const newToken = await this.onAuthRefresh();
        if (newToken && newToken !== token) {
          this.accessToken = newToken;
          headers['Authorization'] = 'Bearer ' + newToken;
          const retry = await this.fetchImpl(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
          return this.handleResponse<T>(retry);
        }
      } catch (_) {}
    }
    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: any = undefined;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text as any; }
    if (!res.ok) {
      const err: any = new Error(data?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data as T;
  }

  // Example convenience endpoints (add as needed)
  auth = {
    login: (tenantSlug: string, email: string, password: string) => this.request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/login', { tenantSlug, email, password }),
    refresh: () => this.request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/refresh'),
    me: () => this.request<{ user: any }>('GET', '/auth/me'),
  };

  tenants = {
    list: () => this.request<any>('GET', '/tenants'),
  };

  projects = {
    list: () => this.request<any>('GET', '/projects'),
  };
}

export type Paths = paths;
