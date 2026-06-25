import type { Section, SectionStyles } from "@/lib/types"
import type { ResolvedTheme, ThemeConfig } from "./types"
import { getDefaultThemeConfig, resolveTheme } from "./resolver"

export function resolveWebsiteTheme(config?: ThemeConfig | null): ResolvedTheme {
  return resolveTheme(config ?? getDefaultThemeConfig())
}

export function getThemeDefaultSectionStyles(theme: ResolvedTheme): SectionStyles {
  return {
    backgroundColor: theme.palette.colors.background,
    textColor: theme.palette.colors.foreground,
  }
}

export function applyThemeDefaultsToSection(section: Section, theme: ResolvedTheme): Section {
  const defaultStyles = getThemeDefaultSectionStyles(theme)

  return {
    ...section,
    styles: {
      ...defaultStyles,
      ...(section.styles ?? {}),
    },
  }
}

export function applyThemeDefaultsToSections(sections: Section[], config?: ThemeConfig | null): Section[] {
  const theme = resolveWebsiteTheme(config)
  return sections.map((section) => applyThemeDefaultsToSection(section, theme))
}
