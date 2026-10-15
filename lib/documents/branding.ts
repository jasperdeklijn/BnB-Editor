import { rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { FLEXPAGINA_STYLE } from "../communication-style"

export function documentColor(value: string = FLEXPAGINA_STYLE.primary) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1] || FLEXPAGINA_STYLE.primary.slice(1)
  return rgb(...[0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as [number, number, number])
}

export function drawDocumentHeader(page: PDFPage, font: PDFFont, accent = documentColor()) {
  const width = page.getWidth()
  const height = page.getHeight()
  page.drawRectangle({ x: 0, y: height - 18, width, height: 18, color: accent })
  const brand = "FlexPagina"
  page.drawText(brand, { x: width - 48 - font.widthOfTextAtSize(brand, 8), y: height - 12, size: 8, font, color: rgb(1, 1, 1) })
}

export function drawDocumentFooter(page: PDFPage, font: PDFFont, index: number, count: number) {
  const width = page.getWidth()
  const muted = documentColor(FLEXPAGINA_STYLE.muted)
  page.drawLine({ start: { x: 48, y: 42 }, end: { x: width - 48, y: 42 }, thickness: 0.5, color: documentColor(FLEXPAGINA_STYLE.border) })
  const brand = "Powered by FlexPagina"
  page.drawText(brand, { x: (width - font.widthOfTextAtSize(brand, 7.5)) / 2, y: 27, size: 7.5, font, color: muted })
  const pagination = `${index + 1} / ${count}`
  page.drawText(pagination, { x: width - 48 - font.widthOfTextAtSize(pagination, 7.5), y: 27, size: 7.5, font, color: muted })
}
