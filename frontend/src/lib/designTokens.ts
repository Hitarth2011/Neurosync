/**
 * Design System Tokens
 * Centralized spacing, typography, colors, and layout constants
 * Used across all components for consistency
 */

// ─── Spacing Scale ───────────────────────────────────────────────────────────
export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  xxl: '3rem',      // 48px
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
export const radius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '999px',
} as const;

// ─── Typography / Font Sizes ─────────────────────────────────────────────────
export const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
} as const;

// ─── Colors (Brand Palette) ──────────────────────────────────────────────────
export const colors = {
  // Primary (Brand)
  primary: {
    50: '#FBF8F3',
    100: '#F4EFE6',
    200: '#E8DCCF',
    300: '#D9C4B3',
    400: '#C07A5E',
    500: '#A35A42',
    600: '#8B5A3C',
    700: '#704629',
    800: '#563620',
    900: '#422812',
  },
  
  // Secondary (Green)
  secondary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },
  
  secondary_alt: {
    light: '#E8EFE8',
    main: '#8DA28B',
    dark: '#5A7A58',
  },
  
  // Accent (Warmth)
  accent: {
    light: '#FFE5D9',
    main: '#C07A5E',
    dark: '#A35A42',
  },
  
  // Success
  success: {
    light: '#C8E6C9',
    main: '#4CAF50',
    dark: '#388E3C',
  },
  
  // Warning
  warning: {
    light: '#FFE0B2',
    main: '#FFA726',
    dark: '#E65100',
  },
  
  // Error
  error: {
    light: '#FFCDD2',
    main: '#DC2626',
    dark: '#B91C1C',
  },
  
  // Info
  info: {
    light: '#BBDEFB',
    main: '#2196F3',
    dark: '#1565C0',
  },
  
  // Neutral/Grayscale
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Semantic
  text: {
    primary: '#2D3748',
    secondary: '#5A6578',
    muted: '#8B8B8B',
    disabled: '#BDBDBD',
    inverse: '#FFFFFF',
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#FBF8F3',
  },
  
  border: '#E8DCCF',
  
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Elevation-based
  elevation: {
    1: '0 2px 8px rgba(0, 0, 0, 0.08)',
    2: '0 4px 12px rgba(0, 0, 0, 0.12)',
    3: '0 8px 20px rgba(0, 0, 0, 0.15)',
  },
} as const;

// ─── Transitions & Animations ────────────────────────────────────────────────
export const transitions = {
  fast: '150ms ease-in-out',
  normal: '300ms ease-in-out',
  slow: '500ms ease-in-out',
  
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
    easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
    easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  },
} as const;

// ─── Layout / Grid ───────────────────────────────────────────────────────────
export const layout = {
  maxWidth: '1200px',
  maxWidthNarrow: '800px',
  maxWidthWide: '1400px',
  
  containerPadding: {
    mobile: spacing.md,
    tablet: spacing.lg,
    desktop: spacing.xl,
  },
  
  gridGap: spacing.md,
  
  // App bar
  appBarHeight: '64px',
  appBarHeightMobile: '56px',
  
  // Breakpoints
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// ─── Z-Index Scale ───────────────────────────────────────────────────────────
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  popover: 500,
  notification: 600,
  tooltip: 700,
} as const;

// ─── Accessibility ───────────────────────────────────────────────────────────
export const a11y = {
  focusOutlineWidth: '2px',
  focusOutlineColor: colors.primary[400],
  focusOutlineOffset: '2px',
  minTapTarget: '44px', // WCAG AA minimum
} as const;

// ─── CSS Custom Properties (for use in stylesheets) ─────────────────────────
export const cssVariables = {
  // Colors
  '--color-primary': colors.primary[400],
  '--color-secondary': colors.secondary_alt.main,
  '--color-accent': colors.accent.main,
  '--color-success': colors.success.main,
  '--color-warning': colors.warning.main,
  '--color-error': colors.error.main,
  '--color-info': colors.info.main,
  
  // Text
  '--text-primary': colors.text.primary,
  '--text-secondary': colors.text.secondary,
  '--text-muted': colors.text.muted,
  
  // Background
  '--bg-primary': colors.background.primary,
  '--bg-secondary': colors.background.secondary,
  '--bg-tertiary': colors.background.tertiary,
  '--border-color': colors.border,
  
  // Spacing
  '--spacing-xs': spacing.xs,
  '--spacing-sm': spacing.sm,
  '--spacing-md': spacing.md,
  '--spacing-lg': spacing.lg,
  '--spacing-xl': spacing.xl,
  
  // Border radius
  '--radius-sm': radius.sm,
  '--radius-md': radius.md,
  '--radius-lg': radius.lg,
  '--radius-xl': radius.xl,
  
  // Shadows
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  
  // Font
  '--font-base': fontSize.base,
  '--font-sm': fontSize.sm,
  '--font-lg': fontSize.lg,
  '--line-height': lineHeight.normal,
  
  // Layout
  '--app-bar-height': layout.appBarHeight,
} as const;

// ─── Gradient Presets ────────────────────────────────────────────────────────
export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.accent.dark})`,
  secondary: `linear-gradient(135deg, ${colors.secondary_alt.light}, ${colors.secondary_alt.main})`,
  success: `linear-gradient(135deg, ${colors.success.light}, ${colors.success.main})`,
  warning: `linear-gradient(135deg, ${colors.warning.light}, ${colors.warning.main})`,
  error: `linear-gradient(135deg, ${colors.error.light}, ${colors.error.main})`,
  subtle: `linear-gradient(135deg, ${colors.background.secondary}, ${colors.background.primary})`,
} as const;

// ─── Responsive Utilities ────────────────────────────────────────────────────
export const media = {
  xs: `@media (min-width: ${layout.breakpoints.xs})`,
  sm: `@media (min-width: ${layout.breakpoints.sm})`,
  md: `@media (min-width: ${layout.breakpoints.md})`,
  lg: `@media (min-width: ${layout.breakpoints.lg})`,
  xl: `@media (min-width: ${layout.breakpoints.xl})`,
  '2xl': `@media (min-width: ${layout.breakpoints['2xl']})`,
  
  // Mobile-first utility functions
  maxSm: `@media (max-width: calc(${layout.breakpoints.sm} - 1px))`,
  maxMd: `@media (max-width: calc(${layout.breakpoints.md} - 1px))`,
  maxLg: `@media (max-width: calc(${layout.breakpoints.lg} - 1px))`,
} as const;

// ─── Export Type-Safe Helper ─────────────────────────────────────────────────
export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
export type FontSizeKey = keyof typeof fontSize;
export type ShadowKey = keyof typeof shadows;
export type ZIndexKey = keyof typeof zIndex;
export type TransitionKey = keyof typeof transitions;
