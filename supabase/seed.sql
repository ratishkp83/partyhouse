-- ============================================================
-- PartyHouse — Seed Data
-- Run in: Supabase → SQL Editor → New Query
--
-- BEFORE RUNNING:
--   1. Log in to the live site with your admin account
--   2. Go to Supabase → Table Editor → profiles
--   3. Copy your UUID from the 'id' column
--   4. Replace every occurrence of <YOUR_USER_UUID> below
--      (Ctrl+H in the SQL editor)
-- ============================================================

-- Set your admin user UUID here — replace this placeholder
-- Example: do $$ begin ... (see usage below)
-- Quick way: Ctrl+H → find '<YOUR_USER_UUID>' → replace with your UUID

-- ── Update your profile to 'host' role if not already ────────
-- (skip if you're already admin — admin includes host privileges)
-- update profiles set role = 'host' where id = '<YOUR_USER_UUID>';

-- ── Venue 1: Skyline Rooftop Lounge, Mumbai ──────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'Skyline Rooftop Lounge',
  'A stunning open-air rooftop in the heart of Bandra West with panoramic views of the Mumbai skyline and sea. The space features fairy lights, a full DJ setup, a stocked bar, and a dedicated dance floor. Perfect for birthday bashes, anniversary dinners, and group nights out. The terrace can be transformed into an intimate candlelit setting for couples or a high-energy party zone — the choice is yours.',
  'Rooftop / Terrace',
  'Mumbai',
  'Rooftop, Palm Court Building, Linking Road, Bandra West, Mumbai 400050',
  80,
  4500,
  6000,
  4,
  4000,
  15000,
  ARRAY['DJ / Sound', 'Party Lights', 'Bar Setup', 'High-speed WiFi', 'AC / Climate ctrl', 'Private / Gated', 'Parking', 'Photo Booth'],
  ARRAY['Birthday', 'Anniversary', 'Group', 'Night Out', 'Couple'],
  '🌃', '🌃 Rooftop / Terrace',
  true, true,
  4.8, 24,
  'Host: Demo Host | Phone: 9820012345 | Email: host@partyhouse.in
Experience: 3 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=false, adults_only=true
Noise cutoff: 1:00 AM
Parking: 20 spots
GST: 27XXXXX1234Z1ZX'
);

-- ── Venue 2: The Secret Garden, Mumbai ───────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'The Secret Garden',
  'A lush private garden in Powai, hidden behind high walls, completely shielded from the city noise. Sprawling 4,000 sq ft of manicured lawn with tall bamboo hedges, fairy-lit pergolas, and a cosy indoor lounge for when Mumbai rains decide to show up. Comes with a dedicated décor team, on-site catering coordinator, and a BBQ grill station. Families love us for milestone birthdays and reunion dinners.',
  'Garden / Lawn',
  'Mumbai',
  'Plot 14, Hiranandani Gardens, Powai, Mumbai 400076',
  120,
  5500,
  7500,
  5,
  5000,
  20000,
  ARRAY['Basic Décor', 'BBQ / Grill', 'Catering', 'Parking', 'High-speed WiFi', 'Ambience / LED', 'Changing rooms', 'Garden / Lawn'],
  ARRAY['Family', 'Birthday', 'Anniversary', 'Corporate', 'Group'],
  '🌳', '🌳 Garden / Lawn',
  true, false,
  4.6, 18,
  'Host: Demo Host | Phone: 9820012345 | Email: host@partyhouse.in
Experience: 5 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=true, adults_only=false
Noise cutoff: 11:00 PM
Parking: 40 spots
GST: 27XXXXX1234Z1ZX'
);

-- ── Venue 3: Azure Pool Villa, Mumbai ────────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'Azure Pool Villa',
  'An exclusive private pool villa in Juhu with a temperature-controlled 40ft infinity pool, sun deck, and a covered entertainment pavilion. The villa sleeps up to 10 and hosts up to 50 guests for events. Features a Sonos sound system, underwater LED pool lights, a fully equipped outdoor kitchen, and a bar counter. Available for pool parties, couple getaways, and intimate group celebrations.',
  'Pool Space',
  'Mumbai',
  '7A Juhu Scheme, Near Juhu Beach, Mumbai 400049',
  50,
  8000,
  11000,
  4,
  6000,
  30000,
  ARRAY['Pool', 'DJ / Sound', 'Bar Setup', 'Party Lights', 'Ambience / LED', 'BBQ / Grill', 'Parking', 'AC / Climate ctrl', 'Private / Gated', 'Changing rooms'],
  ARRAY['Pool Party', 'Couple', 'Birthday', 'Group', 'Anniversary'],
  '🏊', '🏊 Pool Space',
  true, false,
  4.9, 31,
  'Host: Demo Host | Phone: 9820012345 | Email: host@partyhouse.in
Experience: 4 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=false, adults_only=true
Noise cutoff: 12:00 AM
Parking: 15 spots
GST: 27XXXXX1234Z1ZX'
);

-- ── Venue 4: The Penthouse at 42, Mumbai ─────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'The Penthouse at 42',
  'A jaw-dropping duplex penthouse on the 41st and 42nd floors of a luxury tower in Lower Parel, with floor-to-ceiling glass walls overlooking the entire city. 3,500 sq ft of sleek marble interiors, a glass-balcony deck, private elevator access, and a home theatre. The space has hosted product launches, intimate weddings, and celebrity after-parties. Completely private — your own floor of a 42-storey tower.',
  'Penthouse',
  'Mumbai',
  '42nd Floor, One Avighna Park, Currey Road, Lower Parel, Mumbai 400013',
  60,
  15000,
  20000,
  4,
  8000,
  50000,
  ARRAY['DJ / Sound', 'Party Lights', 'Bar Setup', 'Photo Booth', 'Ambience / LED', 'High-speed WiFi', 'AC / Climate ctrl', 'Private / Gated', 'Parking', 'Projector / Screen'],
  ARRAY['Birthday', 'Anniversary', 'Corporate', 'Group', 'Night Out', 'Couple'],
  '🏙️', '🏙️ Penthouse',
  true, false,
  5.0, 9,
  'Host: Demo Host | Phone: 9820012345 | Email: host@partyhouse.in
Experience: 2 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=false, adults_only=true
Noise cutoff: 2:00 AM
Parking: 8 spots (valet)
GST: 27XXXXX1234Z1ZX'
);

-- ── Venue 5: Verdant Farmhouse, Bangalore ────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'Verdant Farmhouse',
  'A sprawling 2-acre farmhouse on the Bangalore–Mysore highway, just 45 minutes from the city. Features a large covered pavilion, an open bonfire area, a children''s play zone, a badminton court, and a fully stocked catering kitchen. The estate has a charming rustic aesthetic with exposed brick walls, wooden beams, and string lights throughout. Popular for family reunions, college group trips, and corporate offsite retreats.',
  'Farmhouse',
  'Bangalore',
  'Survey No. 48, Kanakapura Road, Harohalli, Bangalore Rural 562112',
  200,
  6000,
  8500,
  6,
  7000,
  25000,
  ARRAY['Catering', 'BBQ / Grill', 'Garden / Lawn', 'Parking', 'High-speed WiFi', 'Games Area', 'Basic Décor', 'Changing rooms', 'Wheelchair access'],
  ARRAY['Family', 'Group', 'Corporate', 'Birthday'],
  '🌾', '🌾 Farmhouse',
  true, false,
  4.7, 42,
  'Host: Demo Host | Phone: 9845098450 | Email: host2@partyhouse.in
Experience: 7 years hosting
Rules: alcohol=true, catering=true, smoking=true, pets=true, adults_only=false
Noise cutoff: 11:00 PM
Parking: 80 spots
GST: 29XXXXX5678Z1ZX'
);

-- ── Venue 6: The Glass House, Bangalore ──────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'The Glass House',
  'A breathtaking all-glass villa perched on a slope in Whitefield, surrounded by a landscaped garden. Natural light floods every corner by day; by night, the city lights create a magical backdrop. The interior is styled with mid-century modern furniture, a bespoke kitchen island, a wine cellar, and a rooftop deck. Ideal for romantic dinners, intimate anniversaries, and creative photoshoots that demand a cinematic backdrop.',
  'Villa / Bungalow',
  'Bangalore',
  '18 Emerald Isle, EPIP Zone, Whitefield, Bangalore 560066',
  35,
  9000,
  12000,
  4,
  5500,
  35000,
  ARRAY['Ambience / LED', 'Bar Setup', 'High-speed WiFi', 'AC / Climate ctrl', 'Private / Gated', 'Garden / Lawn', 'Parking', 'Photo Booth', 'Changing rooms'],
  ARRAY['Couple', 'Anniversary', 'Birthday', 'Group'],
  '🏡', '🏡 Villa / Bungalow',
  true, true,
  4.9, 15,
  'Host: Demo Host | Phone: 9845098450 | Email: host2@partyhouse.in
Experience: 3 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=false, adults_only=false
Noise cutoff: 12:00 AM
Parking: 10 spots
GST: 29XXXXX5678Z1ZX'
);

-- ── Venue 7: Imperial Banquet Hall, Delhi ────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'Imperial Banquet Hall',
  'A grand air-conditioned private hall in South Delhi with 5,000 sq ft of event space, a built-in stage, professional sound and lighting rig, and a dedicated catering kitchen. The hall can be divided into two independent spaces or opened fully for large gatherings. The décor team can transform it into any theme — Bollywood, vintage, minimalist or royal. Includes free valet parking for up to 60 cars.',
  'Private Hall',
  'Delhi',
  'B-12, Greater Kailash Part 1, New Delhi 110048',
  250,
  7000,
  9500,
  5,
  8000,
  40000,
  ARRAY['DJ / Sound', 'Party Lights', 'Projector / Screen', 'Catering', 'Pantry / Kitchen', 'AC / Climate ctrl', 'Parking', 'Wheelchair access', 'Basic Décor', 'Ambience / LED'],
  ARRAY['Birthday', 'Family', 'Corporate', 'Group', 'Anniversary'],
  '🎪', '🎪 Private Hall',
  true, false,
  4.5, 67,
  'Host: Demo Host | Phone: 9811098110 | Email: host3@partyhouse.in
Experience: 10 years hosting
Rules: alcohol=true, catering=true, smoking=false, pets=false, adults_only=false
Noise cutoff: 11:30 PM
Parking: 60 spots (valet)
GST: 07XXXXX9012Z1ZX'
);

-- ── Venue 8: Lotus Terrace, Delhi ────────────────────────────
insert into venues (
  host_id, name, description, venue_type, city, address,
  capacity, price_per_hour, weekend_rate, min_hours,
  cleaning_fee, security_deposit,
  amenities, occasions,
  cover_emoji, badge_label,
  is_active, is_instant_book,
  rating_avg, review_count,
  host_notes
) values (
  '<YOUR_USER_UUID>',
  'Lotus Terrace',
  'A stunning open rooftop venue in Hauz Khas Village, Delhi''s most eclectic neighbourhood, overlooking the Hauz Khas lake and the 13th-century fort ruins. The 2,800 sq ft terrace has an all-weather pergola, a modular bar setup, fairy-lit loungers, and a dedicated smoking lounge. Walk out to art galleries and restaurants below. The sunset view here is unmatched in the city — book it for golden hour and stay till midnight.',
  'Rooftop / Terrace',
  'Delhi',
  '3rd Floor, 19 Hauz Khas Village, New Delhi 110016',
  70,
  5500,
  7500,
  4,
  4500,
  20000,
  ARRAY['DJ / Sound', 'Bar Setup', 'Party Lights', 'Ambience / LED', 'High-speed WiFi', 'Private / Gated', 'Karaoke', 'Photo Booth'],
  ARRAY['Birthday', 'Group', 'Night Out', 'Anniversary', 'Couple'],
  '🌃', '🌃 Rooftop / Terrace',
  true, true,
  4.7, 38,
  'Host: Demo Host | Phone: 9811098110 | Email: host3@partyhouse.in
Experience: 4 years hosting
Rules: alcohol=true, catering=true, smoking=true, pets=false, adults_only=true
Noise cutoff: 1:00 AM
Parking: 12 spots (street + nearby paid lot)
GST: 07XXXXX9012Z1ZX'
);

-- ── Done ─────────────────────────────────────────────────────
-- You should now have 8 venues across Mumbai (4), Bangalore (2), Delhi (2)
-- covering all 7 venue types, with ratings, weekend rates, and full amenity sets.
--
-- To verify: select name, city, venue_type, is_active from venues order by city;
