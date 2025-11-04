"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface RoomsSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate: (newData: Record<string, unknown>) => void
  styles?: SectionStyles
}

export function RoomsSection({ data, isPreview, onUpdate, styles }: RoomsSectionProps) {
  const title = data.title as string
  const rooms = data.rooms as Array<{ name: string; description: string; price: string }>

  const updateRoom = (index: number, field: string, value: string) => {
    const newRooms = [...rooms]
    newRooms[index] = { ...newRooms[index], [field]: value }
    onUpdate({ rooms: newRooms })
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
    <section className={`bg-amber-50/50 px-6 py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <EditableText
          value={title}
          onChange={(value) => onUpdate({ title: value })}
          isPreview={isPreview}
          as="h2"
          className="mb-12 text-balance text-center text-3xl font-bold text-foreground md:text-4xl"
          style={textStyle}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-200" />
              <CardHeader>
                <CardTitle>
                  <EditableText
                    value={room.name}
                    onChange={(value) => updateRoom(index, "name", value)}
                    isPreview={isPreview}
                    as="span"
                    style={textStyle}
                  />
                </CardTitle>
                <CardDescription>
                  <EditableText
                    value={room.description}
                    onChange={(value) => updateRoom(index, "description", value)}
                    isPreview={isPreview}
                    as="span"
                  />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-amber-700">
                    <EditableText
                      value={room.price}
                      onChange={(value) => updateRoom(index, "price", value)}
                      isPreview={isPreview}
                      as="span"
                    />
                  </span>
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
