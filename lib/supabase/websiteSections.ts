import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from './server'
import { isMissingRelationError } from './errors'

export type WebsiteSection = {
  id: string
  website_id: string
  page_id: string | null
  scope: 'page' | 'site_header' | 'site_footer'
  position: number
  type: string
  content: any
  styles: any
  created_at?: string
  updated_at?: string
}

export type SectionTransition = {
  id: string
  website_id: string
  from_section_id: string
  to_section_id: string
  transition: any
  created_at?: string
  updated_at?: string
}

async function getClient(supabase?: SupabaseClient) {
  if (supabase) return supabase
  return await createServerClient()
}

async function updateSectionPositions(
  client: SupabaseClient,
  websiteId: string,
  updates: Array<{ id: string; position: number }>,
  pageId?: string,
) {
  const results = await Promise.all(
    updates.map(({ id, position }) => {
      let query = client
        .from('website_sections')
        .update({ position })
        .eq('id', id)
        .eq('website_id', websiteId)
      if (pageId) query = query.eq('page_id', pageId).eq('scope', 'page')
      return query.select('id, position').single()
    })
  )
  const failed = results.find((result) => result.error)
  return {
    data: results.flatMap((result) => result.data ? [result.data] : []),
    error: failed?.error ?? null,
  }
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
        page_id,
        scope,
        type,
        position,
        content,
        styles,
        created_at,
        updated_at
      )
    `)
    .eq('slug', slug)
    .order('position', { foreignTable: 'website_sections' })
    .single()

  return { data, error }
}

export async function listSections(websiteId: string, supabase?: SupabaseClient, pageId?: string) {
  const client = await getClient(supabase)
  let query = client
    .from('website_sections')
    .select('*')
    .eq('website_id', websiteId)
  if (pageId) query = query.eq('page_id', pageId).eq('scope', 'page')
  const { data, error } = await query
    .order('position', { ascending: true })

  return { data, error }
}

export async function listEditorSections(websiteId: string, supabase: SupabaseClient, pageId: string) {
  const [page, shared] = await Promise.all([
    listSections(websiteId, supabase, pageId),
    supabase.from("website_sections").select("*").eq("website_id", websiteId).neq("scope", "page"),
  ])
  return { data: [...(shared.data ?? []).filter((row) => row.scope === "site_header"), ...(page.data ?? []),
    ...(shared.data ?? []).filter((row) => row.scope === "site_footer")], error: page.error || shared.error }
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
    let query = client
      .from('website_sections')
      .select('position')
      .eq('website_id', websiteId)
    if (section.page_id) query = query.eq('page_id', section.page_id)
    const { data: last } = await query
      .order('position', { ascending: false })
      .limit(1)
      .single()

    position = last?.position != null ? last.position + 1 : 1
  }

  const payload = {
    website_id: websiteId,
    page_id: section.page_id,
    scope: section.scope ?? 'page',
    type: section.type,
    position,
    content: section.content ?? {},
    styles: section.styles ?? {},
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

  let remainingQuery = client
    .from('website_sections')
    .select('id')
    .eq('website_id', websiteId)
    .eq('scope', deleted.scope)
  remainingQuery = deleted.page_id ? remainingQuery.eq('page_id', deleted.page_id) : remainingQuery.is('page_id', null)
  const { data: remaining } = await remainingQuery
    .order('position', { ascending: true })

  if (remaining && remaining.length) {
    const updates = (remaining as any[]).map((row, idx) => ({ id: row.id, position: idx + 1 }))
    const { error } = await updateSectionPositions(client, websiteId, updates)
    if (error) return { data: deleted, error }
  }

  return { data: deleted, error: null }
}

export async function deleteSections(ids: string[], supabase?: SupabaseClient) {
  if (ids.length === 0) return { data: [], error: null }
  const client = await getClient(supabase)
  return client.from('website_sections').delete().in('id', ids).select()
}

export async function reorderSections(websiteId: string, orderedIds: string[], supabase?: SupabaseClient, pageId?: string) {
  const client = await getClient(supabase)
  if (pageId) return client.rpc('reorder_page_sections', { p_website_id: websiteId, p_page_id: pageId, p_section_ids: orderedIds })
  const updates = orderedIds.map((id, idx) => ({ id, position: idx + 1 }))
  return updateSectionPositions(client, websiteId, updates)
}

export async function savePageStructure(websiteId: string, pageId: string, sections: unknown[], supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  return client.rpc('save_page_structure', { p_website_id: websiteId, p_page_id: pageId, p_sections: sections })
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

  let allQuery = client
    .from('website_sections')
    .select('id')
    .eq('website_id', websiteId)
    .eq('scope', section.scope)
  allQuery = section.page_id ? allQuery.eq('page_id', section.page_id) : allQuery.is('page_id', null)
  const { data: all } = await allQuery
    .order('position', { ascending: true })

  if (!all) return { data: null, error: new Error('failed to fetch sections') }

  const ids = (all as any[]).map((r) => r.id).filter((id) => id !== sectionId)

  // clamp newPosition
  const clamped = Math.max(1, Math.min(newPosition, ids.length + 1))
  ids.splice(clamped - 1, 0, sectionId)

  const updates = ids.map((id, idx) => ({ id, position: idx + 1 }))
  return updateSectionPositions(client, websiteId, updates)
}

export async function duplicateSection(sectionId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data: section, error: secErr } = await client.from('website_sections').select('*').eq('id', sectionId).single()
  if (secErr || !section) return { data: null, error: secErr || new Error('section not found') }

  // Insert copy right after the original
  const websiteId = (section as any).website_id
  const originalPos = (section as any).position

  // Shift subsequent sections down by 1
  let laterQuery = client
    .from('website_sections')
    .select('id, position')
    .eq('website_id', websiteId)
    .eq('scope', section.scope)
  laterQuery = section.page_id ? laterQuery.eq('page_id', section.page_id) : laterQuery.is('page_id', null)
  const { data: later } = await laterQuery
    .gte('position', originalPos + 1)
    .order('position', { ascending: true })

  if (later && later.length) {
    const inc = later.map((r: any) => ({ id: r.id, position: r.position + 1 }))
    const { error } = await updateSectionPositions(client, websiteId, inc)
    if (error) return { data: null, error }
  }

  const payload = {
    website_id: websiteId,
    page_id: section.page_id,
    scope: section.scope,
    type: (section as any).type,
    position: originalPos + 1,
    content: (section as any).content ?? {},
    styles: (section as any).styles ?? {},
  }

  const { data, error } = await client.from('website_sections').insert(payload).select().single()
  if (error || !data) return { data, error }

  const { data: translations, error: translationReadError } = await client
    .from('website_section_translations')
    .select('locale, values, source_hash')
    .eq('section_id', sectionId)
  if (translationReadError && !isMissingRelationError(translationReadError)) {
    await client.from('website_sections').delete().eq('id', data.id)
    return { data: null, error: translationReadError }
  }
  if (translations?.length) {
    const { error: translationInsertError } = await client.from('website_section_translations').insert(
      translations.map((translation) => ({
        website_id: websiteId,
        section_id: data.id,
        locale: translation.locale,
        values: translation.values,
        source_hash: translation.source_hash,
      })),
    )
    if (translationInsertError) {
      await client.from('website_sections').delete().eq('id', data.id)
      return { data: null, error: translationInsertError }
    }
  }
  return { data, error: null }
}

// Transition management functions
export async function getTransitionsBetweenSections(websiteId: string, supabase?: SupabaseClient, sectionIds?: string[]) {
  const client = await getClient(supabase)
  if (sectionIds?.length === 0) return { data: [], error: null }
  let query = client
    .from('section_transitions')
    .select('*')
    .eq('website_id', websiteId)
  if (sectionIds) query = query.in('from_section_id', sectionIds).in('to_section_id', sectionIds)
  const { data, error } = await query

  return { data, error }
}

export async function getTransitionFromSection(fromSectionId: string, toSectionId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { data, error } = await client
    .from('section_transitions')
    .select('*')
    .eq('from_section_id', fromSectionId)
    .eq('to_section_id', toSectionId)
    .single()

  return { data, error }
}

export async function setTransition(
  websiteId: string,
  fromSectionId: string,
  toSectionId: string,
  transition: any,
  supabase?: SupabaseClient
) {
  const client = await getClient(supabase)
  
  if (!transition || transition.type === 'none') {
    // Delete if no transition
    const { error } = await client
      .from('section_transitions')
      .delete()
      .eq('from_section_id', fromSectionId)
      .eq('to_section_id', toSectionId)
    
    return { data: null, error }
  }

  // Upsert the transition - specify columns for conflict resolution
  const { data, error } = await client
    .from('section_transitions')
    .upsert({
      website_id: websiteId,
      from_section_id: fromSectionId,
      to_section_id: toSectionId,
      transition,
    }, { onConflict: 'from_section_id,to_section_id' })
    .select()
    .single()

  return { data, error }
}

export async function deleteTransition(fromSectionId: string, toSectionId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  const { error } = await client
    .from('section_transitions')
    .delete()
    .eq('from_section_id', fromSectionId)
    .eq('to_section_id', toSectionId)

  return { error }
}

export async function deleteTransitionsForSection(sectionId: string, supabase?: SupabaseClient) {
  const client = await getClient(supabase)
  // Delete transitions where this section is either from or to
  const { error: err1 } = await client
    .from('section_transitions')
    .delete()
    .eq('from_section_id', sectionId)

  const { error: err2 } = await client
    .from('section_transitions')
    .delete()
    .eq('to_section_id', sectionId)

  return { error: err1 || err2 }
}

export default {
  fetchWebsiteWithSectionsBySlug,
  listSections,
  listEditorSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  deleteSections,
  moveSection,
  reorderSections,
  savePageStructure,
  duplicateSection,
  getTransitionsBetweenSections,
  getTransitionFromSection,
  setTransition,
  deleteTransition,
  deleteTransitionsForSection,
}
