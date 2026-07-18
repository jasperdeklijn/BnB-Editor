export const MAIL_THREAD_STATUSES = ["new", "draft_ready", "needs_review", "replied", "closed", "ignored"] as const
export type MailThreadStatus = (typeof MAIL_THREAD_STATUSES)[number]
export type MailDirection = "inbound" | "outbound"
export type MailConfidence = "low" | "medium" | "high"

export type MailAccountRecord = {
  id: string
  email_address: string
  display_name: string
  imap_host: string
  imap_port: number
  imap_secure: boolean
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  inbox_folder: string
  sent_folder: string
  last_inbox_uid: number
  last_sent_uid: number
  inbox_uid_validity: string | null
  sent_uid_validity: string | null
  enabled: boolean
  last_synced_at: string | null
  last_error: string | null
}

export type MailThreadRecord = {
  id: string
  mail_account_id: string
  subject_normalized: string
  contact_email: string
  contact_name: string | null
  status: MailThreadStatus
  last_message_at: string
  last_inbound_at: string | null
  last_outbound_at: string | null
  unread_count: number
  created_at: string
  updated_at: string
}

export type AttachmentMetadata = {
  filename: string | null
  contentType: string
  size: number
  contentId: string | null
}

export type MailMessageRecord = {
  id: string
  thread_id: string
  mail_account_id: string
  direction: MailDirection
  internet_message_id: string | null
  in_reply_to: string | null
  message_references: string[]
  imap_folder: string
  imap_uid: number | null
  from_address: string
  from_name: string | null
  to_addresses: string[]
  cc_addresses: string[]
  subject: string
  text_body: string
  attachment_metadata: AttachmentMetadata[]
  received_at: string | null
  sent_at: string | null
  is_read: boolean
  created_at: string
}

export type MailDraftRecord = {
  id: string
  thread_id: string
  in_reply_to_message_id: string
  status: "generating" | "ready" | "edited" | "sending" | "sent" | "discarded" | "failed"
  subject: string
  suggested_body: string
  final_body: string | null
  confidence: MailConfidence
  confidence_reasons: string[]
  missing_information: string[]
  knowledge_answer_ids: string[]
  example_message_ids: string[]
  generation_error: string | null
  generated_at: string | null
  sent_at: string | null
  created_at: string
}

export type MailKnowledgeAnswer = {
  id: string
  question: string
  answer: string
  keywords: string[]
  category: string
  language: string
  status: "draft" | "active" | "archived"
  priority: number
  created_at: string
  updated_at: string
}

export type ParsedMailboxMessage = {
  messageId: string | null
  inReplyTo: string | null
  references: string[]
  fromAddress: string
  fromName: string | null
  toAddresses: string[]
  ccAddresses: string[]
  subject: string
  textBody: string
  attachments: AttachmentMetadata[]
  date: Date
  isRead: boolean
  headers: Record<string, string>
}
