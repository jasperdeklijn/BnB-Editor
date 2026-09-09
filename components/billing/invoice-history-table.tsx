"use client"

import { Invoice } from "@/lib/types/pricing"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { formatPrice } from "@/lib/pricing"
import { toast } from "sonner"

interface InvoiceHistoryTableProps {
  invoices: Invoice[]
  isLoading?: boolean
  onDownloadPDF?: (invoiceId: string) => void
}

/**
 * Invoice History Table Component
 * Displays past invoices with download links
 */
export function InvoiceHistoryTable({
  invoices,
  isLoading = false,
  onDownloadPDF,
}: InvoiceHistoryTableProps) {
  const handleDownload = (invoiceId: string) => {
    if (onDownloadPDF) {
      onDownloadPDF(invoiceId)
    } else {
      toast.info("PDF-download niet beschikbaar")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-secondary rounded animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">
          Geen facturen
        </h3>
        <p className="text-sm text-muted-foreground">
          Je facturen worden hier weergegeven zodra je abonnement actief is.
        </p>
      </div>
    )
  }

  return (
    <div className="@container min-w-0">
      <ul className="space-y-3 @[40rem]:hidden">
        {invoices.map((invoice) => (
          <li key={invoice.id} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="font-semibold text-foreground [overflow-wrap:anywhere]">{invoice.planName}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Datum</dt><dd>{new Date(invoice.date).toLocaleDateString("nl-NL", { year: "numeric", month: "long", day: "numeric" })}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Bedrag</dt><dd className="font-medium">{formatPrice(invoice.amount)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Status</dt><dd>{{ paid: "Betaald", past_due: "Te betalen", draft: "Concept", uncollectible: "Oninbaar", void: "Ongeldig" }[invoice.status]}</dd></div>
            </dl>
            {invoice.pdfUrl ? (
              <Button variant="outline" onClick={() => handleDownload(invoice.id)} className="mt-4 min-h-11 w-full gap-2"><Download className="h-4 w-4" />PDF downloaden</Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm @[40rem]:block">
      <table className="w-full table-fixed [overflow-wrap:anywhere]">
        <thead>
          <tr className="border-b border-border bg-secondary/60">
            <th className="px-3 py-4 text-left text-sm font-semibold text-foreground">
              Datum
            </th>
            <th className="px-3 py-4 text-left text-sm font-semibold text-foreground">
              Plan
            </th>
            <th className="px-3 py-4 text-left text-sm font-semibold text-foreground">
              Bedrag
            </th>
            <th className="px-3 py-4 text-left text-sm font-semibold text-foreground">
              Status
            </th>
            <th className="px-3 py-4 text-center text-sm font-semibold text-foreground">
              Actie
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr
              key={invoice.id}
              className={index % 2 === 0 ? "bg-muted/30" : ""}
            >
              <td className="px-3 py-4 text-sm text-foreground">
                {new Date(invoice.date).toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
              <td className="px-3 py-4 text-sm text-muted-foreground">
                {invoice.planName}
              </td>
              <td className="px-3 py-4 text-sm font-medium text-foreground">
                {formatPrice(invoice.amount)}
              </td>
              <td className="px-3 py-4 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    invoice.status === "paid"
                      ? "bg-success/10 text-success"
                      : invoice.status === "past_due"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {invoice.status === "paid" && "Betaald"}
                  {invoice.status === "past_due" && "Te betalen"}
                  {invoice.status === "draft" && "Concept"}
                  {invoice.status === "uncollectible" && "Oninbaar"}
                  {invoice.status === "void" && "Ongeldig"}
                </span>
              </td>
              <td className="px-3 py-4 text-center">
                {invoice.pdfUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(invoice.id)}
                    aria-label={`Download PDF van ${invoice.planName}`}
                    className="min-h-11 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
