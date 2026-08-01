import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CustomerBookingClient } from "@/components/booking/customer-booking-client"
import { getCustomerBookingView } from "@/lib/booking/customer-access"

export const metadata: Metadata = {
  title: "Uw boeking | FlexPagina",
  robots: { index: false, follow: false },
}

export default async function CustomerBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const booking = await getCustomerBookingView(token)
  if (!booking) notFound()
  return <CustomerBookingClient initialBooking={booking} />
}
