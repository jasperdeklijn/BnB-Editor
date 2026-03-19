"use client"

import type React from "react"

import { Mail, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { SectionStyles } from "@/lib/types"

interface ContactSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
}

export function ContactSection({ data, styles }: ContactSectionProps) {
  const title = data.title as string
  const address = data.address as string
  const phone = data.phone as string
  const email = data.email as string

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
    <section className={`bg-background px-4 py-10 sm:px-6 sm:py-12 md:py-16 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className="mx-auto max-w-6xl">
        <h2
          className="mb-8 text-balance text-center text-2xl font-bold text-amber-950 sm:mb-10 sm:text-3xl md:mb-12 md:text-4xl"
          style={textStyle}
        >
          {title}
        </h2>
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2 md:gap-12">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Address
                </h3>
                <span className="text-amber-800" style={textStyle}>
                  {address}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Phone
                </h3>
                <span className="text-amber-800" style={textStyle}>
                  {phone}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="mt-1 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold" style={textStyle}>
                  Email
                </h3>
                <span className="text-amber-800" style={textStyle}>
                  {email}
                </span>
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
