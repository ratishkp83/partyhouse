# PartyHouse — Session Handoff Document
**Last updated:** 2026-06-05  
**Live URL:** https://ratishkp83.github.io/partyhouse/  
**Repo:** https://github.com/ratishkp83/partyhouse  
**Supabase project:** https://hxeskohikmtpzfrmovot.supabase.co  

---

## 1. Project Overview

PartyHouse is a party venue booking platform — a purpose-specific alternative to Airbnb focused on celebration spaces. Hourly pricing, occasion-based filtering, venue types: Rooftop / Villa / Garden / Pool / Hall / Farmhouse / Penthouse / Unique.

**Target users:** Couples, families, groups booking venues for parties  
**Tech stack:** Vanilla HTML/CSS/JS (no framework) · Supabase (Postgres + Auth + Storage) · GitHub Pages (hosting, migrating to Cloudflare Pages)  
**Design:** Warm off-white light theme · Plus Jakarta Sans + Inter fonts · Terracotta accent (#e8450a)

---

## 2. Infrastructure Status

| Service | Status | Details |
|---|---|---|
| GitHub Pages | ✅ Live | https://ratishkp83.github.io/partyhouse/ |
| Supabase DB | ✅ Live | Schema deployed, RLS enabled |
| Email auth | ✅ Working | Sign up / login functional |
| Google OAuth | ✅ Done | Redirect URI already in Google Cloud Console |
| Supabase Storage | ✅ Done | Buckets `venue-photos` and `avatars` created |
| Admin RLS | ✅ Fixed | `venues_admin_all` policy applied; admin role set on profile |
| Seed data | ❌ Not done | No real venues in DB yet |
| Razorpay payments | ❌ Blocked | Need Razorpay account + API keys before starting |
| Admin email notifications | ❌ Not started | Needs Supabase Edge Function |
| Cloudflare Pages | ❌ Not started | Replace GitHub Pages |
| Real-time messaging UI | ❌ Not started | Schema + `Messages` API ready, UI not built |

---

## 3. File Structure

```
partyhouse/
├── index.html       # 1,148 lines — entire SPA, all pages as divs
├── app.js           # ~892 lines  — all UI logic, page routing, wizard
├── supabase.js      # 568 lines  — all DB/auth calls, nav state
├── styles.css       # 631 lines  — full design system
├── schema.sql       # 261 lines  — Postgres schema + RLS + triggers
├── favicon.svg
└── .claude/
    └── STATUS.md    # this file
```

### Pages in index.html (each is a `div.page#page-{id}`)
| Page ID | Description |
|---|---|
| `home` | Hero search + featured venues + host CTA |
| `search` | Filter panel + venue grid |
| `listing` | Venue detail + booking widget |
| `booking` | Multi-step booking flow (date/time/guests/occasion → summary → payment) |
| `trips` | Guest's booking history |
| `wishlist` | Saved venues |
| `dashboard` | Host dashboard (their venues + bookings) |
| `new-listing` | 8-step venue listing wizard |
| `auth` | Login / signup |
| `admin` | Admin review panel |

---

## 4. Supabase Schema Summary

### Tables
- **profiles** — extends auth.users; fields: `full_name`, `phone`, `avatar_url`, `role` (guest/host/admin), `city`, `bio`
- **venues** — `name`, `description`, `venue_type`, `city`, `address`, `capacity`, `price_per_hour`, `min_hours`, `cleaning_fee`, `security_deposit`, `amenities[]`, `occasions[]`, `photos[]`, `cover_emoji`, `is_active`, `is_instant_book`, `rating_avg`, `review_count`, `host_notes`
- **bookings** — `venue_id`, `guest_id`, `party_date`, `start_time`, `hours`, `occasion`, `guests_count`, `total_price`, `status` (pending/confirmed/cancelled/completed), `confirmation_code`
- **reviews** — `booking_id`, `venue_id`, `reviewer_id`, `rating`, `comment`
- **wishlists** — `user_id`, `venue_id`
- **messages** — `sender_id`, `receiver_id`, `venue_id`, `booking_id`, `content`, `read_at`
- **payments** — `booking_id`, `razorpay_order_id`, `razorpay_payment_id`, `amount`, `status`

### Key DB behaviors
- Profile auto-created on signup via `handle_new_user()` trigger
- Booking `confirmation_code` auto-generated via trigger (format: `PH-MUM-2026-4821`)
- `rating_avg` and `review_count` on venues auto-updated via `update_venue_rating()` trigger
- All tables have RLS enabled

### RLS policies (applied)
- `venues`: public SELECT where `is_active = true`
- `venues_admin_all`: admin users can SELECT/UPDATE/DELETE all venues regardless of `is_active`

---

## 5. Supabase JavaScript API (supabase.js)

All DB calls go through these objects:

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
Venues.create(venueData)   // sets host_id = currentUser.id
Venues.update(id, updates)
Venues.getHostVenues()
Venues.uploadPhoto(file, venueId)  // Storage buckets now live ✅

Bookings.create(venueId, { partyDate, startTime, hours, occasion, guestsCount, totalPrice, ... })
Bookings.getMyBookings()
Bookings.getHostBookings()
Bookings.updateStatus(bookingId, status)
Bookings.cancel(bookingId)

Reviews.getForVenue(venueId)
Reviews.create(bookingId, venueId, rating, comment)

Wishlist.toggle(venueId, heartBtn)
Wishlist.getAll()
Wishlist.getIds()

Messages.send(receiverId, content, venueId, bookingId)
Messages.getConversation(otherUserId)
```

### Global state (supabase.js)
```js
currentUser     // Supabase auth user object, null if logged out
currentProfile  // profiles row, null if logged out
```

---

## 6. Known Gaps & Bugs

### Critical (must fix before launch)
| # | Issue | Status |
|---|---|---|
| 1 | RLS blocks admin from reading inactive venues | ✅ Fixed — `venues_admin_all` policy applied |
| 2 | `adminApprove()` had redundant no-op DB calls | ✅ Fixed — single fetch + update, modal closes cleanly |
| 3 | Venue photos not stored | ✅ Fixed — Storage buckets created |
| 4 | Booking payment not wired | ⏳ Blocked — need Razorpay account (see §8) |
| 5 | Google OAuth redirect URI not added | ✅ Already done — URI was in Google Cloud Console |

### Non-critical (post-launch)
| # | Issue | Notes |
|---|---|---|
| 6 | No admin email on new listing | Needs Supabase Edge Function + Resend/SendGrid |
| 7 | Messaging UI not built | `Messages` API ready, need chat page |
| 8 | Host approval flow for bookings | Currently instant — host should be able to approve/deny |
| 9 | No availability calendar | Bookings can double-stack on same date/time |
| 10 | Weekend rate not applied in price calc | `wizData.weekend_rate` saved but `calcPrice()` doesn't use it |

---

## 7. Immediate Next Steps (in order)

### Step 1 — Seed first host account
1. Sign up at the live site with a real email
2. In Supabase → profiles → set `role` = `host`
3. In SQL Editor, run the seed venue INSERT from schema.sql (replace YOUR-HOST-UUID)

### Step 2 — Razorpay integration
Blocked on Razorpay account setup. See §8 for full plan.  
Once you have keys: share the **Key ID** (`rzp_test_...`) and Claude will build the full integration.

### Step 3 — Messaging UI
The `Messages` API is ready. Need a chat page in index.html + routing in app.js.

### Step 4 — Migrate to Cloudflare Pages
See §9 below.

### Step 5 — Admin email notifications
See §10 below.

---

## 8. Razorpay Integration Plan

### What's needed
- Razorpay account + API keys (Key ID + Key Secret)
- A backend to create Razorpay orders (can't be done client-side — secret key exposure risk)
- Recommended: **Supabase Edge Function** as the backend

### Architecture
```
Browser → Edge Function (create-order) → Razorpay API → returns order_id
Browser loads Razorpay checkout with order_id
User pays → Razorpay calls webhook → Edge Function (verify-payment) → updates payments table
```

### Files to change
1. **supabase.js** — add `Payments.createOrder(bookingId, amount)` and `Payments.verify(paymentData)`
2. **app.js** — wire `confirmPayment()` (currently placeholder) to call `Payments.createOrder`, open Razorpay modal, handle success/failure
3. **New: `supabase/functions/create-order/index.ts`** — Edge Function
4. **New: `supabase/functions/verify-payment/index.ts`** — Edge Function + webhook handler

### Key Razorpay fields to capture (already in payments table)
- `razorpay_order_id`
- `razorpay_payment_id`
- `amount` (in paise, multiply INR × 100)
- `status`: pending → captured → refunded

### app.js confirmPayment() current state
```js
// Currently just shows a toast — needs full Razorpay wiring
async function confirmPayment() {
  // TODO: call Payments.createOrder() → open Razorpay → on success update booking status
}
```

---

## 9. Cloudflare Pages Migration Plan

### Why migrate
- GitHub Pages has aggressive CDN caching (caused deployment issues this session)
- Cloudflare Pages has instant cache purge, better performance globally
- Supports environment variables natively (needed for Razorpay keys)

### Steps
1. Go to https://dash.cloudflare.com → Workers & Pages → Create application → Pages
2. Connect GitHub → select `ratishkp83/partyhouse`
3. Build settings: Framework = None, Build command = (empty), Output = `/`
4. Deploy → get URL like `partyhouse.pages.dev`
5. Add custom domain if desired
6. In Supabase → Auth → URL Configuration → update Site URL and Redirect URLs to new domain
7. Update Google OAuth Authorised redirect URIs to add new domain's callback

### No code changes needed
The codebase uses no build step — pure static files. Cloudflare Pages serves it identically to GitHub Pages.

---

## 10. Admin Email Notification Plan

When a venue is submitted, the admin should get an email. This needs a Supabase Edge Function triggered by a database webhook.

### Implementation
1. Create Edge Function `notify-admin` that:
   - Receives venue row as payload
   - Sends email via Resend (https://resend.com — free tier: 3000 emails/month)
   - Email contains: venue name, city, host name, phone, email, reference code
2. In Supabase → Database → Webhooks → New webhook:
   - Table: `venues`
   - Event: `INSERT`
   - URL: your Edge Function URL
3. Add `RESEND_API_KEY` and `ADMIN_EMAIL` to Supabase Edge Function secrets

### Edge Function skeleton
```typescript
// supabase/functions/notify-admin/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const { record } = await req.json()
  const hostLine = (record.host_notes || '').split('\n')[0]
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'PartyHouse <noreply@partyhouse.in>',
      to: Deno.env.get('ADMIN_EMAIL'),
      subject: `🎉 New venue submitted: ${record.name} (${record.city})`,
      html: `<h2>${record.name}</h2><p>${record.city} · ${record.venue_type}</p><p>${hostLine}</p><p>Review at: https://ratishkp83.github.io/partyhouse/</p>`
    })
  })
  return new Response('ok')
})
```

---

## 11. Design System Reference

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
--r-sm:   6px
--r-md:   12px
--r-lg:   18px
--r-xl:   24px
--r-pill: 999px

/* Shadows */
--sh-sm:   0 1px 4px rgba(26,20,16,.08)
--sh-md:   0 4px 20px rgba(26,20,16,.10)
--sh-lg:   0 12px 48px rgba(26,20,16,.14)
--sh-glow: 0 0 30px rgba(232,69,10,.14)
```

---

## 12. How to Resume in a New Claude Session

Paste this at the start of the new session:

> "I'm resuming work on PartyHouse, a party venue booking platform. GitHub: https://github.com/ratishkp83/partyhouse · Live: https://ratishkp83.github.io/partyhouse/ · Supabase: https://hxeskohikmtpzfrmovot.supabase.co · Please clone the repo and read `.claude/STATUS.md` before we continue."

Then:
1. Claude will `git clone` the repo and read this file
2. You tell Claude what to work on (use the §7 priority list as a guide)
3. Provide the GitHub token when Claude asks to push (create a new one at https://github.com/settings/tokens)

**GitHub token scope needed:** `repo` only. Create at: https://github.com/settings/tokens/new  
**Token used this session:** `ghp_REVOKED_REPLACE_WITH_NEW_TOKEN` — **revoke this now** at https://github.com/settings/tokens

---

## 13. Session History

| Session | Date | What was done |
|---|---|---|
| 1 | 2026-06 (earlier) | Initial build — full SPA, Supabase schema, auth, booking flow |
| 2 | 2026-06-04 | Fixed Google OAuth UI bug (getSessionFromUrl v1 removal, onAuthStateChange SIGNED_IN handler) |
| 3 | 2026-06-04 | Warm light theme, Plus Jakarta Sans fonts, visible Login/Signup nav buttons, tooltip z-index fix |
| 4 | 2026-06-04 | Location autocomplete (80 Indian cities), guests number-only input, heroSearch() sync |
| 5 | 2026-06-04 | Full 8-step venue listing wizard (type/location/details/rules/amenities/photos/pricing/host info), review workflow with is_active=false |
| 6 | 2026-06-04 | Fixed: goPage('host') → goPage('new-listing'), null guards in goPage(), toggleSw dedup, startNewListing() reset function |
| 7 | 2026-06-04 | Admin panel — pending/approved/rejected tabs, venue detail modal, approve/reject/revoke with audit trail, admin nav badge |
| 8 | 2026-06-05 | Fixed all critical issues: admin RLS policy, admin role set, storage buckets created, adminApprove() simplified, duplicate closeAdminModal() removed |
| 9 | 2026-06-05 | Messaging UI: inbox sidebar, chat panel, real-time via Supabase, unread badge, Contact Host button; added messages_update RLS policy |
| 10 | 2026-06-05 | Availability calendar: month-view date picker, booked dates blocked (pink/strikethrough), start time picker, time-overlap conflict check in startBooking() |
