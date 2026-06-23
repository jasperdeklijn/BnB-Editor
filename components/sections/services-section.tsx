"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { SectionStyles } from "@/lib/types"
import type { Room } from "@/lib/supabase/bnb"
import Link from "next/link"
import { Briefcase, Users, ChevronLeft, ChevronRight, DollarSign } from "lucide-react"

export type DienstenLayout = "grid" | "list" | "featured" | "magazine" | "minimal" | "carousel"
export type ServicesLayout = DienstenLayout

interface DienstenSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

// ---- Shared helpers ----

function RoomImage({
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative h-52 overflow-hidden">
            <RoomImage
              images={room.images}
              name={room.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {room.price && (
              <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-bold text-amber-900 shadow">
                {room.price}
              </div>
            )}
          </div>
          <div className="p-5">
            <h3 className="text-lg font-bold text-amber-950 mb-1" style={textStyle}>
              {room.name}
            </h3>
            {room.description && (
              <p className="text-sm text-amber-700 leading-relaxed line-clamp-2 mb-4">
                {room.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              {room.max_guests && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Users className="h-3.5 w-3.5" />
                  {room.max_guests} deelnemers
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-5">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="group flex overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="relative w-2/5 flex-shrink-0 min-h-[180px] overflow-hidden">
            <RoomImage
              images={room.images}
              name={room.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-amber-950 mb-2" style={textStyle}>
                {room.name}
              </h3>
              {room.description && (
                <p className="text-sm text-amber-700 leading-relaxed line-clamp-3">
                  {room.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4">
                {room.max_guests && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {room.max_guests} deelnemers
                  </span>
                )}
                {room.price && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <DollarSign className="h-3.5 w-3.5" />
                    {room.price}
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
  textStyle: React.CSSProperties
}) {
  const [featured, ...rest] = rooms
  if (!featured) return null
  return (
    <div className="space-y-6">
      {/* Featured hero card */}
      <div className="group relative flex overflow-hidden rounded-3xl bg-white shadow-md hover:shadow-xl transition-shadow min-h-[380px]">
        <div className="relative w-1/2 overflow-hidden">
          <RoomImage
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
              {featured.max_guests && (
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <Users className="h-3.5 w-3.5" />
                  {featured.max_guests} deelnemers
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
          {rest.map((room) => (
            <div
              key={room.id}
              className="group overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative h-44 overflow-hidden">
                <RoomImage
                  images={room.images}
                  name={room.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-amber-950 mb-1" style={textStyle}>
                  {room.name}
                </h3>
                {room.description && (
                  <p className="text-xs text-amber-700 line-clamp-2 mb-3">{room.description}</p>
                )}
                <div className="flex items-center justify-between">
                  {room.price && (
                    <span className="text-sm font-bold text-amber-900">{room.price}</span>
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="space-y-8">
      {rooms.map((room, i) => {
        const isReversed = i % 2 !== 0
        return (
          <div
            key={room.id}
            className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow ${
              isReversed ? "sm:flex-row-reverse" : "sm:flex-row"
            }`}
          >
            <div className="relative h-64 sm:h-auto sm:w-1/2 overflow-hidden">
              <RoomImage
                images={room.images}
                name={room.name}
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
                {room.name}
              </h3>
              {room.description && (
                <p className="text-amber-700 leading-relaxed mb-6">{room.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                {room.price && (
                  <span className="text-lg font-bold text-amber-900" style={textStyle}>
                    {room.price}
                  </span>
                )}
                {room.max_guests && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {room.max_guests} deelnemers
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
  textStyle: React.CSSProperties
}) {
  return (
    <div className="divide-y divide-amber-100">
      {rooms.map((room) => (
        <div key={room.id} className="flex items-center justify-between py-6 group">
          <div className="flex items-center gap-5">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
              <RoomImage images={room.images} name={room.name} />
            </div>
            <div>
              <h3
                className="font-bold text-amber-950 group-hover:text-amber-700 transition-colors"
                style={textStyle}
              >
                {room.name}
              </h3>
              {room.description && (
                <p className="text-sm text-amber-600 mt-0.5 line-clamp-1 max-w-md">
                  {room.description}
                </p>
              )}
              {room.max_guests && (
                <span className="flex items-center gap-1 text-xs text-amber-500 mt-1">
                  <Users className="h-3 w-3" />
                  {room.max_guests} deelnemers
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6 pl-4 flex-shrink-0">
            {room.price && (
              <span className="text-lg font-bold text-amber-900 whitespace-nowrap" style={textStyle}>
                {room.price}
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
  rooms,
  textStyle,
}: {
  rooms: Room[]
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
        {rooms.map((room) => (
          <div
            key={room.id}
            className="group flex-shrink-0 w-72 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm hover:shadow-md transition-shadow"
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="relative h-48 overflow-hidden">
              <RoomImage
                images={room.images}
                name={room.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {room.price && (
                <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-sm font-bold text-amber-900 shadow">
                  {room.price}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-amber-950 mb-1 truncate" style={textStyle}>
                {room.name}
              </h3>
              {room.description && (
                <p className="text-xs text-amber-700 line-clamp-2 mb-3 leading-relaxed">
                  {room.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                {room.max_guests && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                    {room.max_guests} pers.
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

export function DienstenSection({ data, styles }: DienstenSectionProps) {
  const title = (data.title as string) || "Onze diensten"
  const layout = (data.layout as DienstenLayout) || "grid"
  // Support both new `serviceIds` and legacy `roomIds` keys.
  const roomIds = (data.serviceIds ?? data.roomIds) as string[] | undefined

  const [rooms, setDiensten] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const businessId = (data.businessId ?? data.bnbId) as string | null | undefined
  const roomIdsKey = (roomIds ?? []).join(",")

  useEffect(() => {
    let cancelled = false

    const fetchDiensten = async () => {
      setLoading(true)
      try {
        // If service data is already provided (from server-side fetch), use it.
        if (data.services || data.rooms) {
          let result = data.services
            ? (data.services as any[]).map((service): Room => ({
                id: service.id,
                bnb_id: service.business_id,
                name: service.title,
                description: service.description,
                price: service.price,
                max_guests: service.capacity,
                images: Array.isArray(service.image_urls) ? service.image_urls : [],
                position: service.position,
                created_at: service.created_at,
                updated_at: service.updated_at,
              }))
            : (data.rooms as Room[]).map((r) => ({
                ...r,
                images: Array.isArray(r.images) ? r.images : [],
              }))

          if (roomIds && roomIds.length > 0) {
            result = result.filter((r) => roomIds.includes(r.id))
          }

          setDiensten(result)
          setLoading(false)
          return
        }

        const supabase = createClient()

        // Use bnbId from section data if available; otherwise fall back to user→bnb lookup
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

        let result = ((serviceData ?? []) as any[]).map((service): Room => ({
          id: service.id,
          bnb_id: service.business_id,
          name: service.title,
          description: service.description,
          price: service.price,
          max_guests: service.capacity,
          images: Array.isArray(service.image_urls) ? service.image_urls : [],
          position: service.position,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }))

        if (roomIds && roomIds.length > 0) {
          result = result.filter((r) => roomIds.includes(r.id))
        }

        setDiensten(result)
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false)
    }

    fetchDiensten()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, roomIdsKey])

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
  if (rooms.length === 0) {
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

        {layout === "grid" && <GridLayout rooms={rooms} textStyle={textStyle} />}
        {layout === "list" && <ListLayout rooms={rooms} textStyle={textStyle} />}
        {layout === "featured" && <FeaturedLayout rooms={rooms} textStyle={textStyle} />}
        {layout === "magazine" && <MagazineLayout rooms={rooms} textStyle={textStyle} />}
        {layout === "minimal" && <MinimalLayout rooms={rooms} textStyle={textStyle} />}
        {layout === "carousel" && <CarouselLayout rooms={rooms} textStyle={textStyle} />}
      </div>
    </section>
  )
}

export const ServicesSection = DienstenSection




