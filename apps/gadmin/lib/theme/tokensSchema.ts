export interface ThemeTokens {
  // Palette
  primary: string; // hex
  background: string; // hex
  foreground: string; // hex
  secondary: string; // hex
  accent: string; // hex
  muted: string; // hex
  destructive: string; // hex
  border: string; // hex
  input: string; // hex
  ring: string; // hex
  card: string; // hex
  cardForeground: string; // hex
  popover: string; // hex
  popoverForeground: string; // hex

  // Component radii
  radius: number; // px

  // Typography
  fontFamily: string; // stack
  fontSizeBase: number; // px
  fontWeightRegular: number; // 400
  fontWeightMedium: number; // 500
  fontWeightBold: number; // 700

  // Spacing & layout
  spacing: number; // base unit px
  headerHeight: number; // px
  sidebarWidth: number; // px
  footerHeight: number; // px
  
  // Breakpoints
  breakpointSm: number; // px
  breakpointMd: number; // px
  breakpointLg: number; // px
  breakpointXl: number; // px

  // Direction
  direction: 'ltr' | 'rtl';

  // Motion
  motion: 'full' | 'reduced' | 'none';

  // Data Visualization
  datavizColor1: string; // hex
  datavizColor2: string; // hex
  datavizColor3: string; // hex
  datavizColor4: string; // hex
  datavizColor5: string; // hex
}

export const DEFAULT_TOKENS: ThemeTokens = {
  primary: '#6366f1',
  background: '#ffffff',
  foreground: '#111827',
  secondary: '#f1f5f9',
  accent: '#10b981',
  muted: '#f3f4f6',
  destructive: '#ef4444',
  border: '#e5e7eb',
  input: '#e5e7eb',
  ring: '#6366f1',
  card: '#ffffff',
  cardForeground: '#111827',
  popover: '#ffffff',
  popoverForeground: '#111827',

  radius: 8,

  fontFamily: "'Inter', system-ui, sans-serif",
  fontSizeBase: 16,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  spacing: 4,
  headerHeight: 56,
  sidebarWidth: 240,
  footerHeight: 48,

  breakpointSm: 640,
  breakpointMd: 768,
  breakpointLg: 1024,
  breakpointXl: 1280,

  direction: 'ltr',

  motion: 'full',

  datavizColor1: '#3b82f6',
  datavizColor2: '#ef4444',
  datavizColor3: '#10b981',
  datavizColor4: '#f97316',
  datavizColor5: '#8b5cf6',
};

export function validateTokens(tokens: Partial<ThemeTokens>): ThemeTokens {
  return {
    primary: tokens.primary || DEFAULT_TOKENS.primary,
    background: tokens.background || DEFAULT_TOKENS.background,
    foreground: tokens.foreground || DEFAULT_TOKENS.foreground,
    secondary: tokens.secondary || DEFAULT_TOKENS.secondary,
    accent: tokens.accent || DEFAULT_TOKENS.accent,
    muted: tokens.muted || DEFAULT_TOKENS.muted,
    destructive: tokens.destructive || DEFAULT_TOKENS.destructive,
    border: tokens.border || DEFAULT_TOKENS.border,
    input: tokens.input || DEFAULT_TOKENS.input,
    ring: tokens.ring || DEFAULT_TOKENS.ring,
    card: tokens.card || DEFAULT_TOKENS.card,
    cardForeground: tokens.cardForeground || DEFAULT_TOKENS.cardForeground,
    popover: tokens.popover || DEFAULT_TOKENS.popover,
    popoverForeground: tokens.popoverForeground || DEFAULT_TOKENS.popoverForeground,

    radius: tokens.radius ?? DEFAULT_TOKENS.radius,

    fontFamily: tokens.fontFamily || DEFAULT_TOKENS.fontFamily,
    fontSizeBase: tokens.fontSizeBase ?? DEFAULT_TOKENS.fontSizeBase,
    fontWeightRegular: tokens.fontWeightRegular ?? DEFAULT_TOKENS.fontWeightRegular,
    fontWeightMedium: tokens.fontWeightMedium ?? DEFAULT_TOKENS.fontWeightMedium,
    fontWeightBold: tokens.fontWeightBold ?? DEFAULT_TOKENS.fontWeightBold,

    spacing: tokens.spacing ?? DEFAULT_TOKENS.spacing,
    headerHeight: tokens.headerHeight ?? DEFAULT_TOKENS.headerHeight,
    sidebarWidth: tokens.sidebarWidth ?? DEFAULT_TOKENS.sidebarWidth,
    footerHeight: tokens.footerHeight ?? DEFAULT_TOKENS.footerHeight,

    breakpointSm: tokens.breakpointSm ?? DEFAULT_TOKENS.breakpointSm,
    breakpointMd: tokens.breakpointMd ?? DEFAULT_TOKENS.breakpointMd,
    breakpointLg: tokens.breakpointLg ?? DEFAULT_TOKENS.breakpointLg,
    breakpointXl: tokens.breakpointXl ?? DEFAULT_TOKENS.breakpointXl,

    direction: tokens.direction || DEFAULT_TOKENS.direction,

    motion: tokens.motion || DEFAULT_TOKENS.motion,

    datavizColor1: tokens.datavizColor1 || DEFAULT_TOKENS.datavizColor1,
    datavizColor2: tokens.datavizColor2 || DEFAULT_TOKENS.datavizColor2,
    datavizColor3: tokens.datavizColor3 || DEFAULT_TOKENS.datavizColor3,
    datavizColor4: tokens.datavizColor4 || DEFAULT_TOKENS.datavizColor4,
    datavizColor5: tokens.datavizColor5 || DEFAULT_TOKENS.datavizColor5,
  };
}
