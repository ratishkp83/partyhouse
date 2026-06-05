# PartyHouse — Session Handoff Document
**Last updated:** 2026-06-06  
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
| Supabase DB | ✅ Live | Schema deployed, RLS enabled, `weekend_rate` column added |
| Email auth | ✅ Working | Sign up / login functional |
| Google OAuth | ✅ Done | Redirect URI already in Google Cloud Console |
| Supabase Storage | ✅ Done | Buckets `venue-photos` and `avatars` created |
| Admin RLS | ✅ Fixed | `venues_admin_all` policy applied; admin role set on profile |
| Messages RLS | ✅ Fixed | `messages_update` policy applied (allows receivers to mark read) |
| Seed data | ✅ Ready to run | `supabase/seed.sql` — 8 venues across Mumbai, Bangalore, Delhi. Replace `<YOUR_USER_UUID>` and run in SQL Editor. |
| Admin email notifications | ✅ Built | Edge Function `supabase/functions/notify/`. See `supabase/DEPLOY.md` to deploy (needs Resend key). |
| Razorpay payments | ❌ Blocked | Need Razorpay account + API keys before starting |
| Cloudflare Pages | ⏸ Parked | Migrate only after site is fully tested. Plan in §9. |

---

## 3. File Structure

```
partyhouse/
├── index.html                          # ~1,340 lines — entire SPA, all pages as divs
├── app.js                              # ~1,396 lines — all UI logic, page routing, wizard
├── supabase.js                         # ~668 lines  — all DB/auth calls, Notify helper
├── styles.css                          # ~755 lines  — full design system
├── schema.sql                          # ~264 lines  — Postgres schema + RLS + triggers
├── favicon.svg
├── supabase/
│   ├── seed.sql                        # 8 seed venues — run in Supabase SQL Editor
│   ├── DEPLOY.md                       # Edge Function deployment guide
│   └── functions/
│       └── notify/
│           ├── index.ts                # Email Edge Function (new_venue / approved / rejected)
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
- **venues** — `name`, `description`, `venue_type`, `city`, `address`, `capacity`, `price_per_hour`, `weekend_rate` (Sat/Sun override), `min_hours`, `cleaning_fee`, `security_deposit`, `amenities[]`, `occasions[]`, `photos[]`, `cover_emoji`, `is_active`, `is_instant_book`, `rating_avg`, `review_count`, `host_notes`
- **bookings** — `venue_id`, `guest_id`, `party_date`, `start_time`, `hours`, `occasion`, `guests_count`, `total_price`, `status` (pending/confirmed/cancelled/completed), `confirmation_code`
- **reviews** — `booking_id`, `venue_id`, `reviewer_id`, `rating`, `comment`
- **wishlists** — `user_id`, `venue_id`
- **messages** — `sender_id`, `receiver_id`, `venue_id`, `booking_id`, `content`, `read_at`
- **payments** — `booking_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status`

### Key DB behaviours
- Profile auto-created on signup via `handle_new_user()` trigger
- Booking `confirmation_code` auto-generated via trigger (format: `PH-MUM-2026-4821`)
- `rating_avg` and `review_count` on venues auto-updated via `update_venue_rating()` trigger
- All tables have RLS enabled

---

## 5. Supabase JavaScript API (supabase.js)

```js
Auth.signUp(email, password, fullName)
Auth.signIn(email, password)
Auth.signInWithGoogle()
Auth.signOut()
Auth.getProfile(userId)
Auth.updateProfile(updates)
Auth.requireAuth(action)   // shows toast + redirects to auth if not logged in

Venues.getAll({ city, occasion, minCapacity, maxPrice, type })
Venues.getById(id)
Venues.getFeatured()
Venues.create(venueData)
Venues.update(id, updates)
Venues.getHostVenues()
Venues.uploadPhoto(file, venueId)

Bookings.create(venueId, { partyDate, startTime, hours, occasion, guestsCount, totalPrice, ... })
Bookings.getMyBookings()
Bookings.getHostBookings()       // ⚠ BUG — crashes if host has 0 venues (see §6)
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
Messages.getInbox()
Messages.getUnreadCount()
Messages.markRead(senderId)
Messages.subscribe(otherUserId, callback)

Notify.venueApproved(venueId, adminNote)   // calls Edge Function
Notify.venueRejected(venueId, reason)
```

### Global state
```js
currentUser     // Supabase auth user object, null if logged out
currentProfile  // profiles row, null if logged out
selectedVenueData  // currently open venue object (app.js)
```

---

## 6. QA Findings — Fix These Next Session

A full static code analysis was done on 2026-06-06. All 17 findings below are confirmed bugs — none are speculation.

### Critical (fix first — data integrity or broken core flow)

| # | Bug | Location | Fix |
|---|---|---|---|
| C1 | **Host can book their own venue** — no guard against `currentUser.id === host.id` | `startBooking()` app.js:335 | Add 2-line owner check before booking |
| C2 | **Price mismatch in booking summary** — step 1 summary always shows weekday rate, even on weekends; `populateBookingSummary()` uses `v.price_per_hour` directly instead of `price.rate` from `calcPrice()` | `populateBookingSummary()` app.js:380 | Replace `v.price_per_hour` with `price.rate` |
| C3 | **Admin pending tab shows rejected venues** — pending query is `.eq('is_active', false)` with no exclusion of `REJECTED` notes, so rejected venues appear in pending and can be re-approved accidentally | `adminTab()` app.js:1041 | Add `.not('host_notes', 'like', '%REJECTED%')` to pending query |
| C4 | **Real-time message channel leaks on page navigation** — `msgRealtimeChannel` only cleaned up in `closeChatPanel()`, not on `goPage()`. Channel fires callbacks on dead DOM, exhausts Supabase realtime limits | `goPage()` app.js:67 | Add `db.removeChannel(msgRealtimeChannel)` at top of `goPage()` |

### High (fix before launch)

| # | Bug | Location | Fix |
|---|---|---|---|
| H1 | **Calendar blocks entire day if any booking exists** — even a 4hr morning booking marks the whole day red; guests can't book evening slots | `renderCalendar()` app.js:236 | Only mark day blocked if booking covers ≥18 hrs; rely on `hasTimeConflict()` for time-level accuracy |
| H2 | **Edit listing zeros cleaning_fee / security_deposit on save** — `parseInt('') \|\| 0` overwrites existing values with 0 if host leaves those fields untouched | `saveEditListing()` app.js:698 | Change `\|\| 0` to `\|\| v.cleaning_fee \|\| 0` and `\|\| v.security_deposit \|\| 0` |
| H3 | **getHostBookings() crashes with empty venues array** — `.in('venue_id', [])` throws a Postgres UUID error; new hosts with no venues see a broken dashboard | `Bookings.getHostBookings()` supabase.js:322 | Short-circuit return `[]` if `venueIds.length === 0` |
| H4 | **No confirmation before booking cancel** — single misclick cancels a confirmed booking with no undo | `loadMyBookings()` app.js:455 | Wrap in `confirm()` dialog |
| H5 | **Guest can book a past date via devtools** — calendar prevents UI clicks but doesn't validate the hidden `#bwDate` input value | `startBooking()` app.js:335 | Add `date < today` check after the empty-date guard |
| H6 | **Re-review warning fires incorrectly on first open** — `editingVenueData` is null when the `input` event listeners attach at page load; first edit always shows the re-review banner | `app.js:626` | Add `if (!editingVenueData) return` at top of each listener |
| H7 | **Earnings shows ₹NaNL if any booking has null total_price** — `reduce()` doesn't guard against null values | `loadDashboard()` app.js:493 | Change to `(s, b) => s + (b.total_price \|\| 0)` and show `—` for zero |

### Medium (UX gaps)

| # | Bug | Location | Fix |
|---|---|---|---|
| M1 | No back navigation from listing page | `page-listing` index.html | Add `← Back` button that calls `goPage('search')` with saved filters |
| M2 | Wizard success screen shows client-generated code, not the DB confirmation code | `submitListingForReview()` app.js:1000 | Use `venue.confirmation_code` from the DB response |
| M3 | Search filters reset when returning from listing page | `goPage()` app.js:78 | Pass `searchFilters` when calling `loadSearch()` from goPage |
| M4 | `toggleAm()` mutates `wizData.amenities` even when called from edit listing modal | `toggleAm()` app.js:822 | Scope mutation to wizard context only |
| M5 | Real-time channel name `'messages'` collides across tabs | `Messages.subscribe()` supabase.js:462 | Use unique name: `messages-${currentUser.id}-${Date.now()}` |
| M6 | `showToast()` type `'warn'` has no colour mapping — border renders as `undefined` | `showToast()` supabase.js:478 | Add `warn: '#d97706'` to the colours map |

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
| Admin email notifications (Edge Function + Resend) | ✅ Built, needs deploy |
| Messaging UI (inbox + chat + real-time + unread badge) | ✅ |
| Contact Host button on listing page | ✅ |
| Seed data (8 venues, 3 cities) | ✅ Ready to run |

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

No code changes needed — pure static files.

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

Then tell Claude: **"Fix the QA bugs from §6 — start with the 4 Criticals, then the 7 Highs, then the 6 Mediums. Fix them all in one pass."**

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
| 15 | 2026-06-06 | QA: full static code analysis — 4 Critical, 7 High, 6 Medium bugs identified (see §6) |
