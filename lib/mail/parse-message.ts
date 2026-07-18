import "server-only"

import { simpleParser, type AddressObject, type ParsedMail } from "mailparser"
import type { ParsedMailboxMessage } from "@/lib/mail/types"

const MAX_BODY_LENGTH = 30_000

function addresses(value: AddressObject | AddressObject[] | undefined) {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items.flatMap((item) => item.value.map((address) => address.address?.trim().toLowerCase() ?? "")).filter(Boolean)
}

function firstAddress(value: AddressObject | AddressObject[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value
  const address = item?.value[0]
  return {
    email: address?.address?.trim().toLowerCase() ?? "",
    name: address?.name?.trim() || null,
  }
}

function normalizeReferences(value: ParsedMail["references"]) {
  if (!value) return []
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean)
}

function safeHeader(mail: ParsedMail, name: string) {
  const value = mail.headers.get(name)
  if (typeof value === "string") return value.slice(0, 1_000)
  if (value instanceof Date) return value.toISOString()
  return value == null ? "" : String(value).slice(0, 1_000)
}

export function stripQuotedHistory(value: string) {
  const withoutReply = value.split(/\n(?:Op|On) .{0,300}(?:schreef|wrote):\s*\n/i)[0] ?? value
  const withoutQuoteLines = withoutReply.split("\n").filter((line) => !line.trimStart().startsWith(">"))
  const signatureIndex = withoutQuoteLines.findIndex((line) => /^\s*--\s*$/.test(line))
  return withoutQuoteLines.slice(0, signatureIndex >= 0 ? signatureIndex : undefined).join("\n").trim().slice(0, MAX_BODY_LENGTH)
}

export async function parseMailboxMessage(source: Buffer, internalDate: Date | string | undefined, flags?: Set<string>): Promise<ParsedMailboxMessage> {
  const mail = await simpleParser(source, {
    skipHtmlToText: false,
    skipTextToHtml: true,
    maxHtmlLengthToParse: 1_000_000,
  })
  const from = firstAddress(mail.from)
  const text = (mail.text || "").split(String.fromCharCode(0)).join("").trim().slice(0, MAX_BODY_LENGTH)

  return {
    messageId: mail.messageId?.trim() || null,
    inReplyTo: mail.inReplyTo?.trim() || null,
    references: normalizeReferences(mail.references),
    fromAddress: from.email,
    fromName: from.name,
    toAddresses: addresses(mail.to),
    ccAddresses: addresses(mail.cc),
    subject: (mail.subject || "(geen onderwerp)").trim().slice(0, 500),
    textBody: text,
    attachments: mail.attachments.slice(0, 25).map((attachment) => ({
      filename: attachment.filename?.slice(0, 255) || null,
      contentType: attachment.contentType.slice(0, 150),
      size: attachment.size,
      contentId: attachment.contentId?.slice(0, 255) || null,
    })),
    date: mail.date || (internalDate ? new Date(internalDate) : new Date()),
    isRead: flags?.has("\\Seen") ?? false,
    headers: Object.fromEntries(
      ["reply-to", "auto-submitted", "precedence", "list-id"]
        .map((name) => [name, safeHeader(mail, name)] as const)
        .filter(([, value]) => value),
    ),
  }
}
