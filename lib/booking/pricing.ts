export interface BookingFinancialLine {
  id: string
  description: string
  quantity_milli: number
  unit_price_minor: number
  discount_minor: number
  vat_rate_basis_points: number
  subtotal_minor: number
  vat_minor: number
  total_minor: number
}

export interface InvoiceParty {
  legal_name?: string
  name?: string
  logo_url?: string
  address_line1: string
  address_line2?: string
  postal_code: string
  city: string
  country_code: string
  email?: string
  vat_id?: string
  kvk_number?: string
  iban?: string
}

export interface InvoiceTotals {
  lines: BookingFinancialLine[]
  subtotalMinor: number
  vatTotalMinor: number
  totalMinor: number
}

const MAX_MONEY_MINOR = 1_000_000_000_00

function roundedDivision(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / BigInt(2)) / denominator
}

function safeNumber(value: bigint) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0 || number > MAX_MONEY_MINOR) {
    throw new Error("Het factuurbedrag is te groot.")
  }
  return number
}

export function calculateBookingFinancials(inputLines: Array<Partial<BookingFinancialLine>>): InvoiceTotals {
  if (!Array.isArray(inputLines) || inputLines.length === 0) throw new Error("Voeg minimaal één factuurregel toe.")
  if (inputLines.length > 100) throw new Error("Een factuur kan maximaal 100 regels bevatten.")

  const lines = inputLines.map((input, index) => {
    const description = String(input.description || "").trim().slice(0, 200)
    const quantityMilli = Number(input.quantity_milli)
    const unitPriceMinor = Number(input.unit_price_minor)
    const discountMinor = Number(input.discount_minor || 0)
    const vatRateBasisPoints = Number(input.vat_rate_basis_points || 0)
    if (!description) throw new Error(`Omschrijving ontbreekt op regel ${index + 1}.`)
    if (!Number.isInteger(quantityMilli) || quantityMilli < 1 || quantityMilli > 1_000_000) throw new Error(`Ongeldige hoeveelheid op regel ${index + 1}.`)
    if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0 || unitPriceMinor > MAX_MONEY_MINOR) throw new Error(`Ongeldige eenheidsprijs op regel ${index + 1}.`)
    if (!Number.isSafeInteger(discountMinor) || discountMinor < 0) throw new Error(`Ongeldige korting op regel ${index + 1}.`)
    if (!Number.isInteger(vatRateBasisPoints) || vatRateBasisPoints < 0 || vatRateBasisPoints > 10_000) throw new Error(`Ongeldig btw-tarief op regel ${index + 1}.`)

    const gross = roundedDivision(BigInt(quantityMilli) * BigInt(unitPriceMinor), BigInt(1000))
    if (BigInt(discountMinor) > gross) throw new Error(`De korting is hoger dan het regelbedrag op regel ${index + 1}.`)
    const subtotal = gross - BigInt(discountMinor)
    const vat = roundedDivision(subtotal * BigInt(vatRateBasisPoints), BigInt(10_000))
    return {
      id: String(input.id || `line-${index + 1}`).slice(0, 100),
      description,
      quantity_milli: quantityMilli,
      unit_price_minor: unitPriceMinor,
      discount_minor: discountMinor,
      vat_rate_basis_points: vatRateBasisPoints,
      subtotal_minor: safeNumber(subtotal),
      vat_minor: safeNumber(vat),
      total_minor: safeNumber(subtotal + vat),
    }
  })

  const subtotalMinor = safeNumber(lines.reduce((sum, line) => sum + BigInt(line.subtotal_minor), BigInt(0)))
  const vatTotalMinor = safeNumber(lines.reduce((sum, line) => sum + BigInt(line.vat_minor), BigInt(0)))
  return { lines, subtotalMinor, vatTotalMinor, totalMinor: safeNumber(BigInt(subtotalMinor) + BigInt(vatTotalMinor)) }
}

export function formatMinorUnits(value: number, currency = "EUR", locale = "nl-NL") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value / 100)
}

export function validateInvoiceParties(seller: InvoiceParty, customer: InvoiceParty) {
  const missing: string[] = []
  if (!seller.legal_name?.trim()) missing.push("juridische naam verkoper")
  if (!seller.address_line1?.trim() || !seller.postal_code?.trim() || !seller.city?.trim()) missing.push("volledig adres verkoper")
  if (!seller.country_code?.trim()) missing.push("land verkoper")
  if (!seller.vat_id?.trim()) missing.push("btw-identificatienummer")
  if (seller.country_code?.toUpperCase() === "NL" && !seller.kvk_number?.trim()) missing.push("KvK-nummer")
  if (!customer.name?.trim()) missing.push("naam klant")
  if (!customer.address_line1?.trim() || !customer.postal_code?.trim() || !customer.city?.trim()) missing.push("volledig adres klant")
  if (!customer.country_code?.trim()) missing.push("land klant")
  if (missing.length) throw new Error(`Factuurgegevens onvolledig: ${missing.join(", ")}.`)
}

export function parseServicePriceMinor(value: string) {
  const compact = value.trim().replace(/[^0-9,.-]/g, "")
  if (!compact) return 0
  const decimalSeparator = compact.lastIndexOf(",") > compact.lastIndexOf(".") ? "," : "."
  const normalized = compact
    .replace(decimalSeparator === "," ? /\./g : /,/g, "")
    .replace(decimalSeparator, ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0
}
