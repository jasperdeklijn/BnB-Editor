"use client"

import { useState, useTransition } from "react"
import { Copy, CheckCircle, ExternalLink, Globe, Eye, Wifi, WifiOff, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PLATFORM_DOMAIN = "bnbwebsitemaken.nl"

interface DomainDashboardProps {
  slug: string
  currentCustomDomain: string | null
  isPublished: boolean
}

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
      className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

function UrlCard({
  label,
  icon,
  url,
  badge,
}: {
  label: string
  icon: React.ReactNode
  url: string
  badge?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {badge}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground font-mono truncate">{url}</span>
          <CopyButton value={`https://${url}`} />
          <a
            href={`https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

type VerifyStatus = "idle" | "checking" | "connected" | "error"

export function DomainDashboard({ slug, currentCustomDomain, isPublished }: DomainDashboardProps) {
  const [customDomain, setCustomDomain] = useState(currentCustomDomain || "")
  const [savedDomain, setSavedDomain] = useState(currentCustomDomain || "")
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle")
  const [verifyMessage, setVerifyMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const previewUrl = `preview-${slug}.${PLATFORM_DOMAIN}`
  const liveUrl = `${slug}.${PLATFORM_DOMAIN}`

  const handleSaveDomain = async () => {
    startTransition(async () => {
      const res = await fetch("/api/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, customDomain: customDomain.trim() || null }),
      })
      if (res.ok) {
        setSavedDomain(customDomain.trim())
        setVerifyStatus("idle")
      }
    })
  }

  const handleVerify = async () => {
    setVerifyStatus("checking")
    setVerifyMessage("")
    const domain = savedDomain || customDomain.trim()
    if (!domain) return
    const res = await fetch(`/api/domain/verify?domain=${encodeURIComponent(domain)}`)
    const json = await res.json()
    if (json.connected) {
      setVerifyStatus("connected")
      setVerifyMessage("Domain is connected and resolving correctly.")
    } else {
      setVerifyStatus("error")
      setVerifyMessage(json.message || "Domain does not appear to be connected yet.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Platform URLs */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Your URLs</h2>
        <div className="space-y-3">
          <UrlCard
            label="Preview URL"
            icon={<Eye className="h-4 w-4" />}
            url={previewUrl}
            badge={
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                Draft
              </span>
            }
          />
          <UrlCard
            label="Live URL"
            icon={<Globe className="h-4 w-4" />}
            url={liveUrl}
            badge={
              isPublished ? (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  Published
                </span>
              ) : (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  Not published
                </span>
              )
            }
          />
        </div>
      </section>

      {/* Custom Domain */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Custom Domain</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-domain" className="text-sm">
              Your domain
            </Label>
            <div className="flex gap-2">
              <Input
                id="custom-domain"
                placeholder="mybnb.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="font-mono text-sm"
              />
              <Button onClick={handleSaveDomain} disabled={isPending} size="sm">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter your root domain without <code className="font-mono">https://</code> or <code className="font-mono">www</code>.
            </p>
          </div>

          {savedDomain && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                {verifyStatus === "connected" ? (
                  <Wifi className="h-4 w-4 text-green-600" />
                ) : verifyStatus === "error" ? (
                  <WifiOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono text-muted-foreground">{savedDomain}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={verifyStatus === "checking"}
              >
                {verifyStatus === "checking" ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : null}
                {verifyStatus === "checking" ? "Checking..." : "Verify"}
              </Button>
            </div>
          )}

          {verifyMessage && (
            <div
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                verifyStatus === "connected"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {verifyStatus === "connected" ? (
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{verifyMessage}</span>
            </div>
          )}
        </div>
      </section>

      {/* DNS Instructions */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">DNS Configuration</h2>
        <div className="space-y-4">
          {/* Custom domain */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Custom domain</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Point your domain to Vercel by adding these records at your DNS provider.
            </p>
            <DnsTable
              rows={[
                { type: "A", host: "@", value: "76.76.21.21" },
                { type: "CNAME", host: "www", value: "cname.vercel-dns.com" },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function DnsTable({ rows }: { rows: { type: string; host: string; value: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Type</th>
            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Host</th>
            <th className="px-3 py-2 text-left text-muted-foreground font-medium">Value</th>
            <th className="px-3 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary font-semibold text-[10px]">
                  {row.type}
                </span>
              </td>
              <td className="px-3 py-2 text-foreground">{row.host}</td>
              <td className="px-3 py-2 text-foreground truncate max-w-[180px]">{row.value}</td>
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
