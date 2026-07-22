-- Keep the default locale protected during normal locale management, while
-- allowing it to be removed by the website foreign-key cascade.
create or replace function public.protect_default_website_locale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
     and old.is_default
     and exists (select 1 from public.websites where id = old.website_id) then
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
