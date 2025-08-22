import { ThemeTokens } from './tokensSchema';

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const parts = h.length === 3 ? h.split('').map(c => c + c) : [h.slice(0,2), h.slice(2,4), h.slice(4,6)];
  const [r,g,b] = parts.map(p => parseInt(p,16));
  return { r, g, b };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (v: number) => {
    const c = v/255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126*R + 0.7152*G + 0.0722*B;
}

function hexToHslTriple(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN: h = (gN - bN) / d + (gN < bN ? 6 : 1); break;
      case gN: h = (bN - rN) / d + 2; break;
      case bN: h = (rN - gN) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function derivePrimaryForeground(primary: string): string {
  // Decide between dark and light foreground for accessibility contrast baseline
  const L = luminance(primary);
  const chosen = L > 0.55 ? '#111827' : '#ffffff';
  return hexToHslTriple(chosen);
}

function contrastForeground(bgHex: string) {
  const L = luminance(bgHex);
  return hexToHslTriple(L > 0.55 ? '#111827' : '#ffffff');
}

export function tokensToCssVariables(tokens: ThemeTokens): Record<string,string> {
  return {
    '--primary': hexToHslTriple(tokens.primary),
    '--primary-foreground': derivePrimaryForeground(tokens.primary),
    '--background': hexToHslTriple(tokens.background),
    '--foreground': hexToHslTriple(tokens.foreground),
    '--secondary': hexToHslTriple(tokens.secondary),
    '--secondary-foreground': contrastForeground(tokens.secondary),
    '--accent': hexToHslTriple(tokens.accent),
    '--accent-foreground': contrastForeground(tokens.accent),
    '--muted': hexToHslTriple(tokens.muted),
    '--muted-foreground': contrastForeground(tokens.muted),
    '--destructive': hexToHslTriple(tokens.destructive),
    '--destructive-foreground': contrastForeground(tokens.destructive),
    '--border': hexToHslTriple(tokens.border),
    '--input': hexToHslTriple(tokens.input),
    '--ring': hexToHslTriple(tokens.ring),
    '--card': hexToHslTriple(tokens.card),
    '--card-foreground': hexToHslTriple(tokens.cardForeground),
    '--popover': hexToHslTriple(tokens.popover),
    '--popover-foreground': hexToHslTriple(tokens.popoverForeground),

    '--radius': tokens.radius + 'px',

    '--font-family-base': tokens.fontFamily,
    '--font-size-base': tokens.fontSizeBase + 'px',
    '--font-weight-regular': String(tokens.fontWeightRegular),
    '--font-weight-medium': String(tokens.fontWeightMedium),
    '--font-weight-bold': String(tokens.fontWeightBold),

    '--spacing-base': tokens.spacing + 'px',
    '--header-height': tokens.headerHeight + 'px',
    '--sidebar-width': tokens.sidebarWidth + 'px',
    '--footer-height': tokens.footerHeight + 'px',

    '--breakpoint-sm': tokens.breakpointSm + 'px',
    '--breakpoint-md': tokens.breakpointMd + 'px',
    '--breakpoint-lg': tokens.breakpointLg + 'px',
    '--breakpoint-xl': tokens.breakpointXl + 'px',

    '--direction': tokens.direction,

    '--motion-level': tokens.motion,

    '--dataviz-color-1': hexToHslTriple(tokens.datavizColor1),
    '--dataviz-color-2': hexToHslTriple(tokens.datavizColor2),
    '--dataviz-color-3': hexToHslTriple(tokens.datavizColor3),
    '--dataviz-color-4': hexToHslTriple(tokens.datavizColor4),
    '--dataviz-color-5': hexToHslTriple(tokens.datavizColor5),
  };
}
