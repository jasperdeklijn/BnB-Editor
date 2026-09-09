# FlexPagina subscription plans

All catalog prices are monthly in EUR, excluding VAT. `lib/pricing.ts` is the application source of truth.

| Plan or add-on | Price |
| --- | --- |
| Bronze | €7.95/month |
| Silver | €14.95/month |
| Gold | €24.95/month |
| Booking & Facturatie | + €14.95/month |
| Multilanguage add-on | + €2.99/month |
| Multilanguage with Gold | Included |

## Base plans

- **Bronze:** professional responsive website, custom domain support and SSL, SEO, contact form, up to 6 sections.
- **Silver:** everything in Bronze, up to 10 sections, gallery, reviews, FAQ, opening hours, pricing sections, CTA and enquiries. Existing WhatsApp contact support remains available.
- **Gold:** everything in Silver, unlimited sections, extensive features, service management, multilingual website and priority support.

## Add-ons

**Booking & Facturatie** is optional on every plan, including Gold, for €14.95/month. It includes online bookings, availability, booking management, automatic confirmations, invoices from bookings, PDF invoices, customer details and invoice history. Service management is available through the add-on so Bronze and Silver customers can configure their bookable services. It does not increase section limits or unlock unrelated Silver features. Generic enquiries remain distinct from availability-confirmed reservations. Invoices are generated from actual bookings; this add-on is not a separate accounting system or payment processor.

**Multilanguage** costs €2.99/month on Bronze or Silver and is included with Gold. Enabling it on Gold adds no charge.

Examples: Bronze + Booking & Facturatie is €22.90/month; Silver + both add-ons is €32.89/month; Gold + Booking & Facturatie is €39.90/month.

## Deployment and billing

Apply `supabase/migrations/20260908140000_add_booking_subscription_addon.sql` before deploying code that reads `subscriptions.booking_addon_active`. Fresh installs have the same column in `supabase/init.sql`. The column is server-owned under the existing subscription RLS policies; clients cannot purchase or grant themselves access.

For rolling deployments, the subscription loader retries without `booking_addon_active` only when the database reports that specific column missing. The editor and billing pages remain available, with booking disabled until the migration and entitlement are present. Other database errors still fail explicitly.

Apply `20260909120000_service_management_entitlements.sql` for service-management RLS enforcement. The editor services page and all four service mutation actions check Gold or an active Booking & Facturatie add-on. Restrictive insert/update/delete policies also enforce this for direct database clients, in addition to existing business ownership policies. Existing service reads remain available. The database helper mirrors the existing temporary Gold fallback and can handle the booking column being absent. These database policies remain enforced even when the application `PLAN_ENFORCEMENT_MODE` is set to `off` or `warn`; the application switch alone cannot bypass service write restrictions.

Existing rows default to booking disabled. Existing Gold customers therefore require an explicit booking entitlement before booking can continue under this model. Review affected customers before rollout; this migration does not enroll or charge anyone automatically. Existing reservations remain stored.

An active/trial subscription, or a canceled subscription still within its paid-through period, receives booking access only when `booking_addon_active` is true. Missing, past-due and expired subscriptions do not receive booking through the temporary Gold base-plan fallback.

`current_price` remains the base subscription amount; billing adds each active add-on once. Gold never adds a multilingual charge. The payment-provider integration is still a placeholder, and plan/add-on purchase controls remain disabled. No provider prices, live subscriptions or charges were changed by this implementation.

Release checks: apply the migration, verify owner-only subscription reads and service-role-only writes, test authenticated editor/publish and public booking with and without the add-on on every plan, then configure provider checkout and reconciliation before enabling purchases.
