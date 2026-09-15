# Review form editing

Select the Recensies section and choose Recensies verzamelen. Under Inhoud → Recensieformulier bewerken, edit the heading, introduction, field labels, submit button and empty-state text. Indeling offers six layouts and six style types. Section colours also apply to the form. Publish to make changes visible to visitors.

The section now contains the form directly on the website. The separate `/reviews/<websiteId>` page uses settings from the first published collection section. Draft settings do not leak to that page. Consent, confirmation and moderation requirements remain fixed.

Ratings use required native radio buttons rendered as yellow stars, with mouse, touch and arrow-key support. FlexPagina attribution appears below the form. The editor and layout previews display an interactive example with submission and email actions disabled.

## Visibility repair

The public page loader now passes `websiteId` into every section renderer. Previously the reviews renderer received it in the editor only and could not load public reviews. The section also keeps its heading and displays loading, empty or unavailable feedback instead of disappearing when the API is unavailable.

The earlier business-link migration remains necessary for legacy websites. A read-only check during this change confirmed the affected website now has matching business links and `review_collection_live = true`.

## Verified locally

- Public website section and standalone review form both render with active submission controls.
- Editor title changes immediately update the canvas; the original title was restored after testing.
- Mouse and keyboard selection produce the matching number of yellow stars.
- Five stars remain on one row at 320px; public page checks at 320px and 390px found no horizontal overflow.
- 196 automated tests, TypeScript checking and targeted lint passed.

No test review or confirmation email was submitted during browser checks. Production deployment of these UI changes remains separate.
