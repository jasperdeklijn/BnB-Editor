/**
 * Theme System Types
 * Defines the complete type system for website themes
 */

// Color palette definition
export interface ThemePalette {
  id: string;
  name: string;
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
  };
}

// Font pairing definition
export interface ThemeFontPair {
  id: string;
  name: string;
  headingFont: string;
  headingFontFamily: string;
  bodyFont: string;
  bodyFontFamily: string;
  // Google Fonts import URL
  googleFontsUrl?: string;
}

// Spacing scale
export type ThemeSpacing = 'compact' | 'comfortable' | 'spacious';

// Border radius scale
export type ThemeRadius = 'none' | 'small' | 'medium' | 'large' | 'full';

export type LanguageSwitcherStyle = 'dropdown' | 'buttons' | 'compact';

export type LanguageSwitcherPosition = 'nav-left' | 'nav-right' | 'bottom-left' | 'bottom-right';

export interface LanguageSwitcherConfig {
  style: LanguageSwitcherStyle;
  position: LanguageSwitcherPosition;
}

// Complete theme configuration
export interface ThemeConfig {
  paletteId: string;
  fontPairId: string;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  languageSwitcher?: LanguageSwitcherConfig;
}

// Full theme with resolved values
export interface ResolvedTheme {
  palette: ThemePalette;
  fontPair: ThemeFontPair;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  // Computed CSS variables
  cssVariables: Record<string, string>;
}

// Theme preset combining palette and fonts
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  paletteId: string;
  fontPairId: string;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  tags: string[];
  preview?: {
    primaryColor: string;
    secondaryColor: string;
  };
}

// Spacing values in rem
export const SPACING_VALUES: Record<ThemeSpacing, { section: string; element: string; gap: string }> = {
  compact: { section: '3rem', element: '0.75rem', gap: '1rem' },
  comfortable: { section: '5rem', element: '1rem', gap: '1.5rem' },
  spacious: { section: '8rem', element: '1.5rem', gap: '2rem' },
};

// Border radius values
export const RADIUS_VALUES: Record<ThemeRadius, string> = {
  none: '0',
  small: '0.25rem',
  medium: '0.5rem',
  large: '1rem',
  full: '9999px',
};
