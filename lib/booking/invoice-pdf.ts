import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib"

import type { BookingFinancialLine, InvoiceParty } from "./pricing"

export interface InvoicePdfSnapshot {
  documentType: "invoice" | "credit_note"
  invoiceNumber: string
  reservationNumber: string
  currency: string
  seller: InvoiceParty
  customer: InvoiceParty
  lines: BookingFinancialLine[]
  subtotalMinor: number
  vatTotalMinor: number
  totalMinor: number
  serviceDate: string
  dueDate: string
  issuedAt: string
  correctsInvoiceNumber?: string | null
  accentColor?: string
  logo?: {
    bytes: Uint8Array
    format: "png" | "jpeg"
  } | null
}

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 48
const CONTENT_WIDTH = A4.width - MARGIN * 2

function safePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split("")
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code <= 255
    })
    .join("")
}

function vatLabel(value: number) {
  return `${(value / 100).toFixed(2).replace(/[,.]00$/, "")}%`
}

function colorFromHex(value = "#16302B") {
  const match = /^#([0-9a-f]{6})$/i.exec(value)
  const hex = match?.[1] || "16302B"
  return rgb(Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255)
}

function money(value: number, currency: string, negative = false) {
  const sign = negative && value !== 0 ? "-" : ""
  return `${sign}${currency} ${(value / 100).toFixed(2).replace(".", ",")}`
}

function quantity(value: number) {
  return (value / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate
    else {
      if (current) lines.push(current)
      let remaining = word
      while (font.widthOfTextAtSize(remaining, size) > maxWidth && remaining.length > 1) {
        let cut = remaining.length - 1
        while (cut > 1 && font.widthOfTextAtSize(`${remaining.slice(0, cut)}-`, size) > maxWidth) cut -= 1
        lines.push(`${remaining.slice(0, cut)}-`)
        remaining = remaining.slice(cut)
      }
      current = remaining
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function partyLines(party: InvoiceParty, seller = false) {
  return [
    seller ? party.legal_name : party.name,
    party.address_line1,
    party.address_line2,
    `${party.postal_code} ${party.city}`.trim(),
    party.country_code,
    seller && party.vat_id ? `Btw-id: ${party.vat_id}` : null,
    seller && party.kvk_number ? `KvK: ${party.kvk_number}` : null,
    seller && party.iban ? `IBAN: ${party.iban}` : null,
    party.email,
  ].filter((line): line is string => Boolean(line?.trim()))
}

export async function createInvoicePdf(snapshot: InvoicePdfSnapshot) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const accent = colorFromHex(snapshot.accentColor)
  const dark = rgb(0.10, 0.16, 0.15)
  const muted = rgb(0.38, 0.43, 0.42)
  const lineColor = rgb(0.84, 0.87, 0.86)
  const negative = snapshot.documentType === "credit_note"
  let logoImage: PDFImage | null = null
  if (snapshot.logo) {
    try {
      logoImage = snapshot.logo.format === "png"
        ? await pdf.embedPng(snapshot.logo.bytes)
        : await pdf.embedJpg(snapshot.logo.bytes)
    } catch {
      logoImage = null
    }
  }
  const pages: PDFPage[] = []
  let page!: PDFPage
  let y!: number

  const addPage = (continued = false) => {
    page = pdf.addPage([A4.width, A4.height])
    pages.push(page)
    page.drawRectangle({ x: 0, y: A4.height - 18, width: A4.width, height: 18, color: accent })
    let companyNameX = MARGIN
    if (logoImage) {
      const fitted = logoImage.scaleToFit(55, 20)
      page.drawImage(logoImage, { x: MARGIN, y: A4.height - 51, width: fitted.width, height: fitted.height })
      companyNameX += fitted.width + 12
    }
    const companyName = safePdfText(snapshot.seller.legal_name || "Factuur")
    const companyNameSize = logoImage ? 10 : 12
    const companyNameMaxWidth = (continued ? A4.width - 125 : A4.width - MARGIN) - companyNameX
    const companyNameLines = wrapText(companyName, bold, companyNameSize, companyNameMaxWidth).slice(0, 2)
    companyNameLines.forEach((line, index) => page.drawText(line, {
      x: companyNameX,
      y: A4.height - 52 - index * 11,
      size: companyNameSize,
      font: bold,
      color: dark,
    }))
    if (continued) page.drawText("Vervolg", { x: A4.width - MARGIN - 45, y: A4.height - 52, size: 9, font: regular, color: muted })
    y = A4.height - 82
  }

  const drawTableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 21, width: CONTENT_WIDTH, height: 25, color: rgb(0.94, 0.96, 0.95) })
    page.drawText("Omschrijving", { x: MARGIN + 6, y: y - 12, size: 8, font: bold, color: dark })
    const labels = [["Aantal", 360], ["Prijs", 438], ["Btw", 482], ["Totaal", A4.width - MARGIN]] as const
    for (const [label, rightX] of labels) {
      page.drawText(label, { x: rightX - bold.widthOfTextAtSize(label, 8), y: y - 12, size: 8, font: bold, color: dark })
    }
    y -= 28
  }

  addPage()
  const title = negative ? "CREDITFACTUUR" : "FACTUUR"
  page.drawText(title, { x: MARGIN, y, size: 26, font: bold, color: accent })
  page.drawText(snapshot.invoiceNumber, { x: A4.width - MARGIN - bold.widthOfTextAtSize(snapshot.invoiceNumber, 13), y: y + 5, size: 13, font: bold, color: dark })
  y -= 38
  if (snapshot.correctsInvoiceNumber) {
    page.drawText(`Correctie op factuur ${safePdfText(snapshot.correctsInvoiceNumber)}`, { x: MARGIN, y, size: 9, font: regular, color: muted })
    y -= 20
  }

  const sellerX = MARGIN
  const customerX = 315
  page.drawText("Van", { x: sellerX, y, size: 9, font: bold, color: accent })
  page.drawText("Aan", { x: customerX, y, size: 9, font: bold, color: accent })
  let sellerY = y - 17
  let customerY = y - 17
  for (const line of partyLines(snapshot.seller, true)) {
    for (const wrapped of wrapText(line, regular, 9, 220)) {
      page.drawText(wrapped, { x: sellerX, y: sellerY, size: 9, font: regular, color: dark })
      sellerY -= 13
    }
  }
  for (const line of partyLines(snapshot.customer)) {
    for (const wrapped of wrapText(line, regular, 9, 230)) {
      page.drawText(wrapped, { x: customerX, y: customerY, size: 9, font: regular, color: dark })
      customerY -= 13
    }
  }
  y = Math.min(sellerY, customerY) - 18
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.width - MARGIN, y }, thickness: 0.8, color: lineColor })
  y -= 22

  const metadata = [
    ["Factuurdatum", shortDate(snapshot.issuedAt)],
    ["Leverdatum", shortDate(snapshot.serviceDate)],
    ["Vervaldatum", shortDate(snapshot.dueDate)],
    ["Reserveringsnummer", snapshot.reservationNumber],
  ] as const
  for (let index = 0; index < metadata.length; index += 1) {
    const columnX = index % 2 === 0 ? MARGIN : 315
    const rowY = y - Math.floor(index / 2) * 31
    page.drawText(metadata[index][0], { x: columnX, y: rowY, size: 8, font: regular, color: muted })
    page.drawText(safePdfText(metadata[index][1]), { x: columnX, y: rowY - 13, size: 9, font: bold, color: dark })
  }
  y -= 78
  drawTableHeader()

  for (const line of snapshot.lines) {
    const descriptionLines = wrapText(line.description, regular, 8.5, 255)
    const discountLines = line.discount_minor > 0 ? [`Korting: ${money(line.discount_minor, snapshot.currency, negative)}`] : []
    const rowHeight = Math.max(29, (descriptionLines.length + discountLines.length) * 12 + 10)
    if (y - rowHeight < 145) {
      addPage(true)
      drawTableHeader()
    }
    let textY = y - 12
    for (const description of descriptionLines) {
      page.drawText(description, { x: MARGIN + 6, y: textY, size: 8.5, font: regular, color: dark })
      textY -= 12
    }
    for (const discount of discountLines) {
      page.drawText(discount, { x: MARGIN + 6, y: textY, size: 7.5, font: regular, color: muted })
      textY -= 11
    }
    const numericY = y - 12
    const quantityText = quantity(line.quantity_milli)
    const priceText = money(line.unit_price_minor, snapshot.currency, negative)
    const vatText = vatLabel(line.vat_rate_basis_points)
    const totalText = money(line.total_minor, snapshot.currency, negative)
    page.drawText(quantityText, { x: 360 - regular.widthOfTextAtSize(quantityText, 8), y: numericY, size: 8, font: regular, color: dark })
    page.drawText(priceText, { x: 438 - regular.widthOfTextAtSize(priceText, 8), y: numericY, size: 8, font: regular, color: dark })
    page.drawText(vatText, { x: 482 - regular.widthOfTextAtSize(vatText, 8), y: numericY, size: 8, font: regular, color: dark })
    page.drawText(totalText, { x: A4.width - MARGIN - bold.widthOfTextAtSize(totalText, 8), y: numericY, size: 8, font: bold, color: dark })
    y -= rowHeight
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4.width - MARGIN, y }, thickness: 0.5, color: lineColor })
  }

  const vatGroups = new Map<number, { subtotal: number; vat: number }>()
  for (const line of snapshot.lines) {
    const current = vatGroups.get(line.vat_rate_basis_points) ?? { subtotal: 0, vat: 0 }
    current.subtotal += line.subtotal_minor
    current.vat += line.vat_minor
    vatGroups.set(line.vat_rate_basis_points, current)
  }
  const totalsHeight = 73 + vatGroups.size * 15
  if (y - totalsHeight < 80) addPage(true)
  y -= 24
  const totalLabelX = 345
  const totalRow = (label: string, value: number, strong = false) => {
    page.drawText(label, { x: totalLabelX, y, size: strong ? 10 : 8.5, font: strong ? bold : regular, color: strong ? accent : dark })
    const valueText = money(value, snapshot.currency, negative)
    const valueFont = strong ? bold : regular
    const valueSize = strong ? 10 : 8.5
    page.drawText(valueText, { x: A4.width - MARGIN - valueFont.widthOfTextAtSize(valueText, valueSize), y, size: valueSize, font: valueFont, color: strong ? accent : dark })
    y -= strong ? 20 : 15
  }
  totalRow("Subtotaal", snapshot.subtotalMinor)
  for (const [rate, values] of [...vatGroups.entries()].sort(([a], [b]) => a - b)) totalRow(`Btw ${vatLabel(rate)}`, values.vat)
  page.drawLine({ start: { x: totalLabelX, y: y + 5 }, end: { x: A4.width - MARGIN, y: y + 5 }, thickness: 1, color: accent })
  y -= 8
  totalRow(negative ? "Totaal credit" : "Totaal", snapshot.totalMinor, true)

  if (!negative) {
    y -= 5
    page.drawText("Betaling wordt niet door FlexPagina verwerkt. Volg de betaalafspraken van de verkoper.", { x: MARGIN, y, size: 8, font: regular, color: muted })
  }

  const issued = new Date(snapshot.issuedAt)
  pdf.setTitle(`${title} ${snapshot.invoiceNumber}`)
  pdf.setAuthor(snapshot.seller.legal_name || "FlexPagina ondernemer")
  pdf.setSubject(`Reservering ${snapshot.reservationNumber}`)
  pdf.setCreator("FlexPagina Booking Engine 2.0")
  pdf.setProducer("FlexPagina Booking Engine 2.0")
  pdf.setCreationDate(issued)
  pdf.setModificationDate(issued)

  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: A4.width - MARGIN, y: 42 }, thickness: 0.5, color: lineColor })
    current.drawText(`Pagina ${index + 1} van ${pages.length}`, { x: A4.width - MARGIN - 65, y: 27, size: 7.5, font: regular, color: muted })
    current.drawText(`Factuur ${snapshot.invoiceNumber}`, { x: MARGIN, y: 27, size: 7.5, font: regular, color: muted })
    const poweredBy = "Powered by FlexPagina"
    current.drawText(poweredBy, { x: (A4.width - regular.widthOfTextAtSize(poweredBy, 7.5)) / 2, y: 27, size: 7.5, font: regular, color: muted })
  })
  return pdf.save({ useObjectStreams: false })
}
