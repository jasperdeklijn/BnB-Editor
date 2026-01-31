"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface RoomsSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  styles?: SectionStyles
}

export function RoomsSection({ data, isPreview, onUpdate, styles }: RoomsSectionProps) {
  const title = data.title as string
  const rooms = (data.rooms as Array<{ name: string; description: string; price: string }>) || []

  const handleUpdate = (newData: Record<string, unknown>) => {
    if (onUpdate) {
      onUpdate(newData)
    }
  }

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
        <EditableText
          value={title}
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h2"
          className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        />
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-200" />
              <CardHeader>
                <CardTitle>
                  <EditableText
                    value={room.name}
                    onChange={(value) => {
                      const newRooms = [...rooms]
                      newRooms[index] = { ...room, name: value }
                      handleUpdate({ rooms: newRooms }) // Use safe handler
                    }}
                    isPreview={isPreview}
                    as="span"
                    className="text-amber-950"
                    style={textStyle}
                  />
                </CardTitle>
                <CardDescription>
                  <EditableText
                    value={room.description}
                    onChange={(value) => {
                      const newRooms = [...rooms]
                      newRooms[index] = { ...room, description: value }
                      handleUpdate({ rooms: newRooms }) // Use safe handler
                    }}
                    isPreview={isPreview}
                    as="span"
                    className="text-amber-700"
                    style={textStyle}
                  />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <EditableText
                    value={room.price}
                    onChange={(value) => {
                      const newRooms = [...rooms]
                      newRooms[index] = { ...room, price: value }
                      handleUpdate({ rooms: newRooms }) // Use safe handler
                    }}
                    isPreview={isPreview}
                    as="p"
                    className="text-2xl font-bold text-amber-900"
                    style={textStyle}
                  />
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
