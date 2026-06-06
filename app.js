// ============================================================
// app.js — PartyHouse UI logic (Supabase-powered)
// ============================================================

// ── Confirm modal (replaces browser confirm() — suppressed on mobile) ─────────
let _confirmResolve = null;
function showConfirm(msg) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmModalMsg').textContent = msg;
    document.getElementById('confirmModal').style.display = 'flex';
  });
}
function resolveConfirm(result) {
  document.getElementById('confirmModal').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

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
  // C4: Clean up realtime channel before leaving messages page
  if (msgRealtimeChannel) { db.removeChannel(msgRealtimeChannel); msgRealtimeChannel = null; }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) { pg.classList.add('active'); window.scrollTo(0, 0); }
  const catBar = document.getElementById('catBar');
  if (catBar) catBar.style.display = (id === 'home' || id === 'search') ? '' : 'none';
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('open');

  // Trigger data loads per page
  if (id === 'home')         loadHome();
  if (id === 'search')       loadSearch(searchFilters);
  if (id === 'trips')        loadMyBookings();
  if (id === 'wishlist')     loadWishlist();
  if (id === 'dashboard')    loadDashboard();
  if (id === 'new-listing')  startNewListing();
  if (id === 'admin')        loadAdminPanel();
  if (id === 'messages')     loadMessages();
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

function toggleFilterSw(id) {
  document.getElementById(id)?.classList.toggle('on');
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
  // M4: Don't compute with stale DOM fallbacks — require venue data to be loaded first
  if (!selectedVenueData) return null;

  const hours    = parseInt(document.getElementById('bwHours')?.value) || selectedVenueData.min_hours || 4;
  const cleaning = selectedVenueData.cleaning_fee ?? 0;

  // Apply weekend rate if the selected date is Saturday (6) or Sunday (0)
  const dateVal   = document.getElementById('bwDate')?.value;
  const isWeekend = dateVal ? [0, 6].includes(new Date(dateVal + 'T00:00:00').getDay()) : false;
  const weekdayRate  = selectedVenueData.price_per_hour;
  const weekendRate  = selectedVenueData.weekend_rate || null;
  const rate         = (isWeekend && weekendRate) ? weekendRate : weekdayRate;
  const rateLabel    = (isWeekend && weekendRate)
    ? `₹${rate.toLocaleString('en-IN')} × ${hours} hrs <span style="font-size:11px;color:var(--accent);font-weight:600">(Weekend rate)</span>`
    : `₹${rate.toLocaleString('en-IN')} × ${hours} hours`;

  const subtotal = rate * hours;
  const fee      = Math.round((subtotal + cleaning) * 0.08);
  const total    = subtotal + cleaning + fee;

  const bd = document.getElementById('bwBreakdown');
  if (bd) {
    bd.innerHTML = `
      <div class="bw-row"><span>${rateLabel}</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>Cleaning & setup fee</span><span>₹${cleaning.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>PartyHouse service fee (8%)</span><span>₹${fee.toLocaleString('en-IN')}</span></div>
      <div class="bw-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>`;
  }
  return { hours, rate, cleaning, fee, total };
}

// ── Availability Calendar ─────────────────────────────────────
let calYear   = 0;
let calMonth  = 0;  // 0-based
let calSelectedDate  = null;   // 'YYYY-MM-DD'
let calBookedDates   = [];     // array of booking objects { party_date, start_time, hours }

async function initCalendar(venueId) {
  const today = new Date();
  calYear  = today.getFullYear();
  calMonth = today.getMonth();
  calSelectedDate = null;
  document.getElementById('bwDate').value = '';
  document.getElementById('bwDateDisplay').textContent = 'Pick from calendar ↑';
  document.getElementById('bwDateDisplay').style.color = 'var(--muted)';
  calBookedDates = await Bookings.getVenueAvailability(venueId);
  renderCalendar();
}

function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent = `${months[calMonth]} ${calYear}`;

  const today      = new Date();
  today.setHours(0,0,0,0);
  const firstDay   = new Date(calYear, calMonth, 1).getDay();  // 0=Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Build a set of dates that are fully booked (only block entire day if total booked hours ≥ 18)
  const bookedSet = new Set();
  const dateHours = {};
  for (const b of calBookedDates) {
    dateHours[b.party_date] = (dateHours[b.party_date] || 0) + (b.hours || 0);
  }
  for (const [date, hrs] of Object.entries(dateHours)) {
    if (hrs >= 18) bookedSet.add(date);
  }

  let html = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day cal-empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dateObj = new Date(calYear, calMonth, d);
    const isPast    = dateObj < today;
    const isToday   = dateObj.getTime() === today.getTime();
    const isBooked  = bookedSet.has(dateStr);
    const isSelected = dateStr === calSelectedDate;

    let cls = 'cal-day';
    if (isPast)     cls += ' cal-past';
    else if (isBooked)  cls += ' cal-booked';
    else if (isSelected) cls += ' cal-selected';
    if (isToday && !isPast) cls += ' cal-today';

    const onclick = (!isPast && !isBooked) ? `onclick="selectCalDate('${dateStr}')"` : '';
    const tip     = isBooked ? `data-tip="Already booked"` : (!isPast ? `data-tip="Select ${dateStr}"` : '');
    html += `<div class="${cls}" ${onclick} ${tip}>${d}</div>`;
  }

  document.getElementById('calDays').innerHTML = html;
}

function selectCalDate(dateStr) {
  calSelectedDate = dateStr;
  document.getElementById('bwDate').value = dateStr;
  // Format display nicely
  const d = new Date(dateStr + 'T00:00:00');
  const display = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('bwDateDisplay').textContent = display;
  document.getElementById('bwDateDisplay').style.color = 'var(--text)';
  renderCalendar();  // re-render to show selection
  calcPrice();       // recalculate — may switch to weekend rate
}

function calPrevMonth() {
  if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
  // Don't allow going before current month
  const now = new Date();
  if (calYear < now.getFullYear() || (calYear === now.getFullYear() && calMonth < now.getMonth())) {
    calMonth = now.getMonth(); calYear = now.getFullYear();
  }
  renderCalendar();
}

function calNextMonth() {
  if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
  renderCalendar();
}

// Check if selected date+time overlaps with an existing booking
function hasTimeConflict(date, startTime, hours) {
  const start = timeToMins(startTime);
  const end   = start + hours * 60;
  return calBookedDates.some(b => {
    if (b.party_date !== date) return false;
    const bs = timeToMins(b.start_time);
    const be = bs + b.hours * 60;
    return start < be && end > bs;  // overlap
  });
}

function timeToMins(t) {
  const [h, m] = (t || '18:00').split(':').map(Number);
  return h * 60 + m;
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

  // C1: Prevent host from booking their own venue
  if (selectedVenueData?.host_id === currentUser?.id) {
    showToast("You can't book your own venue 🏠", 'error');
    return;
  }

  const date      = document.getElementById('bwDate')?.value;
  const startTime = document.getElementById('bwStartTime')?.value || '18:00';
  const hours     = parseInt(document.getElementById('bwHours')?.value || 6);

  if (!date) {
    showToast('Please select a date on the calendar first 📅', 'warn');
    return;
  }

  // H5: Validate the hidden date input is not in the past (guards against devtools manipulation)
  const today = new Date(); today.setHours(0,0,0,0);
  if (new Date(date + 'T00:00:00') < today) {
    showToast('Please select a future date 📅', 'warn');
    return;
  }

  if (hasTimeConflict(date, startTime, hours)) {
    showToast('That time slot is already booked. Try a different start time or date.', 'error');
    return;
  }

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
  const occ   = document.getElementById('bwOccasion')?.value || 'Party';
  const time  = document.getElementById('bwStartTime')?.value || '18:00';

  const summaryEl = document.getElementById('bookingSummaryVenue');
  if (summaryEl) summaryEl.textContent = v.name;
  const summaryCity = document.getElementById('bookingSummaryCity');
  if (summaryCity) summaryCity.textContent = v.city;
  const summaryDate = document.getElementById('bookingSummaryDate');
  if (summaryDate) summaryDate.textContent = `${date} at ${time} · ${hours} hrs · ${occ} · ${guestCount} guests`;

  // Price breakdown in step 1 — use calcPrice() result so weekend rate is reflected (C2)
  const pb = document.getElementById('bookingPriceBreakdown');
  if (pb) {
    const rateLabel = price.rate !== v.price_per_hour
      ? `₹${price.rate.toLocaleString('en-IN')} × ${hours} hours <span style="font-size:11px;color:var(--accent);font-weight:600">(Weekend rate)</span>`
      : `₹${price.rate.toLocaleString('en-IN')} × ${hours} hours`;
    pb.innerHTML = `
      <div class="pb-row"><span>${rateLabel}</span><span>₹${(price.rate * Number(hours)).toLocaleString('en-IN')}</span></div>
      <div class="pb-row"><span>Cleaning & setup fee</span><span>₹${(v.cleaning_fee||3500).toLocaleString('en-IN')}</span></div>
      <div class="pb-row"><span>PartyHouse service fee</span><span>₹${price.fee.toLocaleString('en-IN')}</span></div>
      <div class="pb-row total"><span>Total (INR)</span><span>₹${price.total.toLocaleString('en-IN')}</span></div>`;
  }

  const totalEl = document.getElementById('bookingConfirmTotal');
  if (totalEl) totalEl.textContent = `Confirm & Pay ₹${price.total.toLocaleString('en-IN')}`;
}

async function confirmPayment() {
  if (!selectedVenueData) return;
  const btn = document.querySelector('#page-booking .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  try {
    const v         = selectedVenueData;
    const price     = calcPrice();
    if (!price) { showToast('Please load the venue page before booking.', 'error'); return; }
    const date      = document.getElementById('bwDate')?.value;
    const startTime = document.getElementById('bwStartTime')?.value || '18:00';
    const hours     = price.hours;
    const occ       = document.getElementById('bwOccasion')?.value || 'Party';

    showToast('Processing booking…', 'info');

    createdBooking = await Bookings.create(v.id, {
      partyDate:    date || new Date().toISOString().split('T')[0],
      startTime,
      hours,
      occasion:     occ,
      guestsCount:  guestCount,
      pricePerHour: v.price_per_hour,
      cleaningFee:  v.cleaning_fee || 0,
      serviceFee:   price.fee,
      totalPrice:   price.total
    });

    if (createdBooking) {
      const codeEl = document.getElementById('confirmationCode');
      if (codeEl) codeEl.textContent = createdBooking.confirmation_code;
      nextStep(3);
      showToast('Booking confirmed! 🎉', 'success');
    } else {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Pay'; }
    }
  } catch (err) {
    console.error('confirmPayment error:', err);
    showToast('Something went wrong. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Confirm & Pay'; }
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
        <h3>${escHtml(b.venue?.name || 'Venue')}</h3>
        <p>${b.venue?.city || ''} · ${new Date(b.party_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · ${b.hours} hrs</p>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
          ${b.occasion || 'Party'} · ${b.guests_count} guests · ₹${b.total_price.toLocaleString('en-IN')}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:.5px">${b.confirmation_code}</div>
        <span class="trip-status ${statusClass[b.status]||'upcoming'}">${statusLabel[b.status]||b.status}</span>
        ${b.status==='pending'||b.status==='confirmed' ? `
          <button onclick="cancelBooking('${b.id}')"
            style="margin-left:10px;font-size:11px;color:var(--muted);cursor:pointer;border:1px solid var(--border);padding:3px 10px;border-radius:999px;background:none">
            Cancel
          </button>` : ''}
      </div>
    </div>`).join('');
}

async function cancelBooking(bookingId) {
  const confirmed = await showConfirm('Cancel this booking? This cannot be undone.');
  if (!confirmed) return;
  await Bookings.cancel(bookingId);
  loadMyBookings();
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
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('dashActiveVenues',  hostVenues.length);
  setEl('dashPending',       pending);
  setEl('dashEarnings',      earnings > 0 ? '₹' + (earnings/100000).toFixed(1) + 'L' : '₹0');

  // Bookings table
  const tbody = document.getElementById('dashBookingsBody');
  if (tbody) {
    if (!bookings.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">No bookings yet</td></tr>';
    } else {
      const statusClass = { confirmed:'status-confirmed', pending:'status-pending', cancelled:'status-cancelled', completed:'status-confirmed' };
      tbody.innerHTML = bookings.slice(0,8).map(b => `
        <tr>
          <td><strong>${escHtml(b.guest?.full_name || 'Guest')}</strong></td>
          <td>${escHtml(b.venue?.name || '')}</td>
          <td>${new Date(b.party_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
          <td>${escHtml(b.occasion || '—')}</td>
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
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
        <div style="width:48px;height:48px;border-radius:var(--r-md);background:#1e1e1e;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;cursor:pointer" onclick="openVenue('${v.id}')">${v.cover_emoji||'🎉'}</div>
        <div style="flex:1;min-width:0;cursor:pointer" onclick="openVenue('${v.id}')">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(v.name)}</div>
          <div style="font-size:12px;color:var(--muted)">₹${v.price_per_hour.toLocaleString('en-IN')}/hr · Max ${v.capacity} · ⭐ ${v.rating_avg||'New'}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span class="status-badge ${{approved:'status-confirmed',pending:'status-pending',rejected:'status-cancelled',revoked:'status-pending'}[v.venue_status]||'status-pending'}">${{approved:'Active',pending:'Pending Review',rejected:'Rejected',revoked:'Revoked'}[v.venue_status]||'Pending'}</span>
          <button onclick="openEditListing('${v.id}')" data-tip="Edit this listing"
            style="font-size:12px;padding:4px 10px;border-radius:var(--r-pill);border:1.5px solid var(--border);background:var(--surface);cursor:pointer;color:var(--text);font-weight:500;transition:border-color .15s"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            ✏️ Edit
          </button>
        </div>
      </div>`).join('') :
      '<div style="color:var(--muted);font-size:13px">No venues yet. <a onclick="goPage(\'new-listing\')" style="color:var(--accent);cursor:pointer">Add one →</a></div>';
  }
}

// ── Edit Listing ──────────────────────────────────────────────
let editingVenueId   = null;
let editingVenueData = null;

async function openEditListing(venueId) {
  editingVenueId = venueId;
  // Fetch latest data fresh
  editingVenueData = await Venues.getById(venueId);
  if (!editingVenueData) { showToast('Could not load venue', 'error'); return; }

  const v = editingVenueData;
  document.getElementById('editListingSubtitle').textContent = v.name;

  // -- Basics --
  document.getElementById('editName').value     = v.name     || '';
  document.getElementById('editDesc').value     = v.description || '';
  document.getElementById('editCity').value     = v.city     || '';
  document.getElementById('editAddress').value  = v.address  || '';
  document.getElementById('editCapacity').value = v.capacity || '';
  document.getElementById('editMinHours').value = v.min_hours || '';
  document.getElementById('editEmoji').value    = v.cover_emoji || '🎉';

  // -- Pricing --
  document.getElementById('editPrice').value       = v.price_per_hour  || '';
  document.getElementById('editWeekendRate').value = v.weekend_rate     || '';
  document.getElementById('editCleaning').value    = v.cleaning_fee     || '';
  document.getElementById('editDeposit').value     = v.security_deposit || '';

  // -- Rules -- (parsed from host_notes since rules aren't in their own columns)
  const notes = v.host_notes || '';
  const rulesLine = notes.split('\n').find(l => l.startsWith('Rules:')) || '';
  const getRule = (key) => rulesLine.includes(`${key}=true`);
  setSw('esw-alcohol',  getRule('alcohol'));
  setSw('esw-catering', getRule('catering'));
  setSw('esw-smoking',  getRule('smoking'));
  setSw('esw-pets',     getRule('pets'));
  setSw('esw-adults',   getRule('adults_only'));
  setSw('esw-instant',  v.is_instant_book || false);

  // -- Amenities --
  const amenities = v.amenities || [];
  document.querySelectorAll('#editAmenityGrid .am-check').forEach(el => {
    const label = el.querySelector('span')?.textContent?.trim();
    el.classList.toggle('sel', amenities.includes(label));
  });

  // -- Occasions --
  const occasions = v.occasions || [];
  document.querySelectorAll('#editOccasionGrid input[type=checkbox]').forEach(cb => {
    cb.checked = occasions.includes(cb.value);
  });

  // Reset to first tab
  switchEditTab(document.querySelector('.edit-tab'), 'edit-basics');
  document.getElementById('editReviewNotice').style.display = 'none';

  // Show modal
  document.getElementById('editListingOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeEditListing(e) {
  if (e && e.target !== document.getElementById('editListingOverlay')) return;
  document.getElementById('editListingOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function switchEditTab(el, panelId) {
  document.querySelectorAll('.edit-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.edit-tab-panel').forEach(p => p.style.display = 'none');
  el.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.style.display = 'block';
}

// Watch name/desc for changes to show re-review notice
['editName','editDesc'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    if (!editingVenueData) return;  // H6: guard — listeners attach at load before modal opens
    const v = editingVenueData;
    const changed = el.id === 'editName'
      ? el.value.trim() !== (v?.name || '')
      : el.value.trim() !== (v?.description || '');
    if (changed && v?.is_active) {
      document.getElementById('editReviewNotice').style.display = 'block';
    } else {
      const nameChanged = document.getElementById('editName').value.trim() !== (v?.name || '');
      const descChanged = document.getElementById('editDesc').value.trim() !== (v?.description || '');
      if (!nameChanged && !descChanged) document.getElementById('editReviewNotice').style.display = 'none';
    }
  });
});

function setSw(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  if (on) el.classList.add('on'); else el.classList.remove('on');
}

async function saveEditListing() {
  if (!editingVenueId || !editingVenueData) return;
  const v    = editingVenueData;
  const btn  = document.getElementById('editSaveBtn');
  btn.textContent = 'Saving…';
  btn.disabled    = true;

  const name    = document.getElementById('editName').value.trim();
  const desc    = document.getElementById('editDesc').value.trim();

  if (!name)  { showToast('Venue name is required', 'error'); btn.textContent = 'Save Changes'; btn.disabled = false; return; }
  if (!desc)  { showToast('Description is required', 'error'); btn.textContent = 'Save Changes'; btn.disabled = false; return; }

  // Check if sensitive fields changed — requires re-review
  const needsReview = v.venue_status === 'approved' && (name !== v.name || desc !== v.description);

  // Collect amenities
  const amenities = Array.from(document.querySelectorAll('#editAmenityGrid .am-check.sel'))
    .map(el => el.querySelector('span')?.textContent?.trim()).filter(Boolean);

  // Collect occasions
  const occasions = Array.from(document.querySelectorAll('#editOccasionGrid input:checked'))
    .map(cb => cb.value);

  // Reconstruct rules for host_notes audit trail
  const rules = {
    alcohol:    document.getElementById('esw-alcohol')?.classList.contains('on'),
    catering:   document.getElementById('esw-catering')?.classList.contains('on'),
    smoking:    document.getElementById('esw-smoking')?.classList.contains('on'),
    pets:       document.getElementById('esw-pets')?.classList.contains('on'),
    adults_only:document.getElementById('esw-adults')?.classList.contains('on'),
  };
  const rulesLine = `Rules: alcohol=${rules.alcohol}, catering=${rules.catering}, smoking=${rules.smoking}, pets=${rules.pets}, adults_only=${rules.adults_only}`;

  // Preserve original host_notes but update the rules line
  const existingNotes = v.host_notes || '';
  const updatedNotes  = existingNotes.replace(/Rules:.*/, rulesLine) +
    (needsReview ? `\n\n✏️ EDITED by host on ${new Date().toLocaleDateString('en-IN')} — sent for re-review` : '');

  const updates = {
    name,
    description:      desc,
    city:             document.getElementById('editCity').value.trim()    || v.city,
    address:          document.getElementById('editAddress').value.trim() || v.address,
    capacity:         parseInt(document.getElementById('editCapacity').value)    || v.capacity,
    min_hours:        parseInt(document.getElementById('editMinHours').value)    || v.min_hours,
    cover_emoji:      document.getElementById('editEmoji').value.trim()          || v.cover_emoji,
    price_per_hour:   parseInt(document.getElementById('editPrice').value)       || v.price_per_hour,
    weekend_rate:     parseInt(document.getElementById('editWeekendRate').value) || null,
    cleaning_fee:     parseInt(document.getElementById('editCleaning').value)    || v.cleaning_fee     || 0,
    security_deposit: parseInt(document.getElementById('editDeposit').value)     || v.security_deposit || 0,
    is_instant_book:  document.getElementById('esw-instant')?.classList.contains('on') || false,
    amenities,
    occasions,
    host_notes: updatedNotes,
    ...(needsReview ? { is_active: false, venue_status: 'pending' } : {}),
  };

  try {
    const result = await Venues.update(editingVenueId, updates);
    btn.textContent = 'Save Changes';
    btn.disabled    = false;

    if (result) {
      closeEditListing();
      loadDashboard();
      if (needsReview) {
        showToast('Listing updated and sent for re-review 📋', 'info');
      } else {
        showToast('Listing updated ✅', 'success');
      }
    }
  } catch (err) {
    console.error('saveEditListing error:', err);
    showToast('Save failed. Please try again.', 'error');
    btn.textContent = 'Save Changes';
    btn.disabled    = false;
  }
}

// ── New Listing Wizard ────────────────────────────────────────
// ── Listing Wizard ───────────────────────────────────────────
function startNewListing() {
  // Reset all wizard state
  wizStep = 1;
  wizVals.wg = 30;
  wizVals.wh = 4;
  wizPhotos  = [];
  wizData.venue_type       = 'Rooftop / Terrace';
  wizData.capacity         = 30;
  wizData.min_hours        = 4;
  wizData.amenities        = ['DJ / Sound', 'Party Lights'];
  wizData.occasions        = ['Couple', 'Family', 'Birthday'];
  wizData.price_per_hour   = 5000;
  wizData.weekend_rate     = null;
  wizData.cleaning_fee     = 2500;
  wizData.security_deposit = 10000;
  wizData.rules            = { alcohol: false, catering: true, smoking: false, pets: false, adults_only: false, instant_book: false };

  // Reset DOM: hide all steps, show step 1
  for (let i = 1; i <= 9; i++) {
    const el = document.getElementById('wizStep' + i);
    if (el) el.style.display = (i === 1) ? 'block' : 'none';
  }
  const bar = document.getElementById('wizBar');
  if (bar) bar.style.width = '12.5%';
  const counter = document.getElementById('wizCounter');
  if (counter) counter.textContent = 'Step 1 of 8';

  // Reset type card selection
  document.querySelectorAll('.type-card').forEach((c, i) => {
    c.classList.toggle('sel', i === 0);
  });

  // Reset amenities
  document.querySelectorAll('.am-check').forEach(c => {
    const label = c.querySelector('span')?.textContent?.trim();
    c.classList.toggle('sel', ['DJ / Sound', 'Party Lights'].includes(label));
  });

  // Reset toggles
  ['sw-alcohol','sw-smoking','sw-pets','sw-adults','sw-instant'].forEach(id => {
    document.getElementById(id)?.classList.remove('on');
  });
  document.getElementById('sw-catering')?.classList.add('on');

  // Clear photo previews
  const photoGrid = document.getElementById('photoPreviewGrid');
  if (photoGrid) photoGrid.innerHTML = '';

  // Reset stepper displays
  const wgEl = document.getElementById('wg-val');
  const whEl = document.getElementById('wh-val');
  if (wgEl) wgEl.textContent = 30;
  if (whEl) whEl.textContent = 4;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
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
  // M4: Only mutate wizData when in new-listing wizard, not in edit listing modal
  if (el.closest('#editListingOverlay')) return;
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
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (wizPhotos.length + files.length > 15) {
    showToast('Maximum 15 photos allowed', 'error');
    return;
  }
  files.forEach(f => {
    if (!allowedTypes.includes(f.type)) { showToast(`${f.name} is not a supported image type (JPEG, PNG, WebP, GIF only)`, 'error'); return; }
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
    venue_status:  'pending',     // Explicit status — never rely on host_notes string-matching
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
  // Strip keys that don't exist as DB columns to avoid Supabase insert errors
  delete payload.rules;

  try {
    const venue = await Venues.create(payload);

    btn.textContent = 'Submit for Review 🎉';
    btn.disabled    = false;

    if (venue) {
      const refCode = venue.confirmation_code || ('PH-' + (venue.city?.toUpperCase().slice(0,3) || 'PH') + '-' + Date.now().toString(36).toUpperCase().slice(-6));
      document.getElementById('wizStep8').style.display = 'none';
      document.getElementById('wizStep9').style.display = 'block';
      document.getElementById('wizConfirmCode').textContent = refCode;
      document.getElementById('wizBar').style.width = '100%';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('submitListingForReview error:', err);
    showToast('Submission failed. Please try again.', 'error');
    btn.textContent = 'Submit for Review 🎉';
    btn.disabled    = false;
  }
}

// ── Misc helpers ──────────────────────────────────────────────
function toggleHeart(btn) { btn.classList.toggle('saved'); }

// ── Admin Panel ───────────────────────────────────────────────
let adminCurrentTab = 'pending';

async function loadAdminPanel() {
  // Guard: only admin role can access
  if (!currentProfile || currentProfile.role !== 'admin') {
    document.getElementById('adminVenuesList').innerHTML =
      '<div style="text-align:center;padding:64px;color:var(--muted)">' +
      '<div style="font-size:48px;margin-bottom:16px">🔒</div>' +
      '<div style="font-size:16px;font-weight:600">Admin access required</div>' +
      '<div style="font-size:13px;margin-top:8px">Your account does not have admin privileges.</div></div>';
    return;
  }
  adminTab(adminCurrentTab);
}

async function adminTab(tab) {
  adminCurrentTab = tab;
  // Update tab UI
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('atab-' + tab);
  if (tabEl) tabEl.classList.add('active');

  const list = document.getElementById('adminVenuesList');
  list.innerHTML = '<div style="color:var(--muted);padding:24px">Loading…</div>';

  // Fetch venues based on tab
  let query = db.from('venues').select('*, host:profiles!host_id(full_name, email)').order('created_at', { ascending: false });
  if (tab === 'pending')  query = query.eq('venue_status', 'pending');
  if (tab === 'approved') query = query.eq('venue_status', 'approved');
  if (tab === 'rejected') query = query.eq('venue_status', 'rejected');

  const { data: venues, error } = await query;
  if (error) { list.innerHTML = `<div style="color:red">Error: ${escHtml(error.message)}</div>`; return; }

  // Update pending count
  if (tab === 'pending') {
    const pendingEl = document.getElementById('adminPendingCount');
    if (pendingEl) pendingEl.textContent = venues?.length || 0;
  }

  if (!venues?.length) {
    list.innerHTML = '<div style="text-align:center;padding:48px;color:var(--muted)">No venues in this category.</div>';
    return;
  }

  const isRejected = v => v.venue_status === 'rejected';
  const statusOf   = v => v.venue_status || 'pending';

  list.innerHTML = venues.map(v => {
    const status = statusOf(v);
    const submitted = new Date(v.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    // Extract host contact from host_notes first line
    const hostLine = (v.host_notes || '').split('\n')[0] || '';
    return `
    <div class="admin-venue-card ${status}">
      <div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
          <span style="font-size:20px">${v.cover_emoji || '🎉'}</span>
          <strong style="font-size:16px">${escHtml(v.name || 'Unnamed venue')}</strong>
          <span class="admin-badge ${status}">${status}</span>
        </div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:4px">
          📍 ${escHtml(v.city || '—')} &nbsp;·&nbsp; ${escHtml(v.venue_type || '—')} &nbsp;·&nbsp; 👥 Up to ${v.capacity || '?'}
          &nbsp;·&nbsp; ₹${(v.price_per_hour||0).toLocaleString('en-IN')}/hr
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">
          🗓 Submitted ${submitted} &nbsp;·&nbsp; 🧑 ${v.host?.full_name || 'Unknown host'}
        </div>
        <div style="font-size:12px;color:var(--muted)">${escHtml(hostLine)}</div>
      </div>
      <div class="admin-actions">
        <button class="btn-review" onclick="openAdminModal('${v.id}')">View Details</button>
        ${status === 'pending' ? `
          <button class="btn-approve" onclick="adminApprove('${v.id}')">✅ Approve</button>
          <button class="btn-reject"  onclick="adminRejectPrompt('${v.id}')">❌ Reject</button>
        ` : ''}
        ${status === 'approved' ? `<button class="btn-reject" onclick="adminRevoke('${v.id}')">Revoke</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function openAdminModal(venueId) {
  const { data: v } = await db.from('venues')
    .select('*, host:profiles!host_id(full_name, email)')
    .eq('id', venueId).single();
  if (!v) return;

  const notes = (v.host_notes || '').split('\n').filter(Boolean);
  document.getElementById('adminModalContent').innerHTML = `
    <div style="font-size:22px;font-weight:800;margin-bottom:4px">${v.cover_emoji || '🎉'} ${escHtml(v.name)}</div>
    <div style="color:var(--muted);font-size:13px;margin-bottom:20px">${escHtml(v.city)} · ${escHtml(v.venue_type)} · Submitted ${new Date(v.created_at).toLocaleDateString('en-IN')}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--surface2);border-radius:var(--r-md);padding:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Capacity & Pricing</div>
        <div style="font-size:13px;line-height:1.9">
          👥 Up to ${v.capacity} guests<br>
          ⏱ Min ${v.min_hours} hours<br>
          💰 ₹${(v.price_per_hour||0).toLocaleString('en-IN')}/hr<br>
          ${v.weekend_rate ? `📅 Weekend: ₹${v.weekend_rate.toLocaleString('en-IN')}/hr<br>` : ''}
          🧹 Cleaning: ₹${(v.cleaning_fee||0).toLocaleString('en-IN')}<br>
          🔐 Deposit: ₹${(v.security_deposit||0).toLocaleString('en-IN')}
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--r-md);padding:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Amenities</div>
        <div style="font-size:13px;line-height:1.9">${(v.amenities||[]).map(a => escHtml(a)).join(' · ') || '—'}</div>
      </div>
    </div>

    <div style="background:var(--surface2);border-radius:var(--r-md);padding:14px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Host Submission Notes</div>
      ${notes.map(n => `<div style="font-size:13px;color:var(--text);line-height:1.8;border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:4px">${escHtml(n)}</div>`).join('')}
    </div>

    <div style="background:var(--surface2);border-radius:var(--r-md);padding:14px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:6px">Venue Description</div>
      <div style="font-size:13px;line-height:1.7">${escHtml(v.description || '—')}</div>
    </div>

    <textarea class="admin-notes-box" id="adminReviewNote" placeholder="Add review notes (optional — saved with approval/rejection)…"></textarea>

    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
      <button class="btn-review" onclick="closeAdminModal()">Close</button>
      ${v.venue_status === 'pending' ? `
        <button class="btn-approve" onclick="adminApprove('${v.id}')">✅ Approve Listing</button>
        <button class="btn-reject"  onclick="adminRejectPrompt('${v.id}')">❌ Reject Listing</button>
      ` : ''}
      ${v.venue_status === 'approved' ? `<button class="btn-reject" onclick="adminRevoke('${v.id}')">Revoke Listing</button>` : ''}
    </div>`;

  document.getElementById('adminModal').style.display = 'block';
}

function closeAdminModal() {
  document.getElementById('adminModal').style.display = 'none';
}

async function adminApprove(venueId) {
  if (!currentProfile || currentProfile.role !== 'admin') { showToast('Unauthorised', 'error'); return; }
  const note = document.getElementById('adminReviewNote')?.value?.trim() || '';

  const { error } = await db.from('venues').update({ venue_status: 'approved', is_active: true }).eq('id', venueId);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }

  showToast('Venue approved and now live! ✅', 'success');
  closeAdminModal();
  loadAdminPanel();
  // Fire-and-forget — email host and admin; failure is non-fatal
  Notify.venueApproved(venueId, note);
}

async function adminRejectPrompt(venueId) {
  if (!currentProfile || currentProfile.role !== 'admin') { showToast('Unauthorised', 'error'); return; }
  // H2: Use the notes textarea already in the modal instead of a browser prompt()
  const reason = document.getElementById('adminReviewNote')?.value?.trim() || '';
  if (!reason) {
    showToast('Please enter a rejection reason in the notes box above', 'error');
    return;
  }
  await adminReject(venueId, reason);
}

async function adminReject(venueId, reason) {
  const { error } = await db.from('venues').update({ venue_status: 'rejected', is_active: false }).eq('id', venueId);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Venue rejected.', 'info');
  closeAdminModal();
  loadAdminPanel();
  // Fire-and-forget — email host; failure is non-fatal
  Notify.venueRejected(venueId, reason);
}

async function adminRevoke(venueId) {
  if (!currentProfile || currentProfile.role !== 'admin') { showToast('Unauthorised', 'error'); return; }
  const confirmed = await showConfirm('Revoke this listing? It will go offline immediately.');
  if (!confirmed) return;
  await db.from('venues').update({ venue_status: 'revoked', is_active: false }).eq('id', venueId);
  showToast('Listing revoked.', 'info');
  closeAdminModal();
  loadAdminPanel();
}

// ── Messaging ──────────────────────────────────────────────────────────────────

let activeConvoPartnerId  = null;
let activeConvoPartner    = null;
let msgRealtimeChannel    = null;
let allConvos             = [];  // cached for search filtering
const partnerMap          = {};  // partnerId → partner object (avoids JSON in onclick)

async function loadMessages() {
  if (!currentUser) {
    document.getElementById('msgConvoList').innerHTML =
      '<div class="msg-empty-state">Please <a onclick="goPage(\'auth\')" style="color:var(--accent);cursor:pointer">log in</a> to view your messages.</div>';
    return;
  }
  document.getElementById('msgConvoList').innerHTML = '<div class="msg-empty-state">Loading…</div>';
  allConvos = await Messages.getInbox();
  allConvos.forEach(c => { if (c.partnerId && c.partner) partnerMap[c.partnerId] = c.partner; });
  renderConvoList(allConvos);

  // Show unread badge on nav item
  refreshMsgBadge();
}

function renderConvoList(convos) {
  const list = document.getElementById('msgConvoList');
  if (!convos.length) {
    list.innerHTML = '<div class="msg-empty-state">No conversations yet.<br>Contact a host from any venue page to start chatting.</div>';
    return;
  }
  list.innerHTML = convos.map(c => {
    const name     = escHtml(c.partner?.full_name || 'User');
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const preview  = c.sender_id === currentUser.id ? `You: ${c.content}` : c.content;
    const time     = formatMsgTime(c.created_at);
    const unread   = c.sender_id !== currentUser.id && !c.read_at;
    const isActive = activeConvoPartnerId === c.partnerId;
    return `
      <div class="msg-convo-item${isActive ? ' active' : ''}" onclick="openConvoById('${c.partnerId}')">
        <div class="msg-convo-av">${initials}</div>
        <div class="msg-convo-body">
          <div class="msg-convo-name">${name}</div>
          <div class="msg-convo-preview">${escHtml(preview)}</div>
        </div>
        <div class="msg-convo-time">${time}</div>
        ${unread ? '<div class="msg-unread-dot"></div>' : ''}
      </div>`;
  }).join('');
}

function filterConvos(q) {
  if (!q.trim()) { renderConvoList(allConvos); return; }
  const lq = q.toLowerCase();
  renderConvoList(allConvos.filter(c => (c.partner?.full_name || '').toLowerCase().includes(lq) || c.content.toLowerCase().includes(lq)));
}

function openConvoById(partnerId) {
  openConvo(partnerId, partnerMap[partnerId] || null);
}

async function openConvo(partnerId, partner) {
  activeConvoPartnerId = partnerId;
  activeConvoPartner   = partner;

  // Mobile: hide sidebar, show chat
  document.getElementById('msgSidebar').classList.add('mobile-hidden');
  document.getElementById('msgChat').classList.add('mobile-open');

  // Update header
  const name     = partner?.full_name || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('msgChatAv').textContent   = initials;
  document.getElementById('msgChatName').textContent = name;
  document.getElementById('msgChatSub').textContent  = '';

  // Switch to active chat panel
  document.getElementById('msgChatEmpty').style.display  = 'none';
  document.getElementById('msgChatInner').style.display  = 'flex';

  // Mark active convo in sidebar
  renderConvoList(allConvos);

  // Load messages
  await loadChatMessages(partnerId);

  // Mark as read
  await Messages.markRead(partnerId);
  refreshMsgBadge();

  // Subscribe to real-time incoming messages
  if (msgRealtimeChannel) db.removeChannel(msgRealtimeChannel);
  msgRealtimeChannel = Messages.subscribe(partnerId, (newMsg) => {
    if (newMsg.sender_id === partnerId || newMsg.receiver_id === partnerId) {
      appendBubble(newMsg, false);
      Messages.markRead(partnerId);
      refreshMsgBadge();
    }
  });
}

async function loadChatMessages(partnerId) {
  const bubbles = document.getElementById('msgBubbles');
  bubbles.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:32px">Loading…</div>';
  const msgs = await Messages.getConversation(partnerId);
  if (!msgs.length) {
    bubbles.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:32px">No messages yet. Say hello! 👋</div>';
    return;
  }
  bubbles.innerHTML = '';
  let lastDate = null;
  for (const msg of msgs) {
    const msgDate = new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (msgDate !== lastDate) {
      bubbles.insertAdjacentHTML('beforeend', `<div class="msg-date-divider">${msgDate}</div>`);
      lastDate = msgDate;
    }
    appendBubble(msg, msg.sender_id === currentUser.id);
  }
  scrollBubblesToBottom();
}

function appendBubble(msg, isMine) {
  const bubbles  = document.getElementById('msgBubbles');
  const rawName  = isMine ? (currentProfile?.full_name || 'You') : (activeConvoPartner?.full_name || 'User');
  const name     = escHtml(rawName);
  const initials = rawName.replace(/<[^>]*>/g, '').split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
  const time     = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  bubbles.insertAdjacentHTML('beforeend', `
    <div class="msg-bubble-wrap ${isMine ? 'mine' : ''}">
      <div class="msg-bubble-av" style="${isMine ? 'background:var(--accent);color:#fff' : ''}">${initials}</div>
      <div>
        <div class="msg-bubble ${isMine ? 'mine' : 'theirs'}">${escHtml(msg.content)}</div>
        <div class="msg-bubble-time ${isMine ? 'mine' : ''}">${time}</div>
      </div>
    </div>`);
  scrollBubblesToBottom();
}

async function sendChatMessage() {
  const input = document.getElementById('msgInput');
  const text  = input.value.trim();
  if (!text || !activeConvoPartnerId) return;
  input.value = '';
  autoResizeMsgInput(input);
  const msg = await Messages.send(activeConvoPartnerId, text);
  if (msg) {
    appendBubble(msg, true);
    // Refresh inbox list
    allConvos = await Messages.getInbox();
    allConvos.forEach(c => { if (c.partnerId && c.partner) partnerMap[c.partnerId] = c.partner; });
    renderConvoList(allConvos);
  }
}

function closeChatPanel() {
  // Mobile: show sidebar, hide chat
  document.getElementById('msgSidebar').classList.remove('mobile-hidden');
  document.getElementById('msgChat').classList.remove('mobile-open');
  activeConvoPartnerId = null;
  document.getElementById('msgChatEmpty').style.display  = 'flex';
  document.getElementById('msgChatInner').style.display  = 'none';
  if (msgRealtimeChannel) { db.removeChannel(msgRealtimeChannel); msgRealtimeChannel = null; }
}

// Contact Host from listing page
async function contactHost() {
  if (!Auth.requireAuth('message a host')) return;
  if (!selectedVenueData) return;
  const host = selectedVenueData.host;
  if (!host) { showToast('Host info unavailable', 'error'); return; }
  if (host.id === currentUser.id) { showToast("That's your own listing!", 'info'); return; }
  // Navigate to messages and open convo with host
  goPage('messages');
  // Small delay for page render
  setTimeout(() => openConvo(host.id, host), 150);
}

async function refreshMsgBadge() {
  const count = await Messages.getUnreadCount();
  const item  = document.getElementById('navMsgItem');
  if (item) item.textContent = count > 0 ? `💬 Messages 🔴${count}` : '💬 Messages';
}

function scrollBubblesToBottom() {
  const b = document.getElementById('msgBubbles');
  if (b) b.scrollTop = b.scrollHeight;
}

function autoResizeMsgInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatMsgTime(iso) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now - d;
  if (diff < 60000)          return 'just now';
  if (diff < 3600000)        return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000)       return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400000)   return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
