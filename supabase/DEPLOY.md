# Deploying the `notify` Edge Function

## One-time setup

### 1. Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 2. Link your project
```bash
cd partyhouse
supabase link --project-ref hxeskohikmtpzfrmovot
```

### 3. Deploy the function
```bash
supabase functions deploy notify
```

### 4. Set secrets
In Supabase dashboard → Settings → Edge Functions → Add secrets:

| Key | Value |
|-----|-------|
| `RESEND_API_KEY` | From https://resend.com (free: 3,000 emails/month) |
| `ADMIN_EMAIL` | Your email address e.g. `you@gmail.com` |

Or via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_xxxx ADMIN_EMAIL=you@gmail.com
```

### 5. Set up DB webhook for new venue submissions
In Supabase dashboard → Database → Webhooks → Create new webhook:

| Field | Value |
|-------|-------|
| Name | `notify-new-venue` |
| Table | `venues` |
| Events | `INSERT` |
| Type | `HTTP Request` |
| URL | `https://hxeskohikmtpzfrmovot.supabase.co/functions/v1/notify` |
| HTTP Method | `POST` |
| Headers | `Content-Type: application/json` |

This fires automatically whenever a host submits a new listing.

### 6. Verify Resend domain (for production)
- Log in to https://resend.com
- Add `partyhouse.in` as a sending domain
- Add the DNS records Resend provides to your domain
- Until verified, use `onboarding@resend.dev` as the `from` address in index.ts

---

## What each notification does

| Trigger | Recipient | Subject |
|---------|-----------|---------|
| New venue INSERT (DB webhook) | Admin | 🎉 New venue submitted: {name} ({city}) |
| Admin approves listing | Host | 🎊 Your venue "{name}" is now live! |
| Admin rejects listing | Host | Re: Your PartyHouse listing "{name}" |

All emails are non-fatal — if Resend is down or misconfigured, the admin action still completes and a warning is logged to the Edge Function logs.
