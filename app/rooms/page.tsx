import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getOrCreateBnb, getRooms } from "@/lib/supabase/bnb"
import { RoomsClient } from "@/components/rooms/rooms-client"

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

  const bnb = await getOrCreateBnb()
  const rooms = await getRooms(bnb.id)

  return <RoomsClient userId={data.user.id} bnbId={bnb.id} initialRooms={rooms} />
}
