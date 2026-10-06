-- Raise account-wide image storage to 500 MiB, including thumbnails.
-- Keep the existing trigger, owner isolation and transaction lock intact.
create or replace function public.enforce_user_image_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  used_bytes bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 981723));
  select coalesce(sum(original_size + thumbnail_size), 0)
    into used_bytes
    from public.user_images
    where user_id = new.user_id and id <> new.id;
  if used_bytes + new.original_size + new.thumbnail_size > 524288000 then
    raise exception 'USER_IMAGE_QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
