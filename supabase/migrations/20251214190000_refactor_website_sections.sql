-- ============================================
-- Refactor website structure to normalized sections
-- ============================================

begin;

-- 1. Ensure required extension
create extension if not exists "pgcrypto";

-- 2. Websites table (remove sections column if it exists)
alter table if exists public.websites
  drop column if exists sections;

-- 3. Website sections table
create table if not exists public.website_sections (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,

  -- Order of the section on the page
  position integer not null,

  -- Section type (hero, gallery, about, contact_form, etc.)
  type text not null,

  -- Section-specific content (text, images, forms, etc.)
  content jsonb not null default '{}'::jsonb,

  -- Styling options (background, spacing, text alignment)
  styles jsonb not null default '{}'::jsonb,

  -- Transition from previous section (fade, wave, colorBlend, etc.)
  transition jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Indexes for performance
create index if not exists idx_website_sections_website_id
  on public.website_sections (website_id);

create index if not exists idx_website_sections_position
  on public.website_sections (website_id, position);

-- 5. Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_website_sections_updated_at on public.website_sections;

create trigger trg_website_sections_updated_at
before update on public.website_sections
for each row execute procedure public.set_updated_at();

commit;
