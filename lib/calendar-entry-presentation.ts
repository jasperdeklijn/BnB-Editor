import type { CalendarEntryType } from "@/lib/supabase/calendar"

export const CALENDAR_ENTRY_PRESENTATION: Record<CalendarEntryType, { label: string; className: string; dotClassName: string }> = {
  appointment: { label: "Afspraak", className: "border-emerald-200 bg-emerald-50 text-emerald-950", dotClassName: "bg-emerald-600" },
  booking: { label: "Verblijf", className: "border-amber-300 bg-amber-50 text-amber-950", dotClassName: "bg-amber-600" },
  blocked: { label: "Blokkade", className: "border-zinc-300 border-dashed bg-zinc-100 text-zinc-800", dotClassName: "bg-zinc-600" },
  note: { label: "Notitie", className: "border-slate-300 bg-slate-50 text-slate-800", dotClassName: "bg-slate-500" },
}
