import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/booking/status-presentation"
import type { CalendarEntryStatus } from "@/lib/supabase/calendar"
import { cn } from "@/lib/utils"

export function BookingStatusBadge({
  status,
  className,
}: {
  status: CalendarEntryStatus
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", BOOKING_STATUS_STYLES[status], className)}
    >
      {BOOKING_STATUS_LABELS[status]}
    </span>
  )
}

