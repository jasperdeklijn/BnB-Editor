begin;

-- Existing assets remain ready. Pending reservations consume the same atomic
-- 500 MiB account quota while their originals and posters upload directly.
alter table public.user_images
  add column if not exists upload_status text not null default 'ready'
  check (upload_status in ('pending', 'ready'));

update storage.buckets set
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
where id = 'user-images';

commit;
