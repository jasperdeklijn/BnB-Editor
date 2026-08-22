import { createAdminClient } from "@/lib/supabase/admin"

export type AuditAction =
  | "login"
  | "logout"
  | "website.created"
  | "website.published"
  | "website.unpublished"
  | "website.publish_denied"
  | "entitlement.warning_shown"
  | "entitlement.upgrade_clicked"
  | "website.deleted"
  | "section.added"
  | "section.deleted"
  | "language.added"
  | "language.updated"
  | "language.removed"
  | "language.enabled"
  | "language.disabled"
  | "domain.added"
  | "domain.add_failed"
  | "domain.removed"
  | "domain.removal_started"
  | "domain.removal_failed"
  | "domain.primary_changed"
  | "domain.verification_started"
  | "domain.verification_failed"
  | "domain.verification_succeeded"
  | "subscription.changed"
  | "payment.failed"
  | "account.deleted"
  | "mail.sync_started"
  | "mail.draft_generated"
  | "mail.reply_sent"
  | "mail.thread_updated"
  | "mail.knowledge_changed"
  | "onboarding.step_completed"
  | "onboarding.completed"
  | "onboarding.started"
  | "onboarding.step_viewed"
  | "onboarding.validation_failed"

type AuditMetadata = Record<string, unknown> | null

type LogAuditEventInput = {
  userId?: string | null
  websiteId?: string | null
  action: AuditAction
  metadata?: AuditMetadata
  request?: Request | null
}

function getClientIp(request?: Request | null) {
  if (!request) return null

  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null
  }

  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip")
}

export async function logAuditEvent({
  userId = null,
  websiteId = null,
  action,
  metadata = null,
  request = null,
}: LogAuditEventInput) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("[AuditLog] SUPABASE_SERVICE_ROLE_KEY is not configured; audit event skipped", { action })
      return
    }

    const supabase = await createAdminClient()
    const { error } = await supabase.from("audit_logs").insert({
      user_id: userId,
      website_id: websiteId,
      action,
      metadata,
      ip_address: getClientIp(request),
      user_agent: request?.headers.get("user-agent") ?? null,
    })

    if (error) {
      console.warn("[AuditLog] Failed to insert audit event", {
        action,
        userId,
        websiteId,
        error: error.message,
      })
    }
  } catch (error) {
    console.warn("[AuditLog] Audit logging failed", {
      action,
      userId,
      websiteId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
