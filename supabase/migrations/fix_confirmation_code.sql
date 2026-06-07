-- ============================================================
-- L4 Fix: Confirmation code format (microsecond timestamp)
-- Run once in: Supabase → SQL Editor → New Query
-- ============================================================
-- Old format: PH-MUM-2026-4831     (year + 4 random digits — collision-prone)
-- New format: PH-MUM-20260607-143052-491  (date + HHMMSS + 3 random digits)
-- ============================================================

create or replace function generate_confirmation_code()
returns trigger language plpgsql as $$
declare
  city_code text;
begin
  select upper(left(city, 3)) into city_code from venues where id = new.venue_id;
  new.confirmation_code :=
    'PH-' || city_code
    || '-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')
    || '-' || floor(random()*900+100)::text;
  return new;
end;
$$;

-- Trigger already exists (set_confirmation_code), function replacement is enough.
-- Verify it's wired correctly:
-- select tgname, tgtype from pg_trigger where tgrelid = 'bookings'::regclass;
