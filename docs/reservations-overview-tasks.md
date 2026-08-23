# Reservations Overview Page Tasks

## Goal

Create a dedicated owner page at `/editor/reservations` where all reservations can be found, filtered, and followed through their current status. The existing `/editor/calendar` remains the planning and availability surface; the new page is the operational list view for reservation handling.

The implementation must reuse `calendar_entries` and the existing booking lifecycle, finance, invoice, entitlement, and ownership checks. Do not introduce a second reservation source of truth.

## Progress checklist

- [x] Task 1 - Server-side reservation query, filters, counts, sorting, and pagination.
- [x] Task 2 - Authenticated `/editor/reservations` route and URL parameter contract.
- [x] Task 3 - Style-guide-aligned desktop table and 390 px mobile card layout.
- [x] Task 4 - Reservation detail, calendar deep link, safe status transitions, lifecycle history, and finance/invoice reuse.
- [x] Task 5 - Editor navigation and shared status presentation.
- [x] Task 6 - Automated tests, TypeScript, lint, production build, and signed-out route validation.
- [ ] Deployment check - Authenticated desktop and 390 px browser pass against a migrated Supabase environment.
- [ ] Deployment check - Live notification/customer-link consistency with the configured SMTP environment.

## Current repository foundation

- Reservations and appointments live in `calendar_entries`.
- Reservation-like records use `entry_type = 'booking'` or `entry_type = 'appointment'`.
- The existing status values are `pending`, `confirmed`, `cancelled`, `completed`, and `blocked`.
- `blocked` and `note` entry types are calendar-planning records, not reservations, and must not appear as reservations.
- Website bookings can be recognized through their existing source/metadata and already use the lifecycle-safe owner actions.
- Confirmed reservations can have a `booking_reservation_financials` record containing the reservation number, pricing state, total, currency, and manual settlement status.
- The calendar already loads customer change requests, status history, invoice data, and a detail editor.
- Booking/calendar mutations are a Gold runtime capability and must remain server-authoritative.

## Product decisions for v1

- Use the route `/editor/reservations` and the Dutch page label `Reserveringen`.
- Show both stay bookings and appointment reservations so the page works for every business category.
- Include every `booking` and `appointment` entry regardless of date or source. Exclude `blocked` and `note` entry types and imported busy periods.
- Do not silently hide a legacy reservation-like record whose status is `blocked`; show it with the existing `Geblokkeerd` label so data remains discoverable.
- Use the existing statuses and Dutch labels:
  - `pending`: `In afwachting`
  - `confirmed`: `Bevestigd`
  - `cancelled`: `Geannuleerd`
  - `completed`: `Afgerond`
  - `blocked`: `Geblokkeerd`
- Keep booking status and manual payment status separate. A reservation can be `Bevestigd` while its payment status is `Open`.
- Default sorting is newest reservation first, with explicit alternatives for reservation date ascending and descending.
- Status changes must use the existing lifecycle-aware booking actions. Never update an online booking directly in client code.
- Opening a reservation may use a dedicated detail panel, but it must reuse shared detail/status/finance components rather than duplicating calendar business logic.

## UI consistency and style-guide requirements

The reservations page must look and behave like a native part of the existing editor. `docs/style-guide.md` is the required visual and interaction reference for this work, not optional inspiration. Do not introduce a separate dashboard theme or one-off component styling for this page.

- Reuse `EditorPageShell` and the same header, navigation, content width, spacing rhythm, borders, shadows, and responsive breakpoints used by the other editor pages.
- Reuse existing shared UI components such as `Button`, `Label`, inputs, selects, cards/panels, dialogs or sheets, status messages, empty states, and loading states before creating new primitives.
- Use the existing semantic theme tokens (`primary`, `background`, `card`, `border`, `foreground`, `muted-foreground`, `destructive`) so the page follows the deep-green palette from `docs/style-guide.md` and remains compatible with global theme changes.
- Do not add isolated hard-coded blue, purple, neon, gradient-heavy, or decorative dashboard styling.
- Keep the visual language professional, calm, practical, structured, and easy to scan, with clear hierarchy and sufficient whitespace.
- Use rounded cards, simple Lucide line icons, compact Dutch labels, and subtle hover/focus transitions consistent with the existing editor.
- Use the same button variants, field heights, border radii, typography scale, focus rings, disabled states, error states, and success feedback as comparable existing screens.
- Status colors may communicate meaning, but every status must also have a visible text label and accessible state; color alone is never sufficient.
- Prefer shared or extracted components when the same status badge, filter, detail field, or action already exists in the calendar or finance UI.
- Keep motion subtle and respect reduced-motion preferences. Do not add bouncy animations, parallax, or large transitions.
- Write all owner-facing copy in clear, concise Dutch and match the tone of existing editor pages.
- Verify visual consistency against nearby editor pages on desktop, tablet, and 390 px mobile before marking the UI complete.

## Task 1 - Add a server-side reservation overview query

- [ ] Add a focused reservation overview module, for example `lib/booking/reservations.ts`.
- [ ] Define a view model that combines the calendar entry with its offering title and optional reservation financial data.
- [ ] Filter by the authenticated user's owned business before returning any records.
- [ ] Restrict the base dataset to `appointment` and `booking` entries and exclude imported external busy periods.
- [ ] Support server-side search across customer name, customer email, customer phone, entry title, and reservation number.
- [ ] Support status, offering, source, booking mode/type, date range, and manual settlement-status filters.
- [ ] Add stable server-side pagination and sorting; do not load the entire reservation history into the browser.
- [ ] Return full-dataset status totals for the active non-status filters so summary cards do not count only the current page.
- [ ] Batch-load related services and finance records without one query per row.
- [ ] Treat missing finance/lifecycle migrations as an explicit unavailable state rather than inventing reservation numbers, totals, or payment statuses.
- [ ] Reuse the existing `CalendarEntryStatus`, `CalendarEntrySource`, `ReservationFinancial`, and `SettlementStatus` types where possible.

Done when:

- The query cannot return another user's reservations when called with altered IDs.
- Search, filters, sort, and pagination are deterministic and can be represented in URL query parameters.
- Pending reservations without a financial record still appear correctly.
- Cancelled and completed historical reservations remain discoverable.

## Task 2 - Create the `/editor/reservations` route

- [ ] Add `app/editor/reservations/page.tsx` as an authenticated server page.
- [ ] Reuse `getOrCreateBusiness`, `EditorPageShell`, the category-aware offering copy, and the editor layout authentication boundary.
- [ ] Parse and validate URL query parameters on the server; fall back safely for unknown statuses, invalid dates, and invalid page numbers.
- [ ] Load only the selected page, filter metadata, global status totals, and the related data needed for visible rows.
- [ ] Add page metadata with the title `Reserveringen | Website Maker` and an accurate description.
- [ ] Render useful empty, no-results, loading, and schema-unavailable states.
- [ ] Keep the page read-only when mutations are unavailable; never hide already stored reservations because the active plan or a supporting migration is unavailable.

Done when:

- Visiting the route signed out redirects to `/auth/login`.
- A signed-in owner sees only reservations for their own business.
- Refreshing or sharing a filtered URL restores the same overview.

## Task 3 - Build the responsive reservations overview

- [ ] Add a focused client component, for example `components/booking/reservations-client.tsx`.
- [ ] Implement the page with the shared editor components and the rules in `docs/style-guide.md`; do not create a visually separate reservations theme.
- [ ] Show compact summary cards for `In afwachting`, `Bevestigd`, `Afgerond`, and `Geannuleerd`; include `Geblokkeerd` when such legacy records exist.
- [ ] Make each summary card an accessible status filter with visible selected state and text that does not rely on color alone.
- [ ] Add a debounced search field and filters for status, offering/accommodation, source, type, date range, and payment status.
- [ ] Keep filters in the URL so browser back/forward, refresh, and copied links behave predictably.
- [ ] Render a desktop table with at least:
  - reservation number or `Nog geen nummer`;
  - customer;
  - accommodation/offering;
  - reservation date or stay range;
  - booking status;
  - total and manual payment status when available;
  - source;
  - last update;
  - a clear detail action.
- [ ] Render the same essential information as stacked cards below the desktop breakpoint; do not force a horizontally scrolling table at 390 px.
- [ ] Format date/time in the reservation's configured timezone and format monetary values from integer minor units.
- [ ] Add clear pagination controls with current range and total result count.
- [ ] Use explicit unavailable copy (`Niet beschikbaar`) for missing finance data rather than displaying zero euros or a fabricated payment status.
- [ ] Ensure long names, email addresses, offering titles, and reservation numbers truncate or wrap without breaking the layout.

Done when:

- Owners can identify an incoming request and its status without opening the calendar.
- All fields remain readable and all controls remain operable at 390 px.
- Keyboard users can reach filters, rows/cards, pagination, and detail actions in a logical order.

## Task 4 - Reuse reservation detail and status workflows

- [ ] Extract reusable reservation-detail pieces from `components/calendar/calendar-client.tsx` where needed instead of copying its lifecycle logic.
- [ ] Let an owner open the selected reservation from the overview, using a URL-addressable selection such as `?reservation=<id>`.
- [ ] Show customer details, offering, date/range, source, internal notes, status history, pending change requests, reservation number, price snapshot, payment status, and invoices when available.
- [ ] Provide only valid, clearly labelled status actions for the current state.
- [ ] Route online-booking approval/decline through `transitionBookingAction` so history and notifications remain idempotent.
- [ ] Route other permitted edits through the existing authenticated calendar actions and runtime-entitlement checks.
- [ ] Keep customer-facing messages separate from private owner notes.
- [ ] Refresh the visible row, summary totals, and detail state after a successful mutation without requiring a full manual reload.
- [ ] Offer `Bekijk in kalender` linking to `/editor/calendar?booking=<id>` for date-based planning and conflict context.
- [ ] Preserve current safe invoice behavior: issued invoices remain immutable, emailing is owner-triggered, and payment status is explicitly manual.

Done when:

- A status changed from either page is immediately consistent on the reservations page, calendar, and customer management link.
- Lifecycle history and notifications are not bypassed or duplicated.
- A failed mutation leaves the previous status visible and shows a durable error message.

## Task 5 - Add editor navigation and shared status presentation

- [ ] Add `Reserveringen` to the `Mijn website` menu in `components/editor/editor-header.tsx`.
- [ ] Add the route title and icon mapping in `components/editor/editor-layout-client.tsx`.
- [ ] Keep `Boekingskalender`/`Afsprakenkalender` as a separate navigation item so list management and planning remain distinct.
- [ ] Extract shared status labels and styles from the calendar client into a small booking/calendar presentation module.
- [ ] Reuse those labels and styles on the calendar, reservations overview, detail panel, and status filters to prevent drift.
- [ ] Add accessible current-page styling to the editor menu if the shared header supports it.

Done when:

- The new page is discoverable from desktop and mobile editor navigation.
- The same stored status has the same Dutch label and visual meaning everywhere.

## Task 6 - Tests and validation

- [ ] Add query tests for ownership isolation, record scope, all statuses, search, filters, sorting, pagination, and missing optional finance data.
- [ ] Add lifecycle tests proving online bookings use the safe transition path and invalid status transitions do not mutate data.
- [ ] Add component tests for status cards, empty states, unavailable states, URL-backed filters, and pagination.
- [ ] Add an authenticated browser test covering desktop and 390 px mobile layouts.
- [ ] Compare the rendered page with existing editor pages and `docs/style-guide.md`, covering palette, typography, spacing, components, focus states, empty/error states, and responsive behavior.
- [ ] Verify direct mutation attempts still require authentication, business ownership, and the Gold runtime entitlement.
- [ ] Verify that a status update is consistent across `/editor/reservations`, `/editor/calendar`, and the signed customer page.
- [ ] Run the focused booking/lifecycle tests, then `node --test tests`, `npx tsc --noEmit`, relevant ESLint, `npm run build`, and `git diff --check`.
- [ ] Record live Supabase/authenticated-browser/SMTP checks as deployment checks when they cannot actually be performed locally.

## Acceptance criteria

- Every owned reservation/appointment is discoverable on one paginated page, including cancelled and completed history.
- Calendar blockers, notes, and external busy imports do not appear as customer reservations.
- Search and filters work across the full server-side dataset, not only already-loaded rows.
- Status summary counts describe the full filtered result set, not the current page.
- Booking status and manual payment status are never conflated.
- The page never invents reservation numbers, totals, customer data, or integration health.
- Owner mutations remain authenticated, business-scoped, entitlement-protected, and lifecycle-aware.
- Calendar, reservations overview, and customer view show consistent status after a change.
- The page is usable with keyboard navigation and at a 390 px viewport.
- The page uses the same shared UI language as the rest of the editor and conforms to `docs/style-guide.md` without one-off visual patterns.

## Out of scope for this task

- A new reservations database table or migration solely for the overview.
- Online payment collection, refunds, or payment-provider webhooks.
- Bulk status changes or bulk customer communication.
- Deleting financial history or issued invoices.
- Replacing the calendar, availability editor, or calendar-sync settings.
- Inventing new booking statuses before a separate lifecycle and migration decision.

## Recommended implementation order

1. Server-side view model, query, filters, counts, and pagination.
2. Authenticated route and URL parameter contract.
3. Responsive overview with shared status presentation.
4. Reusable detail panel and lifecycle-safe actions.
5. Editor navigation.
6. Automated, responsive, and deployment validation.

## Implementation note (2026-08-23)

The owner overview is implemented at `/editor/reservations` without a new database table. It uses an owner-scoped, paginated `calendar_entries` query, batch-loads visible service and finance data, keeps status totals independent from the active status filter, and treats finance/lifecycle schema failures as explicit unavailable states. Search and every filter are URL-backed. Invalid or out-of-range parameters fall back safely.

The responsive UI reuses `EditorPageShell`, shared buttons, inputs, labels, status messages, finance tooling, semantic theme tokens, and the deep-green direction from `docs/style-guide.md`. Desktop uses a structured table; smaller viewports use stacked cards without horizontal scrolling. Calendar and reservations now share one status label/style module.

Status changes use a server-side transition matrix. Online pending bookings continue through `transitionOwnerBooking`; other permitted changes use an ownership- and entitlement-protected compare-and-set update so stale concurrent screens cannot overwrite a newer status. Both calendar and reservations surfaces are revalidated after reservation, lifecycle, price, or invoice changes.

Validation completed:

- [x] `node --test tests`: 138 tests passed.
- [x] `npx tsc --noEmit` passed.
- [x] `npm run lint` passed.
- [x] `npm run build` passed and lists `/editor/reservations` as a dynamic route.
- [x] `git diff --check` passed; new files were separately checked for trailing whitespace.
- [x] Signed-out HTTP/browser behavior returns `307` and lands on `/auth/login`.
- [ ] Authenticated visual interaction remains a deployment check because the in-app browser had no signed-in session and no connected Chrome session was available.
- [ ] Live Supabase mutation, customer-link, and SMTP delivery checks remain deployment checks; no external status change or email delivery is claimed from the local run.
