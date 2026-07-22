import type {
  LanguageSwitcherConfig,
  LanguageSwitcherPosition,
  LanguageSwitcherStyle,
} from "@/lib/themes"

export const DEFAULT_LANGUAGE_SWITCHER_CONFIG: LanguageSwitcherConfig = {
  style: "dropdown",
  position: "nav-right",
}

const STYLES = new Set<LanguageSwitcherStyle>(["dropdown", "buttons", "compact"])
const POSITIONS = new Set<LanguageSwitcherPosition>(["nav-left", "nav-right", "bottom-left", "bottom-right"])

export function normalizeLanguageSwitcherConfig(value: unknown): LanguageSwitcherConfig {
  const candidate = value && typeof value === "object" ? value as Partial<LanguageSwitcherConfig> : {}

  return {
    style: candidate.style && STYLES.has(candidate.style) ? candidate.style : DEFAULT_LANGUAGE_SWITCHER_CONFIG.style,
    position: candidate.position && POSITIONS.has(candidate.position) ? candidate.position : DEFAULT_LANGUAGE_SWITCHER_CONFIG.position,
  }
}
