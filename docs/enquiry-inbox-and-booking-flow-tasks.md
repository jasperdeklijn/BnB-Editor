# Enquiry Inbox and Availability Booking Tasks

## Goal

Give each business owner one practical place to follow up on website enquiries and booking requests, while making the existing availability-aware booking flow the only path that represents a real available slot or stay.

This work covers:

- Website contact, quote, appointment, and booking requests.
- An owner-facing enquiry inbox and follow-up workflow.
- Owner-approved replies sent from FlexPagina and recorded in the enquiry history.
- The existing availability, hold, and booking flow.

This work explicitly does **not** include WhatsApp tracking, WhatsApp inboxes, Meta/WhatsApp Business API, webhooks, templates, or WhatsApp message sending.

## Current foundation

- `POST /api/requests` stores website submissions in `contact_requests`, emails the owner, and creates a pending `calendar_entries` record for appointment and booking requests when a preferred date is supplied.
- `/editor/calendar` owns planning, availability windows, and appointment/booking status changes.
- `/editor/reservations` is an owner-facing list for calendar-backed appointments and bookings.
- The public Services booking block already provides server-validated availability, temporary holds, transactional finalization, notifications, and customer booking links.
- `mail_accounts`, `mail_threads`, and related tables are the platform support-mail system. They are not tenant-scoped and must not be reused as the customer-owner enquiry inbox.

## Product decisions to confirm

- Use these enquiry stages for v1: `new`, `in_progress`, `awaiting_customer`, `won`, `lost`, `spam`, and `archived`.
- Treat an accepted booking as `won` automatically; do not automatically mark a generic contact request as won.
- Start with replies delivered by the configured FlexPagina mail service. Do not promise that they come from the owner's personal mailbox unless a later per-business sending-domain feature is added.
- Show calendar-backed appointment and booking requests in the inbox as links to their canonical calendar/reservation record; do not create a second, competing booking status.
- A free-text preferred date in a generic request is an enquiry only, not a confirmation of availability.

## Phase 1: schema and server-side ownership

- [x] Add a new migration and mirror it in `supabase/init.sql`.
- [x] Extend `contact_requests` with owner workflow fields:
  - `status`, `status_changed_at`, `last_activity_at`, `last_replied_at`, `follow_up_at`, `closed_at`, and `closed_reason`.
  - `owner_notes` for private notes only.
  - Optional `calendar_entry_id` if a stable reverse link is required; otherwise query through the existing `calendar_entries.contact_request_id` relation.
- [x] Add a `contact_request_messages` table for the immutable conversation history:
  - request ID, direction (`inbound`/`outbound`), sender/recipient details, subject, body, delivery status, provider message ID, sent timestamp, and error metadata.
  - Keep message data separate from the request workflow fields so a reply never overwrites the original enquiry.
- [x] Add indexes for business-scoped inbox queries: `(business_id, status, last_activity_at desc)`, due follow-ups, and request/message joins.
- [x] Add owner-scoped RLS policies for reading and updating a request, inserting owner notes/status updates, and reading its messages.
- [x] Keep public inserts server-owned through the existing request route; do not broaden public update access.
- [x] Add server-side request query helpers that always scope by `business_id`, validate filters and pagination, and return unavailable-schema errors clearly.
- [x] Add server actions/routes for status changes, notes, follow-up dates, and reply sending. Re-check ownership in every mutation.
- [x] Add audit events for status changes and sent replies without storing message bodies in general audit logs.

## Phase 2: owner enquiry inbox

- [x] Add `/editor/requests` with an editor navigation entry and a small unread/new count.
- [x] Build a responsive list with: customer, request type, service, preferred date, source, current stage, latest activity, and follow-up date.
- [x] Add server-side filters for stage, request type, service, source, date range, and search by name/email/phone.
- [x] Add concise summary counts: new, needs follow-up, in progress, won, and lost.
- [x] Add a detail panel/page with the original request, private notes, activity timeline, and message history.
- [x] Link appointment/booking requests to `/editor/calendar` or `/editor/reservations`; retain one canonical status source for the calendar record.
- [x] Provide owner actions: start work, set follow-up, mark won/lost/spam/archive, and add internal note.
- [x] Make status labels and mobile interactions accessible, readable at 390px width, and usable without hover-only controls.
- [x] Revalidate the requests page, calendar, and reservations page after workflow changes that affect them.

## Phase 3: replies and follow-up

- [x] Add a reply composer within the request detail view.
- [x] Send mail only from an authenticated owner action; validate recipient, subject, and content length server-side.
- [x] Use an idempotency key so retries cannot send duplicate emails.
- [x] Record every attempted outbound message in `contact_request_messages`; distinguish `queued`, `sent`, and `failed` delivery state.
- [x] Update request stage/activity timestamps only after the send outcome is known.
- [x] Add simple saved reply templates owned by the business, with placeholders limited to known request fields.
- [x] Add a due-follow-up indicator to the editor header or inbox count. Do not send automated follow-up email in v1.
- [x] Keep AI reply drafting separate and approval-only if it is later connected to the existing agent queue.

## Phase 4: make availability and booking the canonical booking path

- [x] Review every public CTA that uses `POST /api/requests` with `appointment` or `booking_request`.
- [x] For actual available times/stays, route the customer through the Services booking block's availability -> hold -> confirmation flow.
- [x] Retain generic appointment/booking forms only as an enquiry flow when the owner deliberately wants a preferred date rather than live availability.
- [x] Change customer-facing copy on generic forms so it says "preferred date" / "request" and never implies a slot is reserved.
- [x] Ensure calendar entries created by the generic request route are visibly marked as unverified requests and never treated as availability-checked online bookings.
- [x] Add a clear setup checklist for owners:
  - Enable booking on the service in `/editor/services`.
  - Choose appointment or stay mode, approval/direct confirmation, capacity, timezone, notice, and horizon.
  - Set business/service availability in `/editor/calendar`.
  - Enable the booking block in the site Services section and select the intended services.
  - Publish the website after changes.
- [x] Surface a clear disabled/misconfigured state when a service has a booking block but booking settings or availability windows are not ready.
- [x] Keep Gold entitlement checks server-authoritative on availability, hold, and confirmation endpoints.

## Phase 5: validation and rollout

- [x] Add focused tests for inbox RLS/ownership boundaries, filters, status transitions, activity timestamps, reply idempotency, and error handling.
- [x] Add regression tests proving a public request cannot update another request or send arbitrary email.
- [x] Add tests that distinguish generic preferred-date enquiries from availability-checked bookings.
- [x] Run `npm run typecheck`, `npm run lint`, `node --test tests`, and `npm run build`.
- [ ] Apply required booking migrations in the target Supabase project before enabling the feature:
  - `20260628100000_calendar_entries.sql`
  - `20260801120000_add_service_booking_settings.sql`
  - `20260801130000_add_public_booking_holds.sql`
  - `20260801140000_add_booking_lifecycle.sql`
  - the new inbox migration from Phase 1
- [ ] Verify production configuration: `CRON_SECRET`, SMTP settings, and an explicit `BOOKING_LINK_SECRET`.
- [ ] Perform authenticated desktop and 390px mobile checks with a real owner account.
- [ ] Run a live end-to-end test: form submission -> inbox -> owner reply -> follow-up -> availability-checked booking -> approval/decline -> customer notification.
- [ ] Verify that live Supabase RLS, SMTP delivery, and cron retry behavior work before claiming production readiness.

## Out of scope

- WhatsApp integration of any kind.
- Payment collection, deposits, refunds, or payment-provider webhooks.
- Customer-specific inbound mailbox connections or sending-domain verification.
- Google Calendar and Outlook OAuth; continue using the existing iCal interoperability work until it has proven reliable in production.

## Acceptance criteria

- A new website contact or quote request appears in the owning business's inbox and nowhere else.
- An owner can safely track status, notes, follow-up, and reply history without leaving FlexPagina.
- Booking/appointment requests link to their calendar or reservation record without duplicate or conflicting statuses.
- A customer cannot obtain a booking confirmation through a generic preferred-date form.
- Actual slot/stay bookings are validated server-side at availability check, hold, and final confirmation.
- No WhatsApp API, tracking, or messaging code is introduced by this work.
