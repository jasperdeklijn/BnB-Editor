"use client"

import { useMemo, useState, useTransition } from "react"
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Info,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StatusMessage } from "@/components/ui/status-message"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PLATFORM_DOMAIN } from "@/lib/platform"

type DomainWebsite = {
  id: string
  title: string
  slug: string
  customDomain: string | null
  isPublished: boolean
}

interface DomainDashboardProps {
  websites: DomainWebsite[]
}

type VerifyStatus = "idle" | "checking" | "connected" | "error"
type Message = { type: "success" | "error"; text: string } | null

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function UrlCard({
  label,
  icon,
  url,
  badge,
  children,
}: {
  label: string
  icon: React.ReactNode
  url: string
  badge?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
        <div className="flex items-center gap-1">
          <span className="truncate font-mono text-sm text-muted-foreground">{url}</span>
          <CopyButton value={`https://${url}`} />
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </div>
  )
}

export function DomainDashboard({ websites }: DomainDashboardProps) {
  const initialWebsite = websites.find((website) => website.isPublished) || websites[0]
  const [websiteList, setWebsiteList] = useState(websites)
  const [selectedWebsiteId, setSelectedWebsiteId] = useState(initialWebsite?.id ?? "")
  const selectedWebsite = useMemo(
    () => websiteList.find((website) => website.id === selectedWebsiteId) || websiteList[0],
    [selectedWebsiteId, websiteList],
  )
  const [customDomain, setCustomDomain] = useState(selectedWebsite?.customDomain || "")
  const [savedDomain, setSavedDomain] = useState(selectedWebsite?.customDomain || "")
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle")
  const [verifyMessage, setVerifyMessage] = useState("")
  const [message, setMessage] = useState<Message>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { setIsSaving, setSaveState } = useEditorLayout()

  const previewUrl = selectedWebsite ? `preview-${selectedWebsite.slug}.${PLATFORM_DOMAIN}` : ""
  const liveUrl = selectedWebsite ? `${selectedWebsite.slug}.${PLATFORM_DOMAIN}` : ""

  const updateSelectedWebsiteDomain = (domain: string | null) => {
    setWebsiteList((current) =>
      current.map((website) =>
        website.id === selectedWebsite?.id
          ? {
              ...website,
              customDomain: domain,
            }
          : website,
      ),
    )
  }

  const handleWebsiteSelect = (websiteId: string) => {
    const nextWebsite = websiteList.find((website) => website.id === websiteId)
    setSelectedWebsiteId(websiteId)
    setCustomDomain(nextWebsite?.customDomain || "")
    setSavedDomain(nextWebsite?.customDomain || "")
    setVerifyStatus("idle")
    setVerifyMessage("")
    setMessage(null)
  }

  const saveDomain = async (domain: string | null) => {
    if (!selectedWebsite) return

    setIsSaving(true)
    const res = await fetch("/api/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: selectedWebsite.id, customDomain: domain }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setIsSaving(false)
      setSaveState("error")
      setMessage({ type: "error", text: json?.error || "Domein kon niet worden opgeslagen." })
      return
    }

    const normalized = json.customDomain || ""
    setCustomDomain(normalized)
    setSavedDomain(normalized)
    updateSelectedWebsiteDomain(normalized || null)
    setVerifyStatus("idle")
    setVerifyMessage("")
    setMessage({
      type: "success",
      text: normalized ? "Domein opgeslagen en naar Vercel gestuurd." : "Domein verwijderd.",
    })
    setIsSaving(false)
  }

  const handleSaveDomain = async () => {
    setMessage(null)
    startTransition(() => {
      void saveDomain(customDomain.trim() || null)
    })
  }

  const handleRemoveDomain = async () => {
    setMessage(null)
    startTransition(() => {
      void saveDomain(null)
    })
  }

  const handleVerify = async () => {
    setVerifyStatus("checking")
    setVerifyMessage("")
    setMessage(null)
    const domain = savedDomain || customDomain.trim()
    if (!domain) return
    const res = await fetch(`/api/domain/verify?domain=${encodeURIComponent(domain)}`)
    const json = await res.json()
    if (json.connected) {
      setVerifyStatus("connected")
      setVerifyMessage("Domein is verbonden en verwijst naar Vercel.")
    } else {
      setVerifyStatus("error")
      setVerifyMessage(json.message || "Domein lijkt nog niet verbonden.")
    }
  }

  const handlePublishChange = async (published: boolean) => {
    if (!selectedWebsite) return

    setIsPublishing(true)
    setIsSaving(true)
    setMessage(null)

    const response = await fetch("/api/websites/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: selectedWebsite.id, published }),
    })
    const result = await response.json().catch(() => ({}))

    setIsPublishing(false)

    if (!response.ok) {
      setIsSaving(false)
      setSaveState("error")
      setMessage({ type: "error", text: result?.error || "Live status kon niet worden bijgewerkt." })
      return
    }

    setWebsiteList((current) =>
      current.map((website) => ({
        ...website,
        isPublished: published ? website.id === selectedWebsite.id : website.id === selectedWebsite.id ? false : website.isPublished,
      })),
    )
    setMessage({
      type: "success",
      text: published ? "Deze website staat nu live." : "Deze website staat niet meer live.",
    })
    setIsSaving(false)
  }

  if (!selectedWebsite) {
    return null
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="website-domain-selector" className="text-sm font-medium">
            Website
          </Label>
          <select
            id="website-domain-selector"
            value={selectedWebsite.id}
            onChange={(event) => handleWebsiteSelect(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {websiteList.map((website) => (
              <option key={website.id} value={website.id}>
                {website.title} ({website.slug}){website.isPublished ? " - live" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kies welke van uw eigen websites aan deze domeininstellingen wordt gekoppeld.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Uw URLs</h2>
        <div className="space-y-3">
          <UrlCard
            label="Preview URL"
            icon={<Eye className="h-4 w-4" />}
            url={previewUrl}
            badge={<span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">Preview</span>}
          >
            <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>De preview is alleen zichtbaar voor u wanneer u bent ingelogd.</span>
            </div>
          </UrlCard>
          <UrlCard
            label="Live URL"
            icon={<Globe className="h-4 w-4" />}
            url={liveUrl}
            badge={
              selectedWebsite.isPublished ? (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Live</span>
              ) : (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Niet live
                </span>
              )
            }
          >
            <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">Live publiceren</p>
                <p className="text-xs text-muted-foreground">Er kan maar een website tegelijk live staan.</p>
              </div>
              <div className="flex items-center gap-2">
                {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                <Switch
                  checked={selectedWebsite.isPublished}
                  onCheckedChange={handlePublishChange}
                  disabled={isPublishing}
                  aria-label="Live status wijzigen"
                />
              </div>
            </div>
          </UrlCard>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Eigen domein</h2>
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="custom-domain" className="text-sm">
              Domeinnaam
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="custom-domain"
                placeholder="mijnbedrijf.nl"
                value={customDomain}
                onChange={(event) => setCustomDomain(event.target.value)}
                className="font-mono text-sm"
              />
              <Button onClick={handleSaveDomain} disabled={isPending} size="sm">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Vul het hoofddomein in zonder <code className="font-mono">https://</code> of{" "}
              <code className="font-mono">www</code>.
            </p>
          </div>

          {savedDomain ? (
            <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                {verifyStatus === "connected" ? (
                  <Wifi className="h-4 w-4 shrink-0 text-primary" />
                ) : verifyStatus === "error" ? (
                  <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-mono text-muted-foreground">{savedDomain}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleVerify} disabled={verifyStatus === "checking"}>
                  {verifyStatus === "checking" ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  {verifyStatus === "checking" ? "Controleren..." : "Controleer"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                      Verwijderen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Domein verwijderen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dit verwijdert {savedDomain} uit deze website en koppelt het domein los van Vercel. DNS-records bij uw
                        provider blijven staan totdat u ze daar zelf verwijdert.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveDomain}>Verwijderen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : null}

          {verifyMessage ? (
            <StatusMessage tone={verifyStatus === "connected" ? "success" : "error"}>{verifyMessage}</StatusMessage>
          ) : null}
          {message ? <StatusMessage tone={message.type}>{message.text}</StatusMessage> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">DNS configuratie</h2>
        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium text-foreground">DNS-records voor uw eigen domein</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Voeg deze records toe bij uw domeinprovider. DNS-wijzigingen kunnen enkele minuten tot 24 uur nodig hebben.
            </p>
          </div>
          <DnsTable
            rows={[
              { type: "A", host: "@", value: "76.76.21.21", purpose: "Verbindt het hoofddomein met Vercel." },
              { type: "CNAME", host: "www", value: "cname.vercel-dns.com", purpose: "Verbindt www met Vercel." },
            ]}
          />
          <ol className="grid gap-3 text-sm text-muted-foreground">
            <li className="rounded-md bg-muted/50 p-3">
              <span className="font-medium text-foreground">1. Open uw DNS-beheer.</span> Ga naar de provider waar uw domein
              is gekocht en open de DNS- of nameserver-instellingen.
            </li>
            <li className="rounded-md bg-muted/50 p-3">
              <span className="font-medium text-foreground">2. Voeg de records toe.</span> Gebruik exact het type, de naam
              en de waarde uit de tabel. Verwijder conflicterende A- of CNAME-records voor dezelfde naam.
            </li>
            <li className="rounded-md bg-muted/50 p-3">
              <span className="font-medium text-foreground">3. Controleer de status.</span> Sla de records op en klik daarna
              op Controleer. Als de status nog niet goed is, wacht dan even en probeer opnieuw.
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}

function DnsTable({
  rows,
}: {
  rows: { type: string; host: string; value: string; purpose: string }[]
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Naam</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Waarde</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Gebruik</th>
            <th className="w-8 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.type}-${row.host}`} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {row.type}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-foreground">{row.host}</td>
              <td className="max-w-[180px] truncate px-3 py-2 font-mono text-foreground">{row.value}</td>
              <td className="min-w-[160px] px-3 py-2 text-muted-foreground">{row.purpose}</td>
              <td className="px-3 py-2">
                <CopyButton value={row.value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
