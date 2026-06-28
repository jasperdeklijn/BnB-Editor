# Editor Refactor Tasks

Use this file as the task list for the next `/editor` refactor. Keep the app buildable after every task.

## Tasks

1. [x] Style all editor pages with the style guide

   Apply the rules from `docs/style-guide.md` across every `/editor` page and editor-related view.

   Done when:
   - Editor pages use the deep green palette centered on `#385344`.
   - Buttons, cards, headers, forms, borders, and empty states follow the shared style guide.
   - Old blue/purple landing or editor styling is removed from the editor UI unless explicitly needed.

2. [x] Make the left sidebar compatible with collapse

   Refactor the left editor sidebar so it works cleanly in expanded and collapsed states.

   Done when:
   - Sidebar labels, icons, active states, and tooltips work in both states.
   - Collapsing does not break navigation, selection, drag/drop, or section controls.
   - The collapsed state keeps stable widths and does not shift the canvas unexpectedly.

3. [x] Match editor page layouts so they all look the same

   Standardize the layout structure for all `/editor` pages.

   Done when:
   - Every editor page uses the same page shell, spacing, header pattern, and content width.
   - Page titles, descriptions, action buttons, cards, and forms follow one consistent structure.
   - Moving between editor pages feels like one product area instead of separate one-off pages.

4. [x] Make `/editor` the main editor page everything returns to

   Treat `/editor` as the central editor dashboard and return target.

   Done when:
   - Primary editor navigation, back links, cancel links, and completion flows return to `/editor` unless a more specific next step is required.
   - `/editor` clearly acts as the central starting point for editing the website.
   - Related editor pages link back to `/editor` using consistent labels and placement.

5. [x] Give every section 6 layout options

   Add six layout variants for every editable section type.

   Done when:
   - Each section exposes exactly six layout choices in the editor.
   - Layout choices are named consistently across sections.
   - Switching layouts preserves section content and only changes presentation.
   - Public rendering and editor preview both use the selected layout.

6. [x] Use theme page settings as default component styling

   Make the settings from `/editor/themes` drive default styling for components.

   Done when:
   - New and existing sections inherit the selected palette, font pair, radius, and spacing defaults.
   - Component-level overrides still work when supported.
   - Theme defaults are applied consistently in editor preview, public site, and preview routes.

7. [x] Make the styling sidebar correspond to the selected section

   Update the styling sidebar so it reflects the currently selected section.

   Done when:
   - Selecting a section updates the styling controls to that section's supported settings.
   - Unsupported controls are hidden or disabled clearly.
   - Editing style values updates the selected section preview immediately.
   - Switching sections does not leak styling state between different sections.

8. [x] Make every page mobile friendly

   This is the final task and should be done after the desktop editor refactor is stable.

   Done when:
   - Every `/editor` page works on mobile viewport sizes.
   - Sidebar, canvas, section selector, settings panels, forms, and dialogs are usable on touch devices.
   - Text does not overflow buttons, cards, panels, or navigation.
   - No page has horizontal overflow on common mobile widths.
   - Mobile behavior is verified after all previous editor refactor tasks are complete.

9. [x] Add theme preset switching to the main editor

   Surface the existing theme presets directly inside `/editor` so users can change the whole website style without leaving the canvas.

   Done when:
   - The main editor exposes theme presets alongside section editing.
   - Selecting a preset updates the editor preview immediately.
   - Theme changes still save through the existing theme API.

10. [x] Add live template previews to the main editor

   Let users inspect template structure and sample content before applying a template.

   Done when:
   - `/editor` shows visual template previews for the available business categories.
   - Each preview communicates the template sections and example services.
   - The preview UI works in the editor without routing through a separate templates page.

11. [x] Add a one-click apply-to-site template flow

   Allow templates to be applied to the selected website from the main editor with a clear confirmation step.

   Done when:
   - Applying a template targets the currently selected website.
   - The confirmation preview states which sections and services will be replaced.
   - After applying, the main editor reloads the updated website and returns to the canvas.
