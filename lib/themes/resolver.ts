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
 * Generate CSS variables from palette
 */
function generatePaletteVariables(palette: ThemePalette): Record<string, string> {
  const { colors } = palette;
  return {
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--accent': colors.accent,
    '--accent-foreground': colors.accentForeground,
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--muted': colors.muted,
    '--muted-foreground': colors.mutedForeground,
    '--card': colors.card,
    '--card-foreground': colors.cardForeground,
    '--border': colors.border,
    '--input': colors.border,
    '--ring': colors.primary,
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
