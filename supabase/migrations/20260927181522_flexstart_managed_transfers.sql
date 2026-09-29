-- Managed service requests, not import history. Uploaded JSON is never retained.
create table public.website_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_email text not null default '',
  source_url text not null check (length(source_url) <= 2000 and source_url ~ '^https?://'),
  business_name text not null check (length(business_name) between 1 and 160),
  business_type text not null, services text not null, city text not null, service_area text not null,
  primary_goal text not null check (primary_goal in ('calls','requests','bookings')),
  appearance text not null default '', preferred_colors text not null default '', preserve_notes text not null default '',
  customer_notes text not null default '', logo_image_id uuid references public.user_images(id) on delete set null,
  permission_confirmed_at timestamptz not null default now(),
  free_slot integer not null unique check (free_slot between 1 and 100),
  status text not null default 'requested' check (status in ('requested','processing','checking','ready','corrections','approved','published')),
  website_id uuid unique references public.websites(id) on delete set null,
  revision integer not null default 0,
  ready_at timestamptz, approved_at timestamptz, approved_version uuid,
  review_requested_at timestamptz, reviewed_at timestamptz, reviewed_version uuid, review_findings text not null default '',
  published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index website_transfer_queue on public.website_transfer_requests(status, created_at);
create index website_transfer_logo on public.website_transfer_requests(logo_image_id);
create table public.website_transfer_private (
  transfer_request_id uuid primary key references public.website_transfer_requests(id) on delete cascade,
  internal_notes text not null default '' check (length(internal_notes) <= 6000)
);
create table public.website_transfer_feedback (
  id uuid primary key default gen_random_uuid(),
  transfer_request_id uuid not null references public.website_transfer_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (length(btrim(message)) between 1 and 6000),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create index website_transfer_feedback_request on public.website_transfer_feedback(transfer_request_id, created_at);
create index website_transfer_feedback_owner on public.website_transfer_feedback(user_id);
create table public.website_check_evidence (
  website_id uuid primary key references public.websites(id) on delete cascade,
  tested_version uuid, tested_at timestamptz
);
alter table public.website_transfer_requests enable row level security;
alter table public.website_transfer_private enable row level security;
alter table public.website_transfer_feedback enable row level security;
alter table public.website_check_evidence enable row level security;
revoke all on public.website_transfer_requests, public.website_transfer_private, public.website_transfer_feedback, public.website_check_evidence from anon, authenticated;
grant select on public.website_transfer_requests, public.website_transfer_feedback, public.website_check_evidence to authenticated;
grant all on public.website_transfer_requests, public.website_transfer_private, public.website_transfer_feedback, public.website_check_evidence to service_role;
create policy transfer_owner_read on public.website_transfer_requests for select to authenticated using (user_id = (select auth.uid()));
create policy transfer_feedback_owner_read on public.website_transfer_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy check_owner_read on public.website_check_evidence for select to authenticated using (
  exists(select 1 from public.websites w where w.id = website_id and w.user_id = (select auth.uid()))
);

-- A monotonic counter is retained after account deletion: the first 100 customers, not 100 concurrent requests.
create table public.website_transfer_offer (singleton boolean primary key default true check(singleton), claimed integer not null default 0 check(claimed between 0 and 100));
insert into public.website_transfer_offer values (true, 0);
alter table public.website_transfer_offer enable row level security;
revoke all on public.website_transfer_offer from anon, authenticated;
grant all on public.website_transfer_offer to service_role;
create or replace function public.claim_transfer_offer() returns trigger language plpgsql security invoker set search_path = public as $$
declare slot integer;
begin
  update public.website_transfer_offer set claimed = claimed + 1 where singleton and claimed < 100 returning claimed into slot;
  if slot is null then raise exception 'FLEXSTART_FULL'; end if;
  new.free_slot := slot;
  return new;
end; $$;
revoke all on function public.claim_transfer_offer() from public, anon, authenticated;
create trigger claim_transfer_offer before insert on public.website_transfer_requests for each row execute function public.claim_transfer_offer();

-- All writes are server-only; p_actor/p_admin are supplied only after getUser + trusted isAdmin.
create or replace function public.transition_transfer_request(
  p_id uuid, p_revision integer, p_action text, p_message text, p_version uuid, p_actor uuid, p_admin boolean
) returns void language plpgsql security invoker set search_path = public as $$
declare r public.website_transfer_requests; v uuid;
begin
  -- Website lock comes first, matching publication and draft-edit triggers.
  select w.draft_version into v from public.websites w join public.website_transfer_requests t on t.website_id = w.id where t.id = p_id for update of w;
  select * into r from public.website_transfer_requests where id = p_id for update;
  if not found or r.revision <> p_revision then raise exception 'STALE_REQUEST'; end if;
  if p_actor is null or (not p_admin and r.user_id <> p_actor) then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_action in ('start','ready','resolve','review','notes') and not p_admin then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_action in ('approve','correct','request_review') and (p_admin or r.user_id <> p_actor) then raise exception 'Owner action required'; end if;
  if length(p_message) > 6000 then raise exception 'Message too long'; end if;
  if p_action in ('approve','review','ready','resolve') and (v is null or v is distinct from p_version) then raise exception 'STALE_DESIGN'; end if;
  case p_action
    when 'start' then
      if r.status <> 'requested' then raise exception 'Invalid transition'; end if;
      update public.website_transfer_requests set status = 'processing' where id = p_id;
    when 'notes' then
      insert into public.website_transfer_private values (p_id, p_message) on conflict (transfer_request_id) do update set internal_notes = excluded.internal_notes;
    when 'ready', 'resolve' then
      if r.status not in ('checking','corrections') then raise exception 'Invalid transition'; end if;
      update public.website_transfer_feedback set resolved_at = now() where transfer_request_id = p_id and resolved_at is null;
      update public.website_transfer_requests set status = 'ready', ready_at = now(), approved_at = null, approved_version = null where id = p_id;
    when 'approve' then
      if r.status <> 'ready' then raise exception 'Invalid transition'; end if;
      update public.website_transfer_requests set status = 'approved', approved_at = now(), approved_version = v where id = p_id;
    when 'correct' then
      if r.status not in ('ready','approved') or length(btrim(p_message)) < 1 then raise exception 'Invalid correction'; end if;
      if exists(select 1 from public.website_transfer_feedback where transfer_request_id = p_id) then raise exception 'Included correction round already used'; end if;
      insert into public.website_transfer_feedback(transfer_request_id,user_id,message) values(p_id,p_actor,p_message);
      update public.website_transfer_requests set status = 'corrections', approved_at = null, approved_version = null, reviewed_at = null, reviewed_version = null where id = p_id;
    when 'request_review' then
      if r.website_id is null or r.status not in ('ready','approved','checking') then raise exception 'Invalid transition'; end if;
      update public.website_transfer_requests set review_requested_at = now() where id = p_id;
    when 'review' then
      if r.status not in ('checking','ready','approved') or length(btrim(p_message)) < 1 then raise exception 'Review findings required'; end if;
      if not exists(select 1 from public.website_check_evidence where website_id = r.website_id and tested_version = v) then raise exception 'Form test required'; end if;
      update public.website_transfer_requests set reviewed_at = now(), reviewed_version = v, review_findings = p_message where id = p_id;
    else raise exception 'Invalid action';
  end case;
  update public.website_transfer_requests set revision = revision + 1, updated_at = now() where id = p_id;
end; $$;
revoke all on function public.transition_transfer_request(uuid,integer,text,text,uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.transition_transfer_request(uuid,integer,text,text,uuid,uuid,boolean) to service_role;

create or replace function public.create_transfer_design(
  p_design_id uuid, p_title text, p_theme jsonb, p_sections jsonb, p_assets jsonb, p_request_id uuid, p_revision integer
) returns uuid language plpgsql security invoker set search_path = public as $$
declare r public.website_transfer_requests; b uuid; item jsonb; ordinal bigint;
begin
  select * into r from public.website_transfer_requests where id = p_request_id for update;
  if not found or r.revision <> p_revision or r.status not in ('processing','checking','corrections') or r.permission_confirmed_at is null then raise exception 'Invalid transfer'; end if;
  if p_design_id is null or length(btrim(p_title)) not between 1 and 200 or jsonb_typeof(p_sections) is distinct from 'array'
    or jsonb_array_length(p_sections) not between 1 and 40 or jsonb_typeof(p_assets) is distinct from 'array'
    or jsonb_array_length(p_assets) > 8 or jsonb_typeof(p_theme) is distinct from 'object' then raise exception 'Invalid design'; end if;
  select id into b from public.businesses where user_id = r.user_id order by created_at limit 1;
  if b is null then raise exception 'Customer business required'; end if;
  insert into public.websites(id,user_id,business_id,title,slug,theme_config,published,live_snapshot)
    values(p_design_id,r.user_id,b,btrim(p_title),'site-' || p_design_id::text,p_theme,false,null);
  for item, ordinal in select value, ordinality from jsonb_array_elements(p_sections) with ordinality loop
    if item->>'type' not in ('nav','hero','about','gallery','features','faq','cta') or jsonb_typeof(item->'data') is distinct from 'object' or jsonb_typeof(item->'styles') is distinct from 'object' then raise exception 'Invalid section'; end if;
    insert into public.website_sections(id,website_id,position,type,content,styles)
      values((item->>'id')::uuid,p_design_id,ordinal,item->>'type',item->'data',item->'styles');
  end loop;
  for item in select value from jsonb_array_elements(p_assets) loop
    if item->>'original_path' is distinct from r.user_id::text || '/originals/' || (item->>'id') || '.webp'
      or item->>'thumbnail_path' is distinct from r.user_id::text || '/thumbnails/' || (item->>'id') || '.webp'
      or (item->>'original_size')::bigint not between 1 and 5242880 or (item->>'thumbnail_size')::bigint not between 1 and 1048576 then raise exception 'Invalid asset'; end if;
    insert into public.user_images(id,user_id,display_name,original_path,thumbnail_path,original_size,thumbnail_size)
      values((item->>'id')::uuid,r.user_id,item->>'display_name',item->>'original_path',item->>'thumbnail_path',(item->>'original_size')::bigint,(item->>'thumbnail_size')::bigint);
  end loop;
  update public.website_transfer_requests set website_id = p_design_id, status = 'checking', revision = revision + 1,
    approved_at = null, approved_version = null, reviewed_at = null, reviewed_version = null, ready_at = null, updated_at = now() where id = p_request_id;
  return p_design_id;
end; $$;
revoke all on function public.create_transfer_design(uuid,text,jsonb,jsonb,jsonb,uuid,integer) from public, anon, authenticated;
grant execute on function public.create_transfer_design(uuid,text,jsonb,jsonb,jsonb,uuid,integer) to service_role;

-- Protect the existing publication RPC and direct table writes alike.
create or replace function public.guard_transfer_publication() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.website_transfer_requests;
begin
  select * into r from public.website_transfer_requests where website_id = new.id for update;
  if not found then return new; end if;
  if new.draft_version is distinct from old.draft_version then
    update public.website_transfer_requests set approved_at = null, approved_version = null, reviewed_at = null, reviewed_version = null,
      status = case when status in ('ready','approved','published') then 'checking' else status end,
      revision = revision + 1, updated_at = now() where id = r.id;
  end if;
  if new.published and (not old.published or new.live_snapshot is distinct from old.live_snapshot) then
    if r.status not in ('approved','published') or r.approved_version is distinct from new.draft_version or r.reviewed_version is distinct from new.draft_version then
      raise exception 'FlexStart: klantgoedkeuring en FlexReview voor het actuele concept zijn vereist.' using errcode = '42501';
    end if;
    if not exists(select 1 from public.website_check_evidence where website_id = new.id and tested_version = new.draft_version) then raise exception 'FlexStart: testaanvraag vereist.'; end if;
    update public.website_transfer_requests set status = 'published', published_at = now(), revision = revision + 1, updated_at = now() where id = r.id;
  elsif old.published and not new.published then
    update public.website_transfer_requests set status = 'checking', approved_at = null, approved_version = null,
      reviewed_at = null, reviewed_version = null, revision = revision + 1, updated_at = now() where id = r.id;
  end if;
  return new;
end; $$;
revoke all on function public.guard_transfer_publication() from public, anon, authenticated;
create trigger zz_guard_transfer_publication before update on public.websites for each row execute function public.guard_transfer_publication();

-- Deleting a linked draft must leave the request available for a replacement import.
create or replace function public.reset_transfer_deleted_design() returns trigger language plpgsql set search_path = public as $$
begin
  if old.website_id is not null and new.website_id is null then
    new.status := 'processing';
    new.approved_at := null; new.approved_version := null;
    new.reviewed_at := null; new.reviewed_version := null;
    new.ready_at := null; new.published_at := null;
    new.revision := old.revision + 1; new.updated_at := now();
  end if;
  return new;
end; $$;
revoke all on function public.reset_transfer_deleted_design() from public, anon, authenticated;
create trigger reset_transfer_deleted_design before update of website_id on public.website_transfer_requests
  for each row execute function public.reset_transfer_deleted_design();

-- A direct change to a private form destination also invalidates the test/review.
create or replace function public.bump_transfer_form_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.recipient_email is not distinct from old.recipient_email then return null; end if;
  update public.websites set draft_version = gen_random_uuid()
    where id = case when tg_op = 'DELETE' then old.website_id else new.website_id end;
  return null;
end; $$;
revoke all on function public.bump_transfer_form_version() from public, anon, authenticated;
create trigger bump_transfer_form_version after insert or update or delete on public.website_form_destinations
  for each row execute function public.bump_transfer_form_version();

create or replace function public.prepare_transfer_design(p_id uuid, p_revision integer, p_version uuid, p_content jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare r public.website_transfer_requests; w public.websites; s uuid; contact_id uuid; service_id_value uuid; service_ids jsonb := '[]'; title_value text; kind text; content_value jsonb; pos integer;
begin
  select sites.* into w from public.websites sites join public.website_transfer_requests t on t.website_id = sites.id where t.id = p_id for update of sites;
  select * into r from public.website_transfer_requests where id = p_id for update;
  if r.id is null or w.id is null or r.revision <> p_revision or w.draft_version is distinct from p_version
    or r.status not in ('checking','corrections') or w.user_id <> r.user_id then raise exception 'Stale design'; end if;
  if jsonb_typeof(p_content->'services') is distinct from 'array' or jsonb_array_length(p_content->'services') not between 1 and 30 then raise exception 'Invalid services'; end if;
  for title_value in select jsonb_array_elements_text(p_content->'services') loop
    if length(btrim(title_value)) not between 1 and 160 then raise exception 'Invalid service title'; end if;
    select id into service_id_value from public.services where business_id = w.business_id and title = title_value order by created_at limit 1;
    if service_id_value is null then
      insert into public.services(business_id,title,description,position) values(w.business_id,title_value,'',0) returning id into service_id_value;
    end if;
    service_ids := service_ids || jsonb_build_array(service_id_value);
  end loop;
  foreach kind in array array['contact','services','footer','cta'] loop
    select id into s from public.website_sections where website_id = w.id and type = kind order by position limit 1;
    if s is null then s := gen_random_uuid(); end if;
    case kind
      when 'contact' then
        contact_id := s;
        content_value := jsonb_build_object('title','Neem contact op','email',p_content->>'email','recipientEmail',p_content->>'email','phone',p_content->>'phone','address',p_content->>'city');
      when 'services' then content_value := jsonb_build_object('title','Onze diensten','businessId',w.business_id,'serviceIds',service_ids);
      when 'footer' then content_value := jsonb_build_object('companyName',p_content->>'name','showLinks',true,'showCompanyInfo',true,'email',p_content->>'email','phone',p_content->>'phone','address',p_content->>'city',
        'columns',jsonb_build_array(jsonb_build_object('title','Informatie','links',jsonb_build_array(jsonb_build_object('label','Privacyverklaring','href',p_content->>'privacyUrl')))));
      when 'cta' then content_value := jsonb_build_object('title','Meer weten?','primaryCtaEnabled',true,'primaryCtaText','Neem contact op','primaryCtaHref','#section-' || contact_id::text);
    end case;
    select coalesce(max(position),0)+1 into pos from public.website_sections where website_id = w.id;
    insert into public.website_sections(id,website_id,position,type,content,styles) values(s,w.id,pos,kind,content_value,'{}')
      on conflict(id) do update set content = public.website_sections.content || excluded.content;
  end loop;
  update public.websites set seo = coalesce(seo,'{}') || jsonb_build_object('title',p_content->>'seoTitle','description',p_content->>'seoDescription') where id = w.id;
end; $$;
revoke all on function public.prepare_transfer_design(uuid,integer,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.prepare_transfer_design(uuid,integer,uuid,jsonb) to service_role;
