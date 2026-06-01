# 🎉 PartyHouse

> **Find and book unique party venues for couples, families, and groups.**

PartyHouse is a modern venue-rental marketplace focused exclusively on celebrations — birthdays, anniversaries, group parties, family reunions, and corporate events.

---

## 🚀 Live Pages

| Page | Description |
|------|-------------|
| `/` | Home — hero search, featured venues, party type cards, how-it-works |
| Search Results | Filter by party type, capacity, price, amenities |
| Listing Detail | Full venue page with gallery, amenities, reviews, booking widget |
| Booking Flow | 3-step wizard — Review → Payment → Confirmation |
| Host Dashboard | Metrics, upcoming bookings, quick actions |
| New Listing Wizard | 5-step venue onboarding |
| My Bookings | Upcoming and past party bookings |
| Saved Venues | Wishlist of favourite party spaces |
| Login / Sign Up | Auth with Google, Facebook, or email |

---

## 🎨 Design

- **Dark theme** — deep blacks, vivid coral/orange gradient accent
- **Typography** — Syne (headings) + DM Sans (body)
- **Tooltips** — every interactive element has descriptive hover tooltips
- **Party types** — Couple 💑 · Family 👨‍👩‍👧‍👦 · Group 🎉
- Animated confetti on the hero section
- Fully responsive layout

---

## 📁 File Structure

```
partyhouse/
├── index.html       # Single-page app — all pages/views
├── styles.css       # Complete design system + component styles
├── app.js           # All interactivity, routing, data
├── favicon.svg      # SVG favicon
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Vanilla HTML + CSS + JavaScript (no build step) |
| Fonts | Google Fonts — Syne + DM Sans |
| Icons | Emoji-based (zero dependencies) |
| Hosting | GitHub Pages / Vercel / Netlify |

---

## ⚡ Getting Started

```bash
# Clone the repo
git clone https://github.com/ratishkp83/partyhouse.git
cd partyhouse

# Open in browser (no build step needed)
open index.html

# Or serve locally
npx serve .
# or
python3 -m http.server 3000
```

---

## 🌐 Deploy to GitHub Pages

1. Go to **Settings → Pages** in your GitHub repo
2. Set source to **main branch / root folder**
3. Your site will be live at `https://ratishkp83.github.io/partyhouse`

---

## 🗺 Roadmap

- [ ] Backend API (Node.js + Supabase)
- [ ] Real image uploads (Supabase Storage)
- [ ] Map integration (Mapbox)
- [ ] Real-time messaging
- [ ] Payment gateway (Razorpay)
- [ ] Mobile app (React Native)

---

© 2026 PartyHouse · Built with 🎉
