import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from './server'

export type WebsiteSection = {
  id: string
  website_id: string
  position: number
  type: string
  content: any
  styles: any
  transition: any
  created_at?: string
  updated_at?: string
}

async function getClient(supabase?: SupabaseClient) {
  if (supabase) return supabase
  return await createServerClient()
}

export async function fetchWebsiteWithSectionsBySlug(slug: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)

  const { data, error } = await client
    .from('websites')
    .select(`
      *,
      website_sections (
        id,
        website_id,
        type,
        position,
        content,
        styles,
        transition,
        created_at,
        updated_at
      )
    `)
    .eq('slug', slug)
    .order('position', { foreignTable: 'website_sections' })
    .single()

  return { data, error }
}

export async function listSections(websiteId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data, error } = await client
    .from('website_sections')
    .select('*')
    .eq('website_id', websiteId)
    .order('position', { ascending: true })

  return { data, error }
}

export async function getSectionById(id: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data, error } = await client
    .from('website_sections')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export async function createSection(
  websiteId: string,
  section: Partial<WebsiteSection> & { type: string },
  supabase?: SupabaseClient
) {
  const client = await getClient(supabase)

  // If position not provided, append to the end
  let position = section.position
  if (position == null) {
    const { data: last } = await client
      .from('website_sections')
      .select('position')
      .eq('website_id', websiteId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    position = last?.position != null ? last.position + 1 : 1
  }

  const payload = {
    website_id: websiteId,
    type: section.type,
    position,
    content: section.content ?? {},
    styles: section.styles ?? {},
    transition: section.transition ?? null,
  }

  const { data, error } = await client.from('website_sections').insert(payload).select().single()
  return { data, error }
}

export async function updateSection(id: string, updates: Partial<WebsiteSection>, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data, error } = await client.from('website_sections').update(updates).eq('id', id).select().single()
  return { data, error }
}

export async function deleteSection(id: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)

  // Delete the section
  const { data: deleted, error: delErr } = await client.from('website_sections').delete().eq('id', id).select().single()
  if (delErr) return { data: deleted, error: delErr }

  // Reorder remaining sections for the website
  const websiteId = (deleted as any)?.website_id
  if (!websiteId) return { data: deleted, error: null }

  const { data: remaining } = await client
    .from('website_sections')
    .select('id')
    .eq('website_id', websiteId)
    .order('position', { ascending: true })

  if (remaining && remaining.length) {
    const updates = (remaining as any[]).map((row, idx) => ({ id: row.id, position: idx + 1 }))
    await client.from('website_sections').upsert(updates, { onConflict: 'id' })
  }

  return { data: deleted, error: null }
}

export async function reorderSections(websiteId: string, orderedIds: string[], supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const updates = orderedIds.map((id, idx) => ({ id, position: idx + 1 }))
  const { data, error } = await client.from('website_sections').upsert(updates, { onConflict: 'id' }).select()
  return { data, error }
}

export async function moveSection(sectionId: string, newPosition: number, supabase?: SupabaseClient) {
  const client = await getClient(supabase)

  const { data: section, error: secErr } = await client
    .from('website_sections')
    .select('*')
    .eq('id', sectionId)
    .single()

  if (secErr || !section) return { data: null, error: secErr || new Error('section not found') }

  const websiteId = section.website_id

  const { data: all } = await client
    .from('website_sections')
    .select('id')
    .eq('website_id', websiteId)
    .order('position', { ascending: true })

  if (!all) return { data: null, error: new Error('failed to fetch sections') }

  const ids = (all as any[]).map((r) => r.id).filter((id) => id !== sectionId)

  // clamp newPosition
  const clamped = Math.max(1, Math.min(newPosition, ids.length + 1))
  ids.splice(clamped - 1, 0, sectionId)

  const updates = ids.map((id, idx) => ({ id, position: idx + 1 }))
  const { data, error } = await client.from('website_sections').upsert(updates, { onConflict: 'id' }).select()
  return { data, error }
}

export async function duplicateSection(sectionId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data: section, error: secErr } = await client.from('website_sections').select('*').eq('id', sectionId).single()
  if (secErr || !section) return { data: null, error: secErr || new Error('section not found') }

  // Insert copy right after the original
  const websiteId = (section as any).website_id
  const originalPos = (section as any).position

  // Shift subsequent sections down by 1
  const { data: later } = await client
    .from('website_sections')
    .select('id, position')
    .eq('website_id', websiteId)
    .gte('position', originalPos + 1)
    .order('position', { ascending: true })

  if (later && later.length) {
    const inc = later.map((r: any) => ({ id: r.id, position: r.position + 1 }))
    await client.from('website_sections').upsert(inc, { onConflict: 'id' })
  }

  const payload = {
    website_id: websiteId,
    type: (section as any).type,
    position: originalPos + 1,
    content: (section as any).content ?? {},
    styles: (section as any).styles ?? {},
    transition: (section as any).transition ?? null,
  }

  const { data, error } = await client.from('website_sections').insert(payload).select().single()
  return { data, error }
}

export default {
  fetchWebsiteWithSectionsBySlug,
  listSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  reorderSections,
  duplicateSection,
}
