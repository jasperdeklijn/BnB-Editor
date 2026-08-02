import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8")

test("phase 5 schema is mirrored, owner-scoped, and keeps invoices private", () => {
  const migration = read("supabase/migrations/20260802140000_add_reservation_invoicing.sql")
  const init = read("supabase/init.sql")
  for (const source of [migration, init]) {
    assert.match(source, /create table (?:if not exists )?public\.booking_reservation_financials/)
    assert.match(source, /settlement_status[^\n]+\('open', 'paid', 'refunded'\)/)
    assert.match(source, /create table (?:if not exists )?public\.booking_invoices/)
    assert.match(source, /create table (?:if not exists )?public\.booking_invoice_emails/)
    assert.match(source, /Users can view own reservation financials/)
    assert.match(source, /Users can view own booking invoices/)
    assert.match(source, /'booking-invoices', 'booking-invoices', false/)
    assert.doesNotMatch(source, /booking_invoices_due_date_check/)
  }
})

test("reservation and document numbers are durable and sequential where required", () => {
  const migration = read("supabase/migrations/20260802140000_add_reservation_invoicing.sql")
  assert.match(migration, /ensure_booking_reservation_financial_trigger/)
  assert.match(migration, /'RES-' \|\| to_char/)
  assert.match(migration, /primary key \(business_id, document_type, document_year\)/)
  assert.match(migration, /for update/)
  assert.match(migration, /lpad\(selected_value::text, 6, '0'\)/)
  assert.match(migration, /Invoice due date cannot precede its issue date/)
})

test("issued invoices are immutable and corrections retain their audit trail", () => {
  const migration = read("supabase/migrations/20260802140000_add_reservation_invoicing.sql")
  const invoicing = read("lib/booking/invoicing.ts")
  assert.match(migration, /Issued invoice values are immutable/)
  assert.match(migration, /Stored invoice PDF is immutable/)
  assert.match(migration, /document_type = 'credit_note'/)
  assert.match(invoicing, /first_downloaded_at/)
  assert.match(invoicing, /Maak een creditfactuur in plaats van de waarden te wijzigen/)
  assert.match(invoicing, /corrects_invoice_id: invoice\.id/)
})

test("payment remains owner-managed and invoice delivery is explicit", () => {
  const panel = read("components/calendar/booking-finance-panel.tsx")
  const invoicing = read("lib/booking/invoicing.ts")
  assert.match(panel, /Handmatige betaalstatus/)
  assert.match(panel, /FlexPagina verwerkt geen betaling/)
  assert.match(panel, /window\.confirm\(`Factuur \$\{invoice\.invoice_number\} nu als PDF-bijlage/)
  assert.match(invoicing, /attachments: \[\{ filename:/)
  assert.match(invoicing, /handmatig door de ondernemer verzonden/)
  assert.doesNotMatch(invoicing, /stripe|mollie|adyen/i)
})

test("owner and customer PDF routes enforce their own authorization boundary", () => {
  const ownerRoute = read("app/api/booking/invoices/[invoiceId]/pdf/route.ts")
  const customerRoute = read("app/api/booking/manage/[token]/invoice/route.ts")
  const access = read("lib/booking/customer-access.ts")
  assert.match(ownerRoute, /booking_invoices/)
  assert.match(ownerRoute, /getUser\(\)/)
  assert.match(customerRoute, /getCustomerBookingView\(token\)/)
  assert.match(customerRoute, /view\.invoices\.some\(\(invoice\) => invoice\.id === invoiceId\)/)
  assert.match(access, /\.in\("status", \["issued", "credited"\]\)/)
  assert.doesNotMatch(access, /seller_details/)
})

test("calendar and customer workspaces expose reservation and invoice references", () => {
  const calendar = read("components/calendar/calendar-client.tsx")
  const customer = read("components/booking/customer-booking-client.tsx")
  assert.match(calendar, /reservation_number/)
  assert.match(calendar, /invoice_number/)
  assert.match(calendar, /Naam, reserverings- of factuurnummer/)
  assert.match(customer, /Reservering en facturen/)
  assert.match(customer, /\/api\/booking\/manage\/\$\{encodeURIComponent\(booking\.token\)\}\/invoice/)
})

test("pricing uses integer minor-unit calculations with bounded inputs", () => {
  const pricing = read("lib/booking/pricing.ts")
  assert.match(pricing, /BigInt\(quantityMilli\) \* BigInt\(unitPriceMinor\)/)
  assert.match(pricing, /roundedDivision/)
  assert.match(pricing, /quantity_milli/)
  assert.match(pricing, /vat_rate_basis_points/)
  assert.match(pricing, /MAX_MONEY_MINOR/)
})

test("invoice PDFs reuse the booking website logo and carry FlexPagina attribution", () => {
  const invoicing = read("lib/booking/invoicing.ts")
  const pdf = read("lib/booking/invoice-pdf.ts")
  assert.match(invoicing, /contact_requests/)
  assert.match(invoicing, /candidate\.type === "nav"/)
  assert.match(invoicing, /\/storage\/v1\/object\/public\/user-images\//)
  assert.match(invoicing, /admin\.storage\.from\("user-images"\)\.download/)
  assert.doesNotMatch(invoicing, /fetch\(logoUrl/)
  assert.match(invoicing, /width \* height <= 16_000_000/)
  assert.match(pdf, /embedPng/)
  assert.match(pdf, /embedJpg/)
  assert.match(pdf, /Powered by FlexPagina/)
})
