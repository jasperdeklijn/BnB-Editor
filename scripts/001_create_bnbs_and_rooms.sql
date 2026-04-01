-- ============================================================
-- 001: Create bnbs and rooms tables
-- Each user owns exactly one BnB (upsert on user_id).
-- Each room belongs to a BnB.
-- ============================================================

-- ---- bnbs ----
create table if not exists public.bnbs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default '',
  tagline       text not null default '',
  description   text not null default '',
  street        text not null default '',
  city          text not null default '',
  postal        text not null default '',
  country       text not null default '',
  checkin_time  text not null default '15:00',
  checkout_time text not null default '11:00',
  max_guests    integer,
  languages     text not null default '',
  website_url   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

-- ---- rooms ----
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  bnb_id      uuid not null references public.bnbs(id) on delete cascade,
  name        text not null default '',
  description text not null default '',
  price       text not null default '',
  max_guests  integer,
  images      jsonb not null default '[]'::jsonb,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- updated_at triggers ----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bnbs_updated_at on public.bnbs;
create trigger set_bnbs_updated_at
  before update on public.bnbs
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
  before update on public.rooms
  for each row execute procedure public.set_updated_at();

-- ---- RLS for bnbs ----
alter table public.bnbs enable row level security;

drop policy if exists "Users can view own bnb" on public.bnbs;
create policy "Users can view own bnb"
  on public.bnbs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own bnb" on public.bnbs;
create policy "Users can insert own bnb"
  on public.bnbs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own bnb" on public.bnbs;
create policy "Users can update own bnb"
  on public.bnbs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own bnb" on public.bnbs;
create policy "Users can delete own bnb"
  on public.bnbs for delete
  using (auth.uid() = user_id);

-- ---- RLS for rooms ----
alter table public.rooms enable row level security;

drop policy if exists "Users can view own rooms" on public.rooms;
create policy "Users can view own rooms"
  on public.rooms for select
  using (
    exists (
      select 1 from public.bnbs
      where bnbs.id = rooms.bnb_id
        and bnbs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own rooms" on public.rooms;
create policy "Users can insert own rooms"
  on public.rooms for insert
  with check (
    exists (
      select 1 from public.bnbs
      where bnbs.id = rooms.bnb_id
        and bnbs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own rooms" on public.rooms;
create policy "Users can update own rooms"
  on public.rooms for update
  using (
    exists (
      select 1 from public.bnbs
      where bnbs.id = rooms.bnb_id
        and bnbs.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own rooms" on public.rooms;
create policy "Users can delete own rooms"
  on public.rooms for delete
  using (
    exists (
      select 1 from public.bnbs
      where bnbs.id = rooms.bnb_id
        and bnbs.user_id = auth.uid()
    )
  );
