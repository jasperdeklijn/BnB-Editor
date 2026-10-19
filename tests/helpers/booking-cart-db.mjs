import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
export const cartMigrationFile =
  "supabase/migrations/20261019090552_booking_cart_and_service_planning.sql"
const init = read("supabase/init.sql")
const table = (name, source = init) =>
  source.match(
    new RegExp(
      `create table (?:if not exists )?public\\.${name} \\([\\s\\S]*?\\n\\);`,
    ),
  )[0]
export async function bookingCartDb() {
  const db = new PGlite()
  await setupBookingCartDb(db)
  return db
}

export async function setupBookingCartDb(db) {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
    create table public.businesses(id uuid primary key,user_id uuid references auth.users(id));
    create table public.websites(id uuid primary key,user_id uuid references auth.users(id),published boolean,live_snapshot jsonb);
    create table public.website_sections(id uuid primary key default gen_random_uuid(),website_id uuid references public.websites(id),type text,content jsonb);
    create table public.subscriptions(user_id uuid,booking_addon_active boolean,status text,current_period_end timestamptz);
    create function public.temporary_gold_access_enabled() returns boolean language sql stable as $$ select coalesce(current_setting('test.gold',true),'off')='on' $$;
    create table public.services(id uuid primary key,business_id uuid references public.businesses(id),title text,price text default '');
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    ${table("contact_requests")}
    ${table("contact_request_messages")}
    ${table("calendar_entries")}
    ${table("calendar_availability_windows")}
  `)
  for (const file of [
    "20260801120000_add_service_booking_settings.sql",
    "20260801130000_add_public_booking_holds.sql",
    "20260801140000_add_booking_lifecycle.sql",
  ])
    await db.exec(read(`supabase/migrations/${file}`))
  const financial = read(
    "supabase/migrations/20260802140000_add_reservation_invoicing.sql",
  )
  await db.exec(`${table("booking_reservation_financials", financial)}
    create table public.booking_invoices(id uuid primary key default gen_random_uuid(),calendar_entry_id uuid references public.calendar_entries(id));
    ${financial.match(/create or replace function public\.ensure_booking_reservation_financial\(\)[\s\S]*?\$\$;/)[0]}
    create trigger ensure_booking_reservation_financial_trigger after insert or update of status on public.calendar_entries for each row execute function public.ensure_booking_reservation_financial();
    grant usage on schema public,auth to authenticated,service_role;
    grant select,insert,update,delete on all tables in schema public to authenticated,service_role;
    grant execute on all functions in schema public to authenticated,service_role;
    alter table public.services enable row level security;
    create policy owner_services on public.services to authenticated using (business_id in(select id from public.businesses where user_id=auth.uid())) with check (business_id in(select id from public.businesses where user_id=auth.uid()));
  `)
  await db.exec(read(cartMigrationFile))
}
