"use client"

import type React from "react"

import { Mail, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EditableText } from "@/components/editor/editable-text"
import type { SectionStyles } from "@/lib/types"

interface ContactSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void // Made onUpdate optional
  styles?: SectionStyles
}

export function ContactSection({ data, isPreview, onUpdate, styles }: ContactSectionProps) {
  const title = data.title as string
  const address = data.address as string
  const phone = data.phone as string
  const email = data.email as string

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
    <section className={`bg-background px-6 py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <EditableText
          value={title}
          onChange={(value) => handleUpdate({ title: value })} // Use safe handler
          isPreview={isPreview}
          as="h2"
          className="mb-12 text-balance text-center text-4xl font-bold text-amber-950"
          style={textStyle}
        />
        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Address
                </h3>
                <EditableText
                  value={address}
                  onChange={(value) => handleUpdate({ address: value })} // Use safe handler
                  isPreview={isPreview}
                  as="span"
                  className="text-amber-800"
                  style={textStyle}
                />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Phone
                </h3>
                <EditableText
                  value={phone}
                  onChange={(value) => handleUpdate({ phone: value })} // Use safe handler
                  isPreview={isPreview}
                  as="span"
                  className="text-amber-800"
                  style={textStyle}
                />
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Email
                </h3>
                <EditableText
                  value={email}
                  onChange={(value) => handleUpdate({ email: value })} // Use safe handler
                  isPreview={isPreview}
                  as="span"
                  className="text-amber-800"
                  style={textStyle}
                />
              </div>
            </div>
          </div>
          <form className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message" rows={4} />
            </div>
            <Button className="w-full bg-amber-700 hover:bg-amber-800">Send Message</Button>
          </form>
        </div>
      </div>
    </section>
  )
}
