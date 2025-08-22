"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CheckResult = {
  name: string;
  url: string;
  method?: string;
  status: 'pending' | 'ok' | 'fail' | 'missing';
  httpStatus?: number;
  detail?: string;
  latencyMs?: number;
  running?: boolean;
};

const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

async function doFetch(url: string, init?: RequestInit) {
  const started = performance.now();
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow', ...init });
  const text = await res.text();
  let parsed: any = text;
  try { parsed = JSON.parse(text); } catch {}
  const latencyMs = Math.round(performance.now() - started);
  return { res, body: parsed, latencyMs } as const;
}

export default function StatusPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshMs, setRefreshMs] = useState(5000);
  const [tenantId, setTenantId] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize tenantId from localStorage once mounted
  useEffect(() => {
    const saved = window.localStorage.getItem('g5:tenantId') || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '';
    setTenantId(saved);
  }, []);

  const baseChecks: CheckResult[] = useMemo(() => ([
    { name: 'Health', url: `${apiBase}/health`, status: 'pending' },
    { name: 'Readiness', url: `${apiBase}/health/ready`, status: 'pending' },
    { name: 'Metrics', url: `${apiBase}/metrics`, status: 'pending' },
    { name: 'Swagger Docs', url: `${apiBase}/docs`, status: 'pending' },
  { name: 'DB Smoke', url: `${apiBase}/health/smoke/db`, status: 'pending' },
  { name: 'Redis Smoke', url: `${apiBase}/health/smoke/redis`, status: 'pending' },
    { name: 'Projects List', url: `${apiBase}/v1/projects`, status: 'pending' },
    // Keep as placeholder until backend auth route is ready
    { name: 'Auth Login', url: `${apiBase}/v1/auth/login`, method: 'POST', status: 'pending' },
  ]), []);

  const runChecks = useCallback(async () => {
    setLoading(true);
    const headers: HeadersInit = tenantId ? { 'X-Tenant-Id': tenantId } : {};
    const updated: CheckResult[] = [];
    for (const c of baseChecks) {
      try {
        const method = c.method || 'GET';
        const { res, body, latencyMs } = await doFetch(c.url, { method, headers });
        if (res.ok) {
          updated.push({ ...c, status: 'ok', httpStatus: res.status, latencyMs, detail: typeof body === 'string' ? body : JSON.stringify(body) });
        } else if (res.status === 404) {
          updated.push({ ...c, status: 'missing', httpStatus: res.status, latencyMs, detail: typeof body === 'string' ? body : JSON.stringify(body) });
        } else {
          updated.push({ ...c, status: 'fail', httpStatus: res.status, latencyMs, detail: typeof body === 'string' ? body : JSON.stringify(body) });
        }
      } catch (e: any) {
        updated.push({ ...c, status: 'fail', detail: e.message });
      }
    }
    setResults(updated);
    setLoading(false);
  }, [baseChecks, tenantId]);

  const runSingle = useCallback(async (idx: number) => {
    const target = results[idx] || baseChecks[idx];
    if (!target) return;
    const headers: HeadersInit = tenantId ? { 'X-Tenant-Id': tenantId } : {};
    setResults(prev => {
      const next = [...(prev.length ? prev : baseChecks)];
      next[idx] = { ...next[idx], running: true, status: 'pending', httpStatus: undefined, detail: undefined, latencyMs: undefined };
      return next;
    });
    try {
      const method = target.method || 'GET';
      const { res, body, latencyMs } = await doFetch(target.url, { method, headers });
      const patch: Partial<CheckResult> = { running: false, latencyMs, httpStatus: res.status };
      if (res.ok) Object.assign(patch, { status: 'ok', detail: typeof body === 'string' ? body : JSON.stringify(body) });
      else if (res.status === 404) Object.assign(patch, { status: 'missing', detail: typeof body === 'string' ? body : JSON.stringify(body) });
      else Object.assign(patch, { status: 'fail', detail: typeof body === 'string' ? body : JSON.stringify(body) });
      setResults(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch } as CheckResult;
        return next;
      });
    } catch (e: any) {
      setResults(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], running: false, status: 'fail', detail: e.message } as CheckResult;
        return next;
      });
    }
  }, [results, baseChecks, tenantId]);

  useEffect(() => {
    // initial run
    runChecks();
  }, [runChecks]);

  useEffect(() => {
    if (autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => runChecks(), refreshMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, refreshMs, runChecks]);

  const overall = useMemo(() => {
    if (!results.length) return 'pending';
    if (results.some(r => r.status === 'fail')) return 'fail';
    if (results.some(r => r.status === 'missing')) return 'missing';
    if (results.every(r => r.status === 'ok')) return 'ok';
    return 'pending';
  }, [results]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        Status del Core API {badge(overall as any)}
      </h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div>Base URL: <code>{apiBase}</code></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>Tenant ID:</label>
          <input value={tenantId} onChange={(e) => {
            const v = e.target.value; setTenantId(v); window.localStorage.setItem('g5:tenantId', v);
          }} placeholder="opcional" style={{ padding: '4px 6px', border: '1px solid #ccc', borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh
          </label>
          <select value={refreshMs} onChange={(e) => setRefreshMs(parseInt(e.target.value, 10))}>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <button onClick={() => runChecks()} disabled={loading} style={btn}>
            {loading ? 'Ejecutando…' : 'Re-ejecutar'}
          </button>
          <a href={`${apiBase}/docs`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}>Abrir Swagger</a>
          <a href={`${apiBase}/metrics`} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: 'none' }}>Ver Métricas</a>
        </div>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 1000 }}>
        <thead>
          <tr>
            <th style={th}>Check</th>
            <th style={th}>Estado</th>
            <th style={th}>HTTP</th>
            <th style={th}>Latencia</th>
            <th style={th}>Detalle</th>
            <th style={th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr key={r.name} style={{ background: rowColor(r.status) }}>
              <td style={td}>{r.name}</td>
              <td style={td}>{badge(r.status)}</td>
              <td style={td}>{r.httpStatus || '—'}</td>
              <td style={td}>{typeof r.latencyMs === 'number' ? `${r.latencyMs} ms` : '—'}</td>
              <td style={{ ...td, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{r.detail?.toString().slice(0, 240) || ''}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => runSingle(idx)} disabled={!!r.running} style={{ ...btn, fontSize: 12 }}>
                    {r.running ? 'Ejecutando…' : 'Run'}
                  </button>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Abrir</a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <section style={{ marginTop: '2rem' }}>
        <h2>Interpretación</h2>
        <ul>
          <li><strong>OK</strong>: Ruta activa y respondió 2xx.</li>
          <li><strong>Missing</strong>: Ruta prevista pero aún no implementada (404 esperado).</li>
          <li><strong>Fail</strong>: Ruta existente devolvió error distinto de 404 o fallo de red.</li>
        </ul>
        <p>Para extender checks, edita <code>apps/gadmin/app/admin/status/page.tsx</code>.</p>
      </section>
    </div>
  );
}

function badge(s: CheckResult['status']) {
  const base: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' };
  const colors: Record<string, React.CSSProperties> = {
    ok: { background: '#d1fae5', color: '#065f46' },
    fail: { background: '#fee2e2', color: '#991b1b' },
    missing: { background: '#e0e7ff', color: '#3730a3' },
    pending: { background: '#fef3c7', color: '#92400e' },
  };
  return <span style={{ ...base, ...colors[s] }}>{s}</span>;
}

function rowColor(s: CheckResult['status']) {
  switch (s) {
    case 'ok': return '#f0fdf4';
    case 'fail': return '#fef2f2';
    case 'missing': return '#f5f3ff';
    case 'pending': return '#fffbeb';
  }
}

const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #ccc', padding: '6px 8px' };
const td: React.CSSProperties = { borderBottom: '1px solid #eee', padding: '6px 8px', verticalAlign: 'top' };
const btn: React.CSSProperties = { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' };
