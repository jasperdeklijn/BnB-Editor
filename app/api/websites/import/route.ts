import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { parseImport, ImportValidationError, MAX_IMPORT_BYTES } from "@/lib/import/schema"
import { createImportedDesign } from "@/lib/import/create-design"

export const runtime = "nodejs"
export const maxDuration = 60
export async function POST(request: Request) {
  const db = await createClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Log in om een ontwerp te importeren." }, { status: 401 })
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Ongeldige herkomst." }, { status: 403 })
  if (request.headers.get("x-import-permission") !== "confirmed") {
    return NextResponse.json({ error: "Bevestig dat je de inhoud en afbeeldingen mag hergebruiken." }, { status: 400 })
  }
  const id = z.string().uuid().safeParse(request.headers.get("x-import-design-id"))
  if (!id.success) return NextResponse.json({ error: "Ongeldig ontwerpkenmerk. Open de import opnieuw." }, { status: 400 })
  const limit = await checkRateLimit(`design_import:${user.id}`, 10, 3600000)
  if (!limit.allowed) return NextResponse.json({ error: "Te veel imports. Probeer het later opnieuw." }, { status: 429 })
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Upload een JSON-bestand." }, { status: 415 })
  }
  try {
    const reader = request.body?.getReader()
    if (!reader) throw new ImportValidationError(["bestand: Het bestand ontbreekt."])
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > MAX_IMPORT_BYTES) { await reader.cancel(); throw new ImportValidationError(["bestand: Maximaal 2 MB."]) }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const document = parseImport(Buffer.concat(chunks).toString("utf8"))
    const { data: existing, error: lookupError } = await db.from("websites").select("id").eq("id", id.data).eq("user_id", user.id).maybeSingle()
    if (lookupError) throw new Error("Je ontwerpen konden niet worden gecontroleerd.")
    // Repeating a confirmed request after a lost response opens the same new draft.
    if (existing) return NextResponse.json({ websiteId: existing.id })
    const websiteId = await createImportedDesign({
      db, storage: await createAdminClient(), userId: user.id, designId: id.data, document,
    })
    return NextResponse.json({ websiteId }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof ImportValidationError) return NextResponse.json({ error: "Controleer het JSON-bestand.", issues: error.issues }, { status: 400 })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Importeren is mislukt." }, { status: 422 })
  }
}

