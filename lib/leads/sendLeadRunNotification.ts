import "server-only"

import nodemailer from "nodemailer"
import { PLATFORM_EMAILS } from "@/lib/platform"
import type { LeadAgentRunStatus } from "@/lib/leads/types"

type LeadRunNotification = {
  status: LeadAgentRunStatus
  found: number
  created: number
  updated: number
  failed: number
  weekKey: string
  errorMessage?: string | null
}

const STATUS_LABELS: Record<LeadAgentRunStatus, string> = {
  running: "gestart",
  succeeded: "voltooid",
  partial: "gedeeltelijk voltooid",
  failed: "mislukt",
  skipped: "overgeslagen",
}

function getAdminRecipients() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function sendLeadRunNotification(input: LeadRunNotification) {
  const recipients = getAdminRecipients()
  if (recipients.length === 0) return { sent: false, reason: "no_admin_recipients" as const }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { sent: false, reason: "smtp_not_configured" as const }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || PLATFORM_EMAILS.info
  const statusLabel = STATUS_LABELS[input.status]
  const errorRow = input.errorMessage
    ? `<p style="margin:16px 0 0;color:#991b1b;"><strong>Melding:</strong> ${escapeHtml(input.errorMessage)}</p>`
    : ""

  try {
    await transporter.sendMail({
      from: `FlexPagina lead-agent <${fromAddress}>`,
      to: recipients.join(","),
      subject: `Lead-agent ${statusLabel}: ${input.created} nieuwe leads`,
      text: [
        `De wekelijkse lead-agent is ${statusLabel}.`,
        `Week: ${input.weekKey}`,
        `Gevonden: ${input.found}`,
        `Nieuw: ${input.created}`,
        `Bijgewerkt: ${input.updated}`,
        `Niet verwerkt: ${input.failed}`,
        input.errorMessage ? `Melding: ${input.errorMessage}` : "",
        "Bekijk de resultaten in /admin/leads.",
      ].filter(Boolean).join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1d2c24;line-height:1.6;">
          <h1 style="font-size:24px;">Wekelijkse lead-agent ${statusLabel}</h1>
          <p>De automatische zoekronde voor week ${escapeHtml(input.weekKey)} is afgerond.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border-bottom:1px solid #ddd;">Gevonden</td><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>${input.found}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd;">Nieuw opgeslagen</td><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>${input.created}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd;">Bijgewerkt</td><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>${input.updated}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd;">Niet verwerkt</td><td style="padding:8px;border-bottom:1px solid #ddd;"><strong>${input.failed}</strong></td></tr>
          </table>
          ${errorRow}
          <p style="margin-top:24px;color:#52645a;">Bekijk en controleer outreach altijd handmatig in het beheer.</p>
        </div>
      `,
    })
    return { sent: true, reason: null }
  } catch {
    console.warn("[lead-cron] Admin notification email failed")
    return { sent: false, reason: "send_failed" as const }
  }
}
