-- ============================================================
-- Session 23 — Scale & Security Fixes
-- Run in: Supabase → SQL Editor → New Query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- H3 Fix: Server-side price recomputation trigger
-- Overwrites client-submitted price fields with values computed
-- from the venues table — prevents totalPrice:1 manipulation.
-- ─────────────────────────────────────────────────────────────
create or replace function recompute_booking_price()
returns trigger language plpgsql security definer as $$
declare
  v_price_per_hour  int;
  v_weekend_rate    int;
  v_cleaning_fee    int;
  v_day_of_week     int;
  effective_rate    int;
  subtotal          int;
  service_fee       int;
begin
  -- Fetch authoritative pricing from venues table
  select price_per_hour, weekend_rate, cleaning_fee
    into v_price_per_hour, v_weekend_rate, v_cleaning_fee
    from venues
    where id = NEW.venue_id;

  -- Apply weekend rate if party_date falls on Saturday (6) or Sunday (0)
  v_day_of_week := extract(dow from NEW.party_date);
  effective_rate := case
    when v_day_of_week in (0, 6) and v_weekend_rate is not null and v_weekend_rate > 0
    then v_weekend_rate
    else v_price_per_hour
  end;

  subtotal    := effective_rate * NEW.hours;
  service_fee := round((subtotal + coalesce(v_cleaning_fee, 0)) * 0.08);

  -- Overwrite client-submitted prices with server-computed values
  NEW.price_per_hour := effective_rate;
  NEW.cleaning_fee   := coalesce(v_cleaning_fee, 0);
  NEW.service_fee    := service_fee;
  NEW.total_price    := subtotal + coalesce(v_cleaning_fee, 0) + service_fee;

  return NEW;
end;
$$;

drop trigger if exists recompute_booking_price on bookings;
create trigger recompute_booking_price
  before insert on bookings
  for each row execute procedure recompute_booking_price();


-- ─────────────────────────────────────────────────────────────
-- C1 Fix: Enforce message content length at DB level
-- Max 2000 characters — prevents storage DoS
-- ─────────────────────────────────────────────────────────────
alter table messages
  drop constraint if exists messages_content_length;

alter table messages
  add constraint messages_content_length check (length(content) between 1 and 2000);


-- ─────────────────────────────────────────────────────────────
-- H1 Fix: DB-level message rate limiting
-- Blocks more than 20 messages per sender per minute (cross-tab safe)
-- ─────────────────────────────────────────────────────────────
create or replace function check_message_rate()
returns trigger language plpgsql security definer as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
    from messages
    where sender_id  = NEW.sender_id
      and created_at > now() - interval '1 minute';

  if recent_count >= 20 then
    raise exception 'RATE_LIMIT: Too many messages. Please wait before sending more.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists check_message_rate on messages;
create trigger check_message_rate
  before insert on messages
  for each row execute procedure check_message_rate();


-- ─────────────────────────────────────────────────────────────
-- M1 Fix: Ensure venue city is never blank (breaks confirmation code)
-- ─────────────────────────────────────────────────────────────
alter table venues
  drop constraint if exists venues_city_nonempty;

alter table venues
  add constraint venues_city_nonempty check (length(trim(city)) >= 2);

-- Also harden the confirmation code trigger to default gracefully
create or replace function generate_confirmation_code()
returns trigger language plpgsql as $$
declare
  city_code text;
begin
  select upper(left(trim(city), 3)) into city_code from venues where id = new.venue_id;
  -- M1: fall back to 'XXX' if city is null, empty, or shorter than 3 chars
  city_code := coalesce(nullif(city_code, ''), 'XXX');
  new.confirmation_code :=
    'PH-' || city_code
    || '-' || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')
    || '-' || floor(random()*900+100)::text;
  return new;
end;
$$;
