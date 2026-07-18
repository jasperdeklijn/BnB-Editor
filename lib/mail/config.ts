import "server-only"

export type MailServerConfig = ReturnType<typeof getMailServerConfig>

function envBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback
  return value.trim().toLowerCase() === "true"
}

function envPort(value: string | undefined, fallback: number) {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65_535 ? port : fallback
}

export function getMailServerConfig() {
  const user = process.env.MAILBOX_USER?.trim().toLowerCase() ?? ""
  const password = process.env.MAILBOX_PASSWORD ?? ""

  return {
    user,
    password,
    fromName: process.env.MAIL_FROM_NAME?.trim() || "FlexPagina support",
    inboxFolder: process.env.MAIL_SYNC_FOLDER?.trim() || "INBOX",
    sentFolder: process.env.MAIL_SENT_FOLDER?.trim() || "Sent",
    imap: {
      host: process.env.MAIL_IMAP_HOST?.trim() || "imap.transip.email",
      port: envPort(process.env.MAIL_IMAP_PORT, 993),
      secure: envBoolean(process.env.MAIL_IMAP_SECURE, true),
    },
    smtp: {
      host: process.env.MAIL_SMTP_HOST?.trim() || process.env.SMTP_HOST?.trim() || "smtp.transip.email",
      port: envPort(process.env.MAIL_SMTP_PORT || process.env.SMTP_PORT, 465),
      secure: envBoolean(process.env.MAIL_SMTP_SECURE ?? process.env.SMTP_SECURE, true),
    },
  }
}

export function getMailConfigurationState() {
  const config = getMailServerConfig()
  return {
    configured: Boolean(config.user && config.password),
    mailbox: config.user || null,
    imapHost: config.imap.host,
    smtpHost: config.smtp.host,
  }
}

export function requireMailServerConfig() {
  const config = getMailServerConfig()
  if (!config.user || !config.password) {
    throw new Error("MAILBOX_USER en MAILBOX_PASSWORD ontbreken.")
  }
  return config
}
