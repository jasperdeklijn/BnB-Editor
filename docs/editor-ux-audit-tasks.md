# Editor UX Audit Tasks

Audit date: 2026-07-02
Route tested: `/editor` in the in-app browser
Perspective: non-technical website owner using the editor without code knowledge
Retry note: development-only Next.js UI, including the small `N` badge/menu, was ignored and is not part of these findings.

## Checklist

- [x] Task 1: Make section selection obvious and reliable
- [x] Task 2: Add labels/tooltips to unlabeled icon buttons
- [x] Task 3: Simplify the first-run tutorial and next step
- [x] Task 4: Replace technical wording in the inspector with user-facing language
- [x] Task 5: Improve mobile editing flow
- [x] Task 6: Make destructive template changes safer
- [x] Task 7: Reduce repetition and mixed language in site design options
- [x] Task 8: Make adding sections easier to understand
- [x] Task 9: Clarify save, publish, and live-site status

## Task 1: Make section selection obvious and reliable

Status: Done
Priority: High

Observed issue:
- The inspector says "Klik op een sectie om aan te passen", but clicking the hero content did not open the section editor.
- Double-clicking text started inline editing, which is a different interaction than the panel instruction describes.
- On mobile, tapping the canvas had the same problem, so the user cannot confidently get from "I see text" to "I can edit this section".

Done when:
- Clicking anywhere inside a section selects that section and opens the section controls.
- Inline text editing and section selection have distinct, visible affordances.
- The empty inspector message explains the exact next action in plain language.
- The selected section has a clear visual outline or label on desktop and mobile.

Verified:
- Desktop: clicking the hero text opens the section inspector, removes the "Geen sectie geselecteerd" state, and shows "Geselecteerd: Hero" on the canvas.
- Mobile: tapping the hero opens the section controls in the style panel.

## Task 2: Add labels/tooltips to unlabeled icon buttons

Status: Done
Priority: High

Observed issue:
- Several header and canvas buttons have no visible label or accessible name.
- The device preview buttons only show icons, and their selected state is not understandable without already knowing what the icons mean.
- Section move/delete/duplicate-style controls appear as empty buttons in the DOM.
- Retest found many product buttons without text, `aria-label`, or tooltip after excluding the Next.js development button.

Done when:
- Every icon-only button has an `aria-label`, tooltip, and visible focus state.
- Device buttons are labeled as desktop, tablet, and phone preview.
- Canvas section controls explain their action on hover/focus.
- Keyboard and screen-reader users can identify every editor action.

Verified:
- Desktop product buttons on the current editor screen have text, `aria-label`, or `title` after excluding the Next.js development button.
- Device preview buttons expose "Desktop preview", "Tablet preview", and "Telefoon preview".
- Canvas section controls expose labels such as "Hero verslepen", "Hero omhoog verplaatsen", and "Hero verwijderen".

## Task 3: Simplify the first-run tutorial and next step

Status: Done
Priority: High

Observed issue:
- The empty state offers "Tutorial starten" and "Zelf beginnen", but it does not show what will happen after choosing either option.
- After the tutorial adds sections, the editor does not clearly guide the user toward the next edit.
- The tutorial creates content, but the user is left to discover selection, inline editing, styling, and publishing alone.

Done when:
- The tutorial states what it will add before it runs.
- After starter sections are added, the next step highlights one section and opens its editing controls.
- The user gets one clear primary action at a time: edit text, change style, add image, or publish.

Verified:
- Empty-state copy now explains the basisopzet before it runs and says it adds intro, over-ons, aanbod and contact.
- Starting the basisopzet selects the first section immediately; on mobile it opens the style/editor panel directly.
- The primary action is now "Basisopzet maken" with "Zelf secties kiezen" as the secondary path.

## Task 4: Replace technical wording in the inspector with user-facing language

Status: Done
Priority: Medium

Observed issue:
- The section inspector uses terms like "hero", "CTA-knoptekst", `font-serif`, hex colors, and background image URL fields.
- These labels are clear to builders, but not to a non-technical business owner.

Done when:
- Section titles use Dutch user-facing names, for example "Intro bovenaan" instead of "hero".
- "CTA" is replaced with plain copy such as "Knoptekst".
- Font and color controls use pickers or named options before exposing raw class names or hex values.
- URL-only image inputs include an easier image-picker path.

Verified:
- The section library, canvas and inspector show "Intro bovenaan" instead of "Hero"/`hero`.
- The hero inspector shows "Knoptekst", "Indeling", "Uiterlijk" and "Lettertype".
- The font control is a named dropdown and no longer shows `font-serif` as placeholder copy.
- The background-image control links to "Afbeeldingen openen" as an easier image-management path.

## Task 5: Improve mobile editing flow

Status: Done
Priority: High

Observed issue:
- On a phone-width viewport, the top editor controls are cramped and truncate the website name and live URL.
- The bottom navigation helps, but "Stijl" can show "Geen sectie geselecteerd" while the canvas is hidden, leaving the user stuck.
- The user has to know to return to "Doek", select a section, then go back to "Stijl".
- The retest stayed on `/editor`; this issue is about the mobile editor flow itself, not the development overlay.

Done when:
- Mobile top controls collapse into a compact header with one clear website selector and one clear save/publish status.
- The style panel offers a section picker when no section is selected.
- Selecting a section from the canvas can directly open the relevant edit panel.
- Long URLs and website names do not crowd out primary actions.

Verified:
- Code: mobile editor controls now use a separate compact mobile header with website selector, save status, editable name, save action, new-site icon, and a constrained live/offline status row.
- Code: the section tab now shows a section picker when no section is selected, and selecting an item reuses the same mobile section-selection flow as tapping the canvas.
- `npx tsc --noEmit` passed.
- Live browser retest was attempted at phone width, but the in-app browser automation timed out before returning tab or DOM state. Shell access to `/editor` still returns `307` to `/auth/login`, so authenticated visual verification needs the live browser session.

## Task 6: Make destructive template changes safer

Status: Done
Priority: High

Observed issue:
- The templates panel says a template replaces the current sections and example content.
- The warning is easy to miss because it sits near many attractive template buttons.
- A non-technical user may click a template expecting a preview, not a site replacement.

Done when:
- Template cards open a preview first.
- Applying a template requires an explicit confirmation that explains what will be replaced.
- The confirmation offers a clear cancel path.
- If possible, the editor creates a reversible checkpoint before applying a template.

Verified:
- Template cards now use "Voorbeeld bekijken" and open a preview dialog before any destructive action is available.
- The preview dialog shows the example business content, page structure, and example items, then offers "Dit sjabloon gebruiken".
- Applying requires a second confirmation dialog with destructive copy, "Annuleren", and the explicit action "Ja, vervang mijn huidige site".
- `/api/templates/apply` creates and returns a restore checkpoint for the current sections, transitions, and services before replacing content.
- After applying a template, the success message offers "Vorige inhoud terugzetten", which calls `/api/templates/restore`.
- `npx tsc --noEmit` passed.

## Task 7: Reduce repetition and mixed language in site design options

Status: Done
Priority: Medium

Observed issue:
- "Beauty Rose" and "Salon Modern" appear in both recommended themes and the full list.
- Many theme and color names are English while the rest of the editor is Dutch.
- The "Hoeken" controls are unlabeled, so it is unclear what each option means.

Done when:
- Recommended themes are not duplicated immediately in the full list, or duplicates are clearly grouped.
- Theme and color labels are consistently localized.
- Corner-radius controls show clear labels such as "Recht", "Klein", "Rond", and "Extra rond".

Verified:
- The theme panel now removes the visible recommended themes from the follow-up "Andere thema's" list, so cards like Beauty Rose and Salon Modern do not immediately repeat.
- Theme and color palette names shown in the panel are localized in Dutch while stored theme IDs remain unchanged.
- The site design tabs now use Dutch labels: "Thema's", "Kleuren", and "Letters".
- The "Hoeken" controls now show labeled choices: "Recht", "Klein", "Rond", and "Extra rond".
- `npx tsc --noEmit` passed.

## Task 8: Make adding sections easier to understand

Status: Done
Priority: Medium

Observed issue:
- The section library says "Sleep of tik om toe te voegen", but the available items look like cards, not buttons.
- On desktop, descriptions are truncated in the narrow left panel.
- On mobile, the section library replaces the canvas, so the user cannot see where a tapped section will be inserted.

Done when:
- Section cards have a visible add button or clear tap affordance.
- Truncated descriptions are avoided or available through a tooltip/details state.
- Mobile add-section flow asks where to insert the new section, or shows an insertion preview before adding.

Verified:
- Section cards now show a visible "Toevoegen" button instead of relying on the whole card as an invisible tap target.
- Section descriptions now wrap inside the card instead of being truncated in the narrow sidebar.
- Desktop users can add a section with the button or drag it to a specific spot.
- Mobile users who tap "Toevoegen" are returned to the canvas and asked whether to place the section at the top, after the selected section, or at the bottom.
- `npx tsc --noEmit` passed.

## Task 9: Clarify save, publish, and live-site status

Status: Done
Priority: Medium

Observed issue:
- There is an "Opgeslagen" status in the navbar and a separate "Opslaan" button near the website name.
- The page also shows "Online" and a live URL, but it is not clear whether saving updates the public site immediately.
- The slash before the URL reads like a stray separator.

Done when:
- Save status and manual save behavior are explained by placement and copy.
- "Online" clearly distinguishes draft/editor changes from live published changes.
- The live URL is presented as a single readable link or preview action.

Verified:
- The manual website-name save button is now labeled "Naam opslaan" to distinguish it from editor autosave status.
- The save status copy now says "Wijzigingen opgeslagen", "Wijzigingen opslaan...", or "Niet opgeslagen" in the editor status row.
- Offline state now explains that changes are only visible in the editor and offers "Live zetten".
- Live state is labeled "Live" and presents the live URL as one readable link with an external-link icon.
- `npx tsc --noEmit` passed.
