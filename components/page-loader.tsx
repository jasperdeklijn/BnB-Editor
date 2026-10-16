import { readAllQueryRows } from "@/lib/supabase/pagination"
import { notFound, permanentRedirect } from "next/navigation"
import { headers } from "next/headers"
import { customerSiteBase, resolveWebsiteRoute, snapshotRedirect } from "@/lib/website-routing"
import { websitePagePath } from "@/lib/website-links"
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
import { publicAnalyticsSettings } from "@/lib/analytics/public-settings"
import { createTrackingToken } from "@/lib/analytics/server"
import { SiteCookieConsent } from "@/components/privacy/site-cookie-consent"
import { PLATFORM_BASE_URL } from "@/lib/platform"
import { WebsiteLinksProvider } from "@/components/editor/website-links-context"
import { mapWebsitePage, type WebsitePage } from "@/lib/website-pages"

interface PageLoaderOptions {
  slug: string
  isPreview?: boolean
  /** Optional pre-built client. Pass an admin client to bypass RLS (for preview). */
  client?: SupabaseClient
  locale?: string
  path?: string[]
}

export async function loadPublicWebsitePage({
  slug,
  isPreview = true,
  client,
  locale,
  path = locale ? [locale] : [],
}: PageLoaderOptions) {
  const supabase = client ?? (await createClient())
  const multilingualEnabled = isMultilingualWebsitesEnabled()
  if (locale && !multilingualEnabled) return notFound()

  const { data: website, error } = isPreview
    ? await websiteSections.fetchWebsiteWithSectionsBySlug(slug, supabase)
    : await supabase
        .rpc("get_public_website", { p_slug: slug, p_domain: null })
        .maybeSingle()

  if (error || !website) return notFound()

  let previewLinkPages: WebsitePage[] = []
  if (isPreview) {
    const { data: pages, error: pagesError } = await readAllQueryRows(supabase.from("website_pages")
      .select("*", {count:"exact"}).eq("website_id", website.id).order("position").order("id"))
    if (pagesError || !pages?.length) return notFound()
    previewLinkPages = pages.map(mapWebsitePage)
  }

  // Live route: only show published sites
  if (!isPreview && !website.published) return notFound()

  const liveSnapshot: WebsiteLiveSnapshot | null = !isPreview && isWebsiteLiveSnapshot(website.live_snapshot)
    ? website.live_snapshot
    : null

  // A published flag without a complete snapshot is not a renderable live revision.
  if (!isPreview && !liveSnapshot) return notFound()

  const visitorHeaders = await headers()
  const basePath = customerSiteBase(slug, visitorHeaders.get("host") ?? "localhost", isPreview)
  const routeLocales = liveSnapshot?.locales.filter((entry) => multilingualEnabled || entry.isDefault) ?? []
  const liveRoute = liveSnapshot ? resolveWebsiteRoute(liveSnapshot.pages, routeLocales, path) : null
  if (liveSnapshot && !liveRoute) {
    const redirectPath = snapshotRedirect(liveSnapshot, path)
    if (redirectPath) permanentRedirect(`${basePath}${redirectPath}`)
    return notFound()
  }
  const liveLocale = liveSnapshot?.locales.find((entry) => entry.locale === liveRoute?.locale.locale) ?? null
  const livePage = liveSnapshot?.pages.find((page) => page.id === liveRoute?.page.id)
  let selectedPageId = livePage?.id ?? null
  if (liveSnapshot?.locales?.length && !liveLocale) return notFound()

  const adminSupabase = await createAdminClient()
  const { analytics, advancedAllowed: advancedAnalyticsAllowed } = !isPreview
    ? await publicAnalyticsSettings(website.id) : { analytics: null, advancedAllowed: false }
  const trackingToken = !isPreview && livePage && analytics?.firstPartyEnabled === true ? createTrackingToken({ websiteId: website.id, pageId: livePage.id,
    host: visitorHeaders.get("host") ?? "", path: basePath + websitePagePath(livePage, liveRoute?.locale.isDefault ? "" : liveRoute?.locale.pathSegment ?? "") }) : null

  const websiteBusinessId = liveSnapshot ? liveSnapshot.website.businessId : website.business_id ?? await (async () => {
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
  const userEmail = userData?.user?.email

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
    ? [...(liveLocale?.sections ?? liveSnapshot.sections).filter((section) => liveSnapshot.sharedSections.some((shared) => shared.id === section.id && shared.type === "nav")),
      ...(livePage?.locales.find((entry) => entry.locale === liveLocale?.locale)?.sections ?? livePage?.sections ?? []),
      ...(liveLocale?.sections ?? liveSnapshot.sections).filter((section) => liveSnapshot.sharedSections.some((shared) => shared.id === section.id && shared.type === "footer"))].map((section) => {
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
    if (!multilingualEnabled) localeOptions = localeOptions.filter((entry) => entry.isDefault)
    const previewRoute = resolveWebsiteRoute(previewLinkPages, localeOptions, path)
    const previewLocale = localeOptions.find((entry) => entry.locale === previewRoute?.locale.locale)
    if (!previewLocale) return notFound()
    selectedPageId = previewRoute!.page.id
    const pageIds = new Set((website.website_sections ?? []).filter((row: { page_id: string | null; scope: string }) => row.page_id === selectedPageId || row.scope !== "page").map((row: { id: string }) => row.id))
    sections = sections.filter((section) => pageIds.has(section.id)).sort((a, b) => (a.type === "nav" ? -1 : a.type === "footer" ? 1 : 0) - (b.type === "nav" ? -1 : b.type === "footer" ? 1 : 0))
    activeLocale = previewLocale.locale
    if (!previewLocale.isDefault) {
      const { data: pageTranslations, error: pageTranslationError } = await supabase.from("website_page_translations").select("page_id,title,navigation_label").eq("website_id", website.id).eq("locale", activeLocale)
      if (pageTranslationError) return notFound()
      previewLinkPages = previewLinkPages.map((page) => { const translation = pageTranslations?.find((entry) => entry.page_id === page.id); return { ...page, title: translation?.navigation_label || translation?.title || page.title } })
    }

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
    themeConfig?.languageSwitcher,
  )
  sections.splice(0, sections.length, ...applyThemeDefaultsToSections(resolvedSections, themeConfig))

  const localeLinks = localeOptions.map((entry) => ({
    locale: entry.locale,
    label: entry.displayName,
    href: `${basePath}${websitePagePath((liveSnapshot?.pages ?? previewLinkPages).find((page) => page.id === selectedPageId)!, entry.isDefault ? "" : entry.pathSegment)}`,
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
    ? { data: (livePage?.transitions ?? []).map((transition) => ({
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

      // Paint separators render once in document flow, just like the canvas.
      const prevWasTransition = i > 0 &&
        sequence[i - 1].type === "transition" && sequence[i - 1].data.type !== "paint"
      const nextIsTransition = i < sequence.length - 1 &&
        sequence[i + 1].type === "transition" && sequence[i + 1].data.type !== "paint"

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
            websiteId={website.id}
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
                websiteId={website.id}
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
                websiteId={website.id}
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
              websiteId={website.id}
              isPreview={isPreview}
              wrapTransition={false}
              allSections={sections}
            />
          </div>
        )
      }
    }
    if (item.type === "transition" && item.data.type === "paint") {
      const previousSection = sections.find((section) => section.id === item.data.fromSectionId)
      const nextSection = sections.find((section) => section.id === item.data.toSectionId)
      nodes.push(
        <TransitionWrapper
          key={item.data.id}
          type="paint"
          position="center"
          fromColor={previousSection?.styles?.backgroundColor || "#ffffff"}
          toColor={nextSection?.styles?.backgroundColor || "#fafaf9"}
        />,
      )
    }
    // Other transition types are handled by wrapping sections above.
  }

  const jsonLd = buildLocalBusinessJsonLd(
    businessDetails as Parameters<typeof buildLocalBusinessJsonLd>[0],
    `${liveSnapshot?.website.customDomain
      ? `https://${liveSnapshot.website.customDomain}`
      : `${PLATFORM_BASE_URL}/site/${liveSnapshot?.website.slug ?? website.slug}`}${websitePagePath((liveSnapshot?.pages ?? previewLinkPages).find((page) => page.id === selectedPageId)!, localeOptions.find((entry) => entry.locale === activeLocale && !entry.isDefault)?.pathSegment ?? "")}`,
  )

  return (
    <WebsiteLinksProvider value={{ pages: liveSnapshot ? liveSnapshot.pages.map((page) => ({ ...page, title: page.locales.find((entry) => entry.locale === activeLocale)?.navigationLabel || page.title })) : previewLinkPages,
      basePath,
      sectionAliases: Object.fromEntries([...sections].reverse().map((section) => [`#${section.type}`, `#section-${section.id}`])),
      activePageId: selectedPageId,
      localePath: localeOptions.find((entry) => entry.locale === activeLocale && !entry.isDefault)?.pathSegment ?? "" }}>
    <WebsiteLocaleProvider locale={activeLocale}>
      <WebsiteThemeProvider initialConfig={themeConfig ?? undefined}>
        <div lang={activeLocale} className="website-theme-scope min-h-screen bg-background">{nodes}</div>
        <SiteCookieConsent
          websiteId={website.id}
          policyUrl={`${PLATFORM_BASE_URL}/cookies`}
          enableTracking={!isPreview && Boolean(trackingToken)}
          trackingToken={trackingToken}
          measurementId={!isPreview && advancedAnalyticsAllowed && analytics?.provider === "google-analytics" ? analytics.measurementId : undefined}
          consentMode={analytics?.consentMode !== false}
        />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </WebsiteThemeProvider>
    </WebsiteLocaleProvider>
    </WebsiteLinksProvider>
  )
}









