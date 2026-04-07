// ── CITY LIST ──────────────────────────────────────────────────────
const CITIES = [
  { name:'Delhi',          state:'Delhi',             slug:'delhi',          lat:28.6139, lng:77.2090 },
  { name:'Mumbai',         state:'Maharashtra',       slug:'mumbai',         lat:19.0760, lng:72.8777 },
  { name:'Bangalore',      state:'Karnataka',         slug:'bangalore',      lat:12.9716, lng:77.5946 },
  { name:'Chennai',        state:'Tamil Nadu',        slug:'chennai',        lat:13.0827, lng:80.2707 },
  { name:'Kolkata',        state:'West Bengal',       slug:'kolkata',        lat:22.5726, lng:88.3639 },
  { name:'Hyderabad',      state:'Telangana',         slug:'hyderabad',      lat:17.3850, lng:78.4867 },
  { name:'Pune',           state:'Maharashtra',       slug:'pune',           lat:18.5204, lng:73.8567 },
  { name:'Jaipur',         state:'Rajasthan',         slug:'jaipur',         lat:26.9124, lng:75.7873 },
  { name:'Ahmedabad',      state:'Gujarat',           slug:'ahmedabad',      lat:23.0225, lng:72.5714 },
  { name:'Lucknow',        state:'Uttar Pradesh',     slug:'lucknow',        lat:26.8467, lng:80.9462 },
  { name:'Chandigarh',     state:'Punjab',            slug:'chandigarh',     lat:30.7333, lng:76.7794 },
  { name:'Kochi',          state:'Kerala',            slug:'kochi',          lat:9.9312,  lng:76.2673 },
  { name:'Goa',            state:'Goa',               slug:'goa',            lat:15.2993, lng:74.1240 },
  { name:'Shimla',         state:'Himachal Pradesh',  slug:'shimla',         lat:31.1048, lng:77.1734 },
  { name:'Ooty',           state:'Tamil Nadu',        slug:'ooty',           lat:11.4102, lng:76.6950 },
  { name:'Bhopal',         state:'Madhya Pradesh',    slug:'bhopal',         lat:23.2599, lng:77.4126 },
  { name:'Manali',         state:'Himachal Pradesh',  slug:'manali',         lat:32.2396, lng:77.1887 },
  { name:'Nagpur',         state:'Maharashtra',       slug:'nagpur',         lat:21.1458, lng:79.0882 },
  { name:'Surat',          state:'Gujarat',           slug:'surat',          lat:21.1702, lng:72.8311 },
];

// ── TOKEN & API ──────────────────────────────────────────────────
const TOKEN = '89f38a329e46ba8ddc6896d909b9db96e57d81a1';
const API   = slug => `https://api.waqi.info/feed/${encodeURIComponent(slug)}/?token=${TOKEN}`;

// ── AQI HELPERS ────────────────────────────────────────────────────
function meta(aqi) {
  if (aqi<=50)  return {cat:'Good',                    color:'#34c759',bg:'good',      cls:'yes',icon:'✅',msg:'Great air quality — perfect time to visit!',    dot:'#34c759'};
  if (aqi<=100) return {cat:'Moderate',                color:'#ffd60a',bg:'moderate',  cls:'meh',icon:'🟡',msg:'Acceptable — visit with mild precaution.',       dot:'#ffd60a'};
  if (aqi<=150) return {cat:'Unhealthy for Sensitive', color:'#ff9f0a',bg:'sensitive', cls:'meh',icon:'⚠️',msg:'Sensitive groups: limit outdoor exposure.',       dot:'#ff9f0a'};
  if (aqi<=200) return {cat:'Unhealthy',               color:'#ff453a',bg:'unhealthy', cls:'no', icon:'🔴',msg:'Unhealthy air — avoid outdoor activities.',       dot:'#ff453a'};
  if (aqi<=300) return {cat:'Very Unhealthy',          color:'#bf5af2',bg:'very',      cls:'no', icon:'🚫',msg:'Very poor air — strongly avoid visiting.',        dot:'#bf5af2'};
  return               {cat:'Hazardous',               color:'#ff3b30',bg:'hazardous', cls:'no', icon:'☠️',msg:'Hazardous! Do not visit — stay indoors.',         dot:'#8e1a0e'};
}
function barPct(aqi) { return Math.min(100,(aqi/500)*100).toFixed(1)+'%'; }

// ── STATE ──────────────────────────────────────────────────────────
const cityData = {};   
const mapMarkers = {}; 
let leafletMap, activeSlug = null;

// ── LEAFLET MAP ────────────────────────────────────────────────────
function initMap() {
  leafletMap = L.map('map', {
    center: [22.5, 80.0],
    zoom: 5,
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(leafletMap);

  CITIES.forEach(c => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="aqi-marker" id="mk-${c.slug}" style="width:38px;height:38px;background:#1a2540;border-color:rgba(255,255,255,.2)"><div class="ring"></div></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -22],
    });

    const marker = L.marker([c.lat, c.lng], { icon }).addTo(leafletMap);
    marker.bindPopup('', { maxWidth: 240, minWidth: 220, className: 'air-popup' });
    marker.on('click', () => {
      if (cityData[c.slug]) {
        updatePopup(c, cityData[c.slug]);
        showHero(c);
      }
    });
    mapMarkers[c.slug] = marker;
  });
}

function updateMarker(city, aqi, m) {
  const el = document.getElementById(`mk-${city.slug}`);
  if (!el) return;
  const size = aqi > 200 ? 46 : aqi > 100 ? 42 : 38;
  el.style.width  = size+'px';
  el.style.height = size+'px';
  el.style.background   = m.color;
  el.style.borderColor  = 'rgba(255,255,255,.35)';
  el.style.fontSize     = aqi >= 100 ? '11px' : '12px';
  el.style.boxShadow    = `0 2px 16px ${m.color}66`;
  el.innerHTML = aqi;

  const marker = mapMarkers[city.slug];
  marker.setIcon(L.divIcon({
    className: '',
    html: el.outerHTML,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -(size/2+6)],
  }));
}

function updatePopup(city, data) {
  const { aqi, m } = data;
  const labels = { yes:'✅ Visit Now', meh:'⚠️ Visit with Caution', no:'🚫 Avoid Visiting' };
  const html = `
    <div class="pop-inner">
      <div class="pop-city">${city.name}</div>
      <div class="pop-state">${city.state}</div>
      <div class="pop-aqi-row">
        <div class="pop-aqi-num" style="color:${m.color}">${aqi}</div>
        <div class="pop-aqi-lbl">US AQI</div>
      </div>
      <div class="pop-cat" style="color:${m.color}">${m.cat}</div>
      <div class="pop-badge ${m.cls}">${labels[m.cls]}</div>
      <button class="pop-detail-btn" onclick="showHeroFromPopup('${city.slug}')">See full details ↓</button>
    </div>`;
  mapMarkers[city.slug].setPopupContent(html);
}

window.showHeroFromPopup = function(slug) {
  const city = CITIES.find(c=>c.slug===slug);
  if (city) showHero(city);
};

// ── FETCH + POPULATE ───────────────────────────────────────────────
let ready = 0;

async function fetchCity(city) {
  try {
    const r = await fetch(API(city.slug));
    const d = await r.json();
    if (d.status !== 'ok' || typeof d.data.aqi !== 'number') return;

    const aqi = d.data.aqi;
    const m   = meta(aqi);
    cityData[city.slug] = { aqi, m, raw: d.data };

    updateMarker(city, aqi, m);
    updateCard(city, aqi, m);
    updatePopup(city, cityData[city.slug]);

    ready++;
    document.getElementById('readyCount').textContent = ready+' / '+CITIES.length+' loaded';
  } catch(e) { console.warn('Failed:', city.slug, e); }
}

// ── CARDS ──────────────────────────────────────────────────────────
function buildCards() {
  const grid = document.getElementById('cityGrid');
  document.getElementById('gridTitle').style.display = 'flex';

  CITIES.forEach((city, i) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.id = `card-${city.slug}`;
    card.style.animationDelay = i*35+'ms';
    card.innerHTML = `
      <div class="c-dot" id="dot-${city.slug}" style="background:#333"></div>
      <div class="c-name">${city.name}</div>
      <div class="c-state">${city.state}</div>
      <div class="c-aqi" id="aqi-${city.slug}" style="color:rgba(255,255,255,.2)">
        <div class="shimmer" style="width:52px;height:42px;margin:9px 0 1px;border-radius:8px"></div>
      </div>
      <div class="c-cat" id="cat-${city.slug}"></div>
      <div class="c-verdict" id="vrd-${city.slug}" style="display:none"></div>
    `;
    card.addEventListener('click', () => {
      showHero(city);
      leafletMap.flyTo([city.lat, city.lng], 8, { duration: 1.2 });
      mapMarkers[city.slug].openPopup();
    });
    grid.appendChild(card);
  });
}

function updateCard(city, aqi, m) {
  const aqiEl = document.getElementById(`aqi-${city.slug}`);
  const catEl = document.getElementById(`cat-${city.slug}`);
  const vrdEl = document.getElementById(`vrd-${city.slug}`);
  const dotEl = document.getElementById(`dot-${city.slug}`);
  if (!aqiEl) return;

  aqiEl.textContent = aqi;
  aqiEl.style.color = m.color;
  catEl.textContent = m.cat;
  catEl.style.color = m.color;
  dotEl.style.background = m.dot;

  const labels = {yes:'✅ Visit', meh:'⚠️ Caution', no:'🚫 Avoid'};
  vrdEl.className = `c-verdict ${m.cls}`;
  vrdEl.textContent = labels[m.cls];
  vrdEl.style.display = 'inline-flex';
}

// ── HERO ───────────────────────────────────────────────────────────
function showHero(city) {
  if (activeSlug) document.getElementById(`card-${activeSlug}`)?.classList.remove('active');
  activeSlug = city.slug;
  document.getElementById(`card-${city.slug}`)?.classList.add('active');

  const hero = document.getElementById('heroCard');
  hero.style.display = 'block';
  document.getElementById('h-city').textContent  = city.name;
  document.getElementById('h-state').textContent = city.state;
  document.getElementById('h-st').textContent    = '';
  document.getElementById('h-badge').style.display = 'none';
  document.getElementById('h-stats').innerHTML   = '';
  document.getElementById('h-updated').textContent = '';

  const d = cityData[city.slug];
  if (!d) {
    document.getElementById('h-aqi').textContent = '…';
    return;
  }

  const { aqi, m, raw } = d;
  document.getElementById('h-aqi').textContent = aqi;
  document.getElementById('h-aqi').style.color = m.color;
  document.getElementById('bg').className = m.bg;
  hero.style.setProperty('--hg', m.color+'20');
  document.getElementById('h-thumb').style.left = barPct(aqi);

  if (raw?.city?.name && raw.city.name.toLowerCase() !== city.name.toLowerCase()) {
    document.getElementById('h-st').textContent = '📍 '+raw.city.name;
  }

  const badge = document.getElementById('h-badge');
  badge.style.display = 'inline-flex';
  badge.className = `visit-badge ${m.cls}`;
  document.getElementById('h-icon').textContent = m.icon;
  document.getElementById('h-msg').textContent  = m.msg;

  if (raw?.time?.s) document.getElementById('h-updated').textContent = 'Last updated: '+raw.time.s;

  if (raw?.iaqi) {
    const chips = [
      {k:'pm25',l:'PM2.5',u:'µg/m³'},{k:'pm10',l:'PM10',u:'µg/m³'},
      {k:'o3',l:'Ozone',u:'ppb'},{k:'no2',l:'NO₂',u:'ppb'},
      {k:'so2',l:'SO₂',u:'ppb'},{k:'co',l:'CO',u:'ppm'},
      {k:'h',l:'Humidity',u:'%'},{k:'t',l:'Temp',u:'°C'},
      {k:'w',l:'Wind',u:'m/s'},{k:'p',l:'Pressure',u:'hPa'},
    ];
    const el = document.getElementById('h-stats'); el.innerHTML='';
    chips.forEach(c => {
      if (raw.iaqi[c.k] !== undefined)
        el.innerHTML += `<div class="stat-chip"><div class="stat-lbl">${c.l}</div><div class="stat-val">${parseFloat(raw.iaqi[c.k].v).toFixed(1)}<span class="stat-unit"> ${c.u}</span></div></div>`;
    });
  }

  hero.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

// ── SEARCH ─────────────────────────────────────────────────────────
const input  = document.getElementById('searchInput');
const sugBox = document.getElementById('suggestions');

input.addEventListener('input', () => {
  const q = input.value.trim().toLowerCase();
  sugBox.innerHTML = '';
  if (q.length < 1) { sugBox.style.display='none'; return; }
  const hits = CITIES.filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
  if (!hits.length) { sugBox.style.display='none'; return; }
  hits.forEach(c => {
    const d    = cityData[c.slug];
    const div  = document.createElement('div');
    div.className = 'sug-item';
    div.innerHTML = `<span>📍</span><span>${c.name} <span style="color:rgba(255,255,255,.35);font-size:11px">${c.state}</span></span>
      ${d ? `<span class="sug-aqi" style="color:${d.m.color}">${d.aqi}</span>` : ''}`;
    div.addEventListener('click', () => {
      input.value = '';
      sugBox.style.display = 'none';
      showHero(c);
      leafletMap.flyTo([c.lat, c.lng], 8, { duration:1.2 });
      mapMarkers[c.slug].openPopup();
    });
    sugBox.appendChild(div);
  });
  sugBox.style.display = 'block';
});

document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) sugBox.style.display='none'; });

// ── BOOT ───────────────────────────────────────────────────────────
initMap();
buildCards();

(async () => {
  for (let i=0; i<CITIES.length; i++) {
    fetchCity(CITIES[i]);
    await new Promise(r => setTimeout(r, 180));
  }
})();