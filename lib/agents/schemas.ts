import { z } from "zod"

export const supportJobPayloadSchema = z.object({
  threadId: z.string().uuid(),
  messageId: z.string().uuid(),
})

export const marketingJobPayloadSchema = z.object({
  weekKey: z.string().min(1).max(32),
  cities: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  categories: z.array(z.string().trim().min(1).max(120)).min(1).max(50),
  limit: z.number().int().min(1).max(500),
  emailNotificationsEnabled: z.boolean().default(true),
})

export const dailySummaryJobPayloadSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const supportArtifactContentSchema = z.object({
  mailDraftId: z.string().uuid(),
  threadId: z.string().uuid(),
  messageId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(8_000),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceReasons: z.array(z.string()).max(5),
  missingInformation: z.array(z.string()).max(5),
  sourceExcerpt: z.string().max(1_200).optional(),
  knowledgeAnswerIds: z.array(z.string().uuid()).max(20).optional(),
  exampleMessageIds: z.array(z.string().uuid()).max(20).optional(),
})

export const agentSettingsUpdateSchema = z.object({
  agents_enabled: z.boolean().optional(),
  observe_only: z.boolean().optional(),
  support_enabled: z.boolean().optional(),
  marketing_enabled: z.boolean().optional(),
  daily_budget_eur: z.number().min(0).max(10_000).optional(),
  budget_reservation_eur: z.number().positive().max(1_000).optional(),
  daily_run_limit: z.number().int().min(1).max(10_000).optional(),
  max_jobs_per_dispatch: z.number().int().min(1).max(10).optional(),
  support_model: z.string().trim().min(1).max(200).optional(),
  marketing_model: z.string().trim().min(1).max(200).optional(),
  confirm_execution_enable: z.literal(true).optional(),
}).strict()

export type SupportArtifactContent = z.infer<typeof supportArtifactContentSchema>
