# Booking Engine 2.0 Implementation Plan

## Goal

Upgrade the existing calendar/request workflow into a customer-facing availability and booking experience. Visitors should only be offered valid slots or stays, while owners retain final control over confirmation rules.

Booking Engine 2.0 does not process customer payments. Owners may record an amount and a manual payment status, but money collection stays outside the application. The application can generate an invoice PDF for a reservation.

## Current foundation

- `/editor/calendar` manages appointments, bookings, blocked periods, notes, statuses, filters, and availability windows.
- `calendar_entries` supports services, customers, sources, time ranges, all-day stays, and request links.
- `calendar_availability_windows` stores basic availability.
- Public service and request-form sections can create pending calendar-ready requests.
- Plan enforcement already distinguishes booking/calendar capabilities and must remain server-authoritative.

## Product decisions required before implementation

- Per service: instant confirmation or owner approval.
- Appointment duration, slot interval, buffers, minimum notice, and maximum booking horizon.
- Capacity of one versus multi-capacity group services.
- Accommodation rules: arrival/departure time, minimum/maximum nights, same-day turnover, and per-unit inventory.
- Whether cancellation/rescheduling is always allowed or limited by a configurable deadline.
- Calendar sync launch scope: one-way export first, then optional two-way providers.

Recommended v1: owner approval by default, capacity one, configurable service duration/buffers, secure customer management links, and iCal export/import before native Google/Outlook OAuth.

Payment-provider integration, checkout, deposits, refunds, and payment webhooks are explicitly outside this plan.

### Phase 1 decisions (implemented 2026-08-01)

- Public booking and availability-calendar runtime remain Gold capabilities. Phase 1 only adds owner configuration and a read-only editor preview; it does not expose a public booking endpoint.
- New settings default to disabled, owner approval, capacity one, a 60-minute duration, 30-minute slot interval, 24-hour notice, and a 90-day horizon.
- B&B offerings default to stay mode with one minimum night, 30 maximum nights, 15:00 check-in, and 11:00 check-out. Other categories default to appointment mode.
- Service-specific availability windows override business-wide windows for the same weekday, including an inactive service-specific row that deliberately closes that day.
- Pending and confirmed entries consume capacity. Cancelled, completed, and note entries do not. Blocked entries always block the affected service or all services when they are business-wide.
- Times are calculated in the configured IANA timezone and nonexistent local times during a DST transition are rejected.

## Data design

### Service booking configuration

Add a one-to-one configuration for each bookable service:

- `booking_enabled boolean`.
- `booking_mode text`: appointment or stay.
- `confirmation_mode text`: request or instant.
- `duration_minutes integer` for appointments.
- `slot_interval_minutes integer`.
- `buffer_before_minutes` and `buffer_after_minutes`.
- `minimum_notice_minutes` and `booking_horizon_days`.
- `capacity integer not null default 1`.
- Stay-specific minimum/maximum nights and check-in/check-out times.
- Cancellation/reschedule cutoff settings.

Prefer a separate `service_booking_settings` table over repeatedly expanding generic service metadata. Add ownership RLS and mirror it in `supabase/init.sql`.

### Booking holds and customer tokens

- Add short-lived `booking_holds` so two visitors cannot select the same final slot during submission.
- Store only a hashed, expiring customer-management token on a booking/calendar entry.
- Track customer actions in a private activity table or a structured calendar activity table.
- Never expose sequential IDs, owner notes, or other bookings through the public management endpoint.

### Reservation number and commercial details

Every accepted booking receives a unique, immutable, human-readable reservation number, for example `RES-2026-000123`.

- Generate the number server-side when the reservation is accepted or confirmed.
- Scope the sequence safely so concurrent confirmations cannot create duplicates.
- Keep the internal UUID as the database relationship key.
- Do not use the reservation number as an authentication token or expose other reservations through it.
- Store the agreed currency, line items, quantities, unit amounts, discounts, VAT rates, subtotal, VAT total, and grand total as a reservation price snapshot.
- Amounts use integer minor units, such as cents, rather than floating-point values.
- Allow the owner to maintain a manual settlement status such as `open`, `paid`, or `refunded`; this status never claims that the application processed or verified a payment.

### Invoice records and PDFs

Keep invoices separate from mutable reservation data so an issued PDF does not change when the service or customer record is edited later.

Suggested invoice fields:

- Internal UUID, reservation UUID, and reservation number.
- Unique invoice number that is separate from the reservation number.
- Invoice status: `draft`, `issued`, `credited`, or `void`.
- Issue date, service/stay date, and optional due date.
- Seller name/address plus business, VAT, and contact identifiers where applicable.
- Customer name and address, with optional company and VAT details.
- Description, quantity, unit amount, discount, VAT rate/amount, subtotal, and total.
- Currency, optional payment instructions, and owner-visible notes that are excluded from the PDF.
- An immutable JSON snapshot of all printed values and the generated PDF storage path.

Invoice numbering and required fields must be configurable and checked against the business's tax situation before release. The invoice number must remain unique and an issued invoice must not be silently overwritten; corrections should produce a new document or credit flow.

### External calendar connections

Start with `calendar_connections` and imported external event fingerprints. Encrypt provider tokens server-side if OAuth is introduced. Imported busy periods should block availability without copying unnecessary attendee data.

## Availability engine

Create one shared server-side availability module used by public APIs and editor previews. It must:

1. Resolve the business timezone.
2. Load service booking settings and applicable availability windows.
3. Apply blocked periods, confirmed bookings, active holds, buffers, notice, horizon, capacity, and stay rules.
4. Return normalized slots or valid arrival/departure ranges.
5. Revalidate availability inside the final booking transaction.

The client must never be the authority for slot validity or plan access.

## Public experience

### Appointment mode

- Choose a service.
- Choose an available date and time.
- Enter the configured customer details.
- Review timezone, duration, cancellation terms, and approval mode.
- Submit and receive a pending or confirmed result.

### Stay mode

- Choose accommodation and arrival/departure dates.
- Show unavailable dates and minimum-stay guidance.
- Recheck the entire date range before final submission.

### Customer management link

- Secure, expiring, single-booking link delivered in the confirmation email.
- View booking summary and current status.
- Cancel or request/reschedule within configured rules.
- Always revalidate replacement availability.

Editor preview must simulate success and must never create holds, bookings, emails, or external calendar events.

## Owner experience

- Booking settings inside the service editor or a focused booking settings page.
- Calendar entry clearly distinguishes request, confirmed booking, hold expiry, cancellation, and external busy time.
- Conflict explanation names the relevant rule without exposing another customer's personal data.
- Owner can approve/decline pending requests and optionally propose another time.
- Confirmed reservations show their reservation number, agreed amount, currency, and manual settlement status.
- Owner can edit draft invoice lines, preview the invoice, generate the final PDF, and download it.
- Issued invoice PDFs remain reproducible from their stored snapshot and are not regenerated from changing live data.
- Consistent navbar saving state and durable error recovery.

## Notifications

- Customer: request received, confirmed, declined, rescheduled, cancelled, and optional reminder.
- Owner: new booking/request and cancellation.
- Use idempotency keys per booking/event/template so retries cannot produce duplicate messages.
- Keep reminders opt-in and start with one conservative schedule.

## Delivery phases

### Phase 1: rules and availability engine

- [x] Confirm product decisions and supported plan tiers.
- [x] Add service booking settings and indexes/RLS.
- [x] Implement timezone-safe appointment and stay availability calculations.
- [x] Add conflict, capacity, buffer, notice, and horizon tests.
- [x] Render read-only availability in the editor before accepting submissions.

Implementation note: source, bootstrap SQL, and migration coverage are complete. Apply `20260801120000_add_service_booking_settings.sql` to the target Supabase project before expecting settings to persist there. No public booking submission path was added in Phase 1.

### Phase 2: public booking flow

- [x] Add authenticated-by-context public availability endpoint with rate limiting.
- [x] Build accessible date/time and stay-range selectors.
- [x] Add short-lived holds and transactional final revalidation.
- [x] Create pending or confirmed calendar entries according to service settings.
- [x] Keep preview completely side-effect free.

Implementation note: calendar-mode service sections now use the published live snapshot as their public context, enforce the Gold booking entitlement server-side, and expose rate-limited availability, hold, and confirmation endpoints. Holds expire after ten minutes; service-level advisory locks and a final database recheck prevent capacity races before the request and calendar entry are created in one transaction. Preview uses local simulated values and returns before any booking request. Apply both Booking Engine migrations through `20260801130000_add_public_booking_holds.sql` before enabling this on a deployed site. No payments, invoice generation, notifications, or customer lifecycle links were added. Source tests, TypeScript, focused lint, entitlement/snapshot/multilingual regressions, and the production build pass; an interactive browser pass remains outstanding because the desktop browser connection was unavailable.

### Phase 3: lifecycle management

- [x] Add idempotent booking notifications.
- [x] Add secure customer view/cancel/reschedule links.
- [x] Add owner approve, decline, and alternative-time actions.
- [x] Record status history without leaking private notes.

Implementation note: lifecycle changes stay attached to the existing `calendar_entries` record. The Phase 3 migration adds versioned customer access, append-only public/private history, change requests, and an idempotent notification outbox. Customer links use an expiring HMAC signature and expose only explicitly selected public fields; owner notes are stored separately and never serialized by the customer API. Replacement times are checked with the availability engine and capacity is rechecked under a service advisory lock before an accepted proposal is applied. Initial delivery is attempted immediately and failed outbox rows retry through the authenticated ten-minute cron. Configure `BOOKING_LINK_SECRET` explicitly in production (the service-role key is only a server-side fallback), retain `CRON_SECRET`, and configure the existing SMTP variables before enabling mail. Apply `20260801140000_add_booking_lifecycle.sql` after the Phase 1 and Phase 2 migrations. No payment or invoice behavior was added. Focused lint, TypeScript, 46 booking/entitlement/snapshot/multilingual tests, and the production build pass; live SMTP, migrated Supabase transactions, and interactive browser rendering remain deployment checks because those external/runtime surfaces were unavailable locally.

### Phase 4: calendar interoperability

- [ ] Add private iCal feed export with key rotation.
- [ ] Add safe iCal busy-time import and deduplication.
- [ ] Monitor stale imports and surface sync health.
- [ ] Consider Google Calendar and Outlook OAuth only after import/export reliability is proven.

### Phase 5: reservation pricing and invoice PDF

- [ ] Generate a unique reservation number when a booking becomes confirmed.
- [ ] Add a reservation price snapshot with currency, line items, VAT, subtotal, and total in minor units.
- [ ] Add owner-managed `open`, `paid`, and `refunded` settlement statuses without payment-provider integration.
- [ ] Add separate draft and issued invoice records with unique invoice numbers.
- [ ] Let the owner edit draft invoice lines and seller/customer details before issue.
- [ ] Generate a branded A4 invoice PDF containing the invoice number, reservation number, parties, dates, line items, VAT breakdown, and total.
- [ ] Store the issued invoice snapshot and PDF so later reservation edits do not change historical invoices.
- [ ] Allow PDF download and an explicit owner-triggered email attachment; never send automatically.
- [ ] Add a safe void/correction path and define credit-note support before allowing issued financial values to change.
- [ ] Validate invoice configuration against the business's applicable Dutch/EU invoicing requirements before production rollout.

## Acceptance criteria

- Visitors cannot book outside server-calculated availability or bypass plan enforcement.
- Two simultaneous final submissions cannot overbook capacity one.
- Appointment buffers and stay ranges block all affected time correctly across DST changes.
- Preview creates no database, email, payment, or external-calendar side effects.
- Each confirmed reservation has one unique reservation number that is stable across edits.
- The application does not collect money; settlement status is explicitly owner-maintained.
- Generated invoice totals exactly match their stored line-item snapshot and use deterministic VAT/rounding rules.
- An issued invoice PDF remains unchanged after customer, service, price, or reservation data is edited.
- Reservation and invoice numbers are searchable but cannot be used to access private booking data without authorization.
- Customer links reveal only one booking and respect expiry and cancellation rules.
- Owner and customer see consistent status after confirmation, cancellation, or rescheduling.
- The flow is accessible and usable on 390 px mobile through confirmation.

## Verification

- Unit tests for timezone/DST, intervals, capacity, buffers, notice, horizons, stays, and cancellation cutoffs.
- Transaction/concurrency tests for holds and simultaneous submissions.
- Entitlement and direct-API bypass tests for every mutation.
- Notification idempotency and token-expiry tests.
- Concurrency tests for unique reservation and invoice numbering.
- Calculation tests for quantities, discounts, VAT rates, rounding, subtotals, and totals.
- PDF render verification for single/multiple lines, long names/addresses, zero VAT, multiple VAT rates, and multipage output.
- Snapshot tests proving issued invoices do not change after related records are edited.
- `npx tsc --noEmit`, focused ESLint, build, and `git diff --check`.
- Authenticated owner and signed-out visitor browser coverage on desktop and 390 px mobile.
- Production-like test using a dedicated calendar and mailbox before enabling reminders or two-way sync.
