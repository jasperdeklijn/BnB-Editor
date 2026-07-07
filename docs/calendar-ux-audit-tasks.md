# Calendar UX Audit Tasks

Audit date: 2026-07-05
Route tested: `/editor/calendar` in the authenticated in-app browser
Perspective: non-technical business owner managing appointments, bookings, availability, and requests
Scope: UX issues only. No calendar entries, availability windows, or services were intentionally saved during this audit.

## Tested

- Desktop calendar at the default browser size.
- Mobile calendar at 390px wide.
- Month, week, and day views.
- Primary add appointment form opened without saving.
- Existing filters, availability panel, upcoming appointments panel, and calendar controls.

## Checklist

- [ ] Task 1: Make visible item counts match the current calendar view
- [ ] Task 2: Add labels and tooltips to icon-only calendar buttons
- [ ] Task 3: Improve mobile month-grid touch targets
- [ ] Task 4: Replace dense week-grid add buttons with a clearer mobile interaction
- [ ] Task 5: Make filters collapsible and less dominant on mobile
- [ ] Task 6: Present the add/edit form as a focused drawer or modal
- [ ] Task 7: Make upcoming appointments explain why nothing is shown
- [ ] Task 8: Separate availability settings from day-to-day appointment work

## Task 1: Make visible item counts match the current calendar view

Status: Open
Priority: High
Likely files:
- `components/calendar/calendar-client.tsx`
- `app/editor/calendar/page.tsx`

Observed issue:
- The header and filters showed `2 items in beeld`, but the current month/day/week area could still appear empty for the selected range.
- The day view for `zondag 05 juli` showed only empty time slots while the page still said two items were in view.
- This makes it unclear whether the count means all filtered items, the current month, the current day, or upcoming items.

Done when:
- The top count clearly states whether it is the filtered total or the visible calendar-range total.
- Month, week, and day views show a range-specific count such as `0 items deze dag` or `2 items deze maand`.
- Empty calendar states explain whether filters, date range, or the selected service caused the empty view.

## Task 2: Add labels and tooltips to icon-only calendar buttons

Status: Open
Priority: High
Likely files:
- `components/calendar/calendar-client.tsx`
- `components/ui/button.tsx`

Observed issue:
- The audit found four product buttons with no visible text, `aria-label`, or `title`.
- The previous/next calendar buttons are icon-only in the DOM.
- Availability delete buttons also appear as unlabeled icon-only buttons.

Done when:
- Previous and next buttons expose labels such as `Vorige periode` and `Volgende periode`.
- Availability delete buttons expose a specific label such as `Beschikbaarheid op maandag verwijderen`.
- Every icon-only calendar button has an accessible name, tooltip, and visible focus state.

## Task 3: Improve mobile month-grid touch targets

Status: Open
Priority: High
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- At 390px, day number buttons measured about 24px high and separate add buttons measured about 14px wide.
- The day number and tiny add target sit next to each other, which is easy to mistap.
- The month grid technically avoids horizontal overflow, but it is too dense for repeated mobile use.

Done when:
- Calendar day cells have stable mobile touch targets of at least 40px.
- Adding an appointment uses one clear cell action instead of a separate tiny plus/add target.
- Existing day entries and empty-day add states remain readable at 390px.

## Task 4: Replace dense week-grid add buttons with a clearer mobile interaction

Status: Open
Priority: High
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- Mobile week view rendered 84 repeated `Toevoegen` buttons for 12 hours across 7 days.
- The repeated labels make the page noisy for sighted users and screen-reader users.
- It is hard to scan actual appointments because empty slots dominate the interface.

Done when:
- Mobile week view uses a compact agenda/list layout or collapses empty hours by default.
- Empty slots do not repeat identical visible labels dozens of times.
- Users can still add an appointment to a specific day/time through a clear secondary action.

## Task 5: Make filters collapsible and less dominant on mobile

Status: Open
Priority: Medium
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- On 390px, the calendar grid starts far below the header because filters, counters, and summary cards take priority.
- The user must scroll through status, service, source, date filters, and counters before reaching the calendar.
- `Filters wissen` is full-width even when disabled, which adds visual weight without action value.

Done when:
- Mobile shows a compact filter summary with a `Filters` button or collapsible panel.
- Active filters remain visible without pushing the calendar below the fold.
- Disabled reset controls are visually quiet or hidden until a filter changes.

## Task 6: Present the add/edit form as a focused drawer or modal

Status: Open
Priority: Medium
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- Opening `Afspraak toevoegen` inserts a long form into the existing page column.
- On mobile, the form appears in the middle of the already dense calendar and availability content.
- Users can lose the sense of whether they are editing, adding, or still browsing the calendar.

Done when:
- Add/edit opens in a focused drawer, sheet, or modal with a clear title.
- Save and cancel actions stay visible while editing.
- The calendar behind the form is visually de-emphasized until the form is closed.
- Validation and conflict warnings remain inside the focused form surface.

## Task 7: Make upcoming appointments explain why nothing is shown

Status: Open
Priority: Medium
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- The page showed `2 items in beeld`, but the `Aankomende afspraken` panel said `Er staan nog geen kalenderitems klaar`.
- The panel does not explain whether it only shows future items, filtered service items, current-range items, or confirmed items.

Done when:
- The upcoming panel states its rule, for example `Komende 30 dagen` or `Binnen huidige filters`.
- If no upcoming items match, the empty state explains the mismatch with the visible calendar count.
- The panel links back to the relevant filter or date range when possible.

## Task 8: Separate availability settings from day-to-day appointment work

Status: Open
Priority: Medium
Likely file:
- `components/calendar/calendar-client.tsx`

Observed issue:
- Availability settings sit directly beside appointment creation and upcoming appointments.
- This makes the right-side/supporting area feel like a mixed settings panel and daily planning panel.
- Deleting availability windows is an icon-only action, so the risk is higher because the control is both destructive and visually quiet.

Done when:
- Availability gets a distinct panel, tab, or collapsed settings area.
- Day-to-day planning stays focused on appointments, bookings, and requests.
- Destructive availability actions have labels, confirmation, and clear context.
