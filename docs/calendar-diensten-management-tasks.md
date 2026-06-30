# Calendar And Diensten Management Tasks

Use this file as the task list for creating a calendar-driven management page for user offerings. Keep the app buildable after every task.

## Goal

Create an editor page where users can manage appointments, bookings, availability, and offering-specific planning from one calendar view. The page should work for generic diensten and category-specific offerings such as B&B accommodations.

## Calendar Entry Model

Use `calendar_entries` as the first calendar table. Each row belongs to one business and can optionally link to one service/accommodation and one contact request.

Entry types:
- `appointment`: a planned appointment for a generic service.
- `booking`: a booking for an accommodation, room, event, or longer service.
- `blocked`: unavailable time such as holidays, maintenance, or room closure.
- `note`: an internal planning note that should appear on the calendar.

Statuses:
- `pending`: received or drafted, not confirmed yet.
- `confirmed`: accepted and active.
- `cancelled`: cancelled by user, customer, or business.
- `completed`: finished historical entry.
- `blocked`: unavailable period.

Required timing fields:
- `start_at`: start time or B&B check-in date/time.
- `end_at`: end time or B&B check-out date/time.
- `all_day`: use for full-day blocked periods or date-range accommodation bookings.
- `timezone`: stored with the entry so the UI can display times predictably.

Customer and planning fields:
- `customer_name`, `customer_email`, `customer_phone`.
- `title` for a short visible calendar label.
- `internal_notes` for private business notes.
- `source` to distinguish manual entries, website forms, contact requests, and imports.
- `metadata` for future category-specific fields without schema churn.

## Tasks

1. [x] Decide the calendar entry model

   Define what the calendar stores and how it relates to existing businesses, websites, services, and request forms.

   Done when:
   - Calendar entries can represent appointments, bookings, blocked time, and notes.
   - Entries belong to a business and can optionally link to a service/accommodation.
   - The model supports start time, end time, status, customer details, source, and internal notes.
   - B&B usage can represent room/accommodation bookings with check-in and check-out dates.

2. [x] Add database schema and server helpers

   Add the calendar tables and typed CRUD helpers.

   Done when:
   - A migration creates the calendar table or tables with RLS policies.
   - Server helpers can list, create, update, delete, and change status for calendar entries.
   - Helpers validate ownership through the current user business.
   - Existing `services` data can be used as the linked offering source.

3. [x] Create the editor calendar route

   Add a protected editor page for the calendar management experience.

   Done when:
   - The page is available under `/editor/calendar`.
   - The editor header and website menu include the calendar page.
   - The page uses `EditorPageShell` and matches the existing editor layout.
   - The page title and labels adapt to category naming where useful.

4. [x] Build the calendar view

   Implement the main calendar UI for managing entries.

   Done when:
   - Users can switch between month, week, and day views.
   - Entries are visible with status, time, customer name, and linked offering.
   - Users can click a day or time slot to create an entry.
   - Users can click an existing entry to edit details.
   - The calendar works on desktop and mobile without horizontal overflow.

5. [x] Add availability and blocked-time management

   Let users define when offerings can or cannot be booked.

   Done when:
   - Users can create blocked periods such as holidays, maintenance, or unavailable rooms.
   - Users can define basic opening/availability windows.
   - Availability can be linked to all offerings or one selected service/accommodation.
   - Conflicting bookings are clearly shown before saving.

6. [x] Connect public request forms to the calendar

   Turn relevant public form submissions into calendar-ready entries.

   Done when:
   - Request form submissions with a date can create a pending calendar entry.
   - Pending entries can be accepted, declined, or edited from the calendar.
   - Accepting a request updates the calendar status.
   - Email/request handling keeps working if calendar creation fails.

7. [x] Make offering management calendar-aware

   Improve the existing diensten/accommodations management page so offerings can be planned.

   Done when:
   - Each offering can show upcoming calendar entries or bookings.
   - Users can open the calendar filtered to a selected offering.
   - B&B offerings use accommodation-friendly labels such as rooms, bookings, check-in, and check-out.
   - Generic service businesses continue to use appointment/service wording.

8. [x] Add status and filtering tools

   Make the calendar useful for day-to-day management.

   Done when:
   - Users can filter by status, offering, source, and date range.
   - Supported statuses include pending, confirmed, cancelled, completed, and blocked.
   - Calendar entries use clear visual status colors.
   - The filter controls are usable on mobile.

9. [x] Add save states, empty states, and error handling

   Match the existing editor save behavior.

   Done when:
   - Calendar create/update/delete actions update the editor saving state.
   - Empty states explain how to add the first entry.
   - Failed saves show a clear error and do not lose local user input.
   - Loading states do not shift the layout.

10. [ ] Fix the missing authenticated mobile verification

   Complete the check that could not be finished because the browser session reached `/auth/login`.

   Done when:
   - `/editor/calendar` is opened in a signed-in browser session.
   - The calendar page is checked at mobile width, including filters, calendar controls, entry form, availability panel, and upcoming entries.
   - There is no horizontal page overflow at mobile width.
   - Any mobile-only layout issue found during the check is fixed before this task is marked complete.
   - `npx tsc --noEmit` passes after any fix.

   Verification notes:
   - 2026-06-30: `npx tsc --noEmit` passed.
   - 2026-06-30: Source check confirmed B&B calendar copy uses bookings, check-in, check-out, accommodations, and generic businesses use appointment/service wording.
   - 2026-06-30: Source check confirmed template demo offerings are inserted into `services`, and calendar entries link to offerings through `service_id`.
   - 2026-06-30: Mobile browser check at 390px reached the protected route boundary and redirected to `/auth/login` without horizontal overflow. The authenticated calendar page itself still needs a signed-in browser session.
   - 2026-06-30: Local HTTP checks for `/editor/calendar` and `/editor/services` returned the protected-route `307` redirect. The in-app browser also reached `http://localhost:3000/auth/login`, so the authenticated mobile verification is still blocked on sign-in.

11. [x] Define customizable booking space settings for the diensten section

   Add a clear content model for a booking or appointment space inside the existing services/accommodations section.

   Done when:
   - The services section data can store whether the booking space is enabled.
   - The settings support editable heading, intro text, button label, success text, and optional helper text.
   - The settings support choosing between inline form, CTA button to the request form, or calendar-focused booking block.
   - The settings can optionally limit booking to selected services/accommodations.
   - B&B defaults use accommodation wording such as book a room, check-in, check-out, and bookings.
   - Generic defaults use service wording such as appointment, date, time, and request.

   Verification notes:
   - 2026-06-30: Services section data now stores `bookingSpaceEnabled`, `bookingSpaceMode`, editable heading, intro, CTA label, success text, helper text, CTA target, request type, and optional service limits.
   - 2026-06-30: Public rendering receives `businessCategory`, so B&B defaults use booking/check-in copy and generic businesses use appointment/date copy.

12. [x] Add editor controls for the services booking space

   Make the booking space configurable from the services section editor.

   Done when:
   - The services section editor has a compact toggle to enable or disable the booking space.
   - Users can edit the booking space heading, text, CTA label, and helper text.
   - Users can choose the booking space mode without cluttering the section editor.
   - Controls use the existing editor patterns, icons, and deep-green styling from `docs/style-guide.md`.
   - Empty or invalid settings fall back to category-appropriate defaults.
   - The editor preview updates when settings change.

   Verification notes:
   - 2026-06-30: The services inspector has a compact booking-space card with enable/disable, request type, mode, copy fields, CTA section selector, and optional offering limiter using the existing deep-green editor controls.

13. [x] Render the booking space on public diensten/accommodations sections

   Show a polished booking area inside the public services section when it is enabled.

   Done when:
   - The booking space appears in `ServicesSection` without breaking existing grid, list, featured, magazine, minimal, and carousel layouts.
   - The booking space is visually consistent with the deep-green B2B style and works on mobile.
   - The booking space can show selected service/accommodation options when configured.
   - B&B visitors see room/accommodation booking copy.
   - Generic service visitors see appointment/request copy.
   - Existing services sections without booking settings keep their current behavior.

   Verification notes:
   - 2026-06-30: `ServicesSection` renders an optional deep-green booking block below all existing services layouts. Disabled sections keep the previous rendering.
   - 2026-06-30: Inline/calendar modes render a mobile-friendly request form; CTA mode links to a selected current section.

14. [x] Connect the diensten booking space to calendar-ready requests

   Let visitors start a booking or appointment from the services section and keep it linked to the selected offering.

   Done when:
   - A visitor can choose a service/accommodation from the booking space when selection is enabled.
   - The selected offering is passed through to the request/contact flow.
   - Requests with date information can still create pending `calendar_entries`.
   - New calendar entries keep the correct `service_id`.
   - If calendar creation fails, the public request still succeeds and the user sees the normal success state.
   - The flow works for both B&B bookings and generic service appointments.

   Verification notes:
   - 2026-06-30: The booking block posts to `/api/requests` with `requestType`, selected service name, and `serviceId`.
   - 2026-06-30: The request API validates the selected service against the business and writes `calendar_entries.service_id` for pending calendar entries. Calendar creation remains best-effort after the public request is stored.

15. [ ] Final verification and documentation

   Validate the full calendar and booking-space workflow before closing this task list.

   Done when:
   - `npx tsc --noEmit` passes.
   - `/editor/calendar` works at authenticated mobile width.
   - `/editor/services` shows upcoming planning and calendar links for offerings.
   - The services section booking space can be enabled, customized, previewed, and rendered publicly.
   - A generic service business and a B&B business both show fitting labels across editor, public section, and calendar.
   - Template-generated demo offerings can be selected in the booking space and linked to calendar entries.
   - This task file is updated with completed checkboxes and any verification notes.

   Verification notes:
   - 2026-06-30: `npx tsc --noEmit` passed after the booking-space implementation.
   - 2026-06-30: Final authenticated mobile browser verification remains blocked because both local HTTP and in-app browser checks redirect to `/auth/login`.
