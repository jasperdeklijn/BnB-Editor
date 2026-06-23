/**
 * Theme Resolver
 * Converts theme configuration into resolved theme with CSS variables
 */

import type { ThemeConfig, ResolvedTheme, ThemePalette, ThemeFontPair } from './types';
import { SPACING_VALUES, RADIUS_VALUES } from './types';
import { getPaletteById, DEFAULT_PALETTE_ID } from './palettes';
import { getFontPairById, DEFAULT_FONT_PAIR_ID } from './fonts';
import { getPresetById, DEFAULT_PRESET_ID } from './presets';

/**
 * Convert hex color to HSL CSS value
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Generate CSS variables from palette
 */
function generatePaletteVariables(palette: ThemePalette): Record<string, string> {
  const { colors } = palette;
  return {
    '--primary': hexToHSL(colors.primary),
    '--primary-foreground': hexToHSL(colors.primaryForeground),
    '--secondary': hexToHSL(colors.secondary),
    '--secondary-foreground': hexToHSL(colors.secondaryForeground),
    '--accent': hexToHSL(colors.accent),
    '--accent-foreground': hexToHSL(colors.accentForeground),
    '--background': hexToHSL(colors.background),
    '--foreground': hexToHSL(colors.foreground),
    '--muted': hexToHSL(colors.muted),
    '--muted-foreground': hexToHSL(colors.mutedForeground),
    '--card': hexToHSL(colors.card),
    '--card-foreground': hexToHSL(colors.cardForeground),
    '--border': hexToHSL(colors.border),
    '--input': hexToHSL(colors.border),
    '--ring': hexToHSL(colors.primary),
    // Store raw hex values for direct use
    '--theme-primary': colors.primary,
    '--theme-primary-foreground': colors.primaryForeground,
    '--theme-secondary': colors.secondary,
    '--theme-secondary-foreground': colors.secondaryForeground,
    '--theme-accent': colors.accent,
    '--theme-accent-foreground': colors.accentForeground,
    '--theme-background': colors.background,
    '--theme-foreground': colors.foreground,
    '--theme-muted': colors.muted,
    '--theme-muted-foreground': colors.mutedForeground,
    '--theme-card': colors.card,
    '--theme-card-foreground': colors.cardForeground,
    '--theme-border': colors.border,
  };
}

/**
 * Generate CSS variables from font pair
 */
function generateFontVariables(fontPair: ThemeFontPair): Record<string, string> {
  return {
    '--font-heading': fontPair.headingFontFamily,
    '--font-body': fontPair.bodyFontFamily,
    '--theme-font-heading-name': fontPair.headingFont,
    '--theme-font-body-name': fontPair.bodyFont,
  };
}

/**
 * Generate CSS variables from spacing
 */
function generateSpacingVariables(spacing: ThemeConfig['spacing']): Record<string, string> {
  const values = SPACING_VALUES[spacing];
  return {
    '--spacing-section': values.section,
    '--spacing-element': values.element,
    '--spacing-gap': values.gap,
    '--theme-spacing': spacing,
  };
}

/**
 * Generate CSS variables from radius
 */
function generateRadiusVariables(radius: ThemeConfig['radius']): Record<string, string> {
  const value = RADIUS_VALUES[radius];
  return {
    '--radius': value,
    '--theme-radius': radius,
  };
}

/**
 * Resolve a theme configuration into a complete theme with CSS variables
 */
export function resolveTheme(config: ThemeConfig): ResolvedTheme {
  const palette = getPaletteById(config.paletteId) || getPaletteById(DEFAULT_PALETTE_ID)!;
  const fontPair = getFontPairById(config.fontPairId) || getFontPairById(DEFAULT_FONT_PAIR_ID)!;

  const cssVariables: Record<string, string> = {
    ...generatePaletteVariables(palette),
    ...generateFontVariables(fontPair),
    ...generateSpacingVariables(config.spacing),
    ...generateRadiusVariables(config.radius),
  };

  return {
    palette,
    fontPair,
    spacing: config.spacing,
    radius: config.radius,
    cssVariables,
  };
}

/**
 * Get theme config from a preset ID
 */
export function getThemeConfigFromPreset(presetId: string): ThemeConfig {
  const preset = getPresetById(presetId);
  if (!preset) {
    const defaultPreset = getPresetById(DEFAULT_PRESET_ID)!;
    return {
      paletteId: defaultPreset.paletteId,
      fontPairId: defaultPreset.fontPairId,
      spacing: defaultPreset.spacing,
      radius: defaultPreset.radius,
    };
  }

  return {
    paletteId: preset.paletteId,
    fontPairId: preset.fontPairId,
    spacing: preset.spacing,
    radius: preset.radius,
  };
}

/**
 * Get default theme config
 */
export function getDefaultThemeConfig(): ThemeConfig {
  return getThemeConfigFromPreset(DEFAULT_PRESET_ID);
}

/**
 * Generate CSS style string from CSS variables
 */
export function generateCSSStyleString(cssVariables: Record<string, string>): string {
  return Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');
}

/**
 * Apply theme CSS variables to an element
 */
export function applyThemeToElement(element: HTMLElement, theme: ResolvedTheme): void {
  Object.entries(theme.cssVariables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Generate Google Fonts link tag URL for a theme
 */
export function getGoogleFontsUrl(fontPair: ThemeFontPair): string | undefined {
  return fontPair.googleFontsUrl;
}
