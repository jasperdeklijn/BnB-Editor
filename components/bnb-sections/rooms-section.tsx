"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { SectionStyles } from "@/lib/types"

interface RoomsSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function RoomsSection({ data, styles }: RoomsSectionProps) {
  const title = data.title as string
  const rooms = (data.rooms as Array<{ name: string; description: string; price: string }>) || []

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }

  const textStyle: React.CSSProperties = {
    color: styles?.textColor,
  }

  return (
    <section className={`bg-amber-50/50 px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <h2
          className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        >
          {title}
        </h2>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-200" />
              <CardHeader>
                <CardTitle>
                  <span className="text-amber-950">{room.name}</span>
                </CardTitle>
                <CardDescription>
                  <span className="text-amber-700">{room.description}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-amber-900" style={textStyle}>
                    {room.price}
                  </p>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
