# PartyHouse — Session Handoff Document
**Last updated:** 2026-06-06 (Session 16)  
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

## 6. QA Status — ✅ All 17 bugs fixed (Session 16)

All findings from the Session 15 static analysis have been resolved. No open bugs.

| Severity | Count | Status |
|---|---|---|
| Critical | 4 | ✅ Fixed |
| High | 7 | ✅ Fixed |
| Medium | 6 | ✅ Fixed |

**Next QA step:** adversarial user testing (see §13) and adversarial code review (see §14).

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

Then tell Claude what you want next — e.g. Razorpay integration, Cloudflare migration, or a new feature.

**GitHub token scope needed:** `repo` only. Create at: https://github.com/settings/tokens/new

---

## 13. Adversarial Testing Prompt

Use this prompt with a fresh Claude session (no context) to stress-test the live app like a hostile user:

---

> You are an adversarial QA tester for **PartyHouse**, a party venue booking platform at **https://ratishkp83.github.io/partyhouse/**
>
> Your job is to break it. Think like a malicious user, a confused guest, a greedy host, and a bored developer with devtools open — all at once.
>
> **Test every attack surface below. For each, report: what you tried, what happened, and a severity rating (Critical / High / Medium / Low).**
>
> **Auth & identity**
> - Sign up with a disposable email. Verify the confirmation flow works end-to-end.
> - Try logging in with wrong credentials — does the error message leak whether the email exists?
> - Open two browser tabs logged in as different users. Navigate between pages. Does state leak between them?
> - Log out mid-booking. What happens to the in-progress booking?
>
> **Booking integrity**
> - Open a venue, pick a date, open devtools, manually set `#bwDate` to yesterday. Click "Book Now". Does it go through?
> - Open a venue you own (if you listed one) and try to book it.
> - Start a booking, complete step 1, open a new tab and cancel the booking, then complete payment in the original tab. What happens?
> - Book the same venue for the same date+time in two browser tabs simultaneously. Does a double-booking occur?
>
> **Price manipulation**
> - Open devtools, find the price breakdown DOM, change the total amount. Click "Confirm & Pay". Does the backend accept the manipulated price?
> - Change `bwHours` to 0 or a negative number via devtools before booking. What total is recorded?
>
> **Host dashboard**
> - Create a fresh account (no venues). Go to the dashboard. Does it crash or show a clean empty state?
> - Edit a listing, clear the cleaning fee field, save. Re-open the listing — is the fee preserved or zeroed?
> - Try to approve/reject a venue from the dashboard as a non-admin.
>
> **Admin panel**
> - Navigate directly to `#admin` or call `goPage('admin')` in the console without admin privileges. What do you see?
> - Try calling `adminApprove('some-uuid')` from the console as a non-admin. Does the DB reject it?
> - Check the pending tab — do any rejected venues appear?
>
> **Messaging**
> - Open messages in two tabs. Send a message in one. Does the other update in real-time?
> - Open messages, then navigate away and back rapidly 10 times. Check the browser console for Supabase channel errors.
> - Try sending an empty message. Try sending a message with `<script>alert(1)</script>`. What is rendered?
>
> **Wishlist & navigation**
> - Heart a venue, then log out and back in. Is the wishlist persisted?
> - Apply a city filter, click a venue, go back. Are the search filters preserved?
> - Open the app on a mobile viewport (375px). Go through the full booking flow. Report any layout breakages.
>
> **Edge cases**
> - Use the browser back button at every step of the booking flow. Does anything break?
> - Resize the browser mid-booking. Any visual corruption?
> - Throttle network to "Slow 3G" in devtools. Do loading states appear everywhere, or do any sections flash blank?
> - Disable JavaScript midway through a page interaction. What does the user see?
>
> **For each issue found:** paste the exact steps to reproduce, the severity, and the file/function most likely responsible.

---

## 14. Adversarial Code Review Prompt

Use this prompt in a fresh Claude session with the full codebase pasted or attached:

---

> You are a hostile senior engineer doing a security and correctness review of **PartyHouse**, a vanilla JS + Supabase SPA. You are looking for bugs, not compliments. Be ruthless.
>
> The three source files are: `index.html`, `app.js`, `supabase.js`. The Supabase schema is in `schema.sql`.
>
> **Review every category below. For each finding, cite the exact file, function, and line range. Rate severity: Critical / High / Medium / Low.**
>
> **Security**
> - Are there any XSS vectors? Look for `innerHTML` assignments that use unsanitised user-supplied data. `escHtml()` exists — is it applied consistently?
> - Are Supabase RLS policies actually enforced for every mutation? List every `db.from(...).update/insert/delete` call and whether the RLS policy covers it.
> - Can a guest access or modify another guest's bookings by guessing a UUID?
> - Is the admin role check purely client-side, or is it enforced at the DB layer too?
> - Are there any API keys or secrets in client-side code that shouldn't be there?
> - Does `Auth.requireAuth()` guard every action that modifies data?
>
> **Data integrity**
> - Are there any race conditions in the booking flow (e.g. two tabs booking the same slot)?
> - Is `hasTimeConflict()` called before every booking insert, or only in the UI?
> - Can `total_price` be submitted as 0 or negative?
> - What happens if `Venues.getById()` returns null mid-flow — are all downstream references null-guarded?
>
> **State management**
> - List every module-level mutable variable (`let`). For each: what resets it, and what happens if it's stale when a new page loads?
> - `selectedVenueData`, `guestCount`, `calSelectedDate` — are these reset when the user navigates away from a listing and returns to a different one?
> - `wizData` and `wizPhotos` — are they fully reset on `startNewListing()`? What if the user abandons mid-wizard and reopens?
>
> **Error handling**
> - Map every `async` function. Which ones have no `try/catch` and no error state shown to the user?
> - What happens if Supabase is unreachable — do any spinners spin forever?
> - Are there any `await` calls whose returned errors are silently swallowed?
>
> **Performance**
> - Are there any N+1 query patterns (a query inside a loop)?
> - `renderVenueGrid` fetches wishlist IDs on every render — is this called redundantly?
> - Are Supabase realtime subscriptions ever created multiple times for the same resource?
>
> **Correctness**
> - `calcPrice()` reads from DOM elements — what does it return if called before the listing page is rendered?
> - The `editingVenueData` input listeners attach at DOMContentLoaded — are there any other listeners with the same timing problem?
> - `removePhoto(idx)` splices `wizPhotos` and re-indexes remove buttons — does it correctly handle removing the last photo, or the first?
>
> Output a prioritised bug list. Group by severity. Be specific — vague findings like "improve error handling" are not acceptable. Every finding must include a reproduction path or proof.

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
| 16 | 2026-06-06 | Fixed all 17 QA bugs: C1-C4 (host self-booking, price mismatch, admin pending tab, realtime leak), H1-H7, M1-M6 |
