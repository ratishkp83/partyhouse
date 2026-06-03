# 🎉 PartyHouse

> **Find and book unique party venues for couples, families, and groups.**

PartyHouse is a full-stack venue-rental marketplace for celebrations — birthdays, anniversaries, group parties, family reunions, and corporate events — powered by **Supabase** for auth, database, and storage.

---

## 🚀 Live Site

**[https://ratishkp83.github.io/partyhouse](https://ratishkp83.github.io/partyhouse)**

---

## ⚡ Supabase Setup (required for live data)

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com) → New Project → choose a region close to India (Singapore).

### 2. Run the schema
- Open **SQL Editor** in your Supabase dashboard
- Paste the full contents of `schema.sql` and click **Run**
- This creates all tables, RLS policies, and triggers

### 3. Configure your keys
Open `supabase.js` and replace:
```js
const SUPABASE_URL  = 'YOUR_SUPABASE_URL';    // Settings → API → Project URL
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'; // Settings → API → anon public key
```

### 4. Enable Google OAuth (optional)
- Supabase Dashboard → Authentication → Providers → Google → Enable
- Add your Google OAuth client ID + secret

### 5. Enable Storage
- Supabase Dashboard → Storage → Create bucket: `venue-photos` (public)
- Create bucket: `avatars` (public)

### 6. Seed your first host account
- Sign up via the site
- In Supabase → Table Editor → profiles → set your `role` to `host`
- Uncomment the seed INSERT in `schema.sql` and run with your UUID

---

## 📁 File Structure

```
partyhouse/
├── index.html      # Single-page app — all pages/views
├── styles.css      # Dark design system + all component styles
├── supabase.js     # Supabase client, Auth/Venues/Bookings/Wishlist APIs
├── app.js          # UI logic, navigation, forms, page loaders
├── schema.sql      # Full PostgreSQL schema + RLS policies
├── favicon.svg     # Party emoji favicon
└── README.md
```

---

## 🗄 Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Users (guests + hosts), extends Supabase auth |
| `venues` | Party venue listings with capacity, pricing, amenities |
| `bookings` | Reservations linking guests to venues |
| `reviews` | Ratings + comments, auto-updates venue avg rating |
| `wishlists` | Saved venues per user |
| `messages` | Host ↔ guest messaging with real-time support |
| `payments` | Razorpay payment records |

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML + CSS + JavaScript |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage (venue photos) |
| Payments | Razorpay (integration ready) |
| Hosting | Cloudflare Pages / GitHub Pages |
| CDN + DNS | Cloudflare |

---

## 🌐 Deploy to Cloudflare Pages

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Workers & Pages → Create → Pages → Connect to Git
3. Select `ratishkp83/partyhouse` → main branch → no build command needed
4. Add environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
5. Your site deploys instantly on every `git push`

---

## 📈 Roadmap

- [x] Full venue browsing + search
- [x] Auth (email + Google)
- [x] Supabase database + RLS
- [x] Booking flow
- [x] Host dashboard
- [x] Wishlists
- [ ] Razorpay payment gateway
- [ ] Real-time messaging
- [ ] Venue photo uploads
- [ ] Map view (Mapbox)
- [ ] Email notifications (Supabase Edge Functions)
- [ ] Mobile app (React Native)

---

© 2026 PartyHouse · Built with 🎉
