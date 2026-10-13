"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { StatusMessage } from "@/components/ui/status-message"
import { createClient } from "@/lib/supabase/client"
import type { WebsiteAnalyticsFields, WebsiteSeoFields } from "@/lib/seo/metadata"

interface SeoEssentialsClientProps {
  advancedAllowed: boolean
  websiteId: string
  pageId?: string
  businessId?: string | null
  initialSeo?: WebsiteSeoFields | null
  initialAnalytics?: WebsiteAnalyticsFields | null
  initialSocialLinks?: Record<string, string> | null
}

export function SeoEssentialsClient({
  advancedAllowed,
  websiteId,
  pageId,
  businessId,
  initialSeo,
  initialAnalytics,
  initialSocialLinks,
}: SeoEssentialsClientProps) {
  const [seo, setSeo] = useState<WebsiteSeoFields>(initialSeo ?? {})
  const [analytics, setAnalytics] = useState<WebsiteAnalyticsFields>(initialAnalytics ?? {})
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(initialSocialLinks ?? {})
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null)
  const { setIsSaving: setHeaderSaving, setSaveState } = useEditorLayout()

  const updateSeo = (key: keyof WebsiteSeoFields, value: string) => {
    setSeo((current) => ({ ...current, [key]: value }))
  }

  const updateAnalytics = (key: keyof WebsiteAnalyticsFields, value: string | boolean) => {
    setAnalytics((current) => ({ ...current, [key]: value }))
  }

  const updateSocial = (key: string, value: string) => {
    setSocialLinks((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setHeaderSaving(true)
    setStatus(null)
    const supabase = createClient()
    if (pageId) {
      const { error } = await supabase.from("website_pages").update({ seo }).eq("id", pageId).eq("website_id", websiteId)
      if (error) {
        setIsSaving(false); setHeaderSaving(false); setSaveState("error")
        setStatus({ tone: "error", text: "Opslaan van pagina-SEO is mislukt." }); return
      }
    }

    const { error: websiteError } = await supabase
      .from("websites")
      .update({ ...(pageId ? {} : { seo }), analytics, updated_at: new Date().toISOString() })
      .eq("id", websiteId)

    if (websiteError) {
      setIsSaving(false)
      setHeaderSaving(false)
      setSaveState("error")
      setStatus({ tone: "error", text: "Opslaan van SEO-instellingen is mislukt." })
      return
    }

    if (businessId) {
      const { error: businessError } = await supabase
        .from("businesses")
        .update({ social_links: socialLinks })
        .eq("id", businessId)

      if (businessError) {
        setIsSaving(false)
        setHeaderSaving(false)
        setSaveState("error")
        setStatus({ tone: "warning", text: "SEO opgeslagen, maar social links opslaan is mislukt." })
        return
      }
    }

    setIsSaving(false)
    setHeaderSaving(false)
    setStatus({ tone: "success", text: "SEO, social links en analytics zijn opgeslagen." })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">{pageId ? "Pagina-SEO en deelinformatie" : "Websitebrede SEO-standaarden"}</h2>
          {pageId ? <p className="mt-2 text-sm text-muted-foreground">Lege velden gebruiken de websitebrede standaard. Een lege canonieke URL volgt automatisch het pagina-adres.</p> : null}
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="seo-title">SEO titel</Label>
              <Input id="seo-title" value={seo.title ?? ""} onChange={(event) => updateSeo("title", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="seo-description">SEO beschrijving</Label>
              <Textarea id="seo-description" value={seo.description ?? ""} onChange={(event) => updateSeo("description", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="seo-og">OpenGraph afbeelding URL</Label>
              <Input id="seo-og" disabled={!advancedAllowed} value={seo.ogImage ?? ""} onChange={(event) => updateSeo("ogImage", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="seo-canonical">Canonieke URL</Label>
              <Input id="seo-canonical" disabled={!advancedAllowed} value={seo.canonicalUrl ?? ""} onChange={(event) => updateSeo("canonicalUrl", event.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Social links</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {['facebook', 'instagram', 'linkedin', 'tiktok'].map((key) => (
              <div key={key}>
                <Label htmlFor={`social-${key}`} className="capitalize">{key}</Label>
                <Input id={`social-${key}`} value={socialLinks[key] ?? ""} onChange={(event) => updateSocial(key, event.target.value)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="h-fit p-6">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <a className="inline-flex min-h-11 text-sm text-primary underline" href={`/editor/analytics?websiteId=${websiteId}`}>Statistieken bekijken</a>
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={analytics.firstPartyEnabled === true} onChange={(event) => updateAnalytics("firstPartyEnabled", event.target.checked)} />Eerste-partijstatistieken inschakelen na bezoekerstoestemming</label>
        <p className="mt-3 text-xs text-muted-foreground">GA4 verzamelt alleen na toestemming. Een Measurement ID geeft geen toegang tot Google-rapporten. Wijzigingen in SEO verschijnen na publicatie; de statistiekenschakelaar werkt direct.</p>
        {!advancedAllowed ? <p className="mt-3 text-sm">Uitgebreide SEO en GA4 vanaf Silver. <a className="text-primary underline" href="/editor/account/billing">Abonnement bekijken</a></p> : null}
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="analytics-provider">Provider</Label>
            <Input id="analytics-provider" disabled={!advancedAllowed} placeholder="google-analytics" value={analytics.provider ?? ""} onChange={(event) => updateAnalytics("provider", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="analytics-id">Measurement ID</Label>
            <Input id="analytics-id" disabled={!advancedAllowed} placeholder="G-XXXXXXXXXX" value={analytics.measurementId ?? ""} onChange={(event) => updateAnalytics("measurementId", event.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!advancedAllowed} checked={analytics.consentMode !== false} onChange={(event) => updateAnalytics("consentMode", event.target.checked)} />
            Consent mode gebruiken
          </label>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Opslaan..." : "Instellingen opslaan"}
          </Button>
          {status ? <StatusMessage tone={status.tone}>{status.text}</StatusMessage> : null}
        </div>
      </Card>
    </div>
  )
}
