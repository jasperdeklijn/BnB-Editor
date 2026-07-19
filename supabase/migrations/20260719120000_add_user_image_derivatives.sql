create table if not exists public.user_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  original_path text not null unique,
  thumbnail_path text unique,
  original_size bigint not null default 0 check (original_size >= 0),
  thumbnail_size bigint not null default 0 check (thumbnail_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_images_paths_owned check (
    original_path like user_id::text || '/%'
    and (thumbnail_path is null or thumbnail_path like user_id::text || '/%')
  )
);

create index if not exists idx_user_images_user_created
  on public.user_images (user_id, created_at desc);

drop trigger if exists set_user_images_updated_at on public.user_images;
create trigger set_user_images_updated_at
  before update on public.user_images
  for each row execute procedure public.set_updated_at();

alter table public.user_images enable row level security;

create policy "Users can view own image metadata"
  on public.user_images for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own image metadata"
  on public.user_images for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own image metadata"
  on public.user_images for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can delete own image metadata"
  on public.user_images for delete to authenticated
  using (user_id = auth.uid());
