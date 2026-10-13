# Temporary free access (superseded)

The temporary Gold/all-add-ons override was ended on 13 October 2026 at the user's explicit request. `DEFAULT_ALL_FEATURES_INCLUDED` is false and stored active/trial/paid-through canceled plans plus active add-on flags now control rights. No existing subscription data was rewritten. Missing/inactive accounts have Bronze base rights; existing live content is preserved.

Deploy `20261013131134_pricing_visitor_analytics.sql` alongside the application so service/review database gates match TypeScript. See [the rollout runbook](pricing-analytics-rollout.md) for privacy, billing and downgrade details. Earlier migration files remain immutable historical records of the free-access period.
