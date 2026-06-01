// ── Data ─────────────────────────────────────────────────────────────────────
const VENUES = [
  { id:1, emoji:'🌃', city:'Bandra, Mumbai', name:'Skyline Rooftop Lounge',   capacity:'Up to 50',  price:'₹12,000/hr', rating:'4.97', type:'Rooftop',  badge:'🌃 Rooftop',  saved:true,  occasions:['Couple','Group','Birthday','Anniversary'] },
  { id:2, emoji:'🌳', city:'Koramangala, Bangalore', name:'Lush Garden Villa', capacity:'Up to 80',  price:'₹8,000/hr',  rating:'4.91', type:'Garden',   badge:'🌳 Garden',   saved:false, occasions:['Family','Group','Corporate'] },
  { id:3, emoji:'🏊', city:'Juhu, Mumbai',   name:'The Pool Party Palace',     capacity:'Up to 40',  price:'₹15,000/hr', rating:'4.95', type:'Pool',     badge:'🏊 Pool',     saved:true,  occasions:['Couple','Family','Birthday'] },
  { id:4, emoji:'🎊', city:'Indiranagar, Bangalore', name:'The Party Loft',   capacity:'Up to 30',  price:'₹6,500/hr',  rating:'4.88', type:'Indoor',   badge:'🎊 Loft',     saved:false, occasions:['Couple','Group','Birthday'] },
  { id:5, emoji:'🏡', city:'Candolim, Goa', name:'Beachfront Party Villa',    capacity:'Up to 60',  price:'₹20,000/hr', rating:'5.0',  type:'Villa',    badge:'🏡 Villa',    saved:true,  occasions:['Family','Group','Corporate'] },
  { id:6, emoji:'🌆', city:'Hiranandani, Pune', name:'Corporate Event Tower', capacity:'Up to 120', price:'₹10,000/hr', rating:'4.82', type:'Corporate',badge:'🎪 Event',    saved:false, occasions:['Corporate','Group'] },
  { id:7, emoji:'🎭', city:'Andheri, Mumbai', name:'Retro Game Night Den',    capacity:'Up to 20',  price:'₹4,500/hr',  rating:'4.93', type:'Unique',   badge:'🎮 Game',     saved:false, occasions:['Couple','Group','Birthday'] },
  { id:8, emoji:'🌹', city:'Civil Lines, Delhi', name:'Heritage Haveli Courtyard', capacity:'Up to 100', price:'₹18,000/hr', rating:'4.96', type:'Heritage', badge:'🏰 Heritage', saved:true, occasions:['Family','Corporate'] },
];

function venueCard(v) {
  return `
    <div class="prop-card" onclick="goPage('listing')" data-tip="View ${v.name}">
      <div class="prop-img">
        <div class="prop-img-placeholder">${v.emoji}</div>
        <div class="card-type-badge">${v.badge}</div>
        <button class="heart-btn ${v.saved ? 'saved' : ''}"
          onclick="event.stopPropagation(); toggleHeart(this)"
          data-tip="Save to wishlist">♥</button>
      </div>
      <div class="prop-info">
        <div class="prop-loc">
          <div class="prop-city">${v.city}</div>
          <div class="prop-rating">⭐ ${v.rating}</div>
        </div>
        <div class="prop-name">${v.name}</div>
        <div class="prop-capacity">👥 ${v.capacity}</div>
        <div class="prop-price">${v.price} <span>· min 4 hrs</span></div>
      </div>
    </div>`;
}

// Render grids
document.getElementById('featuredGrid').innerHTML  = VENUES.map(v => venueCard(v)).join('');
document.getElementById('searchGrid').innerHTML    = VENUES.map(v => venueCard(v)).join('');
document.getElementById('wishlistGrid').innerHTML  = VENUES.filter(v => v.saved).map(v => venueCard(v)).join('');

// ── Confetti ──────────────────────────────────────────────────────────────────
(function spawnConfetti() {
  const container = document.getElementById('confetti');
  const colors = ['#ff4d6d','#ff9a3c','#ffb400','#fff','#ce93d8'];
  for (let i = 0; i < 28; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    const size = Math.random() * 6 + 4;
    dot.style.cssText = `
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*8+6}s;
      animation-delay:${Math.random()*8}s;
    `;
    container.appendChild(dot);
  }
})();

// ── Navigation ────────────────────────────────────────────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) { pg.classList.add('active'); window.scrollTo(0, 0); }
  // Show cat bar only on home + search
  const catBar = document.getElementById('catBar');
  catBar.style.display = (id === 'home' || id === 'search') ? '' : 'none';
  // Close dropdown
  document.getElementById('userDropdown').classList.remove('open');
}

// Dropdown menu
function toggleMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('userMenuWrap');
  if (!wrap.contains(e.target)) document.getElementById('userDropdown').classList.remove('open');
});

// ── Auth ──────────────────────────────────────────────────────────────────────
let loggedIn = false;

function handleAuth() {
  if (loggedIn) {
    loggedIn = false;
    document.getElementById('userAv').textContent = '?';
    document.getElementById('authToggleItem').textContent = '🔐 Log In / Sign Up';
  } else {
    goPage('auth');
  }
}

function handleLogin() {
  loggedIn = true;
  document.getElementById('userAv').textContent = 'G';
  document.getElementById('authToggleItem').textContent = '🚪 Log Out';
  goPage('home');
}

function authTab(el, mode) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('nameField').style.display = mode === 'signup' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent  = mode === 'signup' ? 'Create Account →' : 'Log In →';
}

// ── Category filter ───────────────────────────────────────────────────────────
function setCat(el, icon, name) {
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const count = Math.floor(Math.random() * 60 + 10);
  document.getElementById('resultsCount').textContent = count + ' ' + name + ' venues found';
  goPage('search');
}

// ── Filters ───────────────────────────────────────────────────────────────────
function updatePrice(v) {
  document.getElementById('priceVal').textContent = 'Up to ₹' + Number(v).toLocaleString('en-IN');
}

function toggleSw(id) {
  document.getElementById(id).classList.toggle('on');
}

// ── Heart toggle ──────────────────────────────────────────────────────────────
function toggleHeart(btn) {
  btn.classList.toggle('saved');
}

// ── Booking flow ──────────────────────────────────────────────────────────────
let bookStep = 1;

function nextStep(n) {
  document.getElementById('bookStep' + bookStep).style.display = 'none';
  bookStep = n;
  document.getElementById('bookStep' + n).style.display = 'block';
  ['pd1','pd2','pd3'].forEach((id, i) => {
    const d = document.getElementById(id);
    d.className = 'prog-dot ' + (i+1 < n ? 'done' : i+1 === n ? 'active' : 'pending');
  });
  document.getElementById('pl1').className = 'prog-line' + (n > 2 ? ' done' : '');
  document.getElementById('pl2').className = 'prog-line' + (n > 3 ? ' done' : '');
  window.scrollTo(0, 0);
}

// ── Listing wizard ────────────────────────────────────────────────────────────
let wizStep = 1;
const wizVals = { wg: 30, wh: 4 };

function wizNext(n) {
  document.getElementById('wizStep' + wizStep).style.display = 'none';
  wizStep = n;
  document.getElementById('wizStep' + n).style.display = 'block';
  document.getElementById('wizBar').style.width = (n / 5 * 100) + '%';
  window.scrollTo(0, 0);
}

function adjWiz(k, d) {
  const mins = { wg: 2, wh: 1 };
  const steps = { wg: 5, wh: 1 };
  wizVals[k] = Math.max(mins[k] || 1, wizVals[k] + d * (steps[k] || 1));
  document.getElementById(k + '-val').textContent = wizVals[k];
}

function selType(el) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

function toggleAm(el) {
  el.classList.toggle('sel');
}

// ── Booking widget price calc ─────────────────────────────────────────────────
let guestCount = 20;

function adjGuests(d) {
  guestCount = Math.max(2, Math.min(50, guestCount + d));
  document.getElementById('guestCount').textContent = guestCount;
  calcPrice();
}

function calcPrice() {
  const hours  = parseInt(document.getElementById('bwHours')?.value || 6);
  const rate   = 12000;
  const nightly = rate * hours;
  const setup   = 3500;
  const fee     = Math.round((nightly + setup) * 0.08);
  const total   = nightly + setup + fee;
  const bd      = document.getElementById('bwBreakdown');
  if (bd) {
    bd.innerHTML = `
      <div class="bw-row"><span>₹${rate.toLocaleString('en-IN')} × ${hours} hours</span><span>₹${nightly.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>Cleaning & setup fee</span><span>₹${setup.toLocaleString('en-IN')}</span></div>
      <div class="bw-row"><span>PartyHouse service fee</span><span>₹${fee.toLocaleString('en-IN')}</span></div>
      <div class="bw-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Reset booking step when visiting page
document.getElementById('page-booking') && (bookStep = 1);
