# Customer Workspace Implementation Plan

## Goal

Give each business owner one protected workspace for handling contact messages, quote requests, appointment requests, and booking requests from first submission through completion. Keep it deliberately smaller than a general CRM and preserve explicit owner control over outgoing communication.

## Current foundation

- `contact_requests` stores visitor submissions and already links requests to businesses and websites.
- `/api/requests` validates and creates supported request types.
- `calendar_entries` can link back to a contact request and supports pending, confirmed, cancelled, completed, and blocked states.
- Website forms already capture visitor locale and service/date information where configured.
- Admin mailbox automation is a separate server-side workflow and must not become customer-accessible accidentally.

## Product boundaries

### Included in the first release

- Owner-only request list and request detail.
- Practical statuses: `new`, `contacted`, `scheduled`, `won`, `lost`, and `archived`.
- Internal notes, assignee-free activity history, filtering, search, and quick actions.
- Safe conversion of a request into a calendar entry.
- Manual email, phone, and WhatsApp actions.
- Owner notifications and a configurable daily summary.

### Not included

- Automatic replies or autonomous follow-ups.
- A sales pipeline builder, multiple team assignees, invoicing, or a general contact database.
- Exposing the admin mailbox, its credentials, or its AI knowledge base to customers.
- Fabricated delivery/read status for external email or WhatsApp.

## Data design

### Extend `contact_requests`

Add:

- `workflow_status text not null default 'new'` with an allowed-value constraint.
- `owner_note text` for the current compact note, if a separate notes table is deferred.
- `last_activity_at timestamptz not null default now()`.
- `archived_at timestamptz`.
- `calendar_entry_id uuid null references calendar_entries(id) on delete set null`, unless the existing calendar-side relationship remains the single canonical link.

Keep visitor payload, workflow state, and private notes separate. Do not put workflow state inside request metadata.

### Add `contact_request_activities`

- `id uuid primary key`.
- `request_id uuid not null references contact_requests(id) on delete cascade`.
- `business_id uuid not null references businesses(id) on delete cascade`.
- `actor_user_id uuid references auth.users(id) on delete set null`.
- `activity_type text`: status change, note, calendar conversion, email action, phone action, or WhatsApp action.
- `details jsonb not null default '{}'` containing only non-secret display metadata.
- `created_at timestamptz not null default now()`.

Add owner-scoped RLS through the request's business. Mirror the final schema in both a migration and `supabase/init.sql`.

### Notification preferences

Add business-level preferences for immediate request email and daily-summary email. Default to the existing safe notification behavior; do not silently enable new automated messages.

## Routes and interface

### `/editor/requests`

- Status counters and a searchable, filterable request list.
- Filters for status, request type, website, service, locale, and date.
- Desktop table plus compact mobile cards without horizontal page scrolling.
- Clear unread/new emphasis without relying on color alone.
- Empty state that links to adding a request-form or contact section.

### Request detail

Use a side panel on desktop and a full-height sheet/page on mobile. Show:

- Customer details and submitted values.
- Source website, form type, locale, and linked service.
- Status control and internal note entry.
- Chronological activity history.
- Email, call, and WhatsApp actions only when the corresponding value exists.
- `Zet in agenda` or the linked calendar entry.

Do not place private notes in customer email content or public-site data.

## Server actions and API rules

- List and mutate requests only after resolving the authenticated user's business ownership server-side.
- Ignore client-supplied business/user ownership fields.
- Validate all workflow transitions and note lengths.
- Create the calendar entry and activity record transactionally where possible; otherwise provide idempotency and a recoverable error.
- Treat quick email/WhatsApp actions as handoffs in v1. Record only that the action was opened, not that delivery occurred.
- Rate-limit mutations and notification resend operations.

## Delivery phases

### Phase 1: schema and access

- [ ] Confirm the existing `contact_requests` and `calendar_entries` relationship in production migrations.
- [ ] Add workflow fields and the activity table with indexes and RLS.
- [ ] Mirror schema and policies in `supabase/init.sql`.
- [ ] Add typed server helpers for list, detail, status, notes, and activity creation.
- [ ] Add ownership/RLS and validation tests.

### Phase 2: request list

- [ ] Add `/editor/requests` to editor navigation.
- [ ] Implement server-side pagination, filters, search, and status counts.
- [ ] Add desktop and mobile list presentations.
- [ ] Add useful loading, empty, and error states.

### Phase 3: request handling

- [ ] Build request detail and activity timeline.
- [ ] Add status changes and internal notes with shared saving feedback.
- [ ] Add safe email, phone, and WhatsApp actions.
- [ ] Add calendar conversion with duplicate/conflict protection.
- [ ] Link back from the calendar entry to the originating request.

### Phase 4: notifications and reporting

- [ ] Add immediate/daily notification preferences.
- [ ] Send a daily summary only when explicitly enabled and requests exist.
- [ ] Add request counts and conversion by status to owner analytics after the workflow has reliable data.
- [ ] Add retention guidance for request data and owner-controlled deletion/archive behavior.

## Acceptance criteria

- An owner can find and process every request belonging to their business, across owned websites.
- Another user cannot read or mutate those requests through UI, direct API calls, or Supabase access.
- Statuses, notes, and calendar conversion persist across reloads and create an activity record.
- Calendar conversion cannot silently create duplicate entries.
- No customer communication is sent without an explicit owner action or enabled notification preference.
- The complete list/detail flow works at 390 px and desktop widths with keyboard navigation.

## Verification

- Database migration and `init.sql` parity assertions.
- RLS tests for owner, other authenticated user, anonymous user, and service role.
- API tests for validation, filters, pagination, status transitions, and idempotent calendar conversion.
- `npx tsc --noEmit`, focused ESLint, and `git diff --check`.
- Authenticated browser coverage on desktop and 390 px mobile.
- Test contact, quote, appointment, booking, and WhatsApp-derived requests in every supported website locale.

