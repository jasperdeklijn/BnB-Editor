import { notFound } from "next/navigation"
import React from "react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import websiteSections from "@/lib/supabase/websiteSections"
import { SectionRenderer, TransitionWrapper } from "@/components/editor/section-renderer"
import type { Section, Transition } from "@/lib/types"
import { resolveAllSections } from "@/lib/supabase/section-resolver"
import { WebsiteThemeProvider } from "@/components/themes/website-theme-provider"
import { applyThemeDefaultsToSections, type ThemeConfig } from "@/lib/themes"
import { buildLocalBusinessJsonLd } from "@/lib/business/structured-data"
import { isWebsiteLiveSnapshot, type WebsiteLiveSnapshot } from "@/lib/website-snapshot"
import { DEFAULT_WEBSITE_LOCALE, type SupportedWebsiteLocale } from "@/lib/i18n/locales"
import { applySectionTranslation, materializeNavigationTranslationSource } from "@/lib/i18n/section-translations"
import { getSiteMessages } from "@/lib/site-i18n/messages"
import { WebsiteLocaleProvider } from "@/lib/site-i18n/provider"
import { normalizeLanguageSwitcherConfig } from "@/lib/i18n/language-switcher"
import { isMultilingualWebsitesEnabled } from "@/lib/i18n/feature"
import { PublicVisitTracker } from "@/components/analytics/public-visit-tracker"

interface PageLoaderOptions {
  slug: string
  isPreview?: boolean
  /** Optional pre-built client. Pass an admin client to bypass RLS (for preview). */
  client?: SupabaseClient
  locale?: string
}

export async function loadPublicWebsitePage({
  slug,
  isPreview = true,
  client,
  locale,
}: PageLoaderOptions) {
  const supabase = client ?? (await createClient())
  const multilingualEnabled = isMultilingualWebsitesEnabled()
  if (locale && !multilingualEnabled) return notFound()

  const { data: website, error } = isPreview
    ? await websiteSections.fetchWebsiteWithSectionsBySlug(slug, supabase)
    : await supabase
        .from("websites")
        .select("id, user_id, business_id, title, slug, custom_domain, published, seo, theme_config, live_snapshot")
        .eq("slug", slug)
        .single()

  if (error || !website) return notFound()

  // Live route: only show published sites
  if (!isPreview && !website.published) return notFound()

  const liveSnapshot: WebsiteLiveSnapshot | null = !isPreview && isWebsiteLiveSnapshot(website.live_snapshot)
    ? website.live_snapshot
    : null

  // A published flag without a complete snapshot is not a renderable live revision.
  if (!isPreview && !liveSnapshot) return notFound()

  const liveLocale = liveSnapshot
    ? (locale
        ? liveSnapshot.locales?.find((entry) => entry.pathSegment === locale && !entry.isDefault)
        : liveSnapshot.locales?.find((entry) => entry.isDefault))
    : null
  if (liveSnapshot?.locales?.length && !liveLocale) return notFound()

  const adminSupabase = await createAdminClient()

  const websiteBusinessId = liveSnapshot?.website.businessId ?? website.business_id ?? await (async () => {
    const { data: business, error: businessError } = await adminSupabase
      .from('businesses')
      .select('id')
      .eq('user_id', website.user_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (businessError) return null
    return business?.id ?? null
  })()

  // Get user email for contact form default recipient
  const { data: userData } = liveSnapshot
    ? { data: null }
    : await adminSupabase.auth.admin.getUserById(website.user_id)
  const userEmail = liveSnapshot?.ownerEmail ?? userData?.user?.email

  const { data: currentBusinessDetails } = !liveSnapshot && websiteBusinessId
    ? await adminSupabase
        .from('businesses')
        .select('name, category, description, phone, email, street, city, postal, country, latitude, longitude, social_links, opening_note')
        .eq('id', websiteBusinessId)
        .maybeSingle()
    : { data: null }

  let businessDetails = liveLocale?.business ?? liveSnapshot?.business ?? currentBusinessDetails
  let previewServiceTranslations = new Map<string, { title: string; description: string }>()

  const draftSections: Section[] = (website.website_sections || []).map(
    (r: any): Section => ({
      id: r.id,
      type: r.type,
      data: {
        ...(r.content ?? {}),
        businessId: websiteBusinessId,
        websiteId: website.id,
        businessCategory: businessDetails?.category ?? null,
        // Set default recipientEmail if not already set
        recipientEmail: r.content?.recipientEmail || businessDetails?.email || userEmail,
      },
      styles: r.styles || {},
    })
  )

  let sections: Section[] = liveSnapshot
    ? (liveLocale?.sections ?? liveSnapshot.sections).map((section) => {
        const selectedServiceIds = Array.isArray(section.data.serviceIds)
          ? section.data.serviceIds.filter((id): id is string => typeof id === "string")
          : []
        const snapshotServices = selectedServiceIds.length > 0
          ? (liveLocale?.services ?? liveSnapshot.services).filter((service) => selectedServiceIds.includes(service.id))
          : (liveLocale?.services ?? liveSnapshot.services)

        return {
          ...section,
          data: {
            ...section.data,
            businessId: liveSnapshot.website.businessId,
            websiteId: liveSnapshot.website.id,
            businessCategory: liveSnapshot.business?.category ?? null,
            recipientEmail:
              section.data.recipientEmail || liveSnapshot.business?.email || liveSnapshot.ownerEmail || undefined,
            ...(section.type === "services" && !Array.isArray(section.data.services)
              ? { services: snapshotServices }
              : {}),
          },
        }
      })
    : draftSections

  let activeLocale: SupportedWebsiteLocale = liveLocale?.locale ?? DEFAULT_WEBSITE_LOCALE
  let localeOptions = liveSnapshot?.locales?.filter((entry) => multilingualEnabled || entry.isDefault).map((entry) => ({
    locale: entry.locale,
    pathSegment: entry.pathSegment,
    displayName: entry.displayName,
    isDefault: entry.isDefault,
  })) ?? []

  if (!liveSnapshot) {
    const { data: configuredLocales } = await adminSupabase
      .from("website_locales")
      .select("locale, path_segment, display_name, is_default, is_enabled")
      .eq("website_id", website.id)
      .or("is_default.eq.true,is_enabled.eq.true")
      .order("is_default", { ascending: false })

    localeOptions = (configuredLocales ?? []).map((entry) => ({
      locale: entry.locale as SupportedWebsiteLocale,
      pathSegment: entry.path_segment,
      displayName: entry.display_name,
      isDefault: entry.is_default,
    }))
    if (localeOptions.length === 0) {
      localeOptions = [{ locale: DEFAULT_WEBSITE_LOCALE, pathSegment: "nl", displayName: "Nederlands", isDefault: true }]
    }
    const previewLocale = locale
      ? localeOptions.find((entry) => entry.pathSegment === locale && !entry.isDefault)
      : localeOptions.find((entry) => entry.isDefault)
    if (!previewLocale) return notFound()
    activeLocale = previewLocale.locale

    if (!previewLocale.isDefault) {
      const { data: translations } = await adminSupabase
        .from("website_section_translations")
        .select("section_id, values")
        .eq("website_id", website.id)
        .eq("locale", previewLocale.locale)
      const translationsBySection = new Map(
        (translations ?? []).map((entry) => [entry.section_id, entry.values as Record<string, unknown>]),
      )
      const translationSources = sections.map((section) => materializeNavigationTranslationSource(section, sections))
      sections = translationSources.map((section) => applySectionTranslation(section, translationsBySection.get(section.id)))
      if (websiteBusinessId) {
        const [{ data: businessTranslation }, { data: serviceRows }] = await Promise.all([
          adminSupabase.from("business_translations").select("name, description, opening_note").eq("business_id", websiteBusinessId).eq("locale", previewLocale.locale).maybeSingle(),
          adminSupabase.from("services").select("id").eq("business_id", websiteBusinessId),
        ])
        if (businessTranslation && businessDetails) {
          businessDetails = { ...businessDetails, ...businessTranslation }
        }
        if ((serviceRows ?? []).length > 0) {
          const { data } = await adminSupabase
            .from("service_translations")
            .select("service_id, title, description")
            .in("service_id", (serviceRows ?? []).map((service) => service.id))
            .eq("locale", previewLocale.locale)
          previewServiceTranslations = new Map((data ?? []).map((entry) => [entry.service_id, {
            title: entry.title,
            description: entry.description,
          }]))
        }
      }
    }
  }

  // Resolve live data for all sections that need it.
  // The admin client is used so RLS does not block reads for published sites.
  // Preview shares the same resolver path — resolvers are safe for both modes.
  let resolvedSections = liveSnapshot
    ? sections
    : await resolveAllSections(sections, {
        businessId: websiteBusinessId,
        supabase: adminSupabase,
        isPreview,
      })
  if (previewServiceTranslations.size > 0) {
    resolvedSections = resolvedSections.map((section) => section.type !== "services" ? section : ({
      ...section,
      data: {
        ...section.data,
        services: Array.isArray(section.data.services)
          ? section.data.services.map((service: Record<string, unknown>) => ({
              ...service,
              ...(previewServiceTranslations.get(String(service.id)) ?? {}),
            }))
          : section.data.services,
      },
    }))
  }
  const currentThemeConfig = (website.theme_config as ThemeConfig | null) ?? null
  const themeConfig = liveSnapshot?.website.themeConfig ?? currentThemeConfig
  const languageSwitcher = normalizeLanguageSwitcherConfig(
    currentThemeConfig?.languageSwitcher ?? themeConfig?.languageSwitcher,
  )
  sections.splice(0, sections.length, ...applyThemeDefaultsToSections(resolvedSections, themeConfig))

  const localeLinks = localeOptions.map((entry) => ({
    locale: entry.locale,
    label: entry.displayName,
    href: entry.isDefault ? "/" : `/${entry.pathSegment}`,
    isActive: entry.locale === activeLocale,
  }))
  const messages = getSiteMessages(activeLocale)
  sections.splice(0, sections.length, ...sections.map((section) => ({
    ...section,
    data: {
      ...section.data,
      activeLocale,
      localeLinks,
      siteMessages: messages,
      languageSwitcher,
    },
  })))

  // Fetch transitions from section_transitions table
  const { data: transitionRows } = liveSnapshot
    ? { data: liveSnapshot.transitions.map((transition) => ({
        from_section_id: transition.fromSectionId,
        to_section_id: transition.toSectionId,
        transition: { type: transition.type },
      })) }
    : await supabase
        .from("section_transitions")
        .select("from_section_id, to_section_id, transition")
        .eq("website_id", website.id)

  // Map transitions to Transition objects
  const transitions: Transition[] = (transitionRows || []).map((t: any) => ({
    id: `${t.from_section_id}-${t.to_section_id}`,
    fromSectionId: t.from_section_id,
    toSectionId: t.to_section_id,
    type: t.transition?.type || "none",
  }))

  // Build a sequence: section, transition, section, transition, ...
  type SequenceItem = { type: "section"; data: Section } | { type: "transition"; data: Transition }
  const sequence: SequenceItem[] = []

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i]
    sequence.push({ type: "section", data: current })

    // Check if there's a transition to the next section
    if (i < sections.length - 1) {
      const next = sections[i + 1]
      const transition = transitions.find(
        t => t.fromSectionId === current.id && t.toSectionId === next.id
      )

      if (transition && transition.type !== "none") {
        sequence.push({ type: "transition", data: transition })
      }
    }
  }

  const nodes: React.ReactNode[] = []

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i]

    if (item.type === "section") {
      const section = item.data

      // Check if the previous item was a transition
      const prevWasTransition = i > 0 && sequence[i - 1].type === "transition"
      const nextIsTransition = i < sequence.length - 1 && sequence[i + 1].type === "transition"

      // Determine wrapper ID for anchor navigation (not for nav/footer)
      const needsAnchorId = section.type !== "nav" && section.type !== "footer"
      const anchorId = needsAnchorId ? `section-${section.id}` : undefined
      
      // Nav sections need to be rendered without wrapper for sticky positioning
      const isNavSection = section.type === "nav"

      if (isNavSection) {
        // Render nav directly without wrapper to preserve sticky positioning
        nodes.push(
          <SectionRenderer
            key={section.id}
            section={section}
            isPreview={isPreview}
            wrapTransition={false}
            allSections={sections}
          />
        )
      } else if (prevWasTransition) {
        // This section comes after a transition, wrap it with "top"
        const transition = (sequence[i - 1].data as Transition)
        const prevSection = sections.find(s => s.id === transition.fromSectionId)
        const fromColor = prevSection?.styles?.backgroundColor || "#ffffff"
        const toColor = section.styles?.backgroundColor || "#fafaf9"

        nodes.push(
          <TransitionWrapper
            key={`${section.id}-top`}
            type={transition.type}
            position="top"
            fromColor={fromColor}
            toColor={toColor}
          >
            <div id={anchorId}>
              <SectionRenderer
                section={section}
                isPreview={isPreview}
                wrapTransition={false}
                allSections={sections}
              />
            </div>
          </TransitionWrapper>
        )
      } else if (nextIsTransition) {
        // This section has a transition to the next, wrap it with "bottom"
        const transition = (sequence[i + 1].data as Transition)
        const nextSection = sections.find(s => s.id === transition.toSectionId)
        const fromColor = section.styles?.backgroundColor || "#ffffff"
        const toColor = nextSection?.styles?.backgroundColor || "#fafaf9"

        nodes.push(
          <TransitionWrapper
            key={`${section.id}-bottom`}
            type={transition.type}
            position="bottom"
            fromColor={fromColor}
            toColor={toColor}
          >
            <div id={anchorId}>
              <SectionRenderer
                section={section}
                isPreview={isPreview}
                wrapTransition={false}
                allSections={sections}
              />
            </div>
          </TransitionWrapper>
        )
      } else {
        // No transition before or after, render normally
        nodes.push(
          <div key={section.id} id={anchorId} className="relative">
            <SectionRenderer
              section={section}
              isPreview={isPreview}
              wrapTransition={false}
              allSections={sections}
            />
          </div>
        )
      }
    }
    // Transition items don't render themselves; they're handled by wrapping sections
  }

  const jsonLd = buildLocalBusinessJsonLd(
    businessDetails as Parameters<typeof buildLocalBusinessJsonLd>[0],
    `${liveSnapshot?.website.customDomain
      ? `https://${liveSnapshot.website.customDomain}`
      : `/site/${liveSnapshot?.website.slug ?? website.slug}`}${liveLocale && !liveLocale.isDefault ? `/${liveLocale.pathSegment}` : locale ? `/${locale}` : ""}`,
  )

  return (
    <WebsiteLocaleProvider locale={activeLocale}>
      <WebsiteThemeProvider initialConfig={themeConfig ?? undefined}>
        {!isPreview ? <PublicVisitTracker websiteId={website.id} /> : null}
        <div lang={activeLocale} className="website-theme-scope min-h-screen bg-background">{nodes}</div>
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </WebsiteThemeProvider>
    </WebsiteLocaleProvider>
  )
}









