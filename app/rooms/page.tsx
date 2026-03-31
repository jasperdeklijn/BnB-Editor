import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoomsClient, type Room } from "@/components/rooms/rooms-client"

export const metadata = {
  title: "Rooms | BnB Builder",
  description: "Manage your BnB rooms",
}

export default async function RoomsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const initialRooms: Room[] = (data.user.user_metadata?.bnb_rooms as Room[]) ?? []

  return <RoomsClient userId={data.user.id} initialRooms={initialRooms} />
}
