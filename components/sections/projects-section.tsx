"use client"

import { isVideoSource } from "@/lib/media"

import { BackgroundMedia } from "@/components/images/background-media"

import { ImageIcon, ArrowUpRight } from "lucide-react"
import { EditableText } from "@/components/editor/inline-editable-text"
import { SectionImage } from "@/components/editor/section-content-context"
import { WebsiteLink } from "@/components/editor/website-links-context"
import type { SectionRenderProps } from "@/components/editor/section-registry"
import { readProjects } from "@/lib/projects"
import { getLayoutClasses } from "@/lib/section-layouts"
import { getSectionColorVars } from "@/lib/section-colors"
import { safeElementImage } from "@/lib/section-composition"
import { useWebsiteLocale } from "@/lib/site-i18n/provider"
import { resolveWebsiteLink } from "@/lib/website-links"
import { useWebsiteLinks } from "@/components/editor/website-links-context"
import css from "./projects-section.module.css"

export function ProjectsSection({ data, isPreview, styles, onUpdate }: SectionRenderProps) {
  const { messages } = useWebsiteLocale()
  const links = useWebsiteLinks()
  const projects = readProjects(data.projects)
  const layout = getLayoutClasses(data.layout)
  if (isPreview && projects.length === 0) return null
  const textStyle = { color: styles?.textColor }
  return <section className={`px-4 sm:px-6 ${layout.section} ${styles?.fontFamily ?? ""}`} style={{ ...getSectionColorVars(styles), backgroundColor: styles?.backgroundColor, backgroundImage: styles?.backgroundImage && !isVideoSource(styles.backgroundImage) ? `url("${styles.backgroundImage}")` : undefined, backgroundSize: "cover", backgroundPosition: styles?.backgroundPosition || "center" }} data-media-host><BackgroundMedia src={styles?.backgroundImage} position={styles?.backgroundPosition} />
    <div data-section-content className={`mx-auto ${layout.container} ${css.container}`} data-media-content>
      <div className={`mb-10 ${layout.heading}`}>
        <EditableText as="h2" data={data} path={["title"]} value={typeof data.title === "string" ? data.title : messages.projects} isPreview={isPreview} onUpdate={onUpdate} className="text-3xl font-bold md:text-4xl" style={textStyle} />
        {typeof data.subtitle === "string" && data.subtitle ? <EditableText as="p" data={data} path={["subtitle"]} value={data.subtitle} isPreview={isPreview} onUpdate={onUpdate} multiline className="mt-3 text-muted-foreground" style={textStyle} /> : null}
      </div>
      {projects.length ? <div className={css.collection} data-project-layout={layout.layout}>
        {projects.map((project, index) => {
          const image = safeElementImage(project.image)
          const href = resolveWebsiteLink(project.ctaHref, links?.pages ?? [], links?.activePageId, links?.localePath)
          const copy = { data, isPreview, onUpdate }
          return <article key={project.id} className={css.project} data-project-id={project.id}>
            {image ? <div className={css.image}><SectionImage data-section-image contentPath={["projects", index, "image"]} src={image} alt={project.imageAlt || project.title} loading="lazy" className="h-full w-full object-cover" /></div>
              : !isPreview ? <div className={`${css.image} flex items-center justify-center gap-2 bg-muted text-sm text-muted-foreground`}><ImageIcon aria-hidden="true" className="h-5 w-5" />{messages.projectImagePlaceholder}</div> : null}
            <div className={css.copy}>
              {project.category ? <EditableText as="p" {...copy} path={["projects", index, "category"]} value={project.category} className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--section-accent)]" /> : null}
              <EditableText as="h3" {...copy} path={["projects", index, "title"]} value={project.title} className="text-xl font-semibold" style={textStyle} />
              {project.location || project.year ? <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {project.location ? <EditableText {...copy} path={["projects", index, "location"]} value={project.location} /> : null}
                {project.year ? <EditableText {...copy} path={["projects", index, "year"]} value={project.year} /> : null}
              </div> : null}
              {project.description ? <EditableText as="p" {...copy} path={["projects", index, "description"]} value={project.description} multiline className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground" style={textStyle} /> : null}
              {project.ctaEnabled && href ? <WebsiteLink href={project.ctaHref} className="mt-4 inline-flex items-center gap-2 rounded-md py-1 text-sm font-semibold text-[var(--section-accent)]" onClick={(event) => { if (!isPreview) event.preventDefault() }}>
                <EditableText {...copy} path={["projects", index, "ctaText"]} value={project.ctaText || messages.viewProject} /><ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </WebsiteLink> : null}
            </div>
          </article>
        })}
      </div> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{messages.addProjects}</p>}
    </div>
  </section>
}
