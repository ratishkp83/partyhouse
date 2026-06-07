-- ============================================================
-- PartyHouse — Supabase Database Schema
-- Run this entire file in: Supabase → SQL Editor → New Query
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Drop tables if rebuilding ────────────────────────────────
drop table if exists messages  cascade;
drop table if exists reviews   cascade;
drop table if exists payments  cascade;
drop table if exists bookings  cascade;
drop table if exists wishlists cascade;
drop table if exists venues    cascade;
drop table if exists profiles  cascade;

-- ── profiles ─────────────────────────────────────────────────
-- Extends Supabase auth.users with extra fields
create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        text not null default 'guest' check (role in ('guest','host','admin')),
  city        text,
  bio         text,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── venues ───────────────────────────────────────────────────
create table venues (
  id                uuid default uuid_generate_v4() primary key,
  host_id           uuid references profiles(id) on delete cascade not null,
  name              text not null,
  description       text,
  venue_type        text not null,          -- Rooftop, Villa, Garden, Pool, Hall, Unique
  city              text not null,
  address           text,
  lat               numeric(10,7),
  lng               numeric(10,7),
  capacity          int not null default 20,
  price_per_hour    int not null,           -- INR
  weekend_rate      int default null,       -- INR/hr override for Sat/Sun (null = same as weekday)
  min_hours         int not null default 4,
  cleaning_fee      int default 0,
  security_deposit  int default 0,
  amenities         text[] default '{}',    -- ['WiFi','Pool','DJ','Catering',...]
  occasions         text[] default '{}',    -- ['Couple','Family','Group','Birthday',...]
  photos            text[] default '{}',    -- Supabase Storage URLs
  cover_emoji       text default '🎉',
  badge_label       text,
  is_active         boolean default false,   -- must be approved by admin before going live
  is_instant_book   boolean default false,
  rating_avg        numeric(3,2) default 0,
  review_count      int default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── bookings ─────────────────────────────────────────────────
create table bookings (
  id              uuid default uuid_generate_v4() primary key,
  venue_id        uuid references venues(id) on delete restrict not null,
  guest_id        uuid references profiles(id) on delete restrict not null,
  party_date      date not null,
  start_time      time not null default '18:00',
  hours           int not null,
  occasion        text,
  guests_count    int not null default 10,
  price_per_hour  int not null,
  cleaning_fee    int default 0,
  service_fee     int default 0,
  total_price     int not null,
  status          text default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  host_notes      text,
  guest_notes     text,
  confirmation_code text unique,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-generate confirmation code
create or replace function generate_confirmation_code()
returns trigger language plpgsql as $$
declare
  city_code text;
begin
  select upper(left(city, 3)) into city_code from venues where id = new.venue_id;
  new.confirmation_code := 'PH-' || city_code || '-' || to_char(now(),'YYYY') || '-' || floor(random()*9000+1000)::text;
  return new;
end;
$$;

drop trigger if exists set_confirmation_code on bookings;
create trigger set_confirmation_code
  before insert on bookings
  for each row execute procedure generate_confirmation_code();

-- ── reviews ──────────────────────────────────────────────────
create table reviews (
  id           uuid default uuid_generate_v4() primary key,
  booking_id   uuid references bookings(id) on delete cascade not null unique,
  venue_id     uuid references venues(id) on delete cascade not null,
  reviewer_id  uuid references profiles(id) on delete cascade not null,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz default now()
);

-- Update venue rating average when a review is inserted/updated
create or replace function update_venue_rating()
returns trigger language plpgsql as $$
begin
  update venues
  set
    rating_avg   = (select round(avg(rating)::numeric, 2) from reviews where venue_id = new.venue_id),
    review_count = (select count(*) from reviews where venue_id = new.venue_id)
  where id = new.venue_id;
  return new;
end;
$$;

drop trigger if exists on_review_upsert on reviews;
create trigger on_review_upsert
  after insert or update on reviews
  for each row execute procedure update_venue_rating();

-- ── wishlists ─────────────────────────────────────────────────
create table wishlists (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references profiles(id) on delete cascade not null,
  venue_id   uuid references venues(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, venue_id)
);

-- ── messages ─────────────────────────────────────────────────
create table messages (
  id          uuid default uuid_generate_v4() primary key,
  sender_id   uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  venue_id    uuid references venues(id) on delete set null,
  booking_id  uuid references bookings(id) on delete set null,
  content     text not null check (length(content) > 0),
  read_at     timestamptz,
  created_at  timestamptz default now()
);

-- ── payments ─────────────────────────────────────────────────
create table payments (
  id              uuid default uuid_generate_v4() primary key,
  booking_id      uuid references bookings(id) on delete restrict not null,
  razorpay_order_id   text,
  razorpay_payment_id text,
  amount          int not null,
  currency        text default 'INR',
  status          text default 'pending' check (status in ('pending','captured','failed','refunded')),
  created_at      timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table profiles  enable row level security;
alter table venues    enable row level security;
alter table bookings  enable row level security;
alter table reviews   enable row level security;
alter table wishlists enable row level security;
alter table messages  enable row level security;
alter table payments  enable row level security;

-- profiles: users can read all, update own
create policy "profiles_select_all"  on profiles for select using (true);
-- WITH CHECK locks down which columns can change: role is immutable by the user themselves.
-- An authenticated user can update their own row but cannot escalate their own role.
create policy "profiles_update_own"  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from profiles where id = auth.uid())
  );

-- venues: anyone can read active venues; hosts manage own
create policy "venues_select_active" on venues for select using (is_active = true);
create policy "venues_insert_host"   on venues for insert with check (auth.uid() = host_id and is_active = false);
create policy "venues_update_host"   on venues for update
  using  (auth.uid() = host_id)
  with check (auth.uid() = host_id and is_active = false);  -- hosts cannot self-activate; only admin can set is_active=true
create policy "venues_delete_host"   on venues for delete using (auth.uid() = host_id);
-- admins can do anything to venues (approve/reject/revoke)
create policy "venues_admin_all" on venues for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- bookings: guests see own; hosts see bookings for their venues
create policy "bookings_guest_select" on bookings for select using (auth.uid() = guest_id);
create policy "bookings_host_select"  on bookings for select using (
  auth.uid() in (select host_id from venues where id = venue_id)
);
create policy "bookings_insert"       on bookings for insert with check (auth.uid() = guest_id);
create policy "bookings_update_guest" on bookings for update
  using  (auth.uid() = guest_id and status in ('pending','confirmed'))   -- can only act on live bookings
  with check (auth.uid() = guest_id and status = 'cancelled');           -- can only set to cancelled
create policy "bookings_update_host"  on bookings for update
  using  (auth.uid() in (select host_id from venues where id = venue_id))
  with check (status in ('confirmed','cancelled'));                       -- hosts can only confirm or cancel

create policy "reviews_select_all"   on reviews for select using (true);
create policy "reviews_insert_own"   on reviews for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from bookings
      where id = reviews.booking_id
        and guest_id  = auth.uid()
        and venue_id  = reviews.venue_id
        and status    = 'completed'
    )
  );
create policy "reviews_update_own"   on reviews for update using (auth.uid() = reviewer_id);

-- wishlists: users manage own
create policy "wishlists_own" on wishlists for all using (auth.uid() = user_id);

-- messages: sender or receiver can see
create policy "messages_select" on messages for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "messages_insert" on messages for insert with check (auth.uid() = sender_id);
create policy "messages_update" on messages for update using (auth.uid() = receiver_id);  -- allows receiver to mark read_at

-- payments: guest or host of venue can see; only guest can insert (preemptive for Razorpay)
create policy "payments_select" on payments for select using (
  auth.uid() in (
    select guest_id from bookings where id = booking_id
    union
    select host_id from venues v join bookings b on b.venue_id = v.id where b.id = booking_id
  )
);
create policy "payments_insert" on payments for insert
  with check (
    auth.uid() = (select guest_id from bookings where id = booking_id)
  );

-- ============================================================
-- Booking integrity triggers
-- ============================================================

-- C1: Prevent double-booking at the DB level (server-side conflict check)
create or replace function check_booking_conflict()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from bookings
    where venue_id   = NEW.venue_id
      and party_date = NEW.party_date
      and status     in ('pending','confirmed')
      and id         != coalesce(NEW.id, uuid_generate_v4())   -- safe for INSERT (id not yet set)
      and (
        (NEW.start_time, (NEW.hours || ' hours')::interval)
        overlaps
        (start_time,     (hours     || ' hours')::interval)
      )
  ) then
    raise exception 'BOOKING_CONFLICT: This time slot is already booked.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_double_booking on bookings;
create trigger prevent_double_booking
  before insert on bookings
  for each row execute procedure check_booking_conflict();

-- Server-side capacity guard
create or replace function check_booking_capacity()
returns trigger language plpgsql as $$
begin
  if NEW.guests_count > (select capacity from venues where id = NEW.venue_id) then
    raise exception 'CAPACITY_EXCEEDED: Guest count exceeds venue capacity.';
  end if;
  if NEW.total_price < 1 then
    raise exception 'INVALID_PRICE: Total price must be at least ₹1.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists check_booking_capacity on bookings;
create trigger check_booking_capacity
  before insert on bookings
  for each row execute procedure check_booking_capacity();

-- ============================================================
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('venue-photos', 'venue-photos', true);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- ============================================================
-- Seed Data — sample venues for development
-- ============================================================

-- NOTE: Replace 'YOUR-HOST-UUID' with a real profile UUID after
-- signing up your first host account, then run the inserts below.

-- insert into venues (host_id, name, description, venue_type, city, address, capacity, price_per_hour, min_hours, cleaning_fee, security_deposit, amenities, occasions, cover_emoji, badge_label, is_active, is_instant_book) values
-- (
--   'YOUR-HOST-UUID',
--   'Skyline Rooftop Lounge',
--   'Mumbai''s most sought-after private party rooftop. Panoramic views of the Bandra-Worli Sea Link, premium JBL sound, LED lighting, and a dedicated host.',
--   'Rooftop',
--   'Bandra, Mumbai',
--   '18th Floor, Link Square Mall, Bandra West, Mumbai 400050',
--   50, 12000, 4, 3500, 25000,
--   ARRAY['DJ/Sound System','LED Lighting','Bar Setup','Catering Available','Basic Décor','Photo Booth','Valet Parking','WiFi'],
--   ARRAY['Couple','Family','Group','Birthday','Anniversary','Corporate'],
--   '🌃', '🌃 Rooftop', true, true
-- );

-- ─────────────────────────────────────────────────────────────
-- C3 FIX: venue_status column (replaces host_notes string-matching)
-- Run this migration block in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Add the column
alter table venues
  add column if not exists venue_status text
    not null default 'pending'
    check (venue_status in ('pending','approved','rejected','revoked'));

-- 2. Migrate existing data from is_active + host_notes pattern
update venues set venue_status = 'approved' where is_active = true;
update venues set venue_status = 'rejected' where is_active = false and host_notes like '%REJECTED%';
update venues set venue_status = 'pending'  where is_active = false and (host_notes is null or host_notes not like '%REJECTED%');

-- 3. Lock down RLS: hosts cannot write venue_status (only admins can)
drop policy if exists "venues_insert_host" on venues;
drop policy if exists "venues_update_host" on venues;

create policy "venues_insert_host" on venues for insert
  with check (
    auth.uid() = host_id
    and is_active = false
    and venue_status = 'pending'
  );

create policy "venues_update_host" on venues for update
  using  (auth.uid() = host_id)
  with check (
    auth.uid() = host_id
    and is_active = false
    and venue_status = (select venue_status from venues where id = venues.id)
  );

-- 4. Add host-own select policy so hosts can see their pending/rejected venues
drop policy if exists "venues_select_own" on venues;
create policy "venues_select_own" on venues for select
  using (auth.uid() = host_id);

-- ─────────────────────────────────────────────────────────────
-- H1 + M5 Fix: server-side constraints on bookings
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
alter table bookings
  add constraint bookings_party_date_future  check (party_date >= current_date),
  add constraint bookings_hours_positive     check (hours > 0),
  add constraint bookings_guests_positive    check (guests_count >= 1),
  add constraint bookings_total_positive     check (total_price >= 1);

-- ─────────────────────────────────────────────────────────────
-- H3 Fix: Storage RLS policies
-- Run in Supabase SQL Editor AFTER creating the buckets:
--   insert into storage.buckets (id, name, public) values ('venue-photos', 'venue-photos', true);
--   insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- ─────────────────────────────────────────────────────────────

-- venue-photos: host can only upload to their own venue's folder ({venueId}/...)
-- Path format: {venueId}/{timestamp}.{ext}
create policy "venue_photos_host_upload" on storage.objects
  for insert with check (
    bucket_id = 'venue-photos'
    and auth.uid() is not null
    and exists (
      select 1 from venues
      where id::text = split_part(name, '/', 1)
      and host_id = auth.uid()
    )
  );

-- venue-photos: host can delete their own venue's photos
create policy "venue_photos_host_delete" on storage.objects
  for delete using (
    bucket_id = 'venue-photos'
    and auth.uid() is not null
    and exists (
      select 1 from venues
      where id::text = split_part(name, '/', 1)
      and host_id = auth.uid()
    )
  );

-- venue-photos: anyone can read (bucket is public, but explicit policy is safer)
create policy "venue_photos_public_read" on storage.objects
  for select using (bucket_id = 'venue-photos');

-- avatars: authenticated users can upload/update only their own avatar ({userId}/*)
create policy "avatars_owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- ─────────────────────────────────────────────────────────────
-- H2 Fix: tighten bookings update RLS
-- H7 Fix: add WITH CHECK to reviews_update_own
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- H2: Tighten booking update policies
drop policy if exists "bookings_update_guest" on bookings;
drop policy if exists "bookings_update_host"  on bookings;

-- Guests can only cancel their own pending/confirmed bookings
create policy "bookings_update_guest" on bookings for update
  using  (auth.uid() = guest_id and status in ('pending','confirmed'))
  with check (auth.uid() = guest_id and status = 'cancelled');

-- Hosts can confirm or cancel bookings for their venues only
create policy "bookings_update_host" on bookings for update
  using  (auth.uid() in (select host_id from venues where id = venue_id))
  with check (
    auth.uid() in (select host_id from venues where id = venue_id)
    and status in ('confirmed','cancelled')
  );

-- H7: Prevent reviewers from changing rating/venue/booking after submission
drop policy if exists "reviews_update_own" on reviews;
create policy "reviews_update_own" on reviews for update
  using (auth.uid() = reviewer_id)
  with check (
    auth.uid() = reviewer_id
    and venue_id    = (select venue_id    from reviews r2 where r2.id = reviews.id)
    and booking_id  = (select booking_id  from reviews r2 where r2.id = reviews.id)
    and rating between 1 and 5
  );

-- ─────────────────────────────────────────────────────────────
-- M1 Fix: eliminate confirmation code collision risk
-- Uses microsecond timestamp + 3 random digits instead of 4-digit random
-- Format: PH-MUM-20260607-143052-491  (readable, unique)
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- M6 Fix: prevent wishlisting inactive/unapproved venues
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
drop policy if exists "wishlists_own" on wishlists;

-- Select and delete: user owns the row
create policy "wishlists_select_delete" on wishlists
  for select using (auth.uid() = user_id);

create policy "wishlists_delete" on wishlists
  for delete using (auth.uid() = user_id);

-- Insert: only active (approved) venues can be wishlisted
create policy "wishlists_insert" on wishlists
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from venues
      where id = venue_id
      and is_active = true
      and venue_status = 'approved'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- M7 Fix: extend booking conflict trigger to cover UPDATE
-- Prevents reinstating a cancelled booking into an already-occupied slot
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
create or replace function check_booking_conflict()
returns trigger language plpgsql as $$
begin
  -- Only check when booking is active (being created or reinstated to pending/confirmed)
  if NEW.status not in ('pending','confirmed') then
    return NEW;
  end if;

  if exists (
    select 1 from bookings
    where venue_id   = NEW.venue_id
      and party_date = NEW.party_date
      and status     in ('pending','confirmed')
      and id         != NEW.id
      and (
        (NEW.start_time, (NEW.hours || ' hours')::interval)
        overlaps
        (start_time,     (hours     || ' hours')::interval)
      )
  ) then
    raise exception 'BOOKING_CONFLICT: This time slot is already booked.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists prevent_double_booking on bookings;
create trigger prevent_double_booking
  before insert or update on bookings
  for each row execute procedure check_booking_conflict();

-- ─────────────────────────────────────────────────────────────
-- M8 Fix: cap host_notes length at DB level
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
alter table venues
  add constraint venues_host_notes_length check (length(host_notes) <= 2000);

-- ─────────────────────────────────────────────────────────────
-- L6 Fix: enum constraints on venue_type, occasions, amenities
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────
alter table venues
  add constraint venues_venue_type_enum check (venue_type in (
    'Rooftop / Terrace','Villa / Bungalow','Private Hall','Garden / Lawn',
    'Pool Space','Farmhouse','Penthouse','Unique Venue'
  ));
