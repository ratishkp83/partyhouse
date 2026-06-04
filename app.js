// ============================================================
// app.js — PartyHouse UI logic (Supabase-powered)
// ============================================================

// ── Indian cities for location autocomplete ───────────────────
const INDIA_CITIES = [
  'Agra','Ahmedabad','Aizawl','Ajmer','Aligarh','Allahabad','Amravati','Amritsar',
  'Aurangabad','Bengaluru','Bhopal','Bhubaneswar','Chandigarh','Chennai','Coimbatore',
  'Cuttack','Dehradun','Delhi','Dhanbad','Durgapur','Faridabad','Ghaziabad','Goa',
  'Gorakhpur','Gurgaon','Guwahati','Gwalior','Hubballi','Hyderabad','Imphal',
  'Indore','Itanagar','Jaipur','Jalandhar','Jammu','Jamshedpur','Jodhpur','Kanpur',
  'Kochi','Kohima','Kolkata','Kozhikode','Lucknow','Ludhiana','Madurai','Mangaluru',
  'Meerut','Mumbai','Mysuru','Nagpur','Nashik','Navi Mumbai','Noida','Panaji',
  'Patna','Prayagraj','Puducherry','Pune','Raipur','Rajkot','Ranchi','Salem',
  'Shillong','Shimla','Siliguri','Srinagar','Surat','Thane','Thiruvananthapuram',
  'Tiruchirappalli','Udaipur','Vadodara','Varanasi','Vijayawada','Visakhapatnam'
];

function initCityAutocomplete() {
  ['cityListNav','cityListHero','wizCityList'].forEach(id => {
    const dl = document.getElementById(id);
    if (!dl) return;
    INDIA_CITIES.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city;
      dl.appendChild(opt);
    });
  });
}
document.addEventListener('DOMContentLoaded', initCityAutocomplete);

// Hero search button — syncs values to nav bar then searches
function heroSearch() {
  const city    = document.getElementById('heroWhere')?.value?.trim() || '';
  const date    = document.getElementById('heroDate')?.value || '';
  const occ     = document.getElementById('heroOccasion')?.value || '';
  const guests  = parseInt(document.getElementById('heroGuests')?.value) || undefined;
  // Mirror to nav bar so filters stay in sync
  if (city)   { const nw = document.getElementById('navWhere');   if (nw) nw.value = city; }
  if (date)   { const nd = document.getElementById('navDate');    if (nd) nd.value = date; }
  if (occ)    { const no = document.getElementById('navPartyType'); if (no) no.value = occ; }
  if (guests) { const ng = document.getElementById('navGuests');  if (ng) ng.value = guests; }
  goPage('search');
  loadSearch({ city: city || undefined, occasion: occ || undefined, minCapacity: guests });
}

// ── Confetti ──────────────────────────────────────────────────
(function spawnConfetti() {
  const container = document.getElementById('confetti');
  if (!container) return;
  const colors = ['#e8450a','#f0892a','#d97706','#fde8dd','#f4d0c0'];
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    const size = Math.random() * 6 + 4;
    dot.style.cssText = `
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*8+6}s;
      animation-delay:${Math.random()*8}s;`;
    container.appendChild(dot);
  }
})();

// ── Page navigation ───────────────────────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) { pg.classList.add('active'); window.scrollTo(0, 0); }
  document.getElementById('catBar').style.display =
    (id === 'home' || id === 'search') ? '' : 'none';
  document.getElementById('userDropdown').classList.remove('open');

  // Trigger data loads per page
  if (id === 'home')      loadHome();
  if (id === 'search')    loadSearch();
  if (id === 'trips')     loadMyBookings();
  if (id === 'wishlist')  loadWishlist();
  if (id === 'dashboard') loadDashboard();
}

// ── Dropdown ──────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  const wrap = document.getElementById('userMenuWrap');
  if (wrap && !wrap.contains(e.target))
    document.getElementById('userDropdown').classList.remove('open');
});

// ── Home ──────────────────────────────────────────────────────
async function loadHome() {
  await renderVenueGrid('featuredGrid', Venues.getFeatured.bind(Venues));
}

// ── Search ────────────────────────────────────────────────────
let searchFilters = {};

async function loadSearch(filters = {}) {
  searchFilters = filters;
  const count = document.getElementById('resultsCount');
  if (count) count.textContent = 'Finding venues…';
  await renderVenueGrid('searchGrid', () => Venues.getAll(filters));
  // Update count from rendered cards
  const cards = document.querySelectorAll('#searchGrid .prop-card');
  if (count) count.textContent = cards.length + ' party venues found';
}

function setCat(el, icon, name) {
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  goPage('search');
  loadSearch({ occasion: name });
}

function updatePrice(v) {
  document.getElementById('priceVal').textContent =
    'Up to ₹' + Number(v).toLocaleString('en-IN');
}

function toggleSw(id) {
  document.getElementById(id).classList.toggle('on');
}

function applyFilters() {
  const city    = document.getElementById('navWhere')?.value?.trim() || '';
  const price   = document.getElementById('priceSlider')?.value;
  const guests  = parseInt(document.getElementById('navGuests')?.value) || undefined;
  goPage('search');
  loadSearch({
    city:         city || undefined,
    maxPrice:     price ? parseInt(price) : undefined,
    minCapacity:  guests,
  });
}

// Nav search button
document.getElementById('navSearchBar')?.querySelector('.search-btn')
  ?.addEventListener('click', applyFilters);

// ── Auth forms ────────────────────────────────────────────────
function handleAuth() {
  if (currentUser) Auth.signOut();
  else goPage('auth');
}

function authTab(el, mode) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('nameField').style.display  = mode === 'signup' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent   = mode === 'signup' ? 'Create Account →' : 'Log In →';
  document.getElementById('authSubmit').dataset.mode  = mode;
}

async function handleAuthSubmit() {
  const mode     = document.getElementById('authSubmit').dataset.mode || 'login';
  const email    = document.getElementById('authEmail')?.value?.trim();
  const password = document.getElementById('authPassword')?.value;
  const name     = document.getElementById('authName')?.value?.trim();

  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }

  if (mode === 'signup') {
    if (!name) { showToast('Please enter your name', 'error'); return; }
    await Auth.signUp(email, password, name);
  } else {
    await Auth.signIn(email, password);
  }
}

async function handleGoogleAuth() {
  await Auth.signInWithGoogle();
}

// ── Listing detail ────────────────────────────────────────────
let guestCount = 20;

function adjGuests(d) {
  const venue = selectedVenueData;
  const max   = venue?.capacity || 50;
  guestCount  = Math.max(2, Math.min(max, guestCount + d));
  document.getElementById('guestCount').textContent = guestCount;
}

function calcPrice() {
  const hours    = parseInt(document.getElementById('bwHours')?.value || 6);
  const rate     = selectedVenueData?.price_per_hour || 12000;
  const cleaning = selectedVenueData?.cleaning_fee   || 3500;
  const subtotal = rate * hours;
  const fee      = Math.round((subtotal + cleaning) * 0.08);
  const total    = subtotal + cleaning + fee;

  const bd = document.getElementById('bwBreakdown');
  if (bd) {
    bd.innerHTML = `
      <div class="bw-row"><span>₹${rate.toLocaleString('en-IN')} × ${hours} hours</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>Cleaning & setup fee</span><span>₹${cleaning.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>PartyHouse service fee (8%)</span><span>₹${fee.toLocaleString('en-IN')}</span></div>
      <div class="bw-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>`;
  }
  return { hours, rate, cleaning, fee, total };
}

// ── Booking flow ──────────────────────────────────────────────
let bookStep = 1;
let createdBooking = null;

function nextStep(n) {
  document.getElementById('bookStep' + bookStep).style.display = 'none';
  bookStep = n;
  document.getElementById('bookStep' + n).style.display = 'block';
  ['pd1','pd2','pd3'].forEach((id, i) => {
    document.getElementById(id).className =
      'prog-dot ' + (i+1 < n ? 'done' : i+1 === n ? 'active' : 'pending');
  });
  document.getElementById('pl1').className = 'prog-line' + (n > 2 ? ' done' : '');
  document.getElementById('pl2').className = 'prog-line' + (n > 3 ? ' done' : '');
  window.scrollTo(0, 0);
}

async function startBooking() {
  if (!Auth.requireAuth('make a booking')) return;
  bookStep = 1;
  document.getElementById('bookStep1').style.display = 'block';
  document.getElementById('bookStep2').style.display = 'none';
  document.getElementById('bookStep3').style.display = 'none';
  goPage('booking');
  // Pre-fill booking summary from selected venue
  populateBookingSummary();
}

function populateBookingSummary() {
  const v     = selectedVenueData;
  if (!v) return;
  const price = calcPrice();
  const date  = document.getElementById('bwDate')?.value || 'TBD';
  const hours = document.getElementById('bwHours')?.value || 6;
  const occ   = document.querySelector('.bw-dates select')?.value || 'Party';

  const summaryEl = document.getElementById('bookingSummaryVenue');
  if (summaryEl) summaryEl.textContent = v.name;
  const summaryCity = document.getElementById('bookingSummaryCity');
  if (summaryCity) summaryCity.textContent = v.city;
  const summaryDate = document.getElementById('bookingSummaryDate');
  if (summaryDate) summaryDate.textContent = `Date: ${date} · ${hours} hours · ${occ} · ${guestCount} guests`;

  // Price breakdown in step 1
  const pb = document.getElementById('bookingPriceBreakdown');
  if (pb) {
    pb.innerHTML = `
      <div class="pb-row"><span>₹${v.price_per_hour.toLocaleString('en-IN')} × ${hours} hours</span><span>₹${(v.price_per_hour*hours).toLocaleString('en-IN')}</span></div>
      <div class="pb-row"><span>Cleaning & setup fee</span><span>₹${(v.cleaning_fee||3500).toLocaleString('en-IN')}</span></div>
      <div class="pb-row"><span>PartyHouse service fee</span><span>₹${price.fee.toLocaleString('en-IN')}</span></div>
      <div class="pb-row total"><span>Total (INR)</span><span>₹${price.total.toLocaleString('en-IN')}</span></div>`;
  }

  const totalEl = document.getElementById('bookingConfirmTotal');
  if (totalEl) totalEl.textContent = `Confirm & Pay ₹${price.total.toLocaleString('en-IN')}`;
}

async function confirmPayment() {
  if (!selectedVenueData) return;
  const v     = selectedVenueData;
  const price = calcPrice();
  const date  = document.getElementById('bwDate')?.value;
  const hours = parseInt(document.getElementById('bwHours')?.value || 6);
  const occ   = document.querySelector('#page-listing .bw-dates select')?.value || 'Party';

  showToast('Processing booking…', 'info');

  createdBooking = await Bookings.create(v.id, {
    partyDate:    date || new Date().toISOString().split('T')[0],
    hours,
    occasion:     occ,
    guestsCount:  guestCount,
    pricePerHour: v.price_per_hour,
    cleaningFee:  v.cleaning_fee || 3500,
    serviceFee:   price.fee,
    totalPrice:   price.total
  });

  if (createdBooking) {
    // Show confirmation
    const codeEl = document.getElementById('confirmationCode');
    if (codeEl) codeEl.textContent = createdBooking.confirmation_code;
    nextStep(3);
    showToast('Booking confirmed! 🎉', 'success');
  }
}

// ── My Bookings (trips) ───────────────────────────────────────
async function loadMyBookings() {
  if (!currentUser) {
    document.getElementById('tripsGrid').innerHTML =
      '<div style="text-align:center;padding:48px;color:var(--muted)">Please <a onclick="goPage(\'auth\')" style="color:var(--accent);cursor:pointer">log in</a> to view your bookings.</div>';
    return;
  }
  document.getElementById('tripsGrid').innerHTML =
    '<div style="color:var(--muted);padding:24px">Loading bookings…</div>';

  const bookings = await Bookings.getMyBookings();
  const grid = document.getElementById('tripsGrid');

  if (!bookings.length) {
    grid.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">No bookings yet. <a onclick="goPage(\'search\')" style="color:var(--accent);cursor:pointer">Find a venue →</a></div>';
    return;
  }

  const statusClass = { confirmed:'upcoming', pending:'upcoming', cancelled:'completed', completed:'completed' };
  const statusLabel = { confirmed:'✅ Confirmed', pending:'⏳ Pending', cancelled:'❌ Cancelled', completed:'🎊 Completed' };

  grid.innerHTML = bookings.map(b => `
    <div class="trip-card">
      <div class="trip-img-area">${b.venue?.cover_emoji || '🎉'}</div>
      <div class="trip-card-body">
        <h3>${b.venue?.name || 'Venue'}</h3>
        <p>${b.venue?.city || ''} · ${new Date(b.party_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · ${b.hours} hrs</p>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
          ${b.occasion || 'Party'} · ${b.guests_count} guests · ₹${b.total_price.toLocaleString('en-IN')}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:.5px">${b.confirmation_code}</div>
        <span class="trip-status ${statusClass[b.status]||'upcoming'}">${statusLabel[b.status]||b.status}</span>
        ${b.status==='pending'||b.status==='confirmed' ? `
          <button onclick="Bookings.cancel('${b.id}').then(loadMyBookings)"
            style="margin-left:10px;font-size:11px;color:var(--muted);cursor:pointer;border:1px solid var(--border);padding:3px 10px;border-radius:999px;background:none">
            Cancel
          </button>` : ''}
      </div>
    </div>`).join('');
}

// ── Wishlist page ─────────────────────────────────────────────
async function loadWishlist() {
  if (!currentUser) {
    document.getElementById('wishlistGrid').innerHTML =
      '<div style="text-align:center;padding:48px;color:var(--muted)">Please <a onclick="goPage(\'auth\')" style="color:var(--accent);cursor:pointer">log in</a> to view saved venues.</div>';
    return;
  }
  showSkeleton('wishlistGrid', 4);
  const venues   = await Wishlist.getAll();
  const savedIds = venues.map(v => v.id);
  const el = document.getElementById('wishlistGrid');
  if (!venues.length) {
    el.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">No saved venues yet. Heart a venue to save it here.</div>';
    return;
  }
  el.innerHTML = venues.map(v => venueCard(v, savedIds)).join('');
}

// ── Host Dashboard ────────────────────────────────────────────
async function loadDashboard() {
  if (!currentUser) { goPage('auth'); return; }

  const [hostVenues, bookings] = await Promise.all([
    Venues.getHostVenues(),
    Bookings.getHostBookings()
  ]);

  // Metrics
  const pending   = bookings.filter(b => b.status === 'pending').length;
  const earnings  = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.total_price, 0);

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('dashActiveVenues',  hostVenues.length);
  setEl('dashPending',       pending);
  setEl('dashEarnings',      '₹' + (earnings/100000).toFixed(1) + 'L');

  // Bookings table
  const tbody = document.getElementById('dashBookingsBody');
  if (tbody) {
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No bookings yet</td></tr>';
    } else {
      const statusClass = { confirmed:'status-confirmed', pending:'status-pending', cancelled:'status-cancelled', completed:'status-confirmed' };
      tbody.innerHTML = bookings.slice(0,8).map(b => `
        <tr>
          <td><strong>${b.guest?.full_name || 'Guest'}</strong></td>
          <td>${b.venue?.name || ''}</td>
          <td>${new Date(b.party_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
          <td>${b.occasion || '—'}</td>
          <td>₹${b.total_price.toLocaleString('en-IN')}</td>
          <td>
            <span class="status-badge ${statusClass[b.status]||'status-pending'}">${b.status}</span>
            ${b.status==='pending' ? `
              <button onclick="Bookings.updateStatus('${b.id}','confirmed').then(loadDashboard)"
                style="margin-left:6px;font-size:11px;color:var(--success);cursor:pointer;border:1px solid var(--success);padding:2px 8px;border-radius:999px;background:none">
                Confirm
              </button>` : ''}
          </td>
        </tr>`).join('');
    }
  }

  // Venue list in sidebar
  const venueList = document.getElementById('dashVenueList');
  if (venueList) {
    venueList.innerHTML = hostVenues.length ? hostVenues.map(v => `
      <div style="display:flex;gap:12px;align-items:center;cursor:pointer;margin-bottom:14px" onclick="openVenue('${v.id}')">
        <div style="width:48px;height:48px;border-radius:var(--r-md);background:#1e1e1e;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${v.cover_emoji||'🎉'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${v.name}</div>
          <div style="font-size:12px;color:var(--muted)">₹${v.price_per_hour.toLocaleString('en-IN')}/hr · Max ${v.capacity} · ⭐ ${v.rating_avg||'New'}</div>
        </div>
        <span class="status-badge status-confirmed">${v.is_active?'Active':'Draft'}</span>
      </div>`).join('') :
      '<div style="color:var(--muted);font-size:13px">No venues yet. <a onclick="goPage(\'new-listing\')" style="color:var(--accent);cursor:pointer">Add one →</a></div>';
  }
}

// ── New Listing Wizard ────────────────────────────────────────
// ── Listing Wizard ───────────────────────────────────────────
let wizStep = 1;
const wizVals = { wg: 30, wh: 4 };
let wizPhotos  = []; // array of File objects

const wizData = {
  venue_type:       'Rooftop / Terrace',
  capacity:         30,
  min_hours:        4,
  amenities:        ['DJ / Sound', 'Party Lights'],
  occasions:        ['Couple', 'Family', 'Birthday'],
  price_per_hour:   5000,
  weekend_rate:     null,
  cleaning_fee:     2500,
  security_deposit: 10000,
  rules: { alcohol: false, catering: true, smoking: false, pets: false, adults_only: false, instant_book: false },
};

function wizNext(n) {
  document.getElementById('wizStep' + wizStep).style.display = 'none';
  wizStep = n;
  const total = 8;
  document.getElementById('wizStep' + n).style.display = 'block';
  document.getElementById('wizBar').style.width = (n / total * 100) + '%';
  document.getElementById('wizCounter').textContent = 'Step ' + n + ' of ' + total;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function adjWiz(k, d) {
  const mins  = { wg: 5, wh: 1 };
  const steps = { wg: 5, wh: 1 };
  wizVals[k]  = Math.max(mins[k] || 1, wizVals[k] + d * (steps[k] || 1));
  document.getElementById(k + '-val').textContent = wizVals[k];
  if (k === 'wg') wizData.capacity  = wizVals[k];
  if (k === 'wh') wizData.min_hours = wizVals[k];
}

function selType(el, type) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  wizData.venue_type = type;
}

function toggleAm(el) {
  el.classList.toggle('sel');
  const label = el.querySelector('span').textContent.trim();
  if (el.classList.contains('sel')) {
    if (!wizData.amenities.includes(label)) wizData.amenities.push(label);
  } else {
    wizData.amenities = wizData.amenities.filter(a => a !== label);
  }
}

function toggleSw(id) {
  const el  = document.getElementById(id);
  const key = id.replace('sw-', '').replace('-', '_');
  el.classList.toggle('on');
  if (wizData.rules) wizData.rules[key] = el.classList.contains('on');
}

// ── Step validations ─────────────────────────────────────────
function wizValidateStep2() {
  const name    = document.getElementById('wizVenueName')?.value?.trim();
  const city    = document.getElementById('wizCity')?.value?.trim();
  const area    = document.getElementById('wizArea')?.value?.trim();
  const address = document.getElementById('wizAddress')?.value?.trim();
  const pin     = document.getElementById('wizPin')?.value?.trim();
  const state   = document.getElementById('wizState')?.value;
  if (!name)    { showToast('Please enter a venue name', 'error'); return; }
  if (!city)    { showToast('Please enter the city', 'error'); return; }
  if (!area)    { showToast('Please enter the neighbourhood / area', 'error'); return; }
  if (!address) { showToast('Please enter the full address', 'error'); return; }
  if (!pin || pin.length !== 6 || isNaN(pin)) { showToast('Please enter a valid 6-digit PIN code', 'error'); return; }
  if (!state)   { showToast('Please select a state', 'error'); return; }
  wizNext(3);
}

function wizValidateStep3() {
  const desc = document.getElementById('wizDesc')?.value?.trim();
  if (!desc || desc.length < 80) {
    showToast('Please write at least 80 characters describing your venue', 'error');
    return;
  }
  wizNext(4);
}

function wizValidateStep6() {
  if (wizPhotos.length < 3) {
    showToast('Please upload at least 3 photos of your venue', 'error');
    return;
  }
  wizNext(7);
}

function wizValidateStep7() {
  const price = parseInt(document.getElementById('wizPrice')?.value);
  if (!price || price < 500) {
    showToast('Please set a valid hourly rate (minimum ₹500)', 'error');
    return;
  }
  wizData.price_per_hour   = price;
  wizData.weekend_rate     = parseInt(document.getElementById('wizWeekendPrice')?.value) || null;
  wizData.cleaning_fee     = parseInt(document.getElementById('wizCleaning')?.value) || 0;
  wizData.security_deposit = parseInt(document.getElementById('wizDeposit')?.value) || 0;
  wizNext(8);
}

// ── Photo handling ────────────────────────────────────────────
function handlePhotoUpload(input) {
  const files = Array.from(input.files);
  if (wizPhotos.length + files.length > 15) {
    showToast('Maximum 15 photos allowed', 'error');
    return;
  }
  files.forEach(f => {
    if (f.size > 10 * 1024 * 1024) { showToast(f.name + ' exceeds 10 MB', 'error'); return; }
    wizPhotos.push(f);
    const reader = new FileReader();
    reader.onload = e => renderPhotoPreview(e.target.result, wizPhotos.length - 1);
    reader.readAsDataURL(f);
  });
  input.value = '';
}

function renderPhotoPreview(src, idx) {
  const grid = document.getElementById('photoPreviewGrid');
  const div  = document.createElement('div');
  div.className = 'photo-preview-item';
  div.dataset.idx = idx;
  div.innerHTML = `<img src="${src}" alt="venue photo">
    <div class="photo-remove" onclick="removePhoto(${idx})">✕</div>`;
  grid.appendChild(div);
}

function removePhoto(idx) {
  wizPhotos.splice(idx, 1);
  const grid  = document.getElementById('photoPreviewGrid');
  const items = grid.querySelectorAll('.photo-preview-item');
  items[idx]?.remove();
  // re-index remaining remove buttons
  grid.querySelectorAll('.photo-preview-item').forEach((el, i) => {
    el.dataset.idx = i;
    el.querySelector('.photo-remove').setAttribute('onclick', `removePhoto(${i})`);
  });
}

// ── Earnings preview (live update on price input) ─────────────
document.addEventListener('input', e => {
  if (e.target.id === 'wizPrice') updateEarningsPreview(parseInt(e.target.value) || 0);
});

function updateEarningsPreview(rate) {
  const hours   = wizData.min_hours || 4;
  const total   = rate * hours;
  const fee     = Math.round(total * 0.05);
  const net     = total - fee;
  const fmt     = n => n.toLocaleString('en-IN');
  const el      = id => document.getElementById(id);
  if (el('prevRate'))  el('prevRate').textContent  = fmt(rate);
  if (el('prevTotal')) el('prevTotal').textContent = fmt(total);
  if (el('prevFee'))   el('prevFee').textContent   = fmt(fee);
  if (el('prevNet'))   el('prevNet').textContent   = fmt(net);
}

// ── Submit for review ─────────────────────────────────────────
async function submitListingForReview() {
  if (!Auth.requireAuth('submit a listing')) return;

  const hostName  = document.getElementById('wizHostName')?.value?.trim();
  const hostPhone = document.getElementById('wizHostPhone')?.value?.trim();
  const hostEmail = document.getElementById('wizHostEmail')?.value?.trim();
  const exp       = document.getElementById('wizExperience')?.value;

  if (!hostName)  { showToast('Please enter your full name', 'error'); return; }
  if (!hostPhone) { showToast('Please enter your mobile number', 'error'); return; }
  if (!hostEmail) { showToast('Please enter your email address', 'error'); return; }
  if (!exp)       { showToast('Please select your hosting experience', 'error'); return; }

  const btn = document.getElementById('wizSubmitBtn');
  btn.textContent = 'Submitting…';
  btn.disabled    = true;

  // Collect occasions from checked boxes
  wizData.occasions = Array.from(
    document.querySelectorAll('.occ-check input:checked')
  ).map(cb => cb.value);

  const payload = {
    ...wizData,
    name:          document.getElementById('wizVenueName')?.value?.trim(),
    description:   document.getElementById('wizDesc')?.value?.trim(),
    city:          document.getElementById('wizCity')?.value?.trim(),
    address:       [
      document.getElementById('wizArea')?.value?.trim(),
      document.getElementById('wizAddress')?.value?.trim(),
      document.getElementById('wizPin')?.value?.trim(),
      document.getElementById('wizState')?.value,
    ].filter(Boolean).join(', '),
    cover_emoji:   document.querySelector('.type-card.sel .tc-icon')?.textContent || '🎉',
    badge_label:   (document.querySelector('.type-card.sel .tc-icon')?.textContent || '') + ' ' + wizData.venue_type,
    is_active:     false,        // Stays off until admin approves
    is_instant_book: wizData.rules?.instant_book || false,
    host_notes:    [
      `Host: ${hostName} | Phone: ${hostPhone} | Email: ${hostEmail}`,
      `Experience: ${exp}`,
      `Rules: alcohol=${wizData.rules?.alcohol}, catering=${wizData.rules?.catering}, smoking=${wizData.rules?.smoking}, pets=${wizData.rules?.pets}, adults_only=${wizData.rules?.adults_only}`,
      `Noise cutoff: ${document.getElementById('wizCutoff')?.value || 'none'}`,
      `Parking: ${document.getElementById('wizParking')?.value || 'not specified'} spots`,
      `GST: ${document.getElementById('wizGST')?.value?.trim() || 'not provided'}`,
      document.getElementById('wizHostNotes')?.value?.trim() || '',
    ].filter(Boolean).join('\n'),
  };

  const venue = await Venues.create(payload);

  btn.textContent = 'Submit for Review 🎉';
  btn.disabled    = false;

  if (venue) {
    const refCode = 'PH-' + venue.city?.toUpperCase().slice(0,3) + '-' + Date.now().toString(36).toUpperCase().slice(-6);
    // Show success step
    document.getElementById('wizStep8').style.display = 'none';
    document.getElementById('wizStep9').style.display = 'block';
    document.getElementById('wizConfirmCode').textContent = refCode;
    document.getElementById('wizBar').style.width = '100%';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── Misc helpers ──────────────────────────────────────────────
function toggleHeart(btn) { btn.classList.toggle('saved'); }
