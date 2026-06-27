# Website Management Tasks

Use this file as the task list for the next website management, domain, onboarding, alert, and saving-state refactor. Keep the app buildable after every task.

## Tasks

1. [ ] Let users create multiple websites

   Allow each user to create and manage multiple websites, while only one website can be hosted live at a time.

   Done when:
   - A user can create more than one website in their account.
   - Website lists, selectors, and editor entry points clearly show which website is being edited.
   - Only one website can be marked as hosted/live at the same time.
   - Trying to host a second website explains that the current live website must be changed or disabled first.

2. [ ] Let domain settings choose one of the user's own websites

   Update domain settings so a user can select one of their own websites and generate both preview and live domain versions for it.

   Done when:
   - Domain settings include a selector with only websites owned by the current user.
   - Selecting a website creates or shows a preview domain in the format `preview-mywebsite.domainname.nl`.
   - Selecting a website creates or shows a live domain in the format `mywebsite.domainname.nl`.
   - Preview and live domain states are clearly labeled and cannot be confused.

3. [ ] Support removing custom domains and explain DNS records

   Extend the custom domain page so users can remove domain names after adding them to Vercel, and add a DNS setup tutorial.

   Done when:
   - Users can remove a custom domain from the app.
   - Removing a custom domain also removes or disconnects the matching Vercel domain configuration.
   - Domain removal has a clear confirmation step and consistent success/error feedback.
   - The DNS records area includes a step-by-step tutorial for how to add the required records at a domain provider.
   - The tutorial explains which record type, name, value, and verification state the user should check.

4. [ ] Start a tutorial when no sections are filled

   When a website has no filled sections, offer the user a tutorial to get started.

   Done when:
   - Empty websites or pages detect that no sections contain user content.
   - The editor shows a clear tutorial entry point instead of an empty or confusing canvas.
   - Starting the tutorial guides the user through adding or filling the first useful sections.
   - The tutorial can be skipped or dismissed without blocking normal editing.

5. [ ] Make all alerts consistent with the style guide

   Standardize all alert, toast, banner, confirmation, success, warning, and error states using `docs/style-guide.md`.

   Done when:
   - Alerts use the deep green style system, spacing, borders, typography, and button treatment from `docs/style-guide.md`.
   - Success, warning, danger, and neutral alerts have consistent color usage and icon placement.
   - Alert copy is direct, practical, and consistent across the app.
   - Existing one-off alert styles are replaced or moved to shared components.

6. [ ] Use the navbar saving state for all saving

   Centralize save feedback so all save operations use the saving state in the navbar.

   Done when:
   - Page, section, theme, domain, settings, and website save operations update the navbar saving state.
   - Users can see when changes are saving, saved, failed, or waiting to retry without needing page-specific duplicate indicators.
   - Save errors still provide enough local context to fix the problem.
   - Old inconsistent save indicators are removed or connected to the shared navbar state.
