"use client"

import { UserRound } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import type { SectionStyles } from "@/lib/types"
import { getLayoutClasses } from "@/lib/section-layouts"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { getSectionColorVars } from "@/lib/section-colors"

export interface TeamMember {
  id?: string
  name: string
  title?: string
  bio?: string
  image?: string
}

interface TeamSectionProps {
  data: Record<string, unknown>
  isPreview: boolean
  styles?: SectionStyles
  onUpdate?: (newData: Record<string, unknown>) => void
}

export function TeamSection({ data, isPreview, styles, onUpdate }: TeamSectionProps) {
  const { messages } = useWebsiteLocale()
  const title = (data.title as string) || "Maak kennis met ons team"
  const subtitle = data.subtitle as string | undefined
  const members = Array.isArray(data.members) ? (data.members as TeamMember[]) : []
  const layout = getLayoutClasses(data.layout)
  const isList = layout.layout === "split" || layout.layout === "compact"
  const isHorizontal = layout.layout === "banner"
  const textStyle: React.CSSProperties = { color: styles?.textColor }
  const sectionStyle: React.CSSProperties = {
    ...getSectionColorVars(styles),
    backgroundColor: styles?.backgroundColor,
    backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: styles?.backgroundPosition || "center",
  }

  return (
    <section className={`px-4 ${layout.section} sm:px-6 ${styles?.fontFamily || ""}`} style={sectionStyle}>
      <div className={`mx-auto ${layout.container}`}>
        <div className={`mb-10 ${layout.heading}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--section-accent)]">{messages.team}</p>
          <EditableText as="h2" data={data} path={["title"]} value={title} isPreview={isPreview} onUpdate={onUpdate} className="text-3xl font-bold md:text-4xl" style={textStyle} />
          {subtitle ? <EditableText as="p" data={data} path={["subtitle"]} value={subtitle} isPreview={isPreview} onUpdate={onUpdate} multiline className="mx-auto mt-3 max-w-2xl text-muted-foreground" style={textStyle} /> : null}
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-[var(--section-surface)] p-8 text-center text-sm text-[var(--section-surface-foreground)]">
            {messages.addTeam}
          </div>
        ) : (
          <div className={isHorizontal ? "flex snap-x gap-5 overflow-x-auto pb-3" : isList ? "grid gap-5 md:grid-cols-2" : `grid gap-6 ${layout.grid}`}>
            {members.map((member, index) => (
              <article
                key={member.id ?? index}
                className={`${isHorizontal ? "min-w-[260px] snap-start" : ""} ${isList ? "flex items-center gap-4" : "text-center"} overflow-hidden rounded-2xl border border-border p-5 text-[var(--section-surface-foreground)] shadow-sm`}
                style={{ backgroundColor: "var(--section-surface)" }}
              >
                <div className={`${isList ? "h-24 w-24 shrink-0" : layout.layout === "showcase" ? "h-80" : "mx-auto h-44 w-full"} overflow-hidden rounded-xl bg-muted`}>
                  {member.image ? <img src={member.image} alt={member.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><UserRound className="h-12 w-12 text-muted-foreground/50" /></div>}
                </div>
                <div className={isList ? "min-w-0 text-left" : "mt-4"}>
                  <EditableText as="h3" data={data} path={["members", index, "name"]} value={member.name} isPreview={isPreview} onUpdate={onUpdate} className="text-lg font-semibold" style={textStyle} />
                  {member.title ? <EditableText data={data} path={["members", index, "title"]} value={member.title} isPreview={isPreview} onUpdate={onUpdate} className="mt-1 text-sm font-medium text-[var(--section-accent)]" /> : null}
                  {member.bio ? <EditableText as="p" data={data} path={["members", index, "bio"]} value={member.bio} isPreview={isPreview} onUpdate={onUpdate} multiline className="mt-2 text-sm leading-relaxed text-muted-foreground" style={textStyle} /> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
