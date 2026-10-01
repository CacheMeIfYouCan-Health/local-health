import { Platform } from 'react-native';

// Palette mirrors the web app: soft slate background (Tailwind slate-100),
// off-white cards (slate-50) with visible borders, emerald primary and red
// for emergencies. The `gray*` names are kept for backwards compatibility but
// now map to Tailwind's slate scale.
export const colors = {
  // Surfaces
  bg: '#f1f5f9',        // slate-100 — screen background
  card: '#f8fafc',      // slate-50  — cards
  input: '#ffffff',     // inputs stay white so they stand out inside cards
  border: '#cbd5e1',    // slate-300 — card / input borders
  borderSoft: '#e2e8f0',// slate-200 — dividers

  // Text
  text: '#0f172a',      // slate-900
  textMuted: '#475569', // slate-600
  textSubtle: '#64748b',// slate-500

  emerald50:  '#ecfdf5',
  emerald100: '#d1fae5',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065f46',

  gray50:  '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray900: '#0f172a',

  red50:  '#fef2f2',
  red100: '#fee2e2',
  red600: '#dc2626',
  red700: '#b91c1c',

  amber50: '#fffbeb',
  amber700: '#b45309',

  blue50: '#eff6ff',
  blue700: '#1d4ed8',

  white:  '#ffffff',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const font = {
  meta: 13,
  small: 14,
  body: 16,
  title: 26,
  hero: 44,
};

// Minimum touch target (Material: 48dp, Apple HIG: 44pt).
export const touch = 48;

// Platform-appropriate elevation: iOS uses shadow*, Android uses `elevation`.
export function shadow(level = 1) {
  return Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.06 + level * 0.02,
      shadowRadius: 3 + level * 3,
      shadowOffset: { width: 0, height: level },
    },
    android: { elevation: level * 2 },
    default: {},
  });
}
