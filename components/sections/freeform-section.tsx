"use client"

import { SectionElements } from "@/components/editor/section-elements"
import { getSectionColorVars } from "@/lib/section-colors"
import type { SectionRenderProps } from "@/components/editor/section-registry"
import styles from "@/components/editor/section-composition.module.css"

export function FreeformSection({ data, isPreview, onUpdate, styles: sectionStyles, userId }: SectionRenderProps) {
  const columns = [2, 3].includes(Number(data.columns)) ? Number(data.columns) : 1
  return <section className={`${styles.free} ${sectionStyles?.fontFamily ?? ""}`} style={{ ...getSectionColorVars(sectionStyles), color: sectionStyles?.textColor, backgroundColor: sectionStyles?.backgroundColor, backgroundImage: sectionStyles?.backgroundImage ? `url("${sectionStyles.backgroundImage}")` : undefined }}>
    <div className="mx-auto max-w-6xl" data-section-content><SectionElements data={data} isPreview={isPreview} onUpdate={onUpdate} userId={userId} free columns={columns} /></div>
  </section>
}
