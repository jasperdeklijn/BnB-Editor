"use client"

import type { SectionTargetOption } from "@/components/editor/section-editor-types"

interface SectionLinkSelectProps {
  value: string
  onChange: (value: string) => void
  options: SectionTargetOption[]
  ariaLabel: string
  emptyLabel?: string
}

export function SectionLinkSelect({
  value,
  onChange,
  options,
  ariaLabel,
  emptyLabel = "Kies een sectie",
}: SectionLinkSelectProps) {
  const hasKnownValue = !value || options.some((option) => option.value === value)

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
    >
      <option value="">{emptyLabel}</option>
      {!hasKnownValue ? <option value={value}>{value}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
