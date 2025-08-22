"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_TOKENS, ThemeTokens, validateTokens } from '../../lib/theme/tokensSchema';
import { tokensToCssVariables } from '../../lib/theme/mapTokensToCss';
import { apiClient } from '../../lib/apiClient';

interface ThemeContextValue {
  tokens: ThemeTokens;
  update: (partial: Partial<ThemeTokens>) => void;
  reset: () => void;
}

const STORAGE_KEY = 'gadmin_tokens_v1';
const REMOTE_CACHE_KEY = 'gadmin_active_snapshot_id';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_TOKENS);
  const [loading, setLoading] = useState(true);
  const [remoteThemeId, setRemoteThemeId] = useState<string | null>(null);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === 'undefined') return;
      // Load local draft first for perceived speed
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setTokens(validateTokens(parsed));
        }
      } catch {}
      // Fetch themes to locate first theme (later: pick selected theme)
      try {
        const themes = await apiClient.listThemes();
        if (cancelled) return;
        if (themes && themes.length > 0) {
          const t = themes[0]; // TODO: select by user choice
          setRemoteThemeId(t.id);
          // If active snapshot pointer present fetch snapshots to obtain active tokens
          if (t.activeSnapshotId) {
            setActiveSnapshotId(t.activeSnapshotId);
            const snaps = await apiClient.listThemeSnapshots(t.id);
            if (cancelled) return;
            const active = snaps.find((s: any) => s.id === t.activeSnapshotId);
            if (active) {
              const validated = validateTokens(active.tokens);
              setTokens(validated);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
              localStorage.setItem(REMOTE_CACHE_KEY, t.activeSnapshotId);
            }
          }
        }
      } catch (e) {
        // silent fallback (offline / backend not ready)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const vars = tokensToCssVariables(tokens);
      const root = document.documentElement;
      Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k, v));
    }
  }, [tokens]);

  const persist = (next: ThemeTokens) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const update = useCallback((partial: Partial<ThemeTokens>) => {
    setTokens(prev => {
      const next = validateTokens({ ...prev, ...partial });
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setTokens(DEFAULT_TOKENS);
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  return <ThemeContext.Provider value={{ tokens, update, reset }}>{children}</ThemeContext.Provider>;
};

export function useThemeTokens() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeTokens must be used within ThemeProvider');
  return ctx;
}
