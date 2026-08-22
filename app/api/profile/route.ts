import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40),
  jobTitle: z.string().trim().max(100),
  bio: z.string().trim().max(300),
  avatarUrl: z.string().trim().max(1000),
  locale: z.enum(["nl-NL", "en-GB", "de-DE", "fr-FR"]),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = profileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Controleer je profielgegevens." }, { status: 400 })

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      full_name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      phone: parsed.data.phone || null,
      job_title: parsed.data.jobTitle || null,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatarUrl || null,
      locale: parsed.data.locale,
    })
    .eq("id", data.user.id)

  if (error) return NextResponse.json({ error: "Profiel kon niet worden opgeslagen." }, { status: 500 })
  return NextResponse.json({ success: true })
}

