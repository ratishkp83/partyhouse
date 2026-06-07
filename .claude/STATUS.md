# PartyHouse — Session Handoff Document
**Last updated:** 2026-06-07 (Session 20)  
**Live URL:** https://ratishkp83.github.io/partyhouse/  
**Repo:** https://github.com/ratishkp83/partyhouse  
**Supabase project:** https://hxeskohikmtpzfrmovot.supabase.co  

---

## 1. Project Overview

PartyHouse is a party venue booking platform — a purpose-specific alternative to Airbnb focused on celebration spaces. Hourly pricing, occasion-based filtering, venue types: Rooftop / Villa / Garden / Pool / Hall / Farmhouse / Penthouse / Unique.

**Target users:** Couples, families, groups booking venues for parties  
**Tech stack:** Vanilla HTML/CSS/JS (no framework) · Supabase (Postgres + Auth + Storage) · GitHub Pages (hosting, migrating to Cloudflare Pages later)  
**Design:** Warm off-white light theme · Plus Jakarta Sans + Inter fonts · Terracotta accent (#e8450a)

---

## 2. Infrastructure Status

| Service | Status | Details |
|---|---|---|
| GitHub Pages | ✅ Live | https://ratishkp83.github.io/partyhouse/ |
| Supabase DB | ✅ Live | Schema deployed, RLS hardened (Session 20 security pass) |
| Email auth | ✅ Working | Sign up / login functional |
| Google OAuth | ✅ Done | Redirect URI already in Google Cloud Console |
| Supabase Storage | ✅ Done | Buckets `venue-photos` and `avatars` created, RLS policies applied |
| Admin RLS | ✅ Fixed | `venues_admin_all` policy applied; admin role set on profile |
| Messages RLS | ✅ Fixed | `messages_update` policy applied (allows receivers to mark read) |
| Edge Function `notify` | ✅ Deployed | Auth-guarded, HTML-escaped templates. Handles new_venue / approved / rejected / revoked |
| Seed data | ✅ Ready to run | `supabase/seed.sql` — 8 venues across Mumbai, Bangalore, Delhi. Replace `<YOUR_USER_UUID>` and run in SQL Editor. |
| Razorpay payments | ❌ Blocked | Need Razorpay account + API keys before starting |
| Cloudflare Pages | ⏸ Parked | Migrate only after site is fully tested. Plan in §9. |

---

## 3. File Structure

```
partyhouse/
├── index.html                          # ~1,350 lines — entire SPA, all pages as divs
├── app.js                              # ~1,430 lines — all UI logic, page routing, wizard
├── supabase.js                         # ~700 lines  — all DB/auth calls, Notify helper
├── styles.css                          # ~755 lines  — full design system
├── schema.sql                          # ~430 lines  — Postgres schema + RLS + triggers + migrations
├── favicon.svg
├── supabase/
│   ├── seed.sql                        # 8 seed venues — run in Supabase SQL Editor
│   ├── DEPLOY.md                       # Edge Function deployment guide
│   └── functions/
│       └── notify/
│           ├── index.ts                # Email Edge Function (auth-guarded, HTML-escaped)
│           └── config.toml
└── .claude/
    └── STATUS.md                       # this file
```

### Pages in index.html (each is a `div.page#page-{id}`)
| Page ID | Description |
|---|---|
| `home` | Hero search + featured venues + host CTA |
| `search` | Filter panel + venue grid |
| `listing` | Venue detail + availability calendar + booking widget |
| `booking` | Multi-step booking flow (summary → guest details → payment) |
| `trips` | Guest's booking history |
| `wishlist` | Saved venues |
| `dashboard` | Host dashboard (their venues + bookings table) |
| `new-listing` | 8-step venue listing wizard |
| `messages` | Inbox sidebar + chat panel (real-time via Supabase) |
| `auth` | Login / signup |
| `admin` | Admin review panel (pending / approved / rejected tabs) |
| `editListingOverlay` | Edit listing modal (4-tab: Basics / Pricing / Rules & Amenities / Occasions) |

---

## 4. Supabase Schema Summary

### Tables
- **profiles** — extends auth.users; fields: `full_name`, `phone`, `avatar_url`, `role` (guest/host/admin), `city`, `bio`
- **venues** — `name`, `description`, `venue_type`, `city`, `address`, `capacity`, `price_per_hour`, `weekend_rate` (Sat/Sun override), `min_hours`, `cleaning_fee`, `security_deposit`, `amenities[]`, `occasions[]`, `photos[]`, `cover_emoji`, `is_active`, `venue_status` (pending/approved/rejected/revoked), `is_instant_book`, `rating_avg`, `review_count`
- **bookings** — `venue_id`, `guest_id`, `party_date`, `start_time`, `hours`, `occasion`, `guests_count`, `total_price`, `status` (pending/confirmed/cancelled/completed), `confirmation_code`
- **reviews** — `booking_id`, `venue_id`, `reviewer_id`, `rating`, `comment`
- **wishlists** — `user_id`, `venue_id`
- **messages** — `sender_id`, `receiver_id`, `venue_id`, `booking_id`, `content`, `read_at`
- **payments** — `booking_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status`

### Key DB behaviours
- Profile auto-created on signup via `handle_new_user()` trigger
- Booking `confirmation_code` auto-generated via trigger (format: `PH-MUM-20260607-143052-491`)
- `rating_avg` and `review_count` on venues auto-updated via `update_venue_rating()` trigger
- `prevent_double_booking` trigger fires on `INSERT OR UPDATE` — checks time slot conflicts
- All tables have RLS enabled and hardened (see §6)

### `venue_status` values (added Session 20 — replaces host_notes string-matching)
| Value | Meaning |
|---|---|
| `pending` | Submitted, awaiting admin review |
| `approved` | Live and bookable (`is_active = true`) |
| `rejected` | Admin rejected; host can edit and resubmit |
| `revoked` | Was approved, taken offline by admin |

---

## 5. Supabase JavaScript API (supabase.js)

```js
Auth.signUp(email, password, fullName)
Auth.signIn(email, password)
Auth.signInWithGoogle()
Auth.signOut()
Auth.getProfile(userId)
Auth.updateProfile(updates)      // role is immutable — enforced by RLS WITH CHECK
Auth.requireAuth(action)         // shows toast + redirects to auth if not logged in

Venues.getAll({ city, occasion, minCapacity, maxPrice, type })
Venues.getById(id)
Venues.getFeatured()
Venues.create(venueData)
Venues.update(id, updates)       // auth-guarded
Venues.getHostVenues()
Venues.uploadPhoto(file, venueId)

Bookings.create(venueId, { partyDate, startTime, hours, occasion, guestsCount, totalPrice, ... })
Bookings.getMyBookings()
Bookings.getHostBookings()
Bookings.updateStatus(bookingId, status)
Bookings.cancel(bookingId)
Bookings.getVenueAvailability(venueId)

Reviews.getForVenue(venueId)
Reviews.create(bookingId, venueId, rating, comment)

Wishlist.toggle(venueId, heartBtn)
Wishlist.getAll()
Wishlist.getIds()

Messages.send(receiverId, content)
Messages.getConversation(otherUserId)
Messages.getInbox()              // capped at 200 rows
Messages.getUnreadCount()
Messages.markRead(senderId)
Messages.subscribe(otherUserId, callback)

Notify.venueApproved(venueId, adminNote)   // calls Edge Function (admin JWT required)
Notify.venueRejected(venueId, reason)      // calls Edge Function (admin JWT required)
Notify.venueRevoked(venueId)              // calls Edge Function (admin JWT required)
```

### Global state
```js
currentUser        // Supabase auth user object, null if logged out
currentProfile     // profiles row, null if logged out
selectedVenueData  // currently open venue object (app.js)
VALID_VENUE_TYPES  // ['Rooftop / Terrace', 'Villa / Bungalow', ...] — enum constants
VALID_OCCASIONS    // ['Couple', 'Family', 'Birthday', ...] — enum constants
VALID_AMENITIES    // ['DJ / Sound', 'Party Lights', ...] — enum constants
```

---

## 6. Security Status — Session 20: Full Adversarial Review Complete ✅

Session 20 was a dedicated security hardening session. A full adversarial code review identified 25 findings across all severities. All 25 are resolved.

### All findings and their fixes

| # | Severity | Issue | Fix | Commits |
|---|---|---|---|---|
| C1 | 🔴 Critical | Role escalation via `updateProfile` — `profiles_update_own` had no `WITH CHECK` | Added `WITH CHECK (role = current role)` to RLS policy | `5049d7b` |
| C2 | 🔴 Critical | Edge Function `notify` had no auth — anyone could send fraudulent emails | Added `assertAdmin()` JWT verification; DB webhook path exempt | `422f339`, `2f65b38` |
| C3 | 🔴 Critical | `host_notes` string-matching (`REJECTED`) used as venue status flag — hosts could clear it | Added `venue_status` column with DB enum constraint; removed all string-matching | `6c6e6b9` |
| C4 | 🔴 Critical | `cover_emoji` rendered unescaped into `innerHTML` in 5 places — stored XSS | Wrapped all renders in `escHtml()`; added `sanitiseEmoji()` on save | `5f6da56` |
| H1 | 🟠 High | `confirmPayment()` didn't re-validate date — past dates accepted via devtools | Re-validate in `confirmPayment()`; DB `CHECK (party_date >= current_date)` | `05c74e1` |
| H2 | 🟠 High | Host booking update `WITH CHECK` missing `auth.uid()` binding | Tightened both guest and host booking update policies | `05c74e1` |
| H3 | 🟠 High | Storage buckets had no RLS policies | Added upload/delete/read policies for `venue-photos` and `avatars` | `05c74e1` |
| H4 | 🟠 High | `Messages.getInbox()` fetched all messages with no limit | Added `.limit(200)` | `05c74e1` |
| H5 | 🟠 High | Hosts couldn't view their own inactive venues (`venues_select_active` blocked them) | Added `venues_select_own` policy (done in C3 migration) | `6c6e6b9` |
| H6 | 🟠 High | User values injected raw into email HTML templates | Added `esc()` helper in Edge Function; all values escaped | `422f339` |
| H7 | 🟠 High | `reviews_update_own` had no `WITH CHECK` — reviewers could change rating/venue post-submission | Added `WITH CHECK` locking venue_id, booking_id, rating range | `05c74e1` |
| M1 | 🟡 Medium | Confirmation code 4-digit random — collision-prone at scale (birthday paradox) | Replaced with timestamp + 3-digit random: `PH-MUM-20260607-143052-491` | `9e00261` |
| M2 | 🟡 Medium | `rateLabel` mixed raw `<span>` HTML with dynamic values in `innerHTML` | Separated text from badge HTML; `escHtml()` on all numeric values | `c307d8e` |
| M3 | 🟡 Medium | Cleaning fee `\|\|3500` treated `0` as falsy — showed ₹3,500 for free-cleaning venues | Changed to `?? 0` | `05c74e1` |
| M4 | 🟡 Medium | `Venues.update()` missing `Auth.requireAuth()` guard — TypeError on expired session | Added guard | `865be55` |
| M5 | 🟡 Medium | No server-side validation on `hours`, `guests_count`, `total_price` | Added DB `CHECK` constraints | `05c74e1` |
| M6 | 🟡 Medium | Wishlist RLS allowed saving inactive/unapproved venues | Split policy — insert requires `is_active = true AND venue_status = 'approved'` | `2525b62` |
| M7 | 🟡 Medium | `prevent_double_booking` trigger only fired on `INSERT` — status reinstatement bypass | Extended trigger to `BEFORE INSERT OR UPDATE` | `fdeaf30` |
| M8 | 🟡 Medium | `host_notes` grew unbounded via append-on-every-admin-action | Capped at 2000 chars in JS (DB column doesn't exist in live DB) | `f5cca76` |
| L1 | 🟢 Low | Anon key hardcoded in public JS | Accepted risk — standard Supabase client pattern | — |
| L2 | 🟢 Low | Calendar `calNextMonth()` had no upper bound | Capped at 18 months ahead | `a413be4` |
| L3 | 🟢 Low | No CSP headers | Added `<meta http-equiv="Content-Security-Policy">` to `index.html` | `a413be4` |
| L4 | 🟢 Low | `adminRevoke()` didn't email host | Added `Notify.venueRevoked()` call and Edge Function handler | `a413be4` |
| L5 | 🟢 Low | Host profile UUID exposed in public venue card joins | Removed `id` and `avatar_url` from unauthenticated `getFeatured`/`getAll` joins | `a413be4` |
| L6 | 🟢 Low | `venue_type`, `occasions`, `amenities` had no enum constraints | DB `CHECK` constraint on `venue_type`; JS sanitisation of arrays on submit | `a413be4` |

---

## 7. What Was Built (complete feature list)

| Feature | Status |
|---|---|
| Full SPA routing (goPage) | ✅ |
| Supabase auth — email + Google OAuth | ✅ |
| Venue browse + search + filters | ✅ |
| Venue detail page | ✅ |
| Availability calendar (month-view, booked dates blocked, time conflict check) | ✅ |
| Weekend rate pricing (Sat/Sun auto-switch, visual label) | ✅ |
| Multi-step booking flow (3 steps) | ✅ |
| Razorpay payment | ❌ Blocked on account |
| My Bookings (trips page) | ✅ |
| Wishlist / saved venues | ✅ |
| Host Dashboard (venues + bookings table + metrics) | ✅ |
| Edit Listing (4-tab modal, pre-filled, re-review on name/desc change) | ✅ |
| 8-step venue listing wizard | ✅ |
| Admin panel (pending/approved/rejected tabs, approve/reject/revoke) | ✅ |
| Admin email notifications (Edge Function + Resend, auth-guarded) | ✅ |
| Messaging UI (inbox + chat + real-time + unread badge) | ✅ |
| Contact Host button on listing page | ✅ |
| Seed data (8 venues, 3 cities) | ✅ Ready to run |
| Security hardening (25 findings fixed) | ✅ Session 20 |

---

## 8. Razorpay Integration Plan (when unblocked)

### Architecture
```
Browser → Edge Function (create-order) → Razorpay API → returns order_id
Browser loads Razorpay checkout with order_id
User pays → Razorpay webhook → Edge Function (verify-payment) → updates payments table
```

### Files to create/change
1. `supabase.js` — add `Payments.createOrder(bookingId, amount)` and `Payments.verify(paymentData)`
2. `app.js` — wire `confirmPayment()` to call `Payments.createOrder`, open Razorpay modal, handle success/failure
3. New: `supabase/functions/create-order/index.ts`
4. New: `supabase/functions/verify-payment/index.ts` (+ webhook handler)

When you have Razorpay keys, share the **Key ID** (`rzp_test_...`) and Claude will build the full integration.

---

## 9. Cloudflare Pages Migration Plan (post-testing)

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect GitHub → `ratishkp83/partyhouse`
2. Build settings: Framework = None, Build command = (empty), Output = `/`
3. Deploy → get URL like `partyhouse.pages.dev`
4. In Supabase → Auth → URL Configuration → update Site URL + Redirect URLs
5. Update Google OAuth Authorised redirect URIs to add new domain

No code changes needed — pure static files. When on Cloudflare, move the CSP from the `<meta>` tag to a response header for stronger enforcement.

---

## 10. Design System Reference

```css
/* Palette */
--bg:       #faf8f5   /* page background */
--surface:  #ffffff   /* cards, modals */
--surface2: #f4f1ec   /* inputs, secondary surfaces */
--border:   #e8e2d9
--text:     #1a1410
--muted:    #7a7068
--accent:   #e8450a   /* primary CTA — terracotta */
--accent-h: #c93a08   /* hover state */
--accent2:  #f0892a   /* gradient end */
--success:  #0a8a5c
--warn:     #d97706

/* Typography */
--font-d: 'Plus Jakarta Sans'   /* display / headings */
--font-b: 'Inter'               /* body / UI */

/* Border radius */
--r-sm: 6px  --r-md: 12px  --r-lg: 18px  --r-xl: 24px  --r-pill: 999px
```

---

## 11. How to Resume in a New Claude Session

Paste this at the start of the new session:

> "I'm resuming work on PartyHouse, a party venue booking platform. GitHub: https://github.com/ratishkp83/partyhouse · Live: https://ratishkp83.github.io/partyhouse/ · Supabase: https://hxeskohikmtpzfrmovot.supabase.co · Please clone the repo and read `.claude/STATUS.md` before we continue."

Then tell Claude what you want next — e.g. Razorpay integration, Cloudflare migration, or a new feature.

**GitHub token scope needed:** `repo` only. Create at: https://github.com/settings/tokens/new

---

## 12. Session History

| Session | Date | What was done |
|---|---|---|
| 1 | 2026-06 | Initial build — full SPA, Supabase schema, auth, booking flow |
| 2 | 2026-06-04 | Fixed Google OAuth UI bug |
| 3 | 2026-06-04 | Warm light theme, Plus Jakarta Sans fonts, nav buttons, tooltip fix |
| 4 | 2026-06-04 | Location autocomplete (80 Indian cities), guests input, heroSearch() sync |
| 5 | 2026-06-04 | Full 8-step venue listing wizard |
| 6 | 2026-06-04 | Fixed goPage('host') → goPage('new-listing'), null guards, toggle dedup |
| 7 | 2026-06-04 | Admin panel — tabs, venue detail modal, approve/reject/revoke, nav badge |
| 8 | 2026-06-05 | Fixed critical issues: admin RLS, storage buckets, adminApprove() simplified |
| 9 | 2026-06-05 | Messaging UI: inbox, chat, real-time, unread badge, Contact Host button |
| 10 | 2026-06-05 | Availability calendar: month-view, booked dates, start time picker, conflict check |
| 11 | 2026-06-05 | Weekend rate: schema column, calcPrice() Sat/Sun logic, rules stripped from insert |
| 12 | 2026-06-05 | Edit Listing: 4-tab modal, pre-filled from DB, re-review on name/desc change |
| 13 | 2026-06-05 | Admin notifications: notify Edge Function, 3 email types, Resend templates |
| 14 | 2026-06-06 | Seed data: 8 venues across Mumbai/Bangalore/Delhi, all venue types |
| 15 | 2026-06-06 | QA: full static code analysis — 4 Critical, 7 High, 6 Medium bugs identified |
| 16 | 2026-06-06 | Fixed all 17 QA bugs from Session 15 |
| 17 | 2026-06-06 | Adversarial code review round 1: 17 findings, fixed 3 Critical + 2 High |
| 18 | 2026-06-06 | QA re-run: fixed H1b/H1c/H1d (venueCard XSS), H2 (double-submit), H3/H4/M1-M3 |
| 19 | 2026-06-06 | Full feature QA pass — STATUS.md handoff written |
| 20 | 2026-06-07 | Full adversarial code review: 25 findings identified and all fixed. venue_status column added, Edge Function auth-guarded, storage RLS deployed, CSP added. |

---

## 13. Known Remaining Risks (Architectural — Not Yet Fixed)

These are scale/architecture concerns from the Session 20 review. Not blocking for MVP but worth addressing before launch:

1. **Single-file SPA** — all pages load at once. No code splitting or lazy loading. Will get heavy beyond 50+ venues.
2. **No per-user rate limiting** — `Bookings.create`, `Messages.send`, `Venues.create` can be called in a loop. Relies entirely on Supabase project-level rate limits.
3. **Admin DB calls in `app.js`** — `adminApprove/Reject/Revoke` call `db.from()` directly, bypassing the `supabase.js` API layer. If RLS changes, these break silently.
4. **No pagination** — venue grid (limit 24 hardcoded), bookings (unbounded for hosts with many venues), reviews (limit 10).
5. **`generate_confirmation_code` trigger queries `venues` on every booking insert** — adds a sequential read under high concurrency.
