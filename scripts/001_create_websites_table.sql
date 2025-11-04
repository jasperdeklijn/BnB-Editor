-- Create websites table for storing BnB website data
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My BnB Website',
  slug text not null unique,
  sections jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.websites enable row level security;

-- RLS Policies for websites table
create policy "Users can view their own websites"
  on public.websites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own websites"
  on public.websites for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own websites"
  on public.websites for update
  using (auth.uid() = user_id);

create policy "Users can delete their own websites"
  on public.websites for delete
  using (auth.uid() = user_id);

-- Policy to allow anyone to view published websites
create policy "Anyone can view published websites"
  on public.websites for select
  using (published = true);

-- Create index on slug for faster lookups
create index if not exists websites_slug_idx on public.websites(slug);

-- Create index on user_id for faster user queries
create index if not exists websites_user_id_idx on public.websites(user_id);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_websites_updated_at
  before update on public.websites
  for each row
  execute function public.update_updated_at_column();
