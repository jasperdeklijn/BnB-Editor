"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { SectionStyles } from "@/lib/types"
import Link from "next/link"
import { Briefcase, Users, ChevronLeft, ChevronRight, DollarSign } from "lucide-react"
import { normalizeSectionLayout } from "@/lib/section-layouts"

export type ServicesLayout = "grid" | "list" | "featured" | "magazine" | "minimal" | "carousel"

const servicesLayoutMap = {
  classic: "grid",
  split: "list",
  showcase: "featured",
  compact: "minimal",
  card: "magazine",
  banner: "carousel",
} as const

interface ServicesSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

interface ServiceDisplay {
  id: string
  name: string
  description: string | null
  price: string | null
  capacity: number | null
  images: string[]
  position?: number | null
  created_at?: string | null
  updated_at?: string | null
}

// ---- Shared helpers ----

function ServiceImage({
  images,
  name,
  className,
}: {
  images: string[]
  name: string
  className?: string
}) {
  if (images.length > 0) {
    return (
      <img
        src={images[0]}
        alt={name}
        className={className ?? "w-full h-full object-cover"}
      />
    )
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 ${className ?? "w-full h-full"}`}
    >
      <Briefcase className="h-10 w-10 text-amber-400" />
    </div>
  )
}

// ---- Layout: Grid ----

function GridLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <div
          key={service.id}
          className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative h-52 overflow-hidden">
            <ServiceImage
              images={service.images}
              name={service.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {service.price && (
              <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-bold text-amber-900 shadow">
                {service.price}
              </div>
            )}
          </div>
          <div className="p-5">
            <h3 className="text-lg font-bold text-amber-950 mb-1" style={textStyle}>
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm text-amber-700 leading-relaxed line-clamp-2 mb-4">
                {service.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              {service.capacity && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Users className="h-3.5 w-3.5" />
                  {service.capacity} deelnemers
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-amber-200 text-amber-800 hover:bg-amber-50 ml-auto"
              >
                Meer info
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: List ----

function ListLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-5">
      {services.map((service) => (
        <div
          key={service.id}
          className="group flex overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative w-2/5 flex-shrink-0 min-h-[180px] overflow-hidden">
            <ServiceImage
              images={service.images}
              name={service.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-amber-950 mb-2" style={textStyle}>
                {service.name}
              </h3>
              {service.description && (
                <p className="text-sm text-amber-700 leading-relaxed line-clamp-3">
                  {service.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} deelnemers
                  </span>
                )}
                {service.price && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <DollarSign className="h-3.5 w-3.5" />
                    {service.price}
                  </span>
                )}
              </div>
              <Button size="sm" className="bg-amber-800 hover:bg-amber-700 text-white">
                Bekijken
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: Featured ----

function FeaturedLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  const [featured, ...rest] = services
  if (!featured) return null
  return (
    <div className="space-y-6">
      {/* Featured hero card */}
      <div className="group relative flex overflow-hidden rounded-3xl bg-white shadow-md hover:shadow-xl transition-shadow min-h-[380px]">
        <div className="relative w-1/2 overflow-hidden">
          <ServiceImage
            images={featured.images}
            name={featured.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex-1 p-10 flex flex-col justify-between">
          <div>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 mb-4">
              Uitgelicht
            </span>
            <h3
              className="text-3xl font-bold text-amber-950 mb-3 text-balance"
              style={textStyle}
            >
              {featured.name}
            </h3>
            {featured.description && (
              <p className="text-amber-700 leading-relaxed">{featured.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="space-y-1">
              {featured.price && (
                <span className="font-bold text-amber-900 text-xl" style={textStyle}>
                  {featured.price}
                </span>
              )}
              {featured.capacity && (
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <Users className="h-3.5 w-3.5" />
                  {featured.capacity} deelnemers
                </p>
              )}
            </div>
            <Button className="bg-amber-800 hover:bg-amber-700 text-white">Bekijken</Button>
          </div>
        </div>
      </div>

      {/* Rest in grid */}
      {rest.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((service) => (
            <div
              key={service.id}
              className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 overflow-hidden">
                <ServiceImage
                  images={service.images}
                  name={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-amber-950 mb-1" style={textStyle}>
                  {service.name}
                </h3>
                {service.description && (
                  <p className="text-xs text-amber-700 line-clamp-2 mb-3">{service.description}</p>
                )}
                <div className="flex items-center justify-between">
                  {service.price && (
                    <span className="text-sm font-bold text-amber-900">{service.price}</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-200 text-amber-800 hover:bg-amber-50 text-xs"
                  >
                    Bekijk
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Layout: Magazine ----

function MagazineLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-8">
      {services.map((service, i) => {
        const isReversed = i % 2 !== 0
        return (
          <div
            key={service.id}
            className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow ${
              isReversed ? "sm:flex-row-reverse" : "sm:flex-row"
            }`}
          >
            <div className="relative h-64 sm:h-auto sm:w-1/2 overflow-hidden">
              <ServiceImage
                images={service.images}
                name={service.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="sm:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">
                Dienst {i + 1}
              </span>
              <h3
                className="text-2xl font-bold text-amber-950 mb-3 text-balance"
                style={textStyle}
              >
                {service.name}
              </h3>
              {service.description && (
                <p className="text-amber-700 leading-relaxed mb-6">{service.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                {service.price && (
                  <span className="text-lg font-bold text-amber-900" style={textStyle}>
                    {service.price}
                  </span>
                )}
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} deelnemers
                  </span>
                )}
              </div>
              <Button className="mt-6 w-fit bg-amber-800 hover:bg-amber-700 text-white">
                Meer info
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---- Layout: Minimal ----

function MinimalLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="divide-y divide-amber-100">
      {services.map((service) => (
        <div key={service.id} className="flex items-center justify-between py-6 group">
          <div className="flex items-center gap-5">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <ServiceImage images={service.images} name={service.name} />
            </div>
            <div>
              <h3
                className="font-bold text-amber-950 group-hover:text-amber-700 transition-colors"
                style={textStyle}
              >
                {service.name}
              </h3>
              {service.description && (
                <p className="text-sm text-amber-600 mt-0.5 line-clamp-1 max-w-md">
                  {service.description}
                </p>
              )}
              {service.capacity && (
                <span className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                  <Users className="h-3 w-3" />
                  {service.capacity} deelnemers
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 pl-4 flex-shrink-0">
            {service.price && (
              <span className="text-lg font-bold text-amber-900 whitespace-nowrap" style={textStyle}>
                {service.price}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-50"
            >
              Bekijk &rarr;
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Layout: Carousel ----

function CarouselLayout({
  services,
  textStyle,
}: {
  services: ServiceDisplay[]
  textStyle: React.CSSProperties
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: "left" | "right") => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-4 flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white shadow-md hover:bg-amber-50 transition-colors"
        aria-label="Vorige"
      >
        <ChevronLeft className="h-5 w-5 text-amber-800" />
      </button>

      <div
        ref={containerRef}
        className="flex gap-5 overflow-x-auto scroll-smooth pb-2 px-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {services.map((service) => (
          <div
            key={service.id}
            className="group flex-shrink-0 w-72 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="relative h-48 overflow-hidden">
              <ServiceImage
                images={service.images}
                name={service.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {service.price && (
                <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-bold text-amber-900 shadow">
                  {service.price}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-amber-950 mb-1 truncate" style={textStyle}>
                {service.name}
              </h3>
              {service.description && (
                <p className="text-xs text-amber-700 line-clamp-2 mb-3 leading-relaxed">
                  {service.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                {service.capacity && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {service.capacity} pers.
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-800 hover:bg-amber-50 ml-auto"
                >
                  Bekijk
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-4 flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-white shadow-md hover:bg-amber-50 transition-colors"
        aria-label="Volgende"
      >
        <ChevronRight className="h-5 w-5 text-amber-800" />
      </button>
    </div>
  )
}

// ---- Main section component ----

export function ServicesSection({ data, styles }: ServicesSectionProps) {
  const title = (data.title as string) || "Onze diensten"
  const layout = (servicesLayoutMap[normalizeSectionLayout(data.layout)] ?? "grid") as ServicesLayout
  const serviceIds = data.serviceIds as string[] | undefined

  const [services, setServices] = useState<ServiceDisplay[]>([])
  const [loading, setLoading] = useState(true)

  const businessId = (data.businessId) as string | null | undefined
  const serviceIdsKey = (serviceIds ?? []).join(",")

  useEffect(() => {
    let cancelled = false

    const fetchServices = async () => {
      setLoading(true)
      try {
        // If service data is already provided (from server-side fetch), use it.
        if (data.services) {
          let result = (data.services as any[]).map((service): ServiceDisplay => ({
            id: service.id,
            name: service.title ?? service.name ?? "",
            description: service.description ?? null,
            price: service.price ?? null,
            capacity: service.capacity ?? service.metadata?.capacity ?? null,
            images: Array.isArray(service.image_urls)
              ? service.image_urls
              : Array.isArray(service.images)
                ? service.images
                : [],
            position: service.position,
            created_at: service.created_at,
            updated_at: service.updated_at,
          }))

          if (serviceIds && serviceIds.length > 0) {
            result = result.filter((service) => serviceIds.includes(service.id))
          }

          setServices(result)
          setLoading(false)
          return
        }

        const supabase = createClient()

        // Use businessId from section data if available; otherwise fall back to the user's first business.
        let resolvedBusinessId: string | null = businessId ?? null

        if (!resolvedBusinessId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user || cancelled) {
            setLoading(false)
            return
          }

          const { data: business } = await supabase
            .from("businesses")
            .select("id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!business || cancelled) {
            setLoading(false)
            return
          }
          resolvedBusinessId = business.id
        }

        if (cancelled) return

        const { data: serviceData } = await supabase
          .from("services")
          .select("*")
          .eq("business_id", resolvedBusinessId)
          .order("position", { ascending: true })

        if (cancelled) return

        let result = ((serviceData ?? []) as any[]).map((service): ServiceDisplay => ({
          id: service.id,
          
          name: service.title ?? "",
          description: service.description ?? null,
          price: service.price ?? null,
          capacity: service.capacity ?? service.metadata?.capacity ?? null,
          images: Array.isArray(service.image_urls) ? service.image_urls : [],
          position: service.position,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }))

        if (serviceIds && serviceIds.length > 0) {
          result = result.filter((service) => serviceIds.includes(service.id))
        }

        setServices(result)
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false)
    }

    fetchServices()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, serviceIdsKey])

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const textStyle: React.CSSProperties = { color: styles?.textColor }

  // Loading skeleton
  if (loading) {
    return (
      <section
        className={`bg-amber-50/50 px-4 py-16 ${styles?.fontFamily ?? ""}`}
        style={sectionStyle}
      >
        <div className="mx-auto max-w-6xl">
          <div className="h-8 w-48 bg-amber-200/50 rounded animate-pulse mx-auto mb-10" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-amber-100/50 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Empty state - link to the offerings manager.
  if (services.length === 0) {
    return (
     <section
      className={`relative overflow-hidden bg-[#020617] px-4 py-20 ${styles?.fontFamily ?? ""}`}
      style={sectionStyle}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_45%)]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-400">
          Diensten beheren
        </div>
        <h2 className="mb-6 text-4xl font-extrabold tracking-tight text-white" style={textStyle}>
          {title}
        </h2>
        <div className="relative overflow-hidden rounded-[32px] border border-indigo-500/20 bg-[#050b2c]/95 p-12 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/5 pointer-events-none" />
          <div className="relative flex flex-col items-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-500 shadow-lg shadow-violet-900/30">
              <Briefcase className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-white">
              Nog geen diensten aangemaakt
            </h3>
            <p className="max-w-xl text-base leading-8 text-white/65">
              Maak eerst diensten aan via de diensten pagina en selecteer ze daarna hier om ze zichtbaar te maken op je website.
            </p>
            <Link
              href="/editor/services"
              className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 px-7 py-4 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(124,58,237,0.45)]"
            >
              <Briefcase className="h-4 w-4" />
              Diensten aanmaken
            </Link>
          </div>
        </div>
      </div>
    </section>
    )
  }

  return (
    <section
      className={`bg-amber-50/50 px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily ?? ""}`}
      style={sectionStyle}
    >
      <div className="mx-auto max-w-6xl">
        <h2
          className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        >
          {title}
        </h2>

        {layout === "grid" && <GridLayout services={services} textStyle={textStyle} />}
        {layout === "list" && <ListLayout services={services} textStyle={textStyle} />}
        {layout === "featured" && <FeaturedLayout services={services} textStyle={textStyle} />}
        {layout === "magazine" && <MagazineLayout services={services} textStyle={textStyle} />}
        {layout === "minimal" && <MinimalLayout services={services} textStyle={textStyle} />}
        {layout === "carousel" && <CarouselLayout services={services} textStyle={textStyle} />}
      </div>
    </section>
  )
}








