"use client"

import { isVideoSource } from "@/lib/media"

import { BackgroundMedia } from "@/components/images/background-media"

import { SectionElements } from "@/components/editor/section-elements"
import { getSectionColorVars } from "@/lib/section-colors"
import type { SectionRenderProps } from "@/components/editor/section-registry"
import styles from "@/components/editor/section-composition.module.css"

export function FreeformSection({ data, isPreview, onUpdate, styles: sectionStyles, userId }: SectionRenderProps) {
  const columns = [2, 3].includes(Number(data.columns)) ? Number(data.columns) : 1
  return <section className={`${styles.free} ${sectionStyles?.fontFamily ?? ""}`} style={{ ...getSectionColorVars(sectionStyles), color: sectionStyles?.textColor, backgroundColor: sectionStyles?.backgroundColor, backgroundImage: sectionStyles?.backgroundImage && !isVideoSource(sectionStyles.backgroundImage) ? `url("${sectionStyles.backgroundImage}")` : undefined }} data-media-host><BackgroundMedia src={sectionStyles?.backgroundImage} position={sectionStyles?.backgroundPosition} />
    <div className="mx-auto max-w-6xl" data-section-content data-media-content><SectionElements data={data} isPreview={isPreview} onUpdate={onUpdate} userId={userId} free columns={columns} /></div>
  </section>
}
