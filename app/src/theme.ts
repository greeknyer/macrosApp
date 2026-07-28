// Dark palette carried over from the HTML prototype.
export const theme = {
  bg: '#0b1120',
  cardBg: '#111827',
  cardBgAlt: '#0f172a',
  border: '#1f2937',
  text: '#e2e8f0',
  textDim: '#94a3b8',
  textFaint: '#64748b',
  accentBlue: '#38bdf8',
  blue: '#0284c7',
  green: '#22c55e',
  yellow: '#fde047',
  red: '#ef4444',
  protein: '#f87171',
  carbs: '#fbbf24',
  fat: '#a78bfa',
  kcal: '#38bdf8',
  scaledBg: 'rgba(253,224,71,0.06)',
} as const;

// Per-macro accent used across summary and cards.
export const macroColor = {
  p: theme.protein,
  c: theme.carbs,
  f: theme.fat,
} as const;
