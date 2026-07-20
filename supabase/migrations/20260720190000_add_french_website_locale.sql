begin;

alter table public.website_locales
  drop constraint if exists website_locales_locale_check;
alter table public.website_locales
  add constraint website_locales_locale_check
  check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR'));

alter table public.business_translations
  drop constraint if exists business_translations_locale_check;
alter table public.business_translations
  add constraint business_translations_locale_check
  check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR'));

alter table public.service_translations
  drop constraint if exists service_translations_locale_check;
alter table public.service_translations
  add constraint service_translations_locale_check
  check (locale in ('nl-NL', 'en-GB', 'de-DE', 'fr-FR'));

commit;
