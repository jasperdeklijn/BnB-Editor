"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Globe2, Loader2, Plus, Settings2, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SUPPORTED_WEBSITE_LOCALES,
  type SupportedWebsiteLocale,
  type WebsiteLocale,
} from "@/lib/i18n/locales"
import { normalizeLanguageSwitcherConfig } from "@/lib/i18n/language-switcher"
import type { LanguageSwitcherConfig, LanguageSwitcherPosition, LanguageSwitcherStyle } from "@/lib/themes"

interface WebsiteLanguageControlProps {
  locales: WebsiteLocale[]
  activeLocale: SupportedWebsiteLocale
  onLocaleChange: (locale: SupportedWebsiteLocale) => void
  onAdd: (locale: SupportedWebsiteLocale) => Promise<void>
  onToggle: (locale: SupportedWebsiteLocale, enabled: boolean) => Promise<void>
  onRemove: (locale: SupportedWebsiteLocale) => Promise<void>
  onUpdate: (locale: SupportedWebsiteLocale, updates: { display_name?: string; path_segment?: string; seo?: Record<string, unknown> }) => Promise<void>
  onSetDefault: (locale: SupportedWebsiteLocale) => Promise<void>
  languageSwitcher?: LanguageSwitcherConfig
  onLanguageSwitcherChange: (config: LanguageSwitcherConfig) => Promise<void>
  canSetDefault?: boolean
  statuses?: Partial<Record<SupportedWebsiteLocale, "complete" | "missing" | "stale">>
  mobile?: boolean
}

export function WebsiteLanguageControl({
  locales,
  activeLocale,
  onLocaleChange,
  onAdd,
  onToggle,
  onRemove,
  onUpdate,
  onSetDefault,
  languageSwitcher,
  onLanguageSwitcherChange,
  canSetDefault = false,
  statuses = {},
  mobile = false,
}: WebsiteLanguageControlProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const [busyLocale, setBusyLocale] = useState<SupportedWebsiteLocale | null>(null)
  const [isSavingSwitcher, setIsSavingSwitcher] = useState(false)
  const switcher = normalizeLanguageSwitcherConfig(languageSwitcher)
  const available = useMemo(
    () => SUPPORTED_WEBSITE_LOCALES.filter((supported) => !locales.some((locale) => locale.locale === supported.locale)),
    [locales],
  )

  const run = async (locale: SupportedWebsiteLocale, action: () => Promise<void>) => {
    setBusyLocale(locale)
    try {
      await action()
    } catch {
      // The parent action owns user-facing error feedback.
    } finally {
      setBusyLocale(null)
    }
  }

  const updateSwitcher = async (updates: Partial<LanguageSwitcherConfig>) => {
    setIsSavingSwitcher(true)
    try {
      await onLanguageSwitcherChange({ ...switcher, ...updates })
    } catch {
      // The parent action owns user-facing error feedback.
    } finally {
      setIsSavingSwitcher(false)
    }
  }

  const styleOptions: Array<{ value: LanguageSwitcherStyle; label: string }> = [
    { value: "dropdown", label: "Keuzelijst" },
    { value: "buttons", label: "Taalbuttons" },
    { value: "compact", label: "Compact" },
  ]
  const positionOptions: Array<{ value: LanguageSwitcherPosition; label: string }> = [
    { value: "nav-left", label: "Navigatie links" },
    { value: "nav-right", label: "Navigatie rechts" },
    { value: "bottom-left", label: "Linksonder zwevend" },
    { value: "bottom-right", label: "Rechtsonder zwevend" },
  ]

  return (
    <>
      <div className={mobile
        ? "flex min-h-11 items-center gap-2 rounded-xl border border-border bg-gradient-to-b from-background to-muted/30 px-3 shadow-sm transition-all hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
        : "flex h-8 shrink-0 items-center gap-1 rounded-lg border border-input bg-gradient-to-b from-background to-muted/30 px-1.5 text-xs shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"}
      >
        <Globe2 className="h-4 w-4 shrink-0 text-primary" />
        {mobile ? <span className="shrink-0 text-sm font-medium">Taal van website</span> : null}
        <label htmlFor={mobile ? "website-locale-mobile" : "website-locale"} className="sr-only">
          Taal om te bewerken
        </label>
        <div className={`${mobile ? "ml-auto min-w-0 flex-1" : "w-36"} group relative`}>
          <select
            id={mobile ? "website-locale-mobile" : "website-locale"}
            value={activeLocale}
            onChange={(event) => onLocaleChange(event.target.value as SupportedWebsiteLocale)}
            className={`${mobile ? "text-right text-sm" : "text-xs"} h-7 w-full cursor-pointer appearance-none border-0 bg-transparent pl-1 pr-6 font-semibold text-foreground outline-none`}
          >
            {locales.map((locale) => (
              <option key={locale.locale} value={locale.locale}>
                {locale.display_name}{locale.is_default && mobile ? " (standaard)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-transform group-focus-within:rotate-180 group-focus-within:text-primary" />
        </div>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-l border-border/70 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Talen beheren"
          title="Talen beheren"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {managerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="language-manager-title">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="language-manager-title" className="text-lg font-semibold">Talen beheren</h2>
                <p className="mt-1 text-sm text-muted-foreground">Voeg talen toe en bepaal welke vertalingen na publicatie beschikbaar zijn.</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setManagerOpen(false)} aria-label="Sluiten">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <section className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Taalkeuze op de website</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Kies hoe en waar bezoekers van taal wisselen.</p>
                </div>
                {isSavingSwitcher ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /> : null}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-foreground">Weergave</p>
                <div className="grid grid-cols-3 gap-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSavingSwitcher}
                      onClick={() => void updateSwitcher({ style: option.value })}
                      className={`min-h-16 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                        switcher.style === option.value
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="mb-1.5 flex min-h-6 items-center justify-center gap-1" aria-hidden="true">
                        <Globe2 className="h-3.5 w-3.5" />
                        {option.value === "dropdown" ? <span className="rounded border border-current/30 px-1">NL⌄</span> : null}
                        {option.value === "buttons" ? <><span className="rounded bg-primary px-1 text-primary-foreground">NL</span><span>EN</span></> : null}
                        {option.value === "compact" ? <span>NL</span> : null}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-foreground">Locatie</p>
                <div className="grid grid-cols-2 gap-2">
                  {positionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSavingSwitcher}
                      onClick={() => void updateSwitcher({ position: option.value })}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                        switcher.position === option.value
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-5 space-y-2">
              {locales.map((locale) => (
                <div key={locale.locale} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    {locale.is_default ? <p className="font-medium">{locale.display_name}</p> : (
                      <input
                        aria-label={`Naam voor ${locale.display_name}`}
                        defaultValue={locale.display_name}
                        onBlur={(event) => event.target.value.trim() !== locale.display_name && void run(locale.locale, () => onUpdate(locale.locale, { display_name: event.target.value.trim() }))}
                        className="h-7 w-full rounded border border-transparent bg-transparent px-1 font-medium hover:border-input focus:border-input"
                      />
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {locale.is_default ? <span>/</span> : (
                        <label className="flex items-center">/
                          <input
                            aria-label={`Webadres voor ${locale.display_name}`}
                            defaultValue={locale.path_segment}
                            onBlur={(event) => event.target.value.trim() !== locale.path_segment && void run(locale.locale, () => onUpdate(locale.locale, { path_segment: event.target.value.trim().toLowerCase() }))}
                            className="w-16 border-0 bg-transparent px-0.5 outline-none"
                          />
                        </label>
                      )}
                      <span className={statuses[locale.locale] === "complete" ? "text-emerald-700" : statuses[locale.locale] === "stale" ? "text-amber-700" : "text-muted-foreground"}>
                        {statuses[locale.locale] === "complete" ? "Compleet" : statuses[locale.locale] === "stale" ? "Verouderd" : "Ontbreekt"}
                      </span>
                    </div>
                    {!locale.is_default && canSetDefault ? (
                      <button type="button" className="mt-1 text-xs font-medium text-primary hover:underline" onClick={() => void run(locale.locale, () => onSetDefault(locale.locale))}>
                        Standaard maken
                      </button>
                    ) : null}
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Vindbaarheid in zoekmachines</summary>
                      <input
                        aria-label={`SEO-titel voor ${locale.display_name}`}
                        defaultValue={typeof locale.seo?.title === "string" ? locale.seo.title : ""}
                        placeholder="Paginatitel voor zoekmachines"
                        onBlur={(event) => void run(locale.locale, () => onUpdate(locale.locale, { seo: { ...locale.seo, title: event.target.value } }))}
                        className="mt-2 h-8 w-full rounded border border-input bg-background px-2"
                      />
                      <textarea
                        aria-label={`SEO-beschrijving voor ${locale.display_name}`}
                        defaultValue={typeof locale.seo?.description === "string" ? locale.seo.description : ""}
                        placeholder="Omschrijving voor zoekmachines"
                        onBlur={(event) => void run(locale.locale, () => onUpdate(locale.locale, { seo: { ...locale.seo, description: event.target.value } }))}
                        rows={2}
                        className="mt-2 w-full rounded border border-input bg-background px-2 py-1"
                      />
                    </details>
                  </div>
                  {locale.is_default ? (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Standaard</span>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={locale.is_enabled}
                          disabled={busyLocale === locale.locale}
                          onChange={(event) => void run(locale.locale, () => onToggle(locale.locale, event.target.checked))}
                        />
                        Publiceren
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={busyLocale === locale.locale}
                        onClick={() => {
                          if (window.confirm(`${locale.display_name} en alle vertalingen verwijderen?`)) {
                            void run(locale.locale, () => onRemove(locale.locale))
                          }
                        }}
                        aria-label={`${locale.display_name} verwijderen`}
                      >
                        {busyLocale === locale.locale ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {available.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taal toevoegen</p>
                <div className="flex flex-wrap gap-2">
                  {available.map((locale) => (
                    <Button
                      key={locale.locale}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyLocale === locale.locale}
                      onClick={() => void run(locale.locale, () => onAdd(locale.locale))}
                    >
                      {busyLocale === locale.locale ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {locale.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
