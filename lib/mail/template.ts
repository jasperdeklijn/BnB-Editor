import { PLATFORM_BASE_URL, PLATFORM_BRAND_NAME } from "../platform"
import { FLEXPAGINA_STYLE as colors } from "../communication-style"

export function escapeEmailHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

function safeLink(value: string) {
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) ? escapeEmailHtml(url.href) : null
  } catch { return null }
}

function textHtml(text: string) {
  return text.trim().split(/\r?\n\s*\r?\n/).map((paragraph) => {
    // Escape each piece before adding markup; preserve personal-link fragments.
    const content = paragraph.split(/(https?:\/\/[^\s<>"']+)/g).map((part, index) => {
      const href = index % 2 ? safeLink(part) : null
      return href ? `<a href="${href}" style="color:${colors.primary};word-break:break-word;">${escapeEmailHtml(part)}</a>` : escapeEmailHtml(part)
    }).join("").replace(/\r?\n/g, "<br>")
    return `<p style="margin:0 0 18px;">${content}</p>`
  }).join("")
}

type EmailTemplate = {
  title?: string
  text?: string
  /** Only internally generated HTML with all dynamic values escaped. */
  contentHtml?: string
  locale?: string
  label?: string
  action?: { label: string; url: string }
}

export function renderFlexPaginaEmail(input: EmailTemplate) {
  const locale = ["nl-NL", "en-GB", "de-DE", "fr-FR"].includes(input.locale || "") ? input.locale! : "nl-NL"
  const footer = locale === "en-GB" ? "Sent via" : locale === "de-DE" ? "Gesendet über" : locale === "fr-FR" ? "Envoyé via" : "Verzonden via"
  const actionUrl = input.action && safeLink(input.action.url)
  return `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmailHtml(input.title || PLATFORM_BRAND_NAME)}</title></head>
<body style="margin:0;padding:0;background:${colors.background};color:${colors.text};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.background};"><tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border:1px solid ${colors.border};border-radius:20px;overflow:hidden;background:#ffffff;">
      <tr><td style="padding:24px;background:${colors.dark};color:#ffffff;border-radius:20px 20px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="color:#ffffff;">
          <a href="${escapeEmailHtml(PLATFORM_BASE_URL)}" style="color:#ffffff;text-decoration:none;"><img src="${escapeEmailHtml(PLATFORM_BASE_URL)}/logo_klein.png" width="172" height="44" alt="FlexPagina" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px;background:#ffffff;max-width:100%;height:auto;"></a>
        </td>${input.label ? `<td align="right" style="font-size:12px;color:#d6e0d9;">${escapeEmailHtml(input.label)}</td>` : ""}</tr></table>
      </td></tr>
      <tr><td style="padding:28px 24px;font-size:16px;line-height:1.7;overflow-wrap:anywhere;word-break:break-word;color:${colors.text};">
        ${input.title ? `<h1 style="margin:0 0 24px;font-size:24px;line-height:1.3;color:${colors.dark};">${escapeEmailHtml(input.title)}</h1>` : ""}
        ${input.contentHtml ?? textHtml(input.text || "")}
        ${actionUrl ? `<p style="margin:24px 0 8px;"><a href="${actionUrl}" style="display:inline-block;background:${colors.primary};color:#ffffff;padding:12px 20px;border-radius:12px;font-weight:700;text-decoration:none;">${escapeEmailHtml(input.action!.label)}</a></p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 24px;border-top:1px solid ${colors.border};background:${colors.surface};border-radius:0 0 20px 20px;font-size:12px;line-height:1.6;color:${colors.muted};">${footer} <a href="${escapeEmailHtml(PLATFORM_BASE_URL)}" style="color:${colors.primary};font-weight:700;text-decoration:none;">${escapeEmailHtml(PLATFORM_BRAND_NAME)}</a>.</td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
