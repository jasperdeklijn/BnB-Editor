"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import * as Dialog from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { SectionIcon } from "@/components/sections/section-icon"
import { DEFAULT_FEATURE_ICON, resolveSectionIcon, type SectionIconId } from "@/lib/section-icons"

const IconPickerContent = dynamic(() => import("./section-icon-picker-content"), {
  loading: () => <p role="status" className="p-4 text-sm">Iconen laden…</p>,
})

export function SectionIconPicker({ value, onChange, label, defaultIcon = DEFAULT_FEATURE_ICON }: {
  value: unknown
  onChange: (icon: SectionIconId | null) => void
  label: string
  defaultIcon?: SectionIconId | null
}) {
  const [open, setOpen] = useState(false)
  const resolved = resolveSectionIcon(value === undefined ? defaultIcon : value, defaultIcon ?? DEFAULT_FEATURE_ICON)
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild>
      <Button type="button" variant="outline" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label={`Icoon kiezen voor ${label}`} title={`Icoon kiezen voor ${label}`}>
        {resolved === null ? <span aria-hidden="true">—</span> : <SectionIcon icon={resolved} />}
      </Button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border bg-background p-4 shadow-xl sm:p-6">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div><Dialog.Title className="font-semibold">Icoon kiezen</Dialog.Title><Dialog.Description className="text-sm text-muted-foreground">Kies een icoon voor {label}.</Dialog.Description></div>
          <Dialog.Close asChild><Button type="button" variant="ghost" size="sm" aria-label="Icoonkiezer sluiten">Sluiten</Button></Dialog.Close>
        </div>
        {open && <IconPickerContent value={resolved} defaultIcon={defaultIcon} onChange={(icon) => { onChange(icon); setOpen(false) }} />}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
