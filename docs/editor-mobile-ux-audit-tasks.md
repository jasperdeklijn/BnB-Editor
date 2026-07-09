# Editor Mobile UX Audit Tasks

Audit date: 2026-07-09
Route tested: `/editor` in the authenticated in-app browser
Viewport tested: 390px by 844px
Perspective: non-technical website owner editing from a phone
Scope: Mobile editor UX only. No websites, sections, templates, or publish actions were intentionally saved during this audit.
Retry note: development-only Next.js UI, including the floating `N` badge/menu, was ignored and is not part of these findings.

## Tested

- Empty `/editor` canvas state.
- Mobile bottom navigation: `Secties`, `Doek`, `Stijl`, and `Site`.
- Section library tab and images tab entry point.
- Style empty state with no selected section.
- Site design panel, including `Thema`, `Kleuren`, `Letters`, and `Sjablonen`.
- Horizontal overflow and browser console warnings at 390px wide.

## Not Tested

- Editing an existing populated page on mobile.
- Applying a template.
- Saving a website name, publishing, or creating a new website.
- Dragging a section into the canvas.

## Checklist

- [x] Task 1: Make the mobile editor header touch-safe and less crowded
- [x] Task 2: Make mobile section adding read like a tap-first flow
- [x] Task 3: Reduce nested mobile tabs in the style and site panels
- [ ] Task 4: Give theme, color, and font lists enough visible space
- [ ] Task 5: Fix template cards that sit too close to the viewport edge
- [ ] Task 6: Protect scrollable panels from the fixed bottom navigation
- [ ] Task 7: Add a populated-page mobile verification pass

## Task 1: Make the mobile editor header touch-safe and less crowded

Status: Done
Priority: High
Likely files:
- `components/editor/editor-client.tsx`
- `components/editor/editor-header.tsx`

Observed issue:
- The mobile header uses the first 176px for website selection, save status, website name, create button, offline state, and publish action.
- Several header controls are below a comfortable mobile touch size: the account button is 36px wide, the create-site button is 32px, the save button is 32px high, and `Live zetten` is 24px high.
- The page technically avoids horizontal overflow, but the header feels like an admin toolbar compressed onto a phone.

Done when:
- Primary mobile controls are grouped by workflow: website switcher, save/name, and publish/live state.
- Tappable controls in the mobile header are at least 44px high or have an equivalent touch target.
- The save status and publish state remain visible without crowding the website-name input.
- The empty canvas starts higher on the screen without losing essential status information.

Verified:
- The mobile editor controls now render as two rows: website selector/save status/new-site action, then website name/name-save/publish action.
- At 390px wide, visible product controls in the mobile header measured 44px high or larger, including the account menu, site menu, website selector, new-site button, name input, name-save button, and `Live zetten`.
- Browser verification showed no horizontal overflow at 390px wide.
- `npx tsc --noEmit` passed.

## Task 2: Make mobile section adding read like a tap-first flow

Status: Done
Priority: High
Likely files:
- `components/editor/sections-selector.tsx`
- `components/editor/editor-client.tsx`

Observed issue:
- The mobile `Secties` panel says `Sleep een sectie naar de gewenste plek`.
- The bottom of the section list says `Op mobiel kunt u secties naar het canvas slepen`.
- At 390px, the visible section cards look like list items and do not expose a clear `Toevoegen` action in the viewport.
- This conflicts with the expected phone behavior, where tapping should be the primary path and placement should be confirmed after selection.

Done when:
- Mobile copy says to tap a section to add it, not to drag it as the primary instruction.
- Every section card has a clear tap affordance that is understandable without reading hidden help text.
- After tapping a section, the placement step clearly explains where the section will go.
- Drag-and-drop can remain available, but it is not the only or most prominent mobile instruction.

Verified:
- The mobile `Secties` panel now says `Tik op een sectie om een plek te kiezen. Slepen kan ook.`
- Section cards are the mobile tap target again, without separate `Toevoegen` buttons.
- Tapping the `Intro bovenaan` section card opened the canvas placement prompt with `Waar wilt u Intro bovenaan plaatsen?`, the instruction `Kies eerst de plek. Daarna zetten we de sectie op het doek.`, and placement/cancel actions.
- Browser verification showed no horizontal overflow at 390px wide.
- `npx tsc --noEmit` passed.

## Task 3: Reduce nested mobile tabs in the style and site panels

Status: Done
Priority: Medium
Likely files:
- `components/editor/site-design-panel.tsx`
- `components/themes/theme-panel.tsx`
- `components/editor/editor-client.tsx`

Observed issue:
- The `Site` panel stacks multiple segmented controls: `Sectie/Site`, then `Thema/Sjablonen`, then `Thema's/Kleuren/Letters`.
- These tab buttons are about 29px high, which is small for repeated mobile use.
- The nested tabs push the actual choices far down the viewport and make the panel feel like settings inside settings.

Done when:
- Mobile shows one clear choice level at a time, or uses a single menu/sheet for secondary panel switching.
- Segmented controls have mobile-safe touch height.
- The active panel title and current mode are understandable without scanning three tab rows.
- The first actionable option in the panel appears earlier in the viewport.

Verified:
- The mobile `Stijl` panel now renders only the section-editing panel and no longer shows the `Sectie/Site` tab row.
- The mobile `Site` panel now uses a 44px `Site ontwerp` selector for `Thema aanpassen` versus `Sjabloon kiezen` instead of a segmented tab row.
- The mobile theme panel now uses a 44px selector for `Thema kiezen`, `Kleuren kiezen`, and `Letters kiezen` instead of a segmented tab row.
- Browser verification at 390px found no visible `role="tab"` or `role="tablist"` controls in the `Stijl` or `Site` mobile panels, no mode controls under 44px high, and no horizontal overflow.
- `npx tsc --noEmit` passed.

## Task 4: Give theme, color, and font lists enough visible space

Status: To do
Priority: High
Likely files:
- `components/themes/theme-panel.tsx`

Observed issue:
- In `Site > Thema`, the long theme list is squeezed into a very short internal scroll area while `Afstand` and `Hoeken` stay visible below it.
- `Kleuren` and `Letters` show the same pattern: only the first option is comfortably visible before the spacing and corner controls take over the screen.
- The internal list can scroll, but this is not obvious and makes comparing options slow on mobile.

Done when:
- Theme, color, and font choices get a dedicated mobile list area with enough height to compare several options at once.
- Spacing and corner controls are moved below the list, collapsed, or separated into their own mobile section.
- The selected option remains visible without hiding most of the available alternatives.
- The list can be scrolled without fighting the page or bottom navigation.

## Task 5: Fix template cards that sit too close to the viewport edge

Status: To do
Priority: Medium
Likely files:
- `components/editor/site-design-panel.tsx`
- `components/themes/theme-panel.tsx`

Observed issue:
- In `Site > Sjablonen`, template cards measured slightly wider than the 390px viewport content area.
- The cards do not create page-level horizontal scrolling, but their right edge and arrow icon sit tight against the viewport.
- This makes the template list look clipped compared with the rest of the editor panels.

Done when:
- Template cards fit within the same mobile content gutters as the rest of the editor.
- Right-side icons and focus rings are fully visible at 390px.
- Long template titles and descriptions wrap cleanly without pushing the card beyond the viewport.
- The template warning and list share the same horizontal alignment.

## Task 6: Protect scrollable panels from the fixed bottom navigation

Status: To do
Priority: High
Likely files:
- `components/editor/editor-client.tsx`
- `components/editor/site-design-panel.tsx`
- `components/themes/theme-panel.tsx`

Observed issue:
- The fixed bottom navigation is 66px high at the tested viewport.
- Long mobile panels can place the last visible card or choice under the bottom nav area.
- The template list showed lower items reaching behind the bottom navigation region.

Done when:
- Every mobile panel has bottom padding equal to the nav height plus safe-area spacing.
- The last item in `Secties`, `Site > Thema`, `Site > Kleuren`, `Site > Letters`, and `Site > Sjablonen` can scroll fully above the bottom nav.
- Focus outlines and active states are not clipped by the viewport bottom.
- The bottom nav remains fixed without covering actionable content.

## Task 7: Add a populated-page mobile verification pass

Status: To do
Priority: Medium
Likely files:
- `components/editor/editor-client.tsx`
- `components/editor/editor-canvas.tsx`
- `components/sections/*.editor.tsx`

Observed issue:
- This audit intentionally avoided saving or applying starter content, so it only covered the empty editor and mobile panels.
- The highest-risk mobile path is still a populated page: selecting a section, editing text, changing style, adding a section, and returning to the canvas.

Done when:
- A mobile verification pass covers a page with at least four sections.
- Tapping a canvas section opens the correct editor panel.
- Returning from `Stijl` or `Site` to `Doek` preserves the selected section context.
- Adding a section on mobile shows a clear placement step and the new section appears where expected.
- Verification confirms no horizontal overflow at 390px and no content hidden behind the bottom nav.
