# PartyHouse — Session Status
_Last updated: June 2026_

## What's been built
- Full single-page website: index.html, styles.css, app.js, favicon.svg
- Supabase integration: supabase.js (Auth, Venues, Bookings, Reviews, Wishlist, Messages APIs)
- PostgreSQL schema: schema.sql (7 tables, RLS policies, triggers, seed comments)
- README.md with full setup and deploy guide

## Live URLs
- GitHub repo:   https://github.com/ratishkp83/partyhouse
- Live site:     https://ratishkp83.github.io/partyhouse/
- Supabase URL:  https://hxeskohikmtpzfrmovot.supabase.co

## Supabase setup status
- [x] Project created
- [x] schema.sql run (tables, RLS, triggers)
- [x] Anon key configured in supabase.js
- [x] handle_new_user trigger fixed (database error saving new user — resolved)
- [x] Email signup working
- [ ] Google OAuth — IN PROGRESS (one step remaining — see below)

## Google OAuth — one step remaining
Error was: redirect_uri_mismatch (Error 400)

Fix: Go to console.cloud.google.com
  → APIs & Services → Credentials → your OAuth Client
  → Authorised redirect URIs → Add URI:
      https://hxeskohikmtpzfrmovot.supabase.co/auth/v1/callback
  → Authorised JavaScript origins → Add:
      https://ratishkp83.github.io
  → Save

Supabase → Authentication → URL Configuration:
  Site URL:      https://ratishkp83.github.io/partyhouse/
  Redirect URLs: https://ratishkp83.github.io/partyhouse/
                 https://ratishkp83.github.io/partyhouse

## File structure
partyhouse/
├── index.html       # Full SPA — 10 pages/views
├── styles.css       # Dark theme design system
├── supabase.js      # Supabase client + all API modules
├── app.js           # UI logic, navigation, page loaders
├── schema.sql       # PostgreSQL schema — run in Supabase SQL Editor
├── favicon.svg      # Party emoji favicon
├── README.md        # Setup + deploy guide
└── .claude/
    └── STATUS.md    # This file

## Pending tasks (priority order)
1. [ ] Google OAuth — add redirect URI in Google Cloud Console (above)
2. [ ] Supabase Storage — create buckets: 'venue-photos' and 'avatars' (both public)
3. [ ] Seed first host account:
         Sign up on site → Supabase Table Editor → profiles → set role='host'
         Uncomment seed INSERT in schema.sql → run with your UUID
4. [ ] Razorpay payment gateway integration
5. [ ] Real-time messaging wired to UI
6. [ ] Map view (Mapbox)
7. [ ] Migrate hosting from GitHub Pages → Cloudflare Pages
8. [ ] Register domain (partyhouse.in) on Cloudflare

## GitHub
Repo:  https://github.com/ratishkp83/partyhouse
User:  ratishkp83
Push:  git push https://ratishkp83:<TOKEN>@github.com/ratishkp83/partyhouse.git main
Note:  Regenerate token at github.com/settings/tokens if expired

## Tech stack
Frontend:  Vanilla HTML + CSS + JS (no build step needed)
Auth:      Supabase Auth (email working, Google OAuth pending)
Database:  PostgreSQL via Supabase (schema live)
Storage:   Supabase Storage (buckets not yet created)
Payments:  Razorpay (not yet integrated)
Hosting:   GitHub Pages → migrate to Cloudflare Pages
DNS/CDN:   Cloudflare (recommended, domain pending)
