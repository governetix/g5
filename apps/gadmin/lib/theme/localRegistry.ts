import { ThemeTokens } from './tokensSchema';
import { THEME_PRESETS } from './presets';

export type ThemeSource = 'preset' | 'custom';
export interface ThemeRecord {
  id: string;
  name: string;
  source: ThemeSource;
  slug?: string;
  status?: 'draft' | 'staging' | 'canary' | 'published' | 'inactive';
  isDefault?: boolean;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  wcagScore?: 'AAA' | 'AA' | 'A' | '';
  performanceScore?: number;
  googleFonts?: boolean;
  fontAwesome?: boolean;
  animateCss?: boolean;
  heroIcons?: boolean;
  tokens: ThemeTokens;
}

const CUSTOM_KEY = 'gadmin_custom_themes_v1';
const ACTIVE_KEY = 'gadmin_active_theme_id';

function readCustom(): ThemeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustom(list: ThemeRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function getAllThemes(): ThemeRecord[] {
  const presets: ThemeRecord[] = THEME_PRESETS.map(p => ({ id: p.id, name: p.name, source: 'preset', status: 'published', isDefault: p.id.includes('claro'), version: 1, updatedAt: new Date().toISOString(), updatedBy: 'system', wcagScore: '', tokens: p.tokens }));
  const customs = readCustom();
  return [...presets, ...customs];
}

export function saveCustomTheme(name: string, tokens: ThemeTokens): ThemeRecord {
  const now = new Date().toISOString();
  const slug = (name || 'custom-theme').toLowerCase().replace(/\s+/g, '-');
  const rec: ThemeRecord = { id: `custom-${Date.now()}`, name: name || 'Custom Theme', slug, source: 'custom', status: 'draft', isDefault: false, version: 1, updatedAt: now, updatedBy: 'admin', wcagScore: '', performanceScore: undefined, tokens };
  const list = readCustom();
  list.push(rec);
  writeCustom(list);
  return rec;
}

export function deleteCustomTheme(id: string) {
  const list = readCustom();
  const next = list.filter(x => x.id !== id);
  writeCustom(next);
}

export function renameCustomTheme(id: string, name: string) {
  const list = readCustom();
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
  list[idx] = { ...list[idx], name, slug: (name||list[idx].name).toLowerCase().replace(/\s+/g, '-'), updatedAt: new Date().toISOString() };
    writeCustom(list);
  }
}

export function getActiveThemeId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveThemeId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function getThemeById(id: string): ThemeRecord | undefined {
  const all = getAllThemes();
  return all.find(t => t.id === id);
}

export function upsertCustomTheme(rec: ThemeRecord) {
  const list = readCustom();
  const idx = list.findIndex(x => x.id === rec.id);
  if (idx >= 0) list[idx] = rec; else list.push(rec);
  writeCustom(list);
}

export function updateTheme(id: string, patch: Partial<ThemeRecord>) {
  const list = readCustom();
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return; // only custom themes are editable locally
  const current = list[idx];
  const next: ThemeRecord = {
    ...current,
    ...patch,
    id: current.id,
    source: current.source,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = next;
  writeCustom(list);
}

export function setThemeStatus(id: string, status: ThemeRecord['status']) {
  const list = readCustom();
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], status, updatedAt: new Date().toISOString(), version: (list[idx].version||1) + (status==='published'?1:0) };
    writeCustom(list);
  }
}

export function setThemeDefault(id: string) {
  const list = readCustom();
  const next = list.map(x => ({ ...x, isDefault: x.id === id }));
  writeCustom(next);
}

export function duplicateTheme(id: string): ThemeRecord | null {
  const found = getThemeById(id);
  if (!found) return null;
  return saveCustomTheme(`${found.name} (copy)`, { ...found.tokens });
}
