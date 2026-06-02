import type { SupabaseClient } from "@supabase/supabase-js"
import type { Section, SectionType } from "@/lib/types"

// ---------------------------------------------------------------------------
// Context passed to every resolver so they can query the database.
// ---------------------------------------------------------------------------
export interface RenderContext {
  businessId: string | null
  supabase: SupabaseClient
  isPreview: boolean
}

// ---------------------------------------------------------------------------
// A resolver is an async function that enriches raw section data with live
// database content. Return the enriched data object; the rest of the section
// stays untouched.
// ---------------------------------------------------------------------------
export type SectionDataResolver = (
  data: Record<string, unknown>,
  context: RenderContext,
) => Promise<Record<string, unknown>>

// ---------------------------------------------------------------------------
// Per-type resolver map. Only sections that need live data have an entry.
// ---------------------------------------------------------------------------

/** Shape that the services/rooms renderer expects. */
interface ServiceRow {
  id: string
  business_id: string
  title: string
  description: string
  price: string
  duration: string | null
  capacity: number | null
  image_urls: unknown
  position: number
  created_at: string
  updated_at: string
}

async function fetchServicesForBusiness(
  businessId: string,
  supabase: SupabaseClient,
): Promise<ServiceRow[]> {
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("position", { ascending: true })

  return (data ?? []) as ServiceRow[]
}

/**
 * Map a `services` row into the legacy `rooms` shape expected by ServicesSection.
 * Keeps both `services` (normalized) and `rooms` (legacy) on the data object so
 * either renderer variant can consume it.
 */
function mapServicesToRendererData(rows: ServiceRow[]): {
  services: ServiceRow[]
  rooms: Array<{
    id: string
    bnb_id: string
    name: string
    description: string
    price: string
    max_guests: number | null
    images: string[]
    position: number
    created_at: string
    updated_at: string
  }>
} {
  const rooms = rows.map((s) => ({
    id: s.id,
    bnb_id: s.business_id,
    name: s.title,
    description: s.description,
    price: s.price,
    max_guests: s.capacity,
    images: Array.isArray(s.image_urls) ? (s.image_urls as string[]) : [],
    position: s.position,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }))

  return { services: rows, rooms }
}

// ---------------------------------------------------------------------------
// Resolver implementations
// ---------------------------------------------------------------------------

const servicesResolver: SectionDataResolver = async (data, { businessId, supabase }) => {
  if (!businessId) return data

  // Honour explicit serviceIds filter stored on the section if present.
  const serviceIds = data.serviceIds as string[] | undefined

  const rows = await fetchServicesForBusiness(businessId, supabase)

  const filtered =
    serviceIds && serviceIds.length > 0
      ? rows.filter((r) => serviceIds.includes(r.id))
      : rows

  return { ...data, ...mapServicesToRendererData(filtered) }
}

/** Compatibility resolver: old `rooms` sections are backed by the new
 *  `services` table. We just delegate to the same logic. */
const roomsCompatibilityResolver: SectionDataResolver = async (data, context) => {
  return servicesResolver(data, context)
}

// ---------------------------------------------------------------------------
// Registry: maps SectionType → resolver (only entries that need one).
// ---------------------------------------------------------------------------
const resolvers: Partial<Record<SectionType, SectionDataResolver>> = {
  services: servicesResolver,
  rooms: roomsCompatibilityResolver,
}

// Named exports so individual section definitions in the registry can attach
// the correct resolver directly on their entry (single source of truth).
export { servicesResolver, roomsCompatibilityResolver as roomsResolver }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enrich a single section's `data` object with live database content.
 *
 * Sections that have no resolver (e.g. hero, gallery, cta) are returned
 * unchanged. This function is intentionally side-effect free — it returns a
 * new data object rather than mutating the section in place.
 */
export async function resolveSectionData(
  section: Section,
  context: RenderContext,
): Promise<Record<string, unknown>> {
  const resolver = resolvers[section.type]
  if (!resolver) return section.data
  return resolver(section.data, context)
}

/**
 * Resolve data for every section in the array concurrently.
 * Returns a new array of sections with enriched `data` objects.
 */
export async function resolveAllSections(
  sections: Section[],
  context: RenderContext,
): Promise<Section[]> {
  const resolved = await Promise.all(
    sections.map(async (section) => {
      const data = await resolveSectionData(section, context)
      return { ...section, data }
    }),
  )
  return resolved
}
