/**
 * Theme System
 * Central exports for the theme system
 */

// Types
export type {
  ThemePalette,
  ThemeFontPair,
  ThemeSpacing,
  ThemeRadius,
  LanguageSwitcherStyle,
  LanguageSwitcherPosition,
  LanguageSwitcherConfig,
  ThemeConfig,
  ResolvedTheme,
  ThemePreset,
} from './types';

export { SPACING_VALUES, RADIUS_VALUES } from './types';

// Palettes
export { COLOR_PALETTES, getPaletteById, DEFAULT_PALETTE_ID } from './palettes';

// Fonts
export { FONT_PAIRS, getFontPairById, DEFAULT_FONT_PAIR_ID } from './fonts';

// Presets
export {
  THEME_PRESETS,
  getPresetById,
  getPresetsByTag,
  getPresetsForCategory,
  DEFAULT_PRESET_ID,
} from './presets';

// Resolver
export {
  resolveTheme,
  getThemeConfigFromPreset,
  getDefaultThemeConfig,
  generateCSSStyleString,
  applyThemeToElement,
  getGoogleFontsUrl,
} from './resolver';

export {
  resolveWebsiteTheme,
  getThemeDefaultSectionStyles,
  applyThemeDefaultsToSection,
  applyThemeDefaultsToSections,
} from './section-defaults';
