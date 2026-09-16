# Review form editing

Select the Recensies section and choose Recensies verzamelen. Under Inhoud → Recensieformulier bewerken, edit the heading, introduction, field labels, submit button and empty-state text. Indeling offers six layouts and six style types. Section colours also apply to the form. Publish to make changes visible to visitors.

You can also click those texts directly on the canvas, including the Google button text and the collection empty-state text. Inline edits use the same update and undo flow as other sections. An embedded form that is hidden remains editable inside the expandable standalone-page preview. Actual customer submissions are managed under Beheer recensies; their original text and rating are not editable.

The section uses the shared section style wrapper, heading sizes, colour defaults, and background-image settings. Preview mode has no inline editing or live submission actions.

The section now contains the form directly on the website. The separate `/reviews/<websiteId>` page uses settings from the first published collection section. Draft settings do not leak to that page. Consent, confirmation and moderation requirements remain fixed.

Turn off **Formulier op website tonen** to show only published reviews on the website. Keep collection mode enabled and publish the change. The standalone page stays available with the same editable form settings; this is a visibility preference, not an access restriction. In the editor, expand the standalone-page preview to inspect the hidden form.

Under **Beheer recensies → Klanten uitnodigen → Uitnodigen per e-mail**, the owner's email app opens with a prepared invitation and review link. The owner chooses the recipient and sends it. Copying the collection link remains available as an alternative. FlexPagina does not send an invitation automatically when this button is clicked.

Ratings use required native radio buttons rendered as yellow stars, with mouse, touch and arrow-key support. FlexPagina attribution appears below the form. The editor and layout previews display an interactive example with submission and email actions disabled.

## Visibility repair

The public page loader now passes `websiteId` into every section renderer. Previously the reviews renderer received it in the editor only and could not load public reviews. The section also keeps its heading and displays loading, empty or unavailable feedback instead of disappearing when the API is unavailable.

The earlier business-link migration remains necessary for legacy websites. A read-only check during this change confirmed the affected website now has matching business links and `review_collection_live = true`.

## Inline editing verification (2026-09-16)

- In the authenticated local editor, changing the form heading on the canvas updated the matching sidebar field. Undo restored the original text.
- The hidden form can be expanded and edited without enabling it on the public website.
- 201 automated tests, TypeScript checking and targeted lint passed. Regression tests cover inline editing versus preview, hidden forms, Google buttons without a configured link, and section background settings.

No review, email, or publication was triggered by these checks.

## Earlier local verification

- Public website section and standalone review form both render with active submission controls.
- Editor title changes immediately update the canvas; the original title was restored after testing.
- Mouse and keyboard selection produce the matching number of yellow stars.
- Five stars remain on one row at 320px; public page checks at 320px and 390px found no horizontal overflow.
- 196 automated tests, TypeScript checking and targeted lint passed.

No test review or confirmation email was submitted during browser checks. Production deployment of these UI changes remains separate.
