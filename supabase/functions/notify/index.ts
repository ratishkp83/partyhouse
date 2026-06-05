// supabase/functions/notify/index.ts
// Handles all PartyHouse transactional emails via Resend.
//
// Triggered two ways:
//   1. DB Webhook (Supabase → Database → Webhooks):
//      - Table: venues, Event: INSERT  → type = "new_venue" (admin notified of new submission)
//   2. Direct invocation from browser JS (adminApprove / adminReject):
//      - POST { type, venueId, reason? }
//
// Required secrets (Supabase → Settings → Edge Functions → Secrets):
//   RESEND_API_KEY   — from resend.com (free tier: 3,000 emails/month)
//   ADMIN_EMAIL      — email address that receives new listing alerts
//   SUPABASE_URL     — your project URL (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY — service role key (auto-set by Supabase)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL  = Deno.env.get('ADMIN_EMAIL')!
const SITE_URL     = 'https://ratishkp83.github.io/partyhouse/'
const FROM_EMAIL   = 'PartyHouse <notifications@partyhouse.in>'

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Email sender ──────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    throw new Error(`Resend failed: ${err}`)
  }
  return res.json()
}

// ── Email templates ───────────────────────────────────────────
function baseTemplate(content: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: 'Inter', -apple-system, sans-serif; background: #faf8f5; margin: 0; padding: 32px 16px; color: #1a1410; }
      .card { background: #fff; border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
      .header { background: linear-gradient(135deg, #e8450a, #f0892a); padding: 28px 32px; }
      .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -.3px; }
      .header p  { color: rgba(255,255,255,.85); margin: 6px 0 0; font-size: 13px; }
      .body { padding: 28px 32px; }
      .field { display: flex; margin-bottom: 12px; font-size: 14px; }
      .label { color: #7a7068; width: 140px; flex-shrink: 0; }
      .value { font-weight: 600; }
      .divider { border: none; border-top: 1px solid #e8e2d9; margin: 20px 0; }
      .cta { display: inline-block; background: #e8450a; color: #fff; padding: 13px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 8px; }
      .footer { text-align: center; font-size: 12px; color: #7a7068; padding: 16px 32px 24px; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
      .badge-success { background: #d1fae5; color: #065f46; }
      .badge-error   { background: #fee2e2; color: #991b1b; }
      .badge-pending { background: #fef3c7; color: #92400e; }
    </style>
  </head>
  <body>
    <div class="card">
      ${content}
      <div class="footer">PartyHouse · India's party venue marketplace · <a href="${SITE_URL}" style="color:#e8450a">partyhouse.in</a></div>
    </div>
  </body>
  </html>`
}

function newVenueEmail(venue: any, hostLine: string) {
  return baseTemplate(`
    <div class="header">
      <h1>🎉 New venue submitted</h1>
      <p>Requires admin review before going live</p>
    </div>
    <div class="body">
      <div class="field"><span class="label">Venue</span><span class="value">${venue.name}</span></div>
      <div class="field"><span class="label">Type</span><span class="value">${venue.venue_type || '—'}</span></div>
      <div class="field"><span class="label">City</span><span class="value">${venue.city}</span></div>
      <div class="field"><span class="label">Capacity</span><span class="value">${venue.capacity} guests</span></div>
      <div class="field"><span class="label">Rate</span><span class="value">₹${Number(venue.price_per_hour).toLocaleString('en-IN')}/hr</span></div>
      <hr class="divider">
      <div class="field"><span class="label">Host details</span><span class="value" style="font-weight:400;line-height:1.6">${hostLine.replace(/\n/g, '<br>')}</span></div>
      <div class="field"><span class="label">Submitted</span><span class="value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <br>
      <a href="${SITE_URL}#admin" class="cta">Review in Admin Panel →</a>
    </div>`)
}

function venueApprovedEmail(venue: any, adminNote: string) {
  return baseTemplate(`
    <div class="header">
      <h1>🎊 Your venue is live!</h1>
      <p>Congratulations — guests can now find and book your space</p>
    </div>
    <div class="body">
      <p style="font-size:15px;line-height:1.7;margin-top:0">Great news! <strong>${venue.name}</strong> has been reviewed and approved by the PartyHouse team. Your listing is now live and open for bookings.</p>
      <div class="field"><span class="label">Venue</span><span class="value">${venue.name}</span></div>
      <div class="field"><span class="label">City</span><span class="value">${venue.city}</span></div>
      <div class="field"><span class="label">Status</span><span class="badge badge-success">✅ Live</span></div>
      ${adminNote ? `<div class="field"><span class="label">Note from team</span><span class="value" style="font-weight:400">${adminNote}</span></div>` : ''}
      <hr class="divider">
      <p style="font-size:13px;color:#7a7068;line-height:1.7">Manage your bookings, update pricing, and track earnings from your Host Dashboard.</p>
      <a href="${SITE_URL}" class="cta">Go to Dashboard →</a>
    </div>`)
}

function venueRejectedEmail(venue: any, reason: string) {
  return baseTemplate(`
    <div class="header" style="background: linear-gradient(135deg, #991b1b, #b91c1c)">
      <h1>Listing not approved</h1>
      <p>Your venue submission needs some changes</p>
    </div>
    <div class="body">
      <p style="font-size:15px;line-height:1.7;margin-top:0">Thank you for submitting <strong>${venue.name}</strong>. Unfortunately, we weren't able to approve this listing at this time.</p>
      <div class="field"><span class="label">Venue</span><span class="value">${venue.name}</span></div>
      <div class="field"><span class="label">Status</span><span class="badge badge-error">❌ Not approved</span></div>
      <div class="field"><span class="label">Reason</span><span class="value" style="font-weight:400;line-height:1.6">${reason || 'No specific reason provided.'}</span></div>
      <hr class="divider">
      <p style="font-size:13px;color:#7a7068;line-height:1.7">Please address the feedback above and resubmit your listing. If you have questions, reply to this email or contact support.</p>
      <a href="${SITE_URL}" class="cta">Edit & Resubmit →</a>
    </div>`)
}

// ── Request handler ───────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const body = await req.json()

    // ── DB Webhook: new venue INSERT ──────────────────────────
    // Supabase DB webhooks send { type: 'INSERT', record: {...} }
    if (body.type === 'INSERT' && body.record) {
      const venue    = body.record
      const hostLine = (venue.host_notes || '').split('\n').slice(0, 3).join('\n')
      await sendEmail(
        ADMIN_EMAIL,
        `🎉 New venue submitted: ${venue.name} (${venue.city})`,
        newVenueEmail(venue, hostLine)
      )
      return new Response(JSON.stringify({ sent: 'new_venue' }), { status: 200 })
    }

    // ── Direct invocation from browser ───────────────────────
    const { type, venueId, reason, adminNote } = body

    if (!type || !venueId) {
      return new Response(JSON.stringify({ error: 'Missing type or venueId' }), { status: 400 })
    }

    // Fetch venue + host profile
    const { data: venue, error: vErr } = await db
      .from('venues')
      .select('*, host:profiles!host_id(full_name, email)')
      .eq('id', venueId)
      .single()

    if (vErr || !venue) {
      return new Response(JSON.stringify({ error: 'Venue not found' }), { status: 404 })
    }

    const hostEmail = venue.host?.email
    if (!hostEmail) {
      // No host email — still return ok (admin action succeeded)
      return new Response(JSON.stringify({ sent: 'skipped_no_host_email' }), { status: 200 })
    }

    if (type === 'venue_approved') {
      await sendEmail(
        hostEmail,
        `🎊 Your venue "${venue.name}" is now live on PartyHouse!`,
        venueApprovedEmail(venue, adminNote || '')
      )
      // Also notify admin for record
      await sendEmail(
        ADMIN_EMAIL,
        `✅ Approved: ${venue.name} (${venue.city})`,
        `<p>You approved <strong>${venue.name}</strong>. Host notified at ${hostEmail}.</p>`
      )
    } else if (type === 'venue_rejected') {
      await sendEmail(
        hostEmail,
        `Re: Your PartyHouse listing "${venue.name}"`,
        venueRejectedEmail(venue, reason || '')
      )
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), { status: 400 })
    }

    return new Response(JSON.stringify({ sent: type, to: hostEmail }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    console.error('notify function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
