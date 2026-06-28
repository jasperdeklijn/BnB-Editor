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

5. [ ] Add availability and blocked-time management

   Let users define when offerings can or cannot be booked.

   Done when:
   - Users can create blocked periods such as holidays, maintenance, or unavailable rooms.
   - Users can define basic opening/availability windows.
   - Availability can be linked to all offerings or one selected service/accommodation.
   - Conflicting bookings are clearly shown before saving.

6. [ ] Connect public request forms to the calendar

   Turn relevant public form submissions into calendar-ready entries.

   Done when:
   - Request form submissions with a date can create a pending calendar entry.
   - Pending entries can be accepted, declined, or edited from the calendar.
   - Accepting a request updates the calendar status.
   - Email/request handling keeps working if calendar creation fails.

7. [ ] Make offering management calendar-aware

   Improve the existing diensten/accommodations management page so offerings can be planned.

   Done when:
   - Each offering can show upcoming calendar entries or bookings.
   - Users can open the calendar filtered to a selected offering.
   - B&B offerings use accommodation-friendly labels such as rooms, bookings, check-in, and check-out.
   - Generic service businesses continue to use appointment/service wording.

8. [ ] Add status and filtering tools

   Make the calendar useful for day-to-day management.

   Done when:
   - Users can filter by status, offering, source, and date range.
   - Supported statuses include pending, confirmed, cancelled, completed, and blocked.
   - Calendar entries use clear visual status colors.
   - The filter controls are usable on mobile.

9. [ ] Add save states, empty states, and error handling

   Match the existing editor save behavior.

   Done when:
   - Calendar create/update/delete actions update the editor saving state.
   - Empty states explain how to add the first entry.
   - Failed saves show a clear error and do not lose local user input.
   - Loading states do not shift the layout.

10. [ ] Verify and document

   Validate the implementation before marking the work complete.

   Done when:
   - `npx tsc --noEmit` passes.
   - Calendar page works at mobile width.
   - A generic service business and a B&B business both show fitting labels.
   - Template-generated demo offerings can be linked to calendar entries.
   - This task file is updated with completed checkboxes.
