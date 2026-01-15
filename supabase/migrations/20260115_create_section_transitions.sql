-- Create section_transitions table to store transitions between sections
create table if not exists section_transitions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  from_section_id uuid not null references website_sections(id) on delete cascade,
  to_section_id uuid not null references website_sections(id) on delete cascade,
  transition jsonb default null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint unique_from_to unique(from_section_id, to_section_id)
);

-- Add indexes for faster queries
create index idx_section_transitions_website_id on section_transitions(website_id);
create index idx_section_transitions_from_section on section_transitions(from_section_id);
create index idx_section_transitions_to_section on section_transitions(to_section_id);
