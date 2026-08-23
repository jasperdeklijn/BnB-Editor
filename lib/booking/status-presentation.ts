import type { CalendarEntryStatus } from "@/lib/supabase/calendar"

export const BOOKING_STATUS_LABELS: Record<CalendarEntryStatus, string> = {
  pending: "In afwachting",
  confirmed: "Bevestigd",
  cancelled: "Geannuleerd",
  completed: "Afgerond",
  blocked: "Geblokkeerd",
}

export const BOOKING_STATUS_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-red-200 bg-red-50 text-red-900",
  completed: "border-slate-200 bg-slate-50 text-slate-700",
  blocked: "border-zinc-300 bg-zinc-100 text-zinc-800",
}

export const BOOKING_STATUS_DOT_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-emerald-500",
  cancelled: "bg-red-500",
  completed: "bg-slate-500",
  blocked: "bg-zinc-600",
}

