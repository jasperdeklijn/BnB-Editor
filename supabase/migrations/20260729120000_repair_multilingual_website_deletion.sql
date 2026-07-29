-- Keep the default locale protected during direct locale management, while
-- allowing the foreign-key cascade that runs when its website is deleted.
create or replace function public.protect_default_website_locale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
     and old.is_default
     and pg_trigger_depth() = 1 then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_enabled then
    raise exception 'The default website locale cannot be removed or disabled';
  end if;
  if tg_op = 'UPDATE' and old.is_default and not new.is_default
     and coalesce(current_setting('app.allow_default_locale_change', true), '') <> 'on' then
    raise exception 'Use set_website_default_locale to change the default locale';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
