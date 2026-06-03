// ============================================================
// supabase.js — PartyHouse Supabase client & API layer
//
// SETUP: Replace the two constants below with your project values
// from: Supabase Dashboard → Settings → API
// ============================================================

const SUPABASE_URL  = 'YOUR_SUPABASE_URL';   // e.g. https://xyzxyz.supabase.co
const SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY'; // starts with eyJ...

// Load Supabase from CDN (added via index.html script tag)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth state ────────────────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;

// Listen to auth changes (login / logout / token refresh)
db.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    currentProfile = await Auth.getProfile(session.user.id);
    updateNavForUser(currentProfile);
  } else {
    currentUser    = null;
    currentProfile = null;
    updateNavForUser(null);
  }
});

function updateNavForUser(profile) {
  const av   = document.getElementById('userAv');
  const item = document.getElementById('authToggleItem');
  if (profile) {
    const initials = (profile.full_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    av.textContent   = initials;
    av.style.background = 'var(--accent)';
    item.textContent = '🚪 Log Out';
    item.onclick     = Auth.signOut;
  } else {
    av.textContent   = '?';
    item.textContent = '🔐 Log In / Sign Up';
    item.onclick     = () => goPage('auth');
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────────
const Auth = {

  async signUp(email, password, fullName) {
    showToast('Creating your account…', 'info');
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) { showToast(error.message, 'error'); return null; }
    showToast('Account created! Check your email to verify.', 'success');
    return data;
  },

  async signIn(email, password) {
    showToast('Signing in…', 'info');
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) { showToast(error.message, 'error'); return null; }
    showToast('Welcome back! 🎉', 'success');
    goPage('home');
    return data;
  },

  async signInWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) showToast(error.message, 'error');
  },

  async signOut() {
    await db.auth.signOut();
    showToast('Signed out. See you at the next party! 🎉', 'success');
    goPage('home');
  },

  async getProfile(userId) {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  },

  async updateProfile(updates) {
    if (!currentUser) return null;
    const { data, error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    currentProfile = data;
    showToast('Profile updated!', 'success');
    return data;
  },

  requireAuth(action) {
    if (!currentUser) {
      showToast('Please log in to ' + action, 'info');
      goPage('auth');
      return false;
    }
    return true;
  }
};

// ── Venues API ────────────────────────────────────────────────────────────────
const Venues = {

  async getAll({ city, occasion, minCapacity, maxPrice, type } = {}) {
    let query = db
      .from('venues')
      .select(`*, host:profiles(id, full_name, avatar_url)`)
      .eq('is_active', true)
      .order('rating_avg', { ascending: false });

    if (city)        query = query.ilike('city', `%${city}%`);
    if (occasion)    query = query.contains('occasions', [occasion]);
    if (minCapacity) query = query.gte('capacity', minCapacity);
    if (maxPrice)    query = query.lte('price_per_hour', maxPrice);
    if (type)        query = query.eq('venue_type', type);

    const { data, error } = await query.limit(24);
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async getById(id) {
    const { data, error } = await db
      .from('venues')
      .select(`*, host:profiles(id, full_name, avatar_url, bio, created_at)`)
      .eq('id', id)
      .single();
    if (error) { console.error(error); return null; }
    return data;
  },

  async getFeatured() {
    const { data } = await db
      .from('venues')
      .select(`*, host:profiles(id, full_name, avatar_url)`)
      .eq('is_active', true)
      .order('rating_avg', { ascending: false })
      .limit(8);
    return data || [];
  },

  async create(venueData) {
    if (!Auth.requireAuth('list a venue')) return null;
    const { data, error } = await db
      .from('venues')
      .insert({ ...venueData, host_id: currentUser.id })
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    showToast('Venue listed successfully! 🎉', 'success');
    return data;
  },

  async update(id, updates) {
    const { data, error } = await db
      .from('venues')
      .update(updates)
      .eq('id', id)
      .eq('host_id', currentUser.id)
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    return data;
  },

  async getHostVenues() {
    if (!currentUser) return [];
    const { data } = await db
      .from('venues')
      .select('*')
      .eq('host_id', currentUser.id)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async uploadPhoto(file, venueId) {
    const ext  = file.name.split('.').pop();
    const path = `${venueId}/${Date.now()}.${ext}`;
    const { error } = await db.storage.from('venue-photos').upload(path, file);
    if (error) { showToast('Photo upload failed: ' + error.message, 'error'); return null; }
    const { data } = db.storage.from('venue-photos').getPublicUrl(path);
    return data.publicUrl;
  }
};

// ── Reviews API ───────────────────────────────────────────────────────────────
const Reviews = {

  async getForVenue(venueId) {
    const { data } = await db
      .from('reviews')
      .select(`*, reviewer:profiles(id, full_name, avatar_url)`)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(10);
    return data || [];
  },

  async create(bookingId, venueId, rating, comment) {
    if (!Auth.requireAuth('leave a review')) return null;
    const { data, error } = await db
      .from('reviews')
      .insert({ booking_id: bookingId, venue_id: venueId, reviewer_id: currentUser.id, rating, comment })
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    showToast('Review submitted! Thank you 🎉', 'success');
    return data;
  }
};

// ── Bookings API ──────────────────────────────────────────────────────────────
const Bookings = {

  async create(venueId, { partyDate, startTime, hours, occasion, guestsCount, totalPrice, cleaningFee, serviceFee, pricePerHour }) {
    if (!Auth.requireAuth('make a booking')) return null;
    const { data, error } = await db
      .from('bookings')
      .insert({
        venue_id: venueId,
        guest_id: currentUser.id,
        party_date:    partyDate,
        start_time:    startTime || '18:00',
        hours,
        occasion,
        guests_count:  guestsCount,
        price_per_hour: pricePerHour,
        cleaning_fee:  cleaningFee,
        service_fee:   serviceFee,
        total_price:   totalPrice,
        status:        'pending'
      })
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    return data;
  },

  async getMyBookings() {
    if (!currentUser) return [];
    const { data } = await db
      .from('bookings')
      .select(`*, venue:venues(id, name, city, cover_emoji, venue_type)`)
      .eq('guest_id', currentUser.id)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getHostBookings() {
    if (!currentUser) return [];
    const { data } = await db
      .from('bookings')
      .select(`*, venue:venues(id, name, city), guest:profiles(id, full_name, avatar_url)`)
      .in('venue_id', await Venues.getHostVenues().then(v => v.map(x => x.id)))
      .order('party_date', { ascending: true });
    return data || [];
  },

  async updateStatus(bookingId, status) {
    const { data, error } = await db
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    showToast(`Booking ${status}!`, 'success');
    return data;
  },

  async cancel(bookingId) {
    return this.updateStatus(bookingId, 'cancelled');
  }
};

// ── Wishlist API ──────────────────────────────────────────────────────────────
const Wishlist = {

  async toggle(venueId, heartBtn) {
    if (!Auth.requireAuth('save a venue')) return;
    const isSaved = heartBtn.classList.contains('saved');
    if (isSaved) {
      await db.from('wishlists').delete().eq('user_id', currentUser.id).eq('venue_id', venueId);
      heartBtn.classList.remove('saved');
      showToast('Removed from wishlist', 'info');
    } else {
      await db.from('wishlists').insert({ user_id: currentUser.id, venue_id: venueId });
      heartBtn.classList.add('saved');
      showToast('Saved to wishlist ❤️', 'success');
    }
  },

  async getAll() {
    if (!currentUser) return [];
    const { data } = await db
      .from('wishlists')
      .select(`venue:venues(*, host:profiles(id, full_name))`)
      .eq('user_id', currentUser.id);
    return (data || []).map(w => w.venue).filter(Boolean);
  },

  async getIds() {
    if (!currentUser) return [];
    const { data } = await db
      .from('wishlists')
      .select('venue_id')
      .eq('user_id', currentUser.id);
    return (data || []).map(w => w.venue_id);
  }
};

// ── Messages API ──────────────────────────────────────────────────────────────
const Messages = {

  async send(receiverId, content, venueId = null, bookingId = null) {
    if (!Auth.requireAuth('send a message')) return null;
    const { data, error } = await db
      .from('messages')
      .insert({ sender_id: currentUser.id, receiver_id: receiverId, content, venue_id: venueId, booking_id: bookingId })
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return null; }
    return data;
  },

  async getConversation(otherUserId) {
    if (!currentUser) return [];
    const { data } = await db
      .from('messages')
      .select(`*, sender:profiles!sender_id(id, full_name, avatar_url)`)
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });
    return data || [];
  },

  // Real-time: subscribe to new messages
  subscribe(otherUserId, callback) {
    return db.channel('messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, payload => callback(payload.new))
      .subscribe();
  }
};

// ── UI Helpers ────────────────────────────────────────────────────────────────

// Toast notifications
function showToast(message, type = 'info') {
  const existing = document.getElementById('ph-toast');
  if (existing) existing.remove();

  const colors = { success: '#00c896', error: '#ff4d6d', info: '#ff9a3c' };
  const toast = document.createElement('div');
  toast.id = 'ph-toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1e1e1e; border:1.5px solid ${colors[type]};
    color:#f0ece6; padding:12px 22px; border-radius:999px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
    box-shadow:0 8px 32px rgba(0,0,0,.5); z-index:9999;
    animation:slideUp .25s ease; white-space:nowrap;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Loading skeleton
function showSkeleton(containerId, count = 4) {
  const skeletonCard = `
    <div style="border-radius:18px;overflow:hidden;background:#1e1e1e;border:1.5px solid #2a2a2a">
      <div style="aspect-ratio:4/3;background:linear-gradient(90deg,#1e1e1e 25%,#2a2a2a 50%,#1e1e1e 75%);background-size:200% 100%;animation:shimmer 1.4s infinite"></div>
      <div style="padding:14px">
        <div style="height:12px;background:#2a2a2a;border-radius:6px;margin-bottom:8px;width:70%;animation:shimmer 1.4s infinite"></div>
        <div style="height:10px;background:#2a2a2a;border-radius:6px;width:50%;animation:shimmer 1.4s infinite"></div>
      </div>
    </div>`;

  const shimmerStyle = document.getElementById('shimmer-style');
  if (!shimmerStyle) {
    const s = document.createElement('style');
    s.id = 'shimmer-style';
    s.textContent = '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(s);
  }

  const el = document.getElementById(containerId);
  if (el) el.innerHTML = Array(count).fill(skeletonCard).join('');
}

// Venue card renderer (used by app.js)
function venueCard(v, savedIds = []) {
  const isSaved = savedIds.includes(v.id);
  const rating  = v.rating_avg > 0 ? Number(v.rating_avg).toFixed(2) : 'New';
  const price   = '₹' + Number(v.price_per_hour).toLocaleString('en-IN') + '/hr';
  const cap     = 'Up to ' + v.capacity;
  return `
    <div class="prop-card" onclick="openVenue('${v.id}')" data-tip="View ${v.name}">
      <div class="prop-img">
        <div class="prop-img-placeholder" style="font-size:52px">${v.cover_emoji || '🎉'}</div>
        <div class="card-type-badge">${v.badge_label || v.venue_type}</div>
        <button class="heart-btn ${isSaved ? 'saved' : ''}"
          onclick="event.stopPropagation(); Wishlist.toggle('${v.id}', this)"
          data-tip="Save to wishlist">♥</button>
      </div>
      <div class="prop-info">
        <div class="prop-loc">
          <div class="prop-city">${v.city}</div>
          <div class="prop-rating">⭐ ${rating}</div>
        </div>
        <div class="prop-name">${v.name}</div>
        <div class="prop-capacity">👥 ${cap}</div>
        <div class="prop-price">${price} <span>· min ${v.min_hours} hrs</span></div>
      </div>
    </div>`;
}

// Render venues into a grid with skeleton loading
async function renderVenueGrid(containerId, fetchFn, filters = {}) {
  showSkeleton(containerId);
  const [venues, savedIds] = await Promise.all([
    fetchFn(filters),
    currentUser ? Wishlist.getIds() : Promise.resolve([])
  ]);
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!venues.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">No venues found. Try different filters.</div>';
    return;
  }
  el.innerHTML = venues.map(v => venueCard(v, savedIds)).join('');
}

// Open venue detail page
async function openVenue(venueId) {
  selectedVenueId = venueId;
  goPage('listing');
  loadVenuePage(venueId);
}

// ── Selected venue state ──────────────────────────────────────────────────────
let selectedVenueId  = null;
let selectedVenueData = null;

async function loadVenuePage(venueId) {
  // Show skeleton while loading
  document.getElementById('listingTitle').textContent = 'Loading…';
  document.getElementById('listingSub').textContent   = '';

  const [venue, reviews] = await Promise.all([
    Venues.getById(venueId),
    Reviews.getForVenue(venueId)
  ]);

  if (!venue) { showToast('Venue not found', 'error'); goPage('search'); return; }
  selectedVenueData = venue;

  // Populate listing page
  document.getElementById('listingTitle').textContent   = venue.name;
  document.getElementById('listingSub').textContent     = `📍 ${venue.city} · Hosted by ${venue.host?.full_name || 'Host'}`;
  document.getElementById('listingPrice').textContent   = Number(venue.price_per_hour).toLocaleString('en-IN');
  document.getElementById('listingGuests').textContent  = venue.capacity;
  document.getElementById('listingBeds').textContent    = venue.min_hours + ' hrs min';
  document.getElementById('listingRating').textContent  = venue.rating_avg > 0 ? venue.rating_avg : 'New';
  document.getElementById('listingType').textContent    = venue.venue_type;
  document.getElementById('listingMainImg').style.fontSize = '80px';
  document.getElementById('listingMainImg').querySelector('.prop-img-placeholder') &&
    (document.getElementById('listingMainImg').querySelector('.prop-img-placeholder').textContent = venue.cover_emoji);

  // Render reviews
  const revGrid = document.getElementById('reviewGrid');
  if (revGrid) {
    if (reviews.length) {
      revGrid.innerHTML = reviews.slice(0,4).map(r => `
        <div class="review-card">
          <div class="reviewer">
            <div class="reviewer-av">${(r.reviewer?.full_name||'?')[0].toUpperCase()}</div>
            <div>
              <div class="reviewer-name">${r.reviewer?.full_name || 'Guest'}</div>
              <div class="reviewer-date">${new Date(r.created_at).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</div>
            </div>
          </div>
          <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
          <div class="review-text" style="margin-top:8px">${r.comment || ''}</div>
        </div>`).join('');
    } else {
      revGrid.innerHTML = '<div style="color:var(--muted);font-size:13px">No reviews yet — be the first to party here!</div>';
    }
  }

  calcPrice();
}
