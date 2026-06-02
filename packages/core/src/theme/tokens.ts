/**
 * Tasarım token'ları — TEK doğruluk kaynağı.
 * Tüm renk, boşluk, yarıçap ve tipografi değerleri burada toplanır;
 * global.css'e CSS değişkeni olarak enjekte edilir (injectThemeVars).
 */

export const colors = {
  accent: '#FFD400', // sarı
  accentSoft: 'rgba(255, 212, 0, 0.16)',
  accentGlow: 'rgba(255, 212, 0, 0.45)',

  bg: '#0A0A0A', // zemin
  card: '#141414', // kart
  surface: '#1C1C1C', // yüzey
  border: 'rgba(255, 255, 255, 0.08)',

  text: '#FFFFFF',
  textSecondary: '#B5B5B5',
  textMuted: 'rgba(255, 255, 255, 0.45)',

  in: '#2ECC71', // gelen (yeşil)
  out: '#FF4D4D', // giden (kırmızı)

  black: '#000000',
  white: '#FFFFFF',
} as const;

export const radius = {
  sm: '10px',
  md: '16px',
  lg: '20px',
  pill: '999px',
} as const;

export const space = {
  xs: '6px',
  sm: '10px',
  md: '16px',
  lg: '24px',
  xl: '36px',
  xxl: '56px',
} as const;

export const font = {
  heading: '"Sora", "Manrope", system-ui, sans-serif',
  body: '"Inter", system-ui, -apple-system, sans-serif',
} as const;

export const shadow = {
  card: '0 8px 30px rgba(0, 0, 0, 0.45)',
  glow: `0 0 0 1px ${colors.accentSoft}, 0 8px 40px ${colors.accentGlow}`,
} as const;

export const motion = {
  fast: 0.18,
  base: 0.28,
  slow: 0.5,
  spring: { type: 'spring', stiffness: 260, damping: 26 } as const,
} as const;

/** Token'ları :root CSS değişkenlerine yazar (global.css ile birlikte). */
export function injectThemeVars(target: HTMLElement = document.documentElement) {
  const set = (k: string, v: string) => target.style.setProperty(k, v);
  Object.entries(colors).forEach(([k, v]) => set(`--c-${k}`, v));
  Object.entries(radius).forEach(([k, v]) => set(`--r-${k}`, v));
  Object.entries(space).forEach(([k, v]) => set(`--s-${k}`, v));
  set('--font-heading', font.heading);
  set('--font-body', font.body);
  set('--shadow-card', shadow.card);
  set('--shadow-glow', shadow.glow);
}

export type ThemeName = 'dark' | 'light';
