"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useThemeTokens } from './ThemeProvider';

type Resources = {
  googleFonts: boolean;
  fontAwesome: boolean;
  animateCss: boolean;
  heroIcons: boolean;
  set: (next: Partial<Omit<Resources, 'set'>>) => void;
};

const STORAGE_KEY = 'gadmin_resources_v1';
const Cdns = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
  fontAwesome: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css",
  animateCss: "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
};

const Ctx = createContext<Resources | undefined>(undefined);

export const ResourcesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tokens } = useThemeTokens();
  const [state, setState] = useState({ googleFonts: true, fontAwesome: false, animateCss: false, heroIcons: true });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...state, ...JSON.parse(raw) });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Google Fonts (Inter only for now)
    const root = document.head;
    const ensureLink = (id: string, href: string) => {
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        root.appendChild(link);
      }
      return link;
    };
    const removeLink = (id: string) => {
      const el = document.getElementById(id);
      if (el) el.parentElement?.removeChild(el);
    };

    const family = tokens.fontFamily.toLowerCase();
    if (state.googleFonts && family.includes('inter')) {
      ensureLink('gf-inter', Cdns.inter);
    } else {
      removeLink('gf-inter');
    }
    if (state.fontAwesome) ensureLink('fa-css', Cdns.fontAwesome); else removeLink('fa-css');
    if (state.animateCss) ensureLink('animate-css', Cdns.animateCss); else removeLink('animate-css');
  }, [state.googleFonts, state.fontAwesome, state.animateCss, tokens.fontFamily]);

  const value = useMemo<Resources>(() => ({
    ...state,
    set: (next) => {
      setState(prev => {
        const merged = { ...prev, ...next };
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });
    }
  }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useResources() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useResources must be used within ResourcesProvider');
  return ctx;
}
