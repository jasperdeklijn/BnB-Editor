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
            className="h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
        <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
          Geen facturen
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Je facturen worden hier weergegeven zodra je abonnement actief is.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
              Datum
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
              Plan
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
              Betrag
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
              Status
            </th>
            <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
              Aktion
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr
              key={invoice.id}
              className={index % 2 === 0 ? "bg-white dark:bg-slate-950" : ""}
            >
              <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                {new Date(invoice.date).toLocaleDateString("nl-NL", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                {invoice.planName}
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                {formatPrice(invoice.amount)}
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    invoice.status === "paid"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : invoice.status === "past_due"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {invoice.status === "paid" && "Betaald"}
                  {invoice.status === "past_due" && "Te betalen"}
                  {invoice.status === "draft" && "Concept"}
                  {invoice.status === "uncollectible" && "Oninbaar"}
                  {invoice.status === "void" && "Ongeldig"}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                {invoice.pdfUrl ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(invoice.id)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
