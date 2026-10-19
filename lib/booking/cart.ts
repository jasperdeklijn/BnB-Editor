import { z } from "zod"
import {
  addLocalDays,
  daysBetween,
  getAppointmentAvailability,
  isAppointmentRangeAvailable,
  localDateForInstant,
  type AvailabilityWindowInput,
  type BusyCalendarEntryInput,
} from "@/lib/booking/availability"
import type { ServiceBookingSettings } from "@/lib/booking/types"
import {
  calculateBookingFinancials,
  type BookingFinancialLine,
} from "@/lib/booking/pricing"

const optionId = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/)
const amount = z.number().int().min(0).max(100_000_000)
export const bookingCatalogSchema = z
  .object({
    enabled: z.boolean(),
    combinable: z.boolean(),
    vat_rate_basis_points: z.number().int().min(0).max(10000).default(0),
    variants: z
      .array(
        z.object({
          id: optionId,
          name: z.string().trim().min(1).max(120),
          duration_minutes: z.number().int().min(5).max(1440),
          price_minor: amount,
        }),
      )
      .min(1)
      .max(20),
    extras: z
      .array(
        z.object({
          id: optionId,
          name: z.string().trim().min(1).max(120),
          duration_minutes: z.number().int().min(0).max(480),
          price_minor: amount,
          variant_ids: z.array(optionId).max(20),
          exclusive_group: z.string().trim().max(80),
        }),
      )
      .max(40),
  })
  .superRefine((catalog, ctx) => {
    const ids = [...catalog.variants, ...catalog.extras].map(
      (option) => option.id,
    )
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Opties moeten een unieke ID hebben.",
      })
    if (
      catalog.extras.some((extra) =>
        extra.variant_ids.some(
          (id) => !catalog.variants.some((variant) => variant.id === id),
        ),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Een extra verwijst naar een onbekende variant.",
      })
  })
export type BookingCatalog = z.infer<typeof bookingCatalogSchema>
export const cartSelectionSchema = z
  .array(
    z.object({
      service_id: z.string().uuid(),
      variant_id: optionId,
      extra_ids: z.array(optionId).max(40),
    }),
  )
  .min(1)
  .max(10)
  .superRefine((items, ctx) => {
    if (new Set(items.map((item) => item.service_id)).size !== items.length)
      ctx.addIssue({
        code: "custom",
        message: "Kies iedere dienst maximaal één keer.",
      })
  })
export type CartSelection = z.infer<typeof cartSelectionSchema>
export interface CartService {
  id: string
  title: string
  booking_catalog?: BookingCatalog | null
}
export interface CartLine {
  service_id: string
  title: string
  variant_id: string
  extra_ids: string[]
  description: string
  duration_minutes: number
  price_minor: number
  unit_price_minor: number
  vat_rate_basis_points: number
}
export interface CartPlanItem extends CartLine {
  resource_id?: string | null
  start_at: string
  end_at: string
}
export interface CartPlan {
  confirmation_mode: "request" | "instant"
  start_at: string
  end_at: string
  timezone: string
  total_minor: number
  subtotal_minor: number
  vat_minor: number
  financial_lines: BookingFinancialLine[]
  duration_minutes: number
  items: CartPlanItem[]
}
export interface BookingResource {
  id: string
  business_id: string
  name: string
  capacity: number
  timezone?: string
}
export interface AvailabilityException {
  service_id: string | null
  resource_id: string | null
  date: string
  windows: Array<{ start_time: string; end_time: string }>
}
export interface CartAvailabilityInput {
  lines: CartLine[]
  settings: ServiceBookingSettings[]
  windows: AvailabilityWindowInput[]
  entries: BusyCalendarEntryInput[]
  resources: BookingResource[]
  resourceWindows: Array<AvailabilityWindowInput & { resource_id: string }>
  exceptions: AvailabilityException[]
  date_from: string
  date_to: string
  now?: Date
  limit?: number
}

export function resolveCartLines(
  selection: unknown,
  services: CartService[],
): CartLine[] {
  const items = cartSelectionSchema.parse(selection)
  return items.map((item) => {
    const service = services.find(
      (candidate) => candidate.id === item.service_id,
    )
    const catalog = bookingCatalogSchema.parse(service?.booking_catalog)
    if (
      !service ||
      !catalog.enabled ||
      (items.length > 1 && !catalog.combinable)
    )
      throw new Error("Deze diensten kunnen niet samen worden geboekt.")
    const variant = catalog.variants.find(
      (candidate) => candidate.id === item.variant_id,
    )
    if (!variant || new Set(item.extra_ids).size !== item.extra_ids.length)
      throw new Error("Kies een geldige variant en extra's.")
    const extras = item.extra_ids.map((id) => {
      const extra = catalog.extras.find((candidate) => candidate.id === id)
      if (
        !extra ||
        (extra.variant_ids.length > 0 &&
          !extra.variant_ids.includes(variant.id))
      )
        throw new Error(
          "Deze extra is niet beschikbaar bij de gekozen variant.",
        )
      return extra
    })
    const groups = extras.map((extra) => extra.exclusive_group).filter(Boolean)
    if (new Set(groups).size !== groups.length)
      throw new Error("Deze extra's kunnen niet gecombineerd worden.")
    const duration =
      variant.duration_minutes +
      extras.reduce((sum, extra) => sum + extra.duration_minutes, 0)
    if (duration > 1440) throw new Error("Deze combinatie duurt te lang.")
    const unit =
      variant.price_minor +
      extras.reduce((sum, extra) => sum + extra.price_minor, 0)
    const description = [
      service.title,
      variant.name,
      ...extras.map((extra) => extra.name),
    ].join(" · ")
    const totals = calculateBookingFinancials([
      {
        id: item.service_id,
        description: description.slice(0, 200),
        quantity_milli: 1000,
        unit_price_minor: unit,
        vat_rate_basis_points: catalog.vat_rate_basis_points,
      },
    ])
    return {
      ...item,
      title: service.title,
      description,
      duration_minutes: duration,
      unit_price_minor: unit,
      vat_rate_basis_points: catalog.vat_rate_basis_points,
      price_minor: totals.totalMinor,
    }
  })
}

// Date-specific windows replace the weekly schedule; a business closure closes every service.
export function windowsForDate(
  windows: AvailabilityWindowInput[],
  exceptions: AvailabilityException[],
  serviceId: string,
  date: string,
  timezone: string,
  resourceId?: string | null,
) {
  const business = exceptions.find(
    (exception) =>
      exception.date === date &&
      !exception.service_id &&
      !exception.resource_id,
  )
  if (business?.windows.length === 0) return []
  const exception =
    exceptions.find(
      (row) =>
        row.date === date &&
        (resourceId
          ? row.resource_id === resourceId
          : row.service_id === serviceId),
    ) ?? business
  if (!exception) return windows
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7
  return exception.windows.map((window) => ({
    ...window,
    service_id: serviceId,
    weekday,
    timezone,
    is_active: true,
  }))
}

function hasResourceCapacity(
  start: number,
  end: number,
  capacity: number,
  entries: BusyCalendarEntryInput[],
) {
  const events: Array<[number, number]> = []
  for (const entry of entries) {
    if (
      entry.entry_type === "note" ||
      entry.status === "cancelled" ||
      entry.status === "completed"
    )
      continue
    if (
      !entry.service_id &&
      entry.entry_type !== "blocked" &&
      entry.status !== "blocked"
    )
      continue
    const from =
      new Date(entry.start_at).getTime() -
      (entry.buffer_before_minutes ?? 0) * 60000
    const to =
      new Date(entry.end_at).getTime() +
      (entry.buffer_after_minutes ?? 0) * 60000
    if (from >= end || to <= start) continue
    if (entry.entry_type === "blocked" || entry.status === "blocked")
      return false
    events.push([Math.max(from, start), 1], [Math.min(to, end), -1])
  }
  let count = 0
  for (const [, delta] of events.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    count += delta
    if (count >= capacity) return false
  }
  return true
}

export function buildCartPlan(
  input: CartAvailabilityInput,
  startAt: string,
): CartPlan | null {
  let cursor = new Date(startAt).getTime()
  if (!Number.isFinite(cursor) || input.lines.length === 0) return null
  const items: CartPlanItem[] = []
  const bookingTimezone = input.settings.find(
    (row) => row.service_id === input.lines[0].service_id,
  )?.timezone
  if (!bookingTimezone) return null
  const bookingDate = localDateForInstant(new Date(cursor), bookingTimezone)
  let previous: ServiceBookingSettings | undefined
  for (const line of input.lines) {
    const settings = input.settings.find(
      (row) => row.service_id === line.service_id,
    )
    if (
      !settings ||
      !settings.booking_enabled ||
      settings.booking_mode !== "appointment"
    )
      return null
    if (previous)
      cursor +=
        (previous.buffer_after_minutes + settings.buffer_before_minutes) * 60000
    const start = new Date(cursor),
      end = new Date(cursor + line.duration_minutes * 60000)
    if (
      localDateForInstant(start, bookingTimezone) !== bookingDate ||
      localDateForInstant(end, bookingTimezone) !== bookingDate
    )
      return null
    const date = localDateForInstant(start, settings.timezone)
    if (localDateForInstant(end, settings.timezone) !== date) return null
    const windows = windowsForDate(
      input.windows,
      input.exceptions,
      line.service_id,
      date,
      settings.timezone,
    )
    const lineSettings = {
      ...settings,
      duration_minutes: line.duration_minutes,
    }
    if (
      !isAppointmentRangeAvailable({
        settings: lineSettings,
        windows,
        entries: input.entries,
        now: input.now,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
      })
    )
      return null
    if (settings.resource_id) {
      const resource = input.resources.find(
        (row) => row.id === settings.resource_id,
      )
      if (!resource) return null
      const resourceTimezone = resource.timezone ?? settings.timezone
      const resourceDate = localDateForInstant(start, resourceTimezone)
      const resourceWindows = windowsForDate(
        input.resourceWindows
          .filter((row) => row.resource_id === resource.id)
          .map((row) => ({ ...row, service_id: line.service_id })),
        input.exceptions,
        line.service_id,
        resourceDate,
        resourceTimezone,
        resource.id,
      )
      if (
        !isAppointmentRangeAvailable({
          settings: { ...lineSettings, timezone: resourceTimezone },
          windows: resourceWindows,
          entries: [],
          now: input.now,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
        })
      )
        return null
      const busy = input.entries.filter(
        (entry) =>
          !entry.service_id ||
          (entry.resource_id ??
            input.settings.find((row) => row.service_id === entry.service_id)
              ?.resource_id) === resource.id,
      )
      if (
        !hasResourceCapacity(
          start.getTime() - settings.buffer_before_minutes * 60000,
          end.getTime() + settings.buffer_after_minutes * 60000,
          resource.capacity,
          busy,
        )
      )
        return null
    }
    items.push({
      ...line,
      resource_id: settings.resource_id ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    })
    cursor = end.getTime()
    previous = settings
  }
  const totals = calculateBookingFinancials(
    items.map((item) => ({
      id: item.service_id,
      description: item.description.slice(0, 200),
      quantity_milli: 1000,
      unit_price_minor: item.unit_price_minor,
      vat_rate_basis_points: item.vat_rate_basis_points,
    })),
  )
  return {
    confirmation_mode: input.lines.some(
      (line) =>
        input.settings.find((row) => row.service_id === line.service_id)
          ?.confirmation_mode === "request",
    )
      ? "request"
      : "instant",
    start_at: items[0].start_at,
    end_at: items[items.length - 1].end_at,
    timezone: input.settings.find(
      (row) => row.service_id === items[0].service_id,
    )!.timezone,
    total_minor: totals.totalMinor,
    subtotal_minor: totals.subtotalMinor,
    vat_minor: totals.vatTotalMinor,
    financial_lines: totals.lines,
    duration_minutes: items.reduce(
      (sum, item) => sum + item.duration_minutes,
      0,
    ),
    items,
  }
}

export function getCartAvailability(input: CartAvailabilityInput): CartPlan[] {
  if (
    daysBetween(input.date_from, input.date_to) < 0 ||
    daysBetween(input.date_from, input.date_to) > 31
  )
    throw new Error("Vraag maximaal 31 dagen beschikbaarheid op.")
  const settings = input.settings.find(
    (row) => row.service_id === input.lines[0]?.service_id,
  )
  if (!settings) return []
  const plans: CartPlan[] = [],
    seen = new Set<string>()
  for (
    let date = input.date_from;
    date <= input.date_to;
    date = addLocalDays(date, 1)
  ) {
    const windows = windowsForDate(
      input.windows,
      input.exceptions,
      settings.service_id,
      date,
      settings.timezone,
    )
    const slots = getAppointmentAvailability({
      settings: {
        ...settings,
        duration_minutes: input.lines[0].duration_minutes,
      },
      windows,
      entries: [],
      now: input.now,
      date_from: date,
      date_to: date,
      limit: 300,
    })
    for (const slot of slots) {
      if (seen.has(slot.start_at)) continue
      seen.add(slot.start_at)
      const plan = buildCartPlan(input, slot.start_at)
      if (plan) plans.push(plan)
      if (plans.length >= (input.limit ?? 96)) return plans
    }
  }
  return plans
}
