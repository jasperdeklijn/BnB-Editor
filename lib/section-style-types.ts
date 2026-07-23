export type SectionStyleType = "clean" | "bold" | "elegant" | "soft" | "dark" | "outline"

export interface SectionStyleTypeOption {
  value: SectionStyleType
  label: string
  description: string
}

export const SECTION_STYLE_TYPE_OPTIONS: SectionStyleTypeOption[] = [
  { value: "clean", label: "Clean", description: "Rustig, helder en modern" },
  { value: "bold", label: "Krachtig", description: "Zware typografie en sterke accenten" },
  { value: "elegant", label: "Elegant", description: "Verfijnde vormen en klassieke typografie" },
  { value: "soft", label: "Zacht", description: "Ronde vormen en vriendelijke details" },
  { value: "dark", label: "Donker", description: "Donkere basis met helder contrast" },
  { value: "outline", label: "Omlijnd", description: "Lijnen, kaders en transparante accenten" },
]

export function normalizeSectionStyleType(value: unknown): SectionStyleType {
  if (typeof value !== "string") return "clean"
  return SECTION_STYLE_TYPE_OPTIONS.some((option) => option.value === value)
    ? value as SectionStyleType
    : "clean"
}
