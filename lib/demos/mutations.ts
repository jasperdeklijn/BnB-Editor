import "server-only"
import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ImportValidationError, MAX_IMPORT_BYTES, parseImport } from "@/lib/import/schema"
import { demoMetadataSchema, demoThumbnail, prepareDemo, publicDemoDesign, type DemoSummary } from "./shared"
import { demoSummaryColumns } from "./server"

export class DemoError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export function assertDemoOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) throw new DemoError("Ongeldige herkomst.", 403)
}

export async function readDemoBody(request: Request, maxBytes = MAX_IMPORT_BYTES) {
  const reader = request.body?.getReader()
  if (!reader) throw new DemoError("Het bestand ontbreekt.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) { await reader.cancel(); throw new DemoError("Het bestand is te groot (maximaal 2 MB).", 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks).toString("utf8")
}

export async function createDemo(request: Request, db: SupabaseClient, userId: string): Promise<DemoSummary> {
  assertDemoOrigin(request)
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new DemoError("Kies een JSON-bestand.", 415)
  let metadata: unknown
  try { metadata = JSON.parse(decodeURIComponent(request.headers.get("x-demo-metadata") ?? "")) }
  catch { throw new DemoError("De demogegevens ontbreken of zijn ongeldig.") }
  const parsed = demoMetadataSchema.safeParse(metadata)
  if (!parsed.success) throw new DemoError(parsed.error.issues[0]?.message ?? "Controleer de demogegevens.")
  const raw = await readDemoBody(request)
  const document = parseImport(raw)
  const requestHash = createHash("sha256").update(JSON.stringify(parsed.data)).update(raw).digest("hex")
  const design = prepareDemo(document, () => crypto.randomUUID())
  const row = { ...parsed.data, design, live_design: publicDemoDesign(design), request_hash: requestHash, created_by: userId, thumbnail_url: demoThumbnail(design) }
  const { data, error } = await db.from("demo_websites").insert(row).select(demoSummaryColumns).single()
  if (!error && data) return data as DemoSummary
  if (error?.code === "23505") {
    // A retried upload after a lost response returns the original result; it never overwrites it.
    const existing = await db.from("demo_websites").select(`${demoSummaryColumns},request_hash`).eq("id", row.id).maybeSingle()
    if (!existing.error && existing.data?.request_hash === requestHash) {
      const { request_hash: _hash, ...summary } = existing.data
      return summary as DemoSummary
    }
    throw new DemoError("Dit subdomein is al in gebruik. Kies een andere naam.", 409)
  }
  throw new DemoError("De demo kon niet worden opgeslagen. Controleer of de demo-migratie is geïnstalleerd.", 503)
}

export function demoErrorResponse(error: unknown) {
  const headers = { "Cache-Control": "no-store" }
  if (error instanceof DemoError) return Response.json({ error: error.message }, { status: error.status, headers })
  if (error instanceof ImportValidationError) return Response.json({ error: "Controleer het JSON-bestand.", issues: error.issues }, { status: 400, headers })
  if (error instanceof SyntaxError) return Response.json({ error: "Ongeldige JSON.", }, { status: 400, headers })
  return Response.json({ error: "De actie is mislukt. Probeer het opnieuw." }, { status: 500, headers })
}
