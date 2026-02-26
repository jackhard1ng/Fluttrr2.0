// Fluttrr design system colors
// Matches the FluttrApp.jsx prototype theme token `T`

export const Colors = {
  // Core brand
  blue: '#1E90FF',
  blueLight: '#3DA1FF',
  blueDark: '#1A7DE0',
  blueGlow: 'rgba(30, 144, 255, 0.15)',
  blueBorder: 'rgba(30, 144, 255, 0.3)',

  // Backgrounds (GitHub Primer Dark palette from prototype)
  dark: '#0D1117',
  surface: '#161B22',
  card: '#1C2333',
  cardHover: '#232D42',
  inputBg: '#161B22',

  // Borders
  border: '#30363D',
  borderLight: '#3D444D',

  // Text
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#6B7280',
  textWhite: '#FFFFFF',

  // Status / Accent
  success: '#3FB950',
  successBg: 'rgba(63, 185, 80, 0.1)',
  warn: '#D29922',
  warnBg: 'rgba(210, 153, 34, 0.1)',
  error: '#F85149',
  errorBg: 'rgba(248, 81, 73, 0.1)',
  cyan: '#00BFFF',
  purple: '#A78BFA',
  pink: '#EC4899',

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorName = keyof typeof Colors;
