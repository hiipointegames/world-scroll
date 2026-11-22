// World Scroll — clickable web prototype.
// Screens: Pick your feed → Feed (cards you swipe through) → Daily 10 results.
// Data comes from data/questions.json; maps from world-atlas + us-atlas (inlined by build.js).
(function () {
  'use strict';

  var G = window.WSGame;
  var DATA = window.WS_DATA;
  var QUESTIONS = DATA.questions;
  var CATS = {};
  DATA.categories.forEach(function (c) { CATS[c.id] = c; });

  var COLOR = {
    ink: '#0B1026', water: '#0F1A40', focus: '#2E6F8E', other: '#1D2B5E',
    gold: '#FFB547', teal: '#3DDCC4', pink: '#FF6FA8', text: '#F4F1E8'
  };
  // What the result says for a pin inside / near an outlined place.
  var AREA_WORDS = { deserts: ['Right inside the desert', 'desert'], mountains: ['Right in the mountains', 'mountains'], lakes: ['Right on the lake', 'lake'],
    sea: ['Right in the sea', 'sea'], ocean: ['Right in the ocean', 'ocean'] }; // sea/ocean cards use their kind
  // Home buttons use a couple of longer names (the cards themselves keep the short category names).
  var TILE_NAMES = { cities: 'Iconic cities', landmarks: 'Global landmarks' };

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  // The points chip in the top bar: short for big totals (10.8k, 125k, 1.2M) so the bar fits a small phone.
  function fmtPts(n) {
    n = Math.round(n);
    if (n < 10000) return fmt(n);
    if (n < 1e6) return (n < 1e5 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') : Math.floor(n / 1000)) + 'k';
    return (Math.floor(n / 1e5) / 10).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  function sportDef(q) {
    for (var i = 0; i < DATA.sportsTabs.length; i++) {
      var tab = DATA.sportsTabs[i];
      if (tab.region !== q.region) continue;
      for (var j = 0; j < tab.sports.length; j++) if (tab.sports[j].id === q.sport) return tab.sports[j];
    }
    return null;
  }
  // "Where is the Amazon River?" → "The Amazon River"; "Where do Liverpool play?" → "Liverpool"
  function subjectOf(q) {
    var m = /^Where is (.+)\?$/.exec(q.prompt) || /^Where are (.+)\?$/.exec(q.prompt) ||
      /^Where do (.+) play\?$/.exec(q.prompt) || /^Where does (.+) play at home\?$/.exec(q.prompt);
    var s = m ? m[1] : q.prompt;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // After the guess, show the full team name (the question itself leaves out the city).
  function fullName(q) { return q.team ? q.team.charAt(0).toUpperCase() + q.team.slice(1) : subjectOf(q); }
  var ICON = {
    fit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 3"/></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DDCC4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    chevron: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E95BD" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    shuffle: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B1026" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    bulb: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/></svg>',
    share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
    soundOn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    soundOff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>'
  };
  function bigIcon(svg, size) { return svg.replace(/width="\d+" height="\d+"/, 'width="' + size + '" height="' + size + '"'); }
  function trophyIcon(color, size, filled) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (filled ? color : 'none') + '" stroke="' + (filled ? '#0B1026' : color) +
      '" stroke-width="' + (filled ? 1.4 : 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M7 3h10v6a5 5 0 0 1-10 0V3z"/><path d="M17 5h3v1.5a4 4 0 0 1-3.4 4M7 5H4v1.5a4 4 0 0 0 3.4 4"/>' +
      '<path d="M10 14.5h4v3h-4zM7.5 21h9l-1-3.5h-7z"/></svg>';
  }
  var TIERS = {
    bronze: { label: 'Bronze', color: '#E39A5D', need: 3 },
    silver: { label: 'Silver', color: '#CBD5E8', need: 7 },
    gold: { label: 'Gold', color: '#FFC93C', need: 10 }
  };
  var TIER_ORDER = ['bronze', 'silver', 'gold'];
  // What the result says when a sports guess is a hit (within 100 mi).
  var SPORT_WORDS = {
    nfl: 'Touchdown!', nba: 'Swish!', mlb: 'Home run!', nhl: 'Goal!', soccer: 'GOOOAL!',
    football: 'GOOOAL!', tennis: 'Ace!', rugby: 'Try!', afl: 'Goal!', nrl: 'Try!', bbl: 'Six!'
  };
  var Sound = window.WSSound;
  // ---------- fun layer: verdict words by closeness, combo, toasts ----------
  var VIBE_WORDS = {
    bullseye: ['Bullseye!'],
    scorching: ['Scorching!', 'So close!', 'Almost perfect!'],
    hot: ['Hot!', 'Nice one!', 'Great guess!'],
    warm: ['Warm!', 'Not bad!', 'Getting warmer!'],
    chilly: ['Chilly!', 'Close-ish!', 'Keep going!'],
    cold: ['Brrr, cold!', 'Way off!', 'Next one’s yours!']
  };
  var VIBE_SOUND = { bullseye: 'bullseye', scorching: 'scorching', hot: 'hit', warm: 'warm', chilly: 'chilly', cold: 'cold' };
  var CAT_EMOJI = { countries: '🌍', capitals: '🏛️', cities: '🏙️', rivers: '🌊', mountains: '⛰️', deserts: '🏜️', lakes: '⛵', landmarks: '🗽' };
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  // The public link that shares and challenges point to (the same one in the link-preview tags).
  var SITE_URL = 'https://hiipointegames.github.io/world-scroll/prototype/world-scroll.html';
  var SITE_SHORT = 'hiipointegames.github.io/world-scroll';
  function challengeUrl(q, guess) { return SITE_URL + '?beat=' + encodeURIComponent(G.challengeCode(q.id, guess)); }
  var BYID = {};
  QUESTIONS.forEach(function (q) { BYID[q.id] = q; });
  var REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var combo = 0; // good guesses in a row this sitting

  // ---------- saved progress (this browser only) ----------
  var STORE_KEY = 'world-scroll-prototype-v1';
  function freshStore() {
    return { points: 0, streak: 0, lastDay: null, sound: true, sportsRun: 0, trophies: { bronze: 0, silver: 0, gold: 0 } };
  }
  var store = freshStore();
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) {
      store = Object.assign(store, saved);
      store.trophies = Object.assign(freshStore().trophies, saved.trophies || {});
    }
  } catch (e) { /* storage unavailable: play without saving */ }
  (function () { // count the different days the game has been opened here (for the pop-up tips)
    var today = todayKey();
    store.visitDays = G.countVisit(store.visitDays, store.lastVisit, today);
    store.lastVisit = today;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { }
  })();
  Sound.setEnabled(store.sound);
  document.addEventListener('pointerdown', function () { if (store.sound) Sound.unlock(); }, { once: true });
  // Background music: 'wind' (welcome), 'home' (home + categories), 'sports' (Sports). Remembered so un-muting brings back the right one.
  var musicNow = null;
  function music(name) { musicNow = name; Sound.setMusic(store.sound ? name : false); }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { } }
  function shownStreak() {
    if (!store.lastDay) return 0;
    var today = todayKey();
    if (store.lastDay === today) return store.streak;
    return G.nextStreak(store.lastDay, today, store.streak) > 1 ? store.streak : 0; // played yesterday: still alive
  }
  function recordPoints(points) {
    var today = todayKey();
    store.streak = G.nextStreak(store.lastDay, today, store.streak);
    store.lastDay = today;
    store.points += points;
    save();
  }

  // ---------- map geometry (built once) ----------
  var worldCountries = topojson.feature(WS_WORLD, WS_WORLD.objects.countries).features;
  var countryBorders = topojson.mesh(WS_WORLD, WS_WORLD.objects.countries, function (a, b) { return a !== b; });
  var usNation = topojson.feature(WS_US, WS_US.objects.nation);
  var usStateLines = topojson.mesh(WS_US, WS_US.objects.states, function (a, b) { return a !== b; });
  // Countries shown in the Europe colour on the Europe sports map. Russia counts (Moscow, St. Petersburg,
  // Kaliningrad), matching the capitals data. Turkey counts too (it is in both Europe and Asia).
  var EUROPE = ['Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia',
    'Cyprus', 'N. Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Faeroe Is.', 'Finland', 'France', 'Germany', 'Greece',
    'Guernsey', 'Hungary', 'Iceland', 'Ireland', 'Isle of Man', 'Italy', 'Jersey', 'Kosovo', 'Latvia', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Macedonia', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'Norway',
    'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom', 'Vatican', 'Åland'];
  function fc(features) { return { type: 'FeatureCollection', features: features }; }
  function split(isFocus) {
    return {
      focus: fc(worldCountries.filter(function (f) { return isFocus(f.properties.name); })),
      other: fc(worldCountries.filter(function (f) { return !isFocus(f.properties.name); }))
    };
  }
  var LAYERS = {
    // US state outlines show on every map that includes the United States (many players are American).
    world: Object.assign(split(function (n) { return n !== 'Antarctica'; }), { borders: countryBorders, inner: usStateLines }),
    europe: Object.assign(split(function (n) { return EUROPE.indexOf(n) >= 0; }), { borders: countryBorders }),
    australia: Object.assign(split(function (n) { return n === 'Australia' || n === 'New Zealand'; }), { borders: countryBorders }),
    // The USA sports map also plays in Canada (Raptors, Blue Jays, Maple Leafs, Whitecaps...),
    // so Canada gets the same "play area" color as the US.
    usa: {
      focus: fc(usNation.features.concat(worldCountries.filter(function (f) { return f.properties.name === 'Canada'; }))),
      inner: usStateLines, borders: countryBorders,
      other: fc(worldCountries.filter(function (f) { var n = f.properties.name; return n !== 'United States of America' && n !== 'Canada'; }))
    }
  };

  // Continent maps (Africa, Asia, ...) and the US-states map are built on first use.
  var CONTINENT_OF = DATA.atlasContinents || {};
  var ALSO_IN = DATA.atlasAlsoIn || {}; // countries in two continents (Turkey: Asia and Europe)
  function layersFor(regionId) {
    if (LAYERS[regionId]) return LAYERS[regionId];
    var r = DATA.regions[regionId];
    if (r.globe) LAYERS[regionId] = LAYERS.world; // the ocean map colors land just like the world map
    else if (r.projection === 'albersUsa') LAYERS[regionId] ={ focus: usNation, inner: usStateLines, other: null, borders: null };
    else {
      var b = r.bounds || {};
      var showsUS = b.lonMin < -67 && b.lonMax > -125 && b.latMin < 49 && b.latMax > 25 || r.continent === 'North America';
      LAYERS[regionId] = Object.assign(split(function (n) { return CONTINENT_OF[n] === r.continent || (ALSO_IN[n] || []).indexOf(r.continent) >= 0; }), { borders: countryBorders, inner: showsUS ? usStateLines : null });
    }
    return LAYERS[regionId];
  }
  var COUNTRY_SHAPE = {};
  worldCountries.forEach(function (f) { COUNTRY_SHAPE[f.properties.name] = f; });

  // ---------- "Your pin: ..." (shown after lock-in): the country, or the US state ----------
  var usStates = topojson.feature(WS_US, WS_US.objects.states).features;
  var ATLAS_NAMES = DATA.atlasNames || {};
  // Seas first (they're more exact), then oceans. The name is the answer up to the first comma.
  var WATERS = DATA.questions.filter(function (q) { return q.area && (q.kind === 'sea' || q.kind === 'ocean'); })
    .sort(function (a, b) { return (a.kind === 'sea' ? 0 : 1) - (b.kind === 'sea' ? 0 : 1); });
  function waterAt(g) {
    var hit = WATERS.filter(function (q) { return G.inArea(q.area, g); })[0];
    return hit ? hit.answer.split(',')[0] : null;
  }
  function placeOfPin(g) {
    var pt = [g.lon, g.lat], where = null;
    for (var i = 0; i < worldCountries.length && !where; i++) {
      if (d3.geoContains(worldCountries[i], pt)) where = worldCountries[i].properties.name;
    }
    if (where === 'United States of America') {
      var st = usStates.filter(function (f) { return d3.geoContains(f, pt); })[0];
      where = st ? st.properties.name + ', USA' : 'USA';
    } else if (where) where = ATLAS_NAMES[where] || where;
    if (!where) where = waterAt(g); // in the sea: name it ("Caribbean Sea", "Pacific Ocean")
    return where || 'In the water'; // just the spot: a country, or a US state ("Iowa, USA")
  }

  // Distance from a guess to a country: 0 if the pin is inside it, else to the nearest border point.
  function shapeDistance(feature, g) {
    if (d3.geoContains(feature, [g.lon, g.lat])) return { miles: 0, point: g };
    var best = Infinity, point = null, geom = feature.geometry;
    var polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (c) {
          var p = { lon: c[0], lat: c[1] }, d = G.haversineMiles(g, p);
          if (d < best) { best = d; point = p; }
        });
      });
    });
    return { miles: best, point: point };
  }

  // The world map and the ocean map (which also shows both poles) are drawn as a globe.
  function isGlobe(regionId) { return regionId === 'world' || !!DATA.regions[regionId].globe; }

  // keep: room to leave free for the zoom buttons ({ right, top } in px), so the map never sits under them
  // (Maine used to hide behind the − button on the US states map).
  function makeProjection(regionId, W, H, keep) {
    var r = DATA.regions[regionId];
    var right = (keep && keep.right) || 0, top = (keep && keep.top) || 0;
    if (r.projection === 'albersUsa') { // lower 48 with Alaska and Hawaii insets
      return d3.geoAlbersUsa().fitExtent([[8, 8 + top], [W - 8 - right, H - 8]], usNation);
    }
    var b = r.bounds;
    var pts = [];
    for (var i = 0; i <= 20; i++) {
      var lon = b.lonMin + (b.lonMax - b.lonMin) * i / 20, lat = b.latMin + (b.latMax - b.latMin) * i / 20;
      pts.push([lon, b.latMin], [lon, b.latMax], [b.lonMin, lat], [b.lonMax, lat]);
    }
    var proj = isGlobe(regionId) ? d3.geoNaturalEarth1() : d3.geoMercator();
    if (r.rotate) proj.rotate([r.rotate, 0]); // Oceania straddles the 180° line
    proj.fitExtent([[6, 6 + top], [W - 6 - right, H - 6]], { type: 'MultiPoint', coordinates: pts });
    proj.clipExtent([[0, 0], [W, H]]); // land beyond the region still fills the space next to the buttons
    return proj;
  }

  var pathCache = {};
  function regionPaths(regionId, W, H, proj) {
    var key = regionId + '|' + W + '|' + H + '|' + proj.scale() + '|' + proj.translate();
    if (pathCache[key]) return pathCache[key];
    var path = d3.geoPath(proj), L = layersFor(regionId);
    var out = {
      other: L.other ? path(L.other) || '' : '', focus: path(L.focus) || '', borders: L.borders ? path(L.borders) || '' : '',
      inner: L.inner ? path(L.inner) || '' : '',
      lakes: path(WS_LAKES) || '', // big lakes as water, so the Great Lakes (and Michigan's shape) show
      // Canada's provinces and Australia's states (the US-only map uses its own projection and skips them)
      provinces: DATA.regions[regionId].projection === 'albersUsa' ? '' : path(WS_PROVINCES) || '',
      sphere: isGlobe(regionId) ? path({ type: 'Sphere' }) : '',
      grid: isGlobe(regionId) ? path(d3.geoGraticule10()) : ''
    };
    pathCache[key] = out;
    return out;
  }

  // ---------- Map component ----------
  // Renders a region, turns taps into lat/lon, draws the guess pin and (after lock-in) the answer.
  function createMap(host, regionId, onTap) {
    var W = Math.max(200, Math.round(host.clientWidth)), H = Math.max(80, Math.round(host.clientHeight)); // draw at the box's real size, so a short map isn't squeezed (dark side strips)
    function fitProjection() {
      if (isGlobe(regionId)) return makeProjection(regionId, W, H);
      var btns = host.parentNode && host.parentNode.querySelector('.zoom-btns'), hr = host.getBoundingClientRect();
      if (!btns || !btns.offsetWidth) return makeProjection(regionId, W, H);
      var br = btns.getBoundingClientRect();
      var beside = makeProjection(regionId, W, H, { right: Math.max(0, hr.right - br.left) + 4 });
      var below = makeProjection(regionId, W, H, { top: Math.max(0, br.bottom - hr.top) + 4 });
      return beside.scale() >= below.scale() ? beside : below;
    }
    var proj = fitProjection();
    var P = regionPaths(regionId, W, H, proj);
    var NS = 'http://www.w3.org/2000/svg';
    var svgEl = document.createElementNS(NS, 'svg');
    host.appendChild(svgEl);
    // If the card layout shifts later, the map scales to fit; matching the backdrop hides the edges.
    host.style.background = isGlobe(regionId) ? COLOR.ink : COLOR.water;
    var svg = d3.select(svgEl)
      .attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img')
      .attr('aria-label', 'Map of ' + DATA.regions[regionId].label + '. Drop a pin where you think it is.');

    svg.append('rect').attr('width', W).attr('height', H).attr('fill', isGlobe(regionId) ? COLOR.ink : COLOR.water);
    var zg = svg.append('g');
    var bg = svg.select('rect');
    var layers = []; // [path, key in P]: redrawn if the map box changes size
    function layer(key, cls, fill) {
      if (!P[key]) return;
      var el = zg.append('path').attr('d', P[key]);
      if (cls) el.attr('class', cls);
      if (fill) el.attr('fill', fill);
      layers.push([el, key]);
    }
    layer('sphere', null, COLOR.water);
    layer('grid', 'm-grid');
    layer('other', null, COLOR.other);
    layer('focus', null, COLOR.focus);
    layer('inner', 'm-inner');
    layer('provinces', 'm-inner');
    // lakes go on top of the state lines, so state borders that run out into the lakes are hidden
    layer('lakes', 'm-lakes', COLOR.water);
    layer('borders', 'm-borders');
    var tolPath = zg.append('path').attr('class', 'm-tol');

    var pins = svg.append('g');
    // A friend's pin from a "Beat my pin" link: pink, with its own dashed line to the answer.
    var friendLine = pins.append('line').attr('class', 'm-line m-friend-line').style('display', 'none');
    var friendPin = pins.append('g').style('display', 'none');
    var friendBody = friendPin.append('g').attr('class', 'm-pin m-friend');
    friendBody.append('circle').attr('r', 8).attr('fill', COLOR.pink).attr('stroke', COLOR.ink).attr('stroke-width', 2);
    friendBody.append('circle').attr('r', 3).attr('fill', COLOR.ink);
    var line = pins.append('line').attr('class', 'm-line').style('display', 'none');
    var answer = pins.append('g').style('display', 'none');
    var answerBody = answer.append('g').attr('class', 'm-answer');
    answerBody.append('circle').attr('r', 10).attr('fill', 'none').attr('stroke', COLOR.teal).attr('stroke-width', 3);
    answerBody.append('circle').attr('r', 3.5).attr('fill', COLOR.teal);
    var plane = pins.append('text').attr('class', 'm-plane').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .text('✈️').style('display', 'none'); // flies from the pin to the answer on lock-in
    var guessPin = pins.append('g').style('display', 'none');
    var guessBody = guessPin.append('g').attr('class', 'm-pin');
    guessBody.append('circle').attr('r', 8).attr('fill', COLOR.gold).attr('stroke', COLOR.ink).attr('stroke-width', 2);
    guessBody.append('circle').attr('r', 3).attr('fill', COLOR.ink);

    var t = d3.zoomIdentity, guess = null, target = null, progress = 0, locked = false, friend = null;

    function screenOf(ll) { return t.apply(proj([ll.lon, ll.lat])); }
    function place() {
      zg.attr('transform', t.toString());
      if (friend && target) {
        var fp = screenOf(friend), fa = screenOf(target);
        friendPin.style('display', null).attr('transform', 'translate(' + fp[0] + ',' + fp[1] + ')');
        friendLine.style('display', null).attr('x1', fp[0]).attr('y1', fp[1]).attr('x2', fa[0]).attr('y2', fa[1]);
      }
      if (guess) {
        var g = screenOf(guess);
        guessPin.style('display', null).attr('transform', 'translate(' + g[0] + ',' + g[1] + ')');
        if (target) {
          var a = screenOf(target);
          line.style('display', null).attr('x1', g[0]).attr('y1', g[1])
            .attr('x2', g[0] + (a[0] - g[0]) * progress).attr('y2', g[1] + (a[1] - g[1]) * progress);
          answer.style('display', progress >= 1 ? null : 'none').attr('transform', 'translate(' + a[0] + ',' + a[1] + ')');
          var flying = progress > 0 && progress < 1 && Math.hypot(a[0] - g[0], a[1] - g[1]) > 24;
          plane.style('display', flying ? null : 'none');
          if (flying) { // the emoji points up-right, so turn it 45° more than the line's angle
            var ang = Math.atan2(a[1] - g[1], a[0] - g[0]) * 180 / Math.PI + 45;
            plane.attr('transform', 'translate(' + (g[0] + (a[0] - g[0]) * progress) + ',' + (g[1] + (a[1] - g[1]) * progress) + ') rotate(' + ang + ')');
          }
        }
      }
    }

    // How far players can zoom in: deep enough to place a pin on a city block-sized spot.
    // The world map needs the most room (from the whole planet down to a small country or city).
    var maxZoom = isGlobe(regionId) ? 80 : 40;
    var wrap = host.parentNode;
    // ---- zoom and drag, tuned to feel like a top map app ----
    // * one redraw per screen refresh, however many touch events arrive (no wasted work, no stutter)
    // * paths draw a little faster while the map is moving, then crisp again when it stops
    // * a flick keeps the map gliding and slowing down (momentum), like Google or Apple Maps
    // * double-tap (or double-click) zooms in right where you tapped
    // * a tap that wobbles a few pixels still drops the pin (it isn't mistaken for a drag)
    var frameQueued = false, samples = [], fling = null, settleTimer = null;
    function draw() { frameQueued = false; place(); }
    function queueDraw() { if (!frameQueued) { frameQueued = true; requestAnimationFrame(draw); } }
    function moving(on) {
      clearTimeout(settleTimer);
      if (on) svg.classed('moving', true);
      else settleTimer = setTimeout(function () { svg.classed('moving', false); }, 90);
    }
    function stopFling() { if (fling) { cancelAnimationFrame(fling.raf); fling = null; } }
    var zoom = d3.zoom().scaleExtent([1, maxZoom]).extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
      .clickDistance(8).tapDistance(12) // finger wobble on a tap is not a drag
      .on('start', function (e) {
        if (e.sourceEvent) { stopFling(); samples = []; if (focusTimer) { clearTimeout(focusTimer); focusTimer = null; } } // a new touch catches the gliding map (and the player stays in control)
        moving(true);
      })
      .on('zoom', function (e) {
        t = e.transform;
        if (e.sourceEvent && !fling) { // remember the last moments of a drag, to measure the flick
          var now = e.sourceEvent.timeStamp; // when the finger actually moved (not when we got to it), so busy phones still glide
          samples.push({ t: now, x: t.x, y: t.y, k: t.k });
          while (samples.length && now - samples[0].t > 160) samples.shift();
        }
        queueDraw();
        if (wrap) wrap.classList.toggle('zoomed', t.k > 1.05);
      })
      .on('end', function (e) {
        var pinch = samples.length > 1 && samples[0].k !== samples[samples.length - 1].k;
        var v = e.sourceEvent && t.k > 1.01 && !pinch && !reduceMotion ? G.flingVelocity(samples, e.sourceEvent.timeStamp) : { vx: 0, vy: 0 };
        samples = [];
        if (!v.vx && !v.vy) { moving(false); return; }
        var last = performance.now();
        fling = { v: v };
        (function glide(now) {
          if (!fling) return;
          var dt = Math.min(48, now - last); last = now;
          svg.call(zoom.translateBy, fling.v.vx * dt / t.k, fling.v.vy * dt / t.k);
          fling.v = G.flingStep(fling.v, dt);
          if (fling.v) fling.raf = requestAnimationFrame(glide); else { fling = null; moving(false); }
        })(last);
      });
    svg.call(zoom).on('dblclick.zoom', null);

    var lastTap = null;
    svg.on('click', function (e) {
      var tap = { t: e.timeStamp, x: e.clientX, y: e.clientY }; // when the tap happened, even if the phone was busy
      if (G.isDoubleTap(lastTap, tap)) { // double-tap: zoom in toward that spot (the pin is already there)
        lastTap = null;
        svg.transition().duration(300).ease(d3.easeCubicOut).call(zoom.scaleBy, 2.2, d3.pointer(e, svgEl));
        return;
      }
      lastTap = tap;
      if (locked) return;
      var p = t.invert(d3.pointer(e, svgEl));
      var ll = proj.invert(p);
      if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) return;
      var back = proj(ll); // reject taps outside the globe edge
      if (!back || Math.abs(back[0] - p[0]) > 1 || Math.abs(back[1] - p[1]) > 1) return;
      guess = { lon: ll[0], lat: ll[1] };
      place();
      var g = screenOf(guess); // a ripple where the pin lands
      var rp = pins.insert('circle', ':first-child').attr('class', 'm-ripple').attr('r', 9).attr('cx', g[0]).attr('cy', g[1]);
      setTimeout(function () { rp.remove(); }, 650);
      if (window.FX) FX.pinBurst(e.clientX, e.clientY);
      guessBody.classed('drop', false);
      void guessBody.node().getBoundingClientRect();
      guessBody.classed('drop', true);
      onTap(guess);
    });

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var shown = null, riverLine = null; // the revealed answer, kept so a resize can redraw it
    var focusTimer = null; // the "fly to the answer" that follows every reveal

    var api = {
      // Where the answer sits, as a fraction of the map box (for floating points).
      answerFrac: function () { if (!target) return [0.5, 0.5]; var a = screenOf(target); return [a[0] / W, a[1] / H]; },
      // Two teal rings bursting out of the answer: the bullseye shockwave.
      shock: function () {
        if (!target || reduceMotion) return;
        var a = screenOf(target);
        [0, 140].forEach(function (d) {
          var c = pins.insert('circle', ':first-child').attr('class', 'm-shock').attr('r', 12).attr('cx', a[0]).attr('cy', a[1]).style('animation-delay', d + 'ms');
          setTimeout(function () { c.remove(); }, 1100 + d);
        });
      },
      // + and − zoom toward the pin once there is one (and it's on screen), otherwise toward the middle.
      zoomBy: function (k) {
        var p = guess && screenOf(guess), on = p && p[0] >= 0 && p[1] >= 0 && p[0] <= W && p[1] <= H;
        svg.transition().duration(240).call(zoom.scaleBy, k, on ? p : [W / 2, H / 2]);
      },
      // Back out to the whole map in one tap.
      resetZoom: function () { svg.transition().duration(320).call(zoom.transform, d3.zoomIdentity); },
      // Show a friend's pin (after the reveal), zooming out if it's off screen.
      showFriend: function (ll) {
        friend = ll;
        var p = screenOf(ll);
        if (p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);
        place();
        friendBody.classed('drop', true);
      },
      // opts.shape: a country to light up; opts.target: where the dashed line should end.
      reveal: function (card, opts) {
        locked = true;
        target = (opts && opts.target) || { lat: card.lat, lon: card.lon };
        shown = { card: card, opts: opts };
        drawAnswer(card, opts, reduceMotion ? 0 : null);
        // Teach where it really is: the result starts at the player's own zoom (pin, line, answer), then
        // the camera glides in to frame the correct answer. Touching the map first cancels it.
        clearTimeout(focusTimer);
        focusTimer = setTimeout(function () { focusTimer = null; if (svgEl.isConnected) focusAnswer(reduceMotion ? 0 : 1000); }, reduceMotion ? 700 : 1250);
        if (reduceMotion) { progress = 1; place(); return; }
        var start = performance.now();
        (function step(now) {
          progress = Math.min(1, (now - start) / 550);
          progress = 1 - Math.pow(1 - progress, 3);
          place();
          if (progress < 1) requestAnimationFrame(step);
          else answerBody.classed('drop', true);
        })(start);
      }
    };

    // What to frame when we fly in: the river, desert, sea or range itself; for a country, the part the card is
    // about (its mainland, not far-off islands, so France doesn't zoom out to French Guiana); null for a point.
    function answerGeo(card, opts) {
      if (opts && opts.area) return opts.area;
      if (opts && opts.line) return { type: 'MultiLineString', coordinates: opts.line };
      if (opts && opts.shape) {
        var g = opts.shape.geometry;
        if (g.type !== 'MultiPolygon') return opts.shape;
        var pt = [card.lon, card.lat], best = null, bestArea = -1;
        g.coordinates.forEach(function (poly) {
          var f = { type: 'Polygon', coordinates: poly };
          if (bestArea === Infinity) return;
          if (d3.geoContains(f, pt)) { best = f; bestArea = Infinity; return; }
          var a = d3.geoArea(f); if (a > bestArea) { best = f; bestArea = a; }
        });
        return best || opts.shape;
      }
      return null;
    }
    // The zoom that frames the answer: shapes fill most of the map; a point shows about 700 miles around it,
    // so you see the region it's in. Returns null when there's nothing to gain (oceans, or already zoomed in on it).
    function focusTransform(card, opts) {
      var path = d3.geoPath(proj), geo = answerGeo(card, opts);
      var deg = function (miles) { return miles / G.EARTH_RADIUS_MI * 180 / Math.PI; };
      var around = d3.geoCircle().center([card.lon, card.lat]).radius(deg(geo ? 150 : Math.max(350, (card.toleranceMiles || 25) * 4)))();
      var b = path.bounds(geo || around), m = path.bounds(around);
      if (![b[0][0], b[0][1], b[1][0], b[1][1]].every(isFinite)) return null;
      var cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
      var bw = Math.max(b[1][0] - b[0][0], geo ? m[1][0] - m[0][0] : 0, 1), bh = Math.max(b[1][1] - b[0][1], geo ? m[1][1] - m[0][1] : 0, 1);
      // frame it in the space beside the zoom buttons, so they never cover the answer
      var btns = wrap && wrap.querySelector('.zoom-btns'), side = 0;
      if (btns && btns.offsetWidth && btns.offsetHeight > btns.offsetWidth) side = btns.offsetWidth + 12; // buttons in a column on the right
      var VW = W - side;
      var k = Math.max(1, Math.min(maxZoom, 0.8 / Math.max(bw / VW, bh / H)));
      var a = screenOf(target), onScreen = a[0] >= 0 && a[1] >= 0 && a[0] <= W && a[1] <= H;
      if (k < 1.15 || (onScreen && t.k >= k * 0.85)) return null;
      var x = Math.max(W - W * k, Math.min(0, VW / 2 - cx * k)), y = Math.max(H - H * k, Math.min(0, H / 2 - cy * k)); // stay on the map
      return d3.zoomIdentity.translate(x, y).scale(k);
    }
    function focusAnswer(ms) {
      if (!shown) return;
      var tr = focusTransform(shown.card, shown.opts);
      if (!tr) return;
      shown.focused = true;
      svg.interrupt();
      if (ms) svg.transition().duration(ms).ease(d3.easeCubicInOut).call(zoom.transform, tr); // a smooth "fly to" (zooms out a little, then in)
      else svg.call(zoom.transform, tr);
    }

    // The answer's highlight, and the zoom that frames it. ms: animation time (null = the normal one).
    function drawAnswer(card, opts, ms) {
        if (opts && opts.area) { // the whole desert or range lights up
          tolPath.attr('d', d3.geoPath(proj)(opts.area) || '').classed('m-area', true).classed('m-water', card.kind === 'ocean' || card.kind === 'sea');
        } else if (opts && opts.line) { // the whole river lights up, with a soft band for the bullseye zone
          var riverGeo = { type: 'MultiLineString', coordinates: opts.line };
          var zoneDeg = (card.toleranceMiles || 250) / G.EARTH_RADIUS_MI * 180 / Math.PI;
          var pxPerDeg = Math.abs(proj([card.lon, card.lat + 0.5])[1] - proj([card.lon, card.lat - 0.5])[1]) || 1; // 1° north-south
          tolPath.attr('d', d3.geoPath(proj)(riverGeo) || '').classed('m-river', true)
            .style('--zone', Math.max(6, Math.min(80, zoneDeg * pxPerDeg * 2)) + 'px');
          if (!riverLine) riverLine = tolPath.clone().classed('m-tol m-river', false).classed('m-river-line', true).attr('style', null);
          riverLine.attr('d', tolPath.attr('d'));
        } else if (opts && opts.shape) {
          tolPath.attr('d', d3.geoPath(proj)(opts.shape) || '').classed('m-shape', true);
        } else {
          var deg = (card.toleranceMiles || 25) / G.EARTH_RADIUS_MI * 180 / Math.PI;
          tolPath.attr('d', d3.geoPath(proj)(d3.geoCircle().center([card.lon, card.lat]).radius(deg)()) || '');
        }
        svg.classed('revealed', true);
        var a = screenOf(target), g = screenOf(guess);
        if (opts && (opts.line || opts.area)) {
          // Rivers, deserts and ranges: zoom so the whole thing and the pin fit, so it's easy to see.
          var bb = d3.geoPath(proj).bounds(opts.area || { type: 'MultiLineString', coordinates: opts.line });
          var gp = proj([guess.lon, guess.lat]);
          var x0 = Math.min(bb[0][0], gp[0]), y0 = Math.min(bb[0][1], gp[1]), x1 = Math.max(bb[1][0], gp[0]), y1 = Math.max(bb[1][1], gp[1]);
          var k = Math.max(1, Math.min(maxZoom, 0.8 / Math.max((x1 - x0) / W, (y1 - y0) / H)));
          // Something as big as an ocean already fills the map: keep the whole map in view instead of sliding it.
          var fit = k < 1.2 ? d3.zoomIdentity : d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
          svg.transition().duration(ms == null ? 700 : ms).call(zoom.transform, fit);
        } else {
          // If the player zoomed in and the answer is off screen, zoom back out first.
          var off = [a, g].some(function (p) { return p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H; });
          if (off) svg.transition().duration(ms == null ? 350 : ms).call(zoom.transform, d3.zoomIdentity);
        }
    }

    // The card layout can change after the map is drawn (a card waiting off screen, tab rows stepping aside
    // after lock-in). Redraw at the new size instead of squeezing the old drawing, which left dark side strips.
    if (window.ResizeObserver) {
      var pending = false;
      new ResizeObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          var w = Math.round(host.clientWidth), h = Math.round(host.clientHeight);
          if (!w || !h || (Math.abs(w - W) < 3 && Math.abs(h - H) < 3)) return;
          W = Math.max(200, w); H = Math.max(80, h);
          proj = fitProjection();
          P = regionPaths(regionId, W, H, proj);
          svg.attr('viewBox', '0 0 ' + W + ' ' + H);
          bg.attr('width', W).attr('height', H);
          layers.forEach(function (l) { l[0].attr('d', P[l[1]] || ''); });
          zoom.extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]]);
          svg.interrupt();
          if (shown) { drawAnswer(shown.card, shown.opts, 0); if (shown.focused) focusAnswer(0); } // keep framing the answer
          else svg.call(zoom.transform, d3.zoomIdentity);
          place();
        });
      }).observe(host);
    }
    return api;
  }

  // ---------- screens ----------
  var app = document.getElementById('app');
  // Safety net: the game frame, the screens and the card stage must never scroll (only lists inside them do).
  // Some browsers can still nudge them (mouse wheel, focus, find-in-page); snap them straight back.
  document.addEventListener('scroll', function (e) {
    var el = e.target;
    if (el === document || !el.classList) { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); return; }
    if (el === app || el.classList.contains('screen') || el.classList.contains('stage') || el.classList.contains('card')) {
      if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; }
    }
  }, true);
  var feed = null;      // the feed being played
  var card = null;      // the card on screen
  var busy = false;     // true while a card is sliding

  function statChips(extra) {
    return '<div class="stats">' +
      '<button class="stat" id="stat-streak" aria-label="Day streak. What is this?">' + ICON.flame + '<span>' + shownStreak() + '</span></button>' +
      '<button class="stat" id="stat-points" aria-label="Points. What is this?">' + ICON.star + '<span data-n="' + store.points + '">' + fmtPts(store.points) + '</span></button>' +
      (extra || '') + '</div>';
  }
  function soundButton() {
    // The mute button: on every screen, a glowing teal circle when sound is on, grey when muted.
    return '<button class="icon-btn sound-btn" aria-pressed="' + store.sound + '" aria-label="' + (store.sound ? 'Sound is on. Tap to mute' : 'Sound is off. Tap to turn on') + '">' +
      (store.sound ? ICON.soundOn : ICON.soundOff) + '</button>';
  }
  // Hook up the tappable chips and the sound button on whatever screen is showing.
  function wireChrome() {
    var s = document.getElementById('stat-streak'), p = document.getElementById('stat-points');
    var tc = document.getElementById('trophy-case');
    var brand = document.getElementById('brand');
    if (brand) brand.onclick = showIntro;
    if (s) s.onclick = streakSheet;
    if (p) p.onclick = pointsSheet;
    var rc = document.getElementById('rank-card');
    if (rc) rc.onclick = rankSheet;
    if (tc) tc.onclick = trophySheet;
  }
  // Mute / unmute from any sound button on any screen (home, Sports, or the corner of each card).
  function toggleSound() {
    store.sound = !store.sound; save();
    Sound.setEnabled(store.sound);
    if (store.sound) { Sound.unlock(); Sound.play('tap'); }
    Sound.setMusic(store.sound ? musicNow : false); // back on: the music for the screen you're on
    app.querySelectorAll('.sound-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', store.sound);
      b.setAttribute('aria-label', store.sound ? 'Sound is on. Tap to mute' : 'Sound is off. Tap to turn on');
      b.innerHTML = store.sound ? ICON.soundOn : ICON.soundOff;
    });
  }
  app.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.sound-btn')) { e.stopPropagation(); toggleSound(); }
  });

  // ---------- pop-up sheets (stat legends, trophy case, trophy awards) ----------
  function openSheet(html, opts) {
    closeSheet();
    var ov = document.createElement('div');
    ov.className = 'sheet-overlay';
    ov.innerHTML = '<div class="sheet' + (opts && opts.cls ? ' ' + opts.cls : '') + '" role="dialog" aria-modal="true">' + html +
      '<button class="btn primary big" data-close>' + ((opts && opts.button) || 'Got it') + '</button></div>';
    app.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.closest('[data-close]')) { closeSheet(); if (opts && opts.onClose) opts.onClose(); }
    });
    ov.querySelector('[data-close]').focus({ preventScroll: true }); // long pop-ups (Deep Dives) open at the top, not scrolled to the button
    if (opts && opts.confetti) confetti(ov, opts.confetti);
  }
  function closeSheet() { var o = app.querySelector('.sheet-overlay'); if (o) o.remove(); }
  document.addEventListener('keydown', function (e) {
    var o = app.querySelector('.sheet-overlay');
    if (o && e.key === 'Escape') o.querySelector('[data-close]').click();
  });
  function sheetHead(icon, eyebrow, title) {
    return '<div class="sheet-icon">' + icon + '</div><div class="sheet-eyebrow">' + eyebrow + '</div><h2 class="sheet-title">' + title + '</h2>';
  }

  // Sports nerd facts: name origin, first coach, where the team began, big moments.
  function nerdSheet(q) {
    var rows = q.nerd.map(function (f) {
      return '<div class="nerd-row"><div class="nerd-label">' + esc(f[0]) + '</div><div class="nerd-text">' + esc(f[1]) + '</div></div>';
    }).join('');
    var kind = nerdKind(q).toUpperCase(); // e.g. SPORTS, CITY, RIVER, OCEAN or LANDMARK nerd facts
    openSheet(sheetHead('<span class="nerd-emoji" aria-hidden="true">🤓</span>', kind + ' NERD FACTS', esc(fullName(q))) +
      (q.venue ? '<div class="sheet-text small">' + esc(q.venue) + ' · ' + esc(q.answer.replace(/\s*\(.*?\)/g, '')) + '</div>' : '') +
      '<div class="nerd-list">' + rows + '</div>' +
      '<button class="btn ghost big share-facts" id="share-facts">' + ICON.share + 'Share these facts</button>', { button: 'Back to the game', cls: 'nerd-sheet' });
    // One share button for all the facts, at the bottom (not one per fact).
    document.getElementById('share-facts').onclick = function () {
      WSShare.send({ text: G.nerdShareText(fullName(q), q.nerd), url: SITE_URL }).then(function (how) { shareToast(how, 'Shared!', 'Facts copied! Paste them anywhere.'); });
    };
  }

  function nerdKind(q) {
    if (q.kind === 'ocean') return 'Ocean';
    if (q.kind === 'sea') return 'Sea';
    return { sports: 'Sports', countries: 'Country', cities: 'City', capitals: 'Capital', rivers: 'River', lakes: 'Lake',
      mountains: 'Mountain', deserts: 'Desert', landmarks: 'Landmark' }[q.category] || 'Nerd';
  }
  // Deep Dive: a rare card's bonus pop-up, full of in-depth facts (plus a country's nerd facts, if it has them).
  function deepSheet(q) {
    var d = q.deepDive, facts = d.facts.concat(q.category === 'sports' ? [] : (q.nerd || []));
    var rows = facts.map(function (f, i) {
      return '<div class="nerd-row deep-row" style="--i:' + i + '"><div class="nerd-label">' + esc(f[0]) + '</div><div class="nerd-text">' + esc(f[1]) + '</div></div>';
    }).join('');
    Sound.play('trophy', 'gold');
    openSheet(sheetHead('<span class="deep-emoji" aria-hidden="true">' + d.emoji + '</span>', '💎 DEEP DIVE · RARE FIND', esc(fullName(q))) +
      '<div class="sheet-text small deep-tagline">' + esc(d.tagline) + '</div>' +
      '<div class="nerd-list">' + rows + '</div>',
      { button: 'Back to the game', cls: 'nerd-sheet deep-sheet', confetti: [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'] });
  }

  function streakSheet() {
    var n = shownStreak(), played = store.lastDay === todayKey();
    var status = played ? 'You’re lit for today. Come back tomorrow to make it ' + (n + 1) + '.'
      : n ? 'You haven’t played today. One card keeps the fire alive.' : 'Play one card to light your first flame.';
    openSheet(sheetHead(bigIcon(ICON.flame, 44), 'THE FLAME', n ? n + '-day streak' : 'Light your streak') +
      '<p class="sheet-text">Your flame grows by one every day you play at least one card. Miss a day and it burns back down to 1.</p>' +
      '<div class="sheet-status">' + status + '</div>', { button: 'Keep it burning' });
  }

  function pointsSheet() {
    var rows = [[0, 'Dead on'], [25, '25 mi away'], [100, '100 mi away'], [350, '350 mi away'], [1000, '1,000 mi away']];
    openSheet(sheetHead(bigIcon(ICON.star, 44), 'THE STAR', fmt(store.points) + ' points') +
      '<p class="sheet-text">Every guess is worth up to 1,000 points. The closer your pin lands, the bigger the haul.</p>' +
      '<div class="points-table">' + rows.map(function (r) {
        return '<div><span>' + r[1] + '</span><b>+' + fmt(G.pointsFor(r[0])) + '</b></div>';
      }).join('') + '</div>' +
      '<p class="sheet-text small">Land inside the teal zone for a Bullseye. Points never go down, so every card grows your pile.</p>',
      { button: 'Let’s score' });
  }

  function trophyCaseHtml(big) {
    return TIER_ORDER.map(function (k) {
      var t = TIERS[k];
      return '<span class="tc-item' + (store.trophies[k] ? '' : ' empty') + '">' + trophyIcon(t.color, big ? 34 : 16, big) +
        '<b>' + store.trophies[k] + '</b>' + (big ? '<span>' + t.label + ' · ' + t.need + ' in a row</span>' : '') + '</span>';
    }).join('');
  }
  function nextTier(run) {
    for (var i = 0; i < TIER_ORDER.length; i++) if (run < TIERS[TIER_ORDER[i]].need) return TIERS[TIER_ORDER[i]];
    return TIERS.gold;
  }
  function trophySheet() {
    var run = store.sportsRun, nt = nextTier(run);
    openSheet(sheetHead(trophyIcon(TIERS.gold.color, 46, true), 'SPORTS', 'Trophy case') +
      '<div class="tc-big">' + trophyCaseHtml(true) + '</div>' +
      '<p class="sheet-text">Drop your pin within <b>100 miles</b> of the stadium and it’s a hit. Chain hits together: <b>3</b> in a row for Bronze, <b>7</b> for Silver, <b>10</b> for Gold. After Gold your run resets and the hunt starts over.</p>' +
      '<p class="sheet-text small">A miss or a skip resets your run, so choose wisely.</p>' +
      '<div class="sheet-status">Current run: ' + run + '. ' + nt.label + ' is ' + (nt.need - run) + ' hit' + (nt.need - run === 1 ? '' : 's') + ' away.</div>',
      { button: 'Let’s play' });
  }

  function showTrophy(tier) {
    var t = TIERS[tier];
    var copy = {
      bronze: ['Bronze trophy!', '3 in a row. Silver is 4 more hits away.'],
      silver: ['Silver trophy!', '7 in a row! Gold is just 3 more away.'],
      gold: ['GOLD TROPHY!', '10 in a row. Legendary. Your run resets now, so go win another.']
    }[tier];
    Sound.play('trophy', tier);
    openSheet('<div class="award-glow" style="--tier:' + t.color + '">' + trophyIcon(t.color, 96, true) + '</div>' +
      '<div class="sheet-eyebrow">' + t.need + ' IN A ROW</div><h2 class="sheet-title award">' + copy[0] + '</h2>' +
      '<p class="sheet-text">' + copy[1] + '</p>' +
      '<div class="sheet-status">Your trophy case: ' + store.trophies[tier] + ' ' + t.label + '</div>',
      { cls: 'award-sheet', button: 'Keep scrolling', confetti: [t.color, COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], onClose: function () { renderMeter(); } });
  }

  function confetti(host, colors, count, originY) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas');
    cv.className = 'confetti';
    host.appendChild(cv);
    var W = cv.width = host.clientWidth * 2, H = cv.height = host.clientHeight * 2, c = cv.getContext('2d');
    var bits = [];
    for (var i = 0; i < (count || 140); i++) {
      bits.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * (originY || 0.38), vx: (Math.random() - 0.5) * 34, vy: -Math.random() * 40 - 12,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 10 + Math.random() * 10, h: 6 + Math.random() * 8,
        color: colors[i % colors.length] });
    }
    var start = performance.now();
    (function frame(now) {
      var t = now - start;
      c.clearRect(0, 0, W, H);
      bits.forEach(function (b) {
        b.vy += 1.1; b.vx *= 0.985; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.globalAlpha = Math.max(0, 1 - t / 2600);
        c.fillStyle = b.color; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); c.restore();
      });
      if (t < 2600 && cv.isConnected) requestAnimationFrame(frame); else cv.remove();
    })(start);
  }

  // ---------- sports hot-streak meter ----------
  function meterHtml() {
    var pips = '';
    for (var n = 1; n <= 10; n++) {
      var mile = n === 3 ? 'bronze' : n === 7 ? 'silver' : n === 10 ? 'gold' : '';
      pips += '<span class="pip' + (mile ? ' mile mile-' + mile : '') + '" data-n="' + n + '"></span>';
    }
    return '<div class="meter-row">' +
      '<div class="meter"><div class="meter-label" id="meter-label"></div><div class="pips" id="pips">' + pips + '</div></div>' +
      '<button class="trophy-case" id="trophy-case" aria-label="Trophy case. What is this?">' + trophyCaseHtml(false) + '</button>' +
      soundButton() + '</div>';
  }
  function renderMeter(show) {
    var run = show == null ? store.sportsRun : show;
    var pips = document.getElementById('pips'), label = document.getElementById('meter-label');
    if (!pips) return;
    pips.querySelectorAll('.pip').forEach(function (p) {
      var n = +p.getAttribute('data-n');
      p.className = p.className.replace(/ on( \w+)?/g, '');
      if (n <= run) p.className += ' on ' + (n <= 3 ? 'bronze' : n <= 7 ? 'silver' : 'gold');
    });
    var nt = nextTier(run);
    label.innerHTML = run === 0 ? 'HOT STREAK · 0 IN A ROW'
      : run >= 3 ? '<span class="fire">ON FIRE</span> · ' + run + ' IN A ROW'
      : run + ' IN A ROW · ' + nt.label.toUpperCase() + ' AT ' + nt.need;
    var tc = document.getElementById('trophy-case');
    if (tc) tc.innerHTML = trophyCaseHtml(false);
  }
  var shownPoints = null;
  function bumpStats() {
    var s = document.getElementById('stat-streak'), p = document.getElementById('stat-points');
    if (s) s.querySelector('span').textContent = shownStreak();
    if (!p) return;
    var span = p.querySelector('span');
    var from = shownPoints == null ? +(span.dataset.n || 0) : shownPoints, to = store.points, t0 = performance.now();
    shownPoints = to;
    p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
    (function tick(now) { // count up to the new total
      var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      span.textContent = fmtPts(from + (to - from) * e);
      if (k < 1 && span.isConnected) requestAnimationFrame(tick);
    })(t0);
  }
  var TAGLINE = 'learn geography by scrolling';
  // Little globe beside the wordmark: teal ocean, gold land-ish arcs, so it reads as a world at a glance.
  var GLOBE = '<svg class="wm-globe" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10.5" fill="#2E6F8E" stroke="#3DDCC4" stroke-width="1.5"/>' +
    '<ellipse cx="12" cy="12" rx="4.6" ry="10.5" fill="none" stroke="#3DDCC4" stroke-width="1.2" opacity=".75"/>' +
    '<path d="M1.8 12h20.4M3.6 6.8h16.8M3.6 17.2h16.8" stroke="#3DDCC4" stroke-width="1.2" opacity=".75"/>' +
    '<circle cx="15.6" cy="8.4" r="1.9" fill="#FFB547"/></svg>';
  var WORDMARK = '<button class="brand" id="brand" aria-label="World Scroll: learn geography by scrolling. About the game">' +
    '<span class="wordmark">' + GLOBE + 'World<span>Scroll</span></span><span class="tagline">' + TAGLINE + '</span></button>';

  // --- Welcome screen (first open, or tap the logo) ---
  function showIntro() {
    music('wind'); // soft wind while the welcome globe spins
    // Each letter of the big wordmark bounces in a wave (see .wave-letter in app.html).
    var letters = function (word, from) {
      return word.split('').map(function (ch, i) { return '<i class="wave-letter" style="--i:' + (from + i) + '">' + ch + '</i>'; }).join('');
    };
    app.innerHTML =
      '<div class="screen intro">' +
      '<div class="intro-globe" aria-hidden="true"></div>' + // a spinning 3D globe (fx.js)
      '<div class="intro-body">' +
      '<div class="intro-brand"><div class="wordmark big" aria-label="World Scroll">' + GLOBE + letters('World', 0) + '<span>' + letters('Scroll', 5) + '</span></div>' +
      '<h1 class="intro-title">Learn geography by scrolling.</h1>' +
      '</div>' +
      // A real card to play right here: the first pin is the first win.
      '<div class="intro-try" id="intro-try"><div class="try-head"><span class="try-kicker">TRY ONE!</span><span class="try-prompt">Where is Paris?</span></div>' +
      '<div class="try-map map-wrap"><div class="map"></div>' + // the same zoom buttons as a real card
      '<div class="zoom-btns"><button class="zoom-in" aria-label="Zoom in">+</button><button class="zoom-out" aria-label="Zoom out">−</button>' +
      '<button class="zoom-reset" aria-label="Show the whole map">' + ICON.fit + '</button></div></div>' +
      '<div class="try-panel hint" id="try-panel" aria-live="polite"></div>' + // fills in with your result
      '<button class="btn teal try-lock" id="try-lock" disabled>Drop a pin on Paris</button></div>' +
      '<p class="intro-more">Scroll through countries, capitals, rivers, oceans, lakes, seas, famous landmarks, and where your favorite sports teams play.</p>' +
      '</div>' +
      '<div class="intro-foot"><button class="btn primary big" id="intro-go">Start scrolling</button></div>' +
      '<div class="corner-sound">' + soundButton() + '</div>' +
      '</div>';
    FX.welcomeGlobe(app.querySelector('.intro-globe'));
    document.getElementById('intro-go').onclick = function () {
      store.seenIntro = true; save(); showPicker({ flyIn: true });
    };
    tryCard();
  }
  // Opening the app (after the first visit): the spinning globe and one big "Tap to explore" button.
  // Browsers only allow sound after a tap, so this tap is what lets the fly-in whoosh and the music play.
  function showGate() {
    app.innerHTML =
      '<div class="screen gate" id="gate">' +
      '<div class="gate-globe" aria-hidden="true"></div>' +
      '<div class="gate-brand"><div class="wordmark big" aria-label="World Scroll">' + GLOBE + 'World<span>Scroll</span></div>' +
      '<p class="gate-tag">Learn geography by scrolling</p></div>' +
      '<button class="btn primary big gate-go" id="gate-go">Tap to explore</button>' +
      '<div class="corner-sound">' + soundButton() + '</div>' + // mute before anything plays
      '</div>';
    FX.welcomeGlobe(app.querySelector('.gate-globe'));
    var gone = false;
    document.getElementById('gate').addEventListener('click', function (e) { // a tap anywhere works, not just the button
      if (gone || e.target.closest('.sound-btn')) return; // the mute button only mutes
      gone = true;
      Sound.unlock();
      showPicker({ flyIn: true });
    });
  }
  // The welcome screen's practice card: Paris on the Europe map. It scores for real.
  function tryCard() {
    var q = QUESTIONS.filter(function (x) { return x.category === 'capitals' && x.prompt === 'Where is Paris?'; })[0];
    var box = document.getElementById('intro-try'), lock = document.getElementById('try-lock'), panel = document.getElementById('try-panel');
    if (!q || !box) return;
    var guess = null;
    var map = createMap(box.querySelector('.map'), 'europe', function (ll) {
      guess = ll; Sound.play('pin');
      lock.disabled = false; lock.textContent = 'Lock in my guess';
      var lr = lock.getBoundingClientRect(), fr = document.querySelector('.intro-foot').getBoundingClientRect();
      if (lr.bottom > fr.top) lock.scrollIntoView({ block: 'center', behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); // small phones: bring the lock button into view
    });
    box.querySelector('.zoom-in').onclick = function () { map.zoomBy(2); };
    box.querySelector('.zoom-out').onclick = function () { map.zoomBy(0.5); };
    box.querySelector('.zoom-reset').onclick = function () { map.resetZoom(); };
    lock.onclick = function () {
      if (!guess || box.classList.contains('done')) return;
      box.classList.add('done');
      var r = G.scoreGuess(guess, q);
      map.reveal(q);
      recordPoints(r.points);
      var vibe = G.vibeFor(r.miles, r.bullseye);
      Sound.play('lock');
      setTimeout(function () {
        Sound.play(VIBE_SOUND[vibe]);
        if (r.bullseye || r.miles <= G.DAILY_HIT_MILES) confetti(box, [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 50, 0.3);
      }, 560);
      panel.classList.remove('hint');
      panel.innerHTML = '<b class="v-' + vibe + '">' + pick(VIBE_WORDS[vibe]) + '</b> ' + (r.bullseye ? 'Right on Paris!' : fmt(r.miles) + ' miles off.') +
        ' <b class="try-pts">+' + fmt(r.points) + ' pts</b><br><span class="try-fact">' + esc(q.fact) + '</span>';
      lock.style.display = 'none';
      document.getElementById('intro-go').classList.add('glow');
      if (G.earnsStamp(r.miles, r.bullseye) && !(store.stamps || {})[q.id]) { // a close guess earns the very first passport stamp
        store.stamps = Object.assign({}, store.stamps); store.stamps[q.id] = todayKey(); save();
        setTimeout(function () { if (box.isConnected) stampFx(q); }, 1100);
      }
    };
  }

  // --- Pick your feed ---
  // ---------- pop-up tips: day 2 = share your results, day 4 = explore every section ----------
  var TIPS = {
    share: function () {
      return sheetHead('<span class="tip-icon">' + bigIcon(ICON.share, 40) + '</span>', 'QUICK TIP', 'Have you shared your daily results with a friend yet?') +
        '<p class="sheet-text">Once you finish a <b>Daily 10</b> or <b>Daily Sports 10</b>, hit <b>Share my score</b> and send your results to a friend. Can they beat you?</p>';
    },
    explore: function () {
      return sheetHead(GLOBE.replace('class="wm-globe"', 'class="wm-globe tip-globe"'), 'QUICK TIP', 'Have you explored it all?') +
        '<p class="sheet-text">World Scroll has way more than countries. There are <b>sports teams</b>, <b>landmarks</b>, <b>lakes</b>, <b>seas</b>, <b>rivers</b>, <b>oceans</b>, <b>mountains</b>, <b>deserts</b>, <b>capitals</b>, <b>cities</b> and more. Pick something new today!</p>';
    }
  };
  var TIP_BUTTONS = { share: 'Got it', explore: 'Let’s explore' };
  function maybeShowTip() {
    var forced = (location.search.match(/[?&]tip=(share|explore)/) || [])[1]; // preview: add ?tip=share or ?tip=explore to the link
    var today = todayKey();
    var tip = forced || (store.tipDay === today ? null : G.tipForDay(store.visitDays, store.tipsSeen));
    if (!tip) return;
    if (!forced) {
      store.tipsSeen = Object.assign({}, store.tipsSeen); store.tipsSeen[tip] = true;
      store.tipDay = today; // never two tips on the same day
      save();
    }
    setTimeout(function () { if (!feed && !app.querySelector('.sheet-overlay')) openSheet(TIPS[tip](), { button: TIP_BUTTONS[tip], cls: 'tip-sheet' }); }, 450);
  }

  // Rank badges: every rank has its own emoji and color. Locked ones show greyed out, so you can see what's coming.
  function rankBadge(r, cls, locked) {
    return '<span class="rank-badge' + (cls ? ' ' + cls : '') + (locked ? ' locked' : '') + '" style="--rc:' + r.color + '" aria-hidden="true">' +
      '<span class="rb-emoji">' + r.emoji + '</span>' + (locked ? '<span class="rb-lock">🔒</span>' : '') + '</span>';
  }
  // Explorer rank, at the top of the home screen (half width, beside the passport).
  function progressCardHtml() {
    var rk = G.rankFor(store.points);
    return '<button class="progress-card" id="rank-card" style="--rc:' + rk.color + '" aria-label="Explorer rank: ' + esc(rk.name) + '. See all ranks">' +
      '<span class="pc-row">' + rankBadge(rk, 'pc-rank') +
      '<span class="pc-main"><span class="pc-label">RANK ' + (rk.index + 1) + ' OF ' + G.RANKS.length + '</span><span class="pc-name">' + esc(rk.name) + '</span></span></span>' +
      '<span class="pc-bar"><i style="--w:' + Math.round(rk.progress * 100) + '%"></i></span>' +
      '<span class="pc-next">' + (rk.next ? fmt(rk.next.min - store.points) + ' pts to ' + esc(rk.next.name) : 'Top rank!') + '</span>' +
      '</button>';
  }
  // Tap the rank card: what ranks are, where you are, and every rank still to climb.
  function rankSheet() {
    var rk = G.rankFor(store.points);
    var rows = G.RANKS.map(function (r, i) {
      var state = i < rk.index ? 'done' : i === rk.index ? 'now' : i === rk.index + 1 ? 'next' : 'locked';
      var right = state === 'done' ? 'Unlocked ✓' : state === 'now' ? 'You are here' : fmt(r.min) + ' pts';
      return '<li class="rank-row ' + state + '" style="--rc:' + r.color + '">' + rankBadge(r, 'rank-icon', i > rk.index) +
        '<span class="rank-name">' + (i + 1) + '. ' + esc(r.name) + '</span><span class="rank-pts">' + right + '</span></li>';
    }).join('');
    openSheet(sheetHead(rankBadge(rk, 'big'), 'EXPLORER RANK', esc(rk.name)) +
      '<p class="sheet-text">Every point you earn moves you up. Collect all ' + G.RANKS.length + ' badges, from Rookie Explorer to World Legend.</p>' +
      '<ol class="rank-list">' + rows + '</ol>' +
      '<div class="sheet-status">' + (rk.next ? 'Next up: ' + rk.next.emoji + ' ' + esc(rk.next.name) + '. Just ' + fmt(rk.next.min - store.points) + ' more points to go!' : 'You reached the top. You are a World Legend!') + '</div>',
      { button: 'Let’s climb', cls: 'rank-sheet' });
  }
  // A new rank: a big badge celebration you can share.
  function rankUpSheet(rk) {
    Sound.play('trophy', 'gold');
    openSheet(sheetHead(rankBadge(rk, 'big rank-up'), 'NEW RANK UNLOCKED!', esc(rk.name)) +
      '<p class="sheet-text">You’re now rank ' + (rk.index + 1) + ' of ' + G.RANKS.length + '.' +
      (rk.next ? ' Next up: ' + rk.next.emoji + ' ' + esc(rk.next.name) + ' at ' + fmt(rk.next.min) + ' points.' : ' That’s the very top!') + '</p>' +
      '<button class="btn ghost big" id="share-rank">' + ICON.share + 'Share my new rank</button>',
      { button: 'Keep playing', cls: 'rankup-sheet', confetti: [rk.color, COLOR.gold, COLOR.teal, '#FFFFFF'] });
    document.getElementById('share-rank').onclick = function () {
      WSShare.send({ text: rk.emoji + ' I just became a ' + rk.name + ' on World Scroll! Can you catch me?', url: SITE_URL })
        .then(function (how) { shareToast(how, 'Shared!', 'Copied! Paste it anywhere.'); });
    };
  }

  // ---------- passport: every close guess stamps that place ----------
  function stampName(q) { return q.category === 'sports' ? fullName(q) : subjectOf(q).replace(/^The /, ''); }
  function stampTilt(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return (Math.abs(h) % 15) - 7; }
  function stampEmoji(q) { return q.category === 'sports' ? '🏟️' : (CAT_EMOJI[q.category] || '📍'); }
  function stampCount(cat) {
    var s = store.stamps || {};
    return Object.keys(s).filter(function (id) { return BYID[id] && (!cat || BYID[id].category === cat); }).length;
  }
  function passportCardHtml() {
    var n = stampCount();
    return '<button class="passport-card" id="passport-card" aria-label="My passport: ' + n + ' stamps. Open it">' +
      '<span class="pp-book" aria-hidden="true">' + GLOBE + '</span>' +
      '<span class="pp-main"><span class="pc-label">MY PASSPORT</span><span class="pp-count">' + n + ' stamp' + (n === 1 ? '' : 's') + '</span></span>' +
      '<span class="pp-sub">' + (n ? 'of ' + fmt(QUESTIONS.length) + ' places' : 'Earn your first!') + '</span></button>';
  }
  // The passport: one page per category, with a stamp for every place you've landed close to.
  function showPassport() {
    feed = null; card = null;
    var s = store.stamps || {}, total = stampCount();
    var pages = DATA.categories.map(function (c) {
      var cards = QUESTIONS.filter(function (q) { return q.category === c.id; });
      var got = cards.filter(function (q) { return s[q.id]; }).sort(function (a, b) { return s[a.id] < s[b.id] ? 1 : -1; }); // newest first
      var stamps = got.map(function (q) {
        var d = new Date(s[q.id] + 'T12:00:00');
        return '<span class="stamp" style="--c:' + c.color + ';--tilt:' + stampTilt(q.id) + 'deg">' +
          '<span class="st-emoji" aria-hidden="true">' + stampEmoji(q) + '</span><span class="st-name">' + esc(stampName(q)) + '</span>' +
          '<span class="st-date">' + esc(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()) + '</span></span>';
      }).join('');
      // Each page opens and closes with a tap (a caret menu), so 50+ stamps never flood the screen.
      var open = !!(store.ppOpen || {})[c.id];
      return '<details class="pp-page" data-cat="' + c.id + '" style="--c:' + c.color + '"' + (open ? ' open' : '') + '>' +
        '<summary class="pp-sum"><span class="pp-head"><span class="pp-emoji" aria-hidden="true">' + (c.id === 'sports' ? '🏟️' : CAT_EMOJI[c.id] || '') + '</span>' +
        '<span class="pp-name">' + esc(c.label) + '</span><span class="pp-n">' + got.length + ' / ' + cards.length + '</span>' +
        '<span class="pp-caret" aria-hidden="true">' + ICON.chevron + '</span></span>' +
        '<span class="pc-bar pp-bar"><i style="--w:' + Math.round(got.length / cards.length * 100) + '%"></i></span></summary>' +
        (got.length ? '<div class="stamps">' + stamps + '</div>' : '<p class="pp-empty">No stamps yet. Land a pin within ' + G.HIT_MILES + ' miles to earn one!</p>') +
        '</details>';
    }).join('');
    app.innerHTML =
      '<div class="screen passport">' +
      '<div class="topbar"><div class="topbar-left"><button class="icon-btn back-btn" id="back" aria-label="Back">' + ICON.back + '</button>' +
      WORDMARK + '</div>' + statChips(soundButton()) + '</div>' +
      '<div class="passport-body">' +
      '<div class="pp-cover"><span class="pp-book big" aria-hidden="true">' + GLOBE + '</span>' +
      '<div><div class="pc-label">MY PASSPORT</div><h1>' + total + ' stamp' + (total === 1 ? '' : 's') + '</h1>' +
      '<p>Land a pin within ' + G.HIT_MILES + ' miles (or hit a bullseye) and that place gets stamped. Can you fill every page?</p></div></div>' +
      pages + '</div></div>';
    document.getElementById('back').onclick = function () { showPicker(); };
    app.querySelectorAll('details.pp-page').forEach(function (d) { // remember which pages were left open
      d.addEventListener('toggle', function () {
        store.ppOpen = Object.assign({}, store.ppOpen); store.ppOpen[d.getAttribute('data-cat')] = d.open; save();
        Sound.play('tap');
      });
    });
    wireChrome();
  }
  // The stamp thunks onto the screen when you earn a new one.
  function stampFx(q) {
    var host = app.querySelector('.screen'); if (!host) return;
    var el = document.createElement('div');
    el.className = 'stamp-pop';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="stamp big" style="--c:' + CATS[q.category].color + ';--tilt:-8deg">' +
      '<span class="st-kicker">NEW STAMP!</span><span class="st-emoji" aria-hidden="true">' + stampEmoji(q) + '</span>' +
      '<span class="st-name">' + esc(stampName(q)) + '</span><span class="st-date">PASSPORT · ' + stampCount() + (stampCount() === 1 ? ' STAMP' : ' STAMPS') + '</span></span>';
    host.appendChild(el);
    Sound.play('square', true); setTimeout(function () { Sound.play('hit'); }, 120);
    if (navigator.vibrate) { try { navigator.vibrate([10, 40, 25]); } catch (e) { } }
    setTimeout(function () { el.classList.add('out'); }, 1700);
    setTimeout(function () { el.remove(); }, 2200);
  }
  // The Daily 10 is the star of the home screen: a big glowing card with a countdown, and your score once you've played.
  function dailyHeroHtml() {
    var done = dailyDone();
    var res = done ? loadPicks(done.picks) : [], hits = res.filter(function (r) { return r.hit; }).length;
    var day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return '<button class="daily-hero' + (done ? ' done' : '') + '" id="go-daily" aria-label="' + (done ? 'Daily 10: you scored ' + hits + ' out of 10. See and share' : 'Play the Daily 10') + '">' +
      // Played already: a compact card (Share top right, score + countdown, squares) so the eye moves on to what's below.
      '<span class="dh-top"><span class="dh-kicker">📅 TODAY’S DAILY 10 · ' + esc(day.toUpperCase()) + '</span>' + (done ? '<span class="dh-go share-nudge">Share</span>' : '') + '</span>' +
      (done
        ? '<span class="dh-row"><span class="dh-title">You scored ' + hits + '/10</span><span class="dh-clock" id="dh-clock">' + countdownText() + '</span></span>' +
          '<span class="dh-squares">' + res.map(function (r) { return '<i class="g-' + G.gradeFor(r) + '"></i>'; }).join('') + '</span>'
        : '<span class="dh-row"><span class="dh-title">Same 10 places for everyone</span><span class="dh-go">Play</span></span>') + // Play sits beside the title; no countdown until you've played
      '</button>';
  }
  // opts.flyIn: play the 2-second opening (after the welcome screen, and each time the app opens).
  function showPicker(opts) {
    var flyIn = !!(opts && opts.flyIn);
    feed = null; card = null;
    music(flyIn ? false : 'home'); // after the fly-in (its own gust and fanfare), the home tune fades in
    var count = function (cat) { return QUESTIONS.filter(function (q) { return q.category === cat; }).length; };
    var tiles = DATA.categories.filter(function (c) { return c.id !== 'sports'; }).map(function (c, i) {
      var n = count(c.id), got = stampCount(c.id);
      // A compact button: the name with its icon to the right, and stamp progress once you've earned one
      return '<button class="tile" data-cat="' + c.id + '" style="--c:' + c.color + ';--i:' + i + '">' +
        '<span class="tile-row"><span class="tile-name">' + esc(TILE_NAMES[c.id] || c.label) + '</span>' +
        '<span class="tile-emoji" aria-hidden="true">' + (CAT_EMOJI[c.id] || '') + '</span></span>' +
        (got ? '<span class="tile-count stamped">' + got + '/' + n + ' stamped</span>' : '') + '</button>';
    }).join('');
    app.innerHTML =
      '<div class="screen picker">' +
      '<div class="topbar">' + WORDMARK + statChips(soundButton()) + '</div>' +
      '<div class="picker-body">' +
      '<div class="picker-head"><h1>Where do you wanna scroll today?</h1></div>' +
      dailyHeroHtml() +
      '<div class="pc-pair">' + progressCardHtml() + passportCardHtml() + '</div>' +
      '<button class="sports-hero" id="go-sports">' +
      '<span class="hero-text"><span class="hero-kicker">WHERE DO THEY PLAY?</span>' +
      '<span class="hero-name">Sports</span>' +
      '<span class="hero-sub">USA, Europe and Australia</span></span>' +
      '<span class="hero-side"><span class="hero-trophies">' + trophyCaseHtml(false) + '</span>' +
      '<span class="hero-go">Play</span></span></button>' +
      '<div class="tiles">' + tiles + '</div>' +
      '<button class="btn primary big" id="go-shuffle">' + ICON.shuffle + 'Shuffle the whole world</button>' +
      '<button class="reset" id="reset">Reset all my progress</button>' +
      '</div></div>';
    // Leaving the home screen: start the feed, then slam a big pop-up onto it.
    var launch = function (spec, emoji, text) { startFeed(spec); FX.slam(app, emoji, text); };
    document.getElementById('go-sports').onclick = function () { launch({ kind: 'sports', region: 'usa', sport: 0 }, '🏟️', 'GAME ON!'); };
    document.getElementById('go-shuffle').onclick = function () { launch({ kind: 'shuffle' }, '🔀', 'SHUFFLE!'); };
    document.getElementById('go-daily').onclick = function () { if (dailyDone()) showDailyResults(false); else launch({ kind: 'daily' }, '📅', 'DAILY 10!'); };
    document.getElementById('passport-card').onclick = function () { Sound.play('tap'); showPassport(); };
    var clock = document.getElementById('dh-clock'); // the countdown ticks while you're on the home screen (only shown once you've played)
    if (clock) var tick = setInterval(function () { if (!clock.isConnected) clearInterval(tick); else clock.textContent = countdownText(); }, 30000);
    document.getElementById('reset').onclick = function () {
      var keepSound = store.sound;
      var keep = { visitDays: store.visitDays, lastVisit: store.lastVisit, tipsSeen: store.tipsSeen, tipDay: store.tipDay, seenIntro: store.seenIntro };
      store = Object.assign(freshStore(), keep); store.sound = keepSound; save(); showPicker(); // tips don't come back after a reset
    };
    app.querySelectorAll('.tile').forEach(function (b) {
      b.onclick = function () { var id = b.getAttribute('data-cat'); launch({ kind: 'category', category: id }, CAT_EMOJI[id] || '🌍', 'LET’S GO!'); };
    });
    wireChrome();
    if (flyIn) {
      var scr = app.querySelector('.screen.picker');
      scr.classList.add('arriving'); // hidden under the fly-in, then everything bounces in
      setTimeout(function () { if (scr.isConnected) music('home'); }, 1000); // the music starts as the logo lands, so it's playing when home appears
      FX.flyIn(app, function () { scr.classList.remove('arriving'); scr.classList.add('arrived'); if (scr.isConnected) music('home'); maybeShowTip(); });
    } else maybeShowTip();
  }

  // --- Feed ---
  function buildFeed(spec) {
    var items;
    if (spec.kind === 'shuffle') items = G.mixByCategory(QUESTIONS, Math.random);
    else if (spec.kind === 'daily') items = G.dailyPick(QUESTIONS, todayKey(), 10);
    else if (spec.kind === 'sportsdaily') items = G.dailySportsPick(QUESTIONS, todayKey(), 10);
    else if (spec.kind === 'challenge') items = [BYID[spec.id]];
    else if (spec.kind === 'category') {
      var group = spec.group || 'all';
      var gtab = DATA.geoTabs.filter(function (t) { return t.id === group; })[0];
      spec.groupDef = gtab;
      spec.mapRegion = gtab && gtab.region; // a continent tab zooms the map to that continent
      items = G.shuffle(QUESTIONS.filter(function (q) {
        if (q.category !== spec.category) return false;
        if (group === 'all') return q.continent !== 'us-states'; // state capitals live in their own tab
        return q.continent === group || (q.alsoIn || []).indexOf(group) >= 0; // Turkey shows under Europe and Asia
      }), Math.random);
    }
    else {
      var tab = DATA.sportsTabs.filter(function (t) { return t.region === spec.region; })[0];
      spec.sportDef = tab.sports[spec.sport];
      items = G.shuffle(QUESTIONS.filter(function (q) { return q.region === spec.region && q.sport === spec.sportDef.id; }), Math.random);
    }
    return { spec: spec, items: items, base: items.length, idx: 0, results: [] };
  }
  function itemAt(i) {
    if (feed.spec.kind === 'shuffle') {
      while (i >= feed.items.length) {
        var more = G.mixByCategory(QUESTIONS, Math.random);
        if (more[0] === feed.items[feed.items.length - 1]) more.push(more.shift());
        feed.items = feed.items.concat(more);
      }
      return feed.items[i];
    }
    return feed.items[i % feed.base];
  }
  function isDailyKind() { return feed.spec.kind === 'daily' || feed.spec.kind === 'sportsdaily'; }
  function isLastDaily() { return isDailyKind() && feed.idx >= feed.base - 1; }
  function isSportsLook() { return !!feed && (feed.spec.kind === 'sports' || feed.spec.kind === 'sportsdaily'); }

  function startFeed(spec) {
    feed = buildFeed(spec);
    var s = feed.spec;
    var tabs = '';
    var hasGeoTabs = s.kind === 'category' && (s.category === 'countries' || s.category === 'capitals');
    if (hasGeoTabs) {
      tabs = '<div class="sport-tabs geo-tabs" role="group" aria-label="Continent">' + DATA.geoTabs.filter(function (t) {
        return !t.only || t.only === s.category;
      }).map(function (t) {
        return '<button class="pill geo-pill" data-group="' + esc(t.id) + '" aria-pressed="' + (t.id === (s.group || 'all')) + '">' + esc(t.label) + '</button>';
      }).join('') + '</div>';
    }
    if (s.kind === 'sports') {
      tabs = '<div class="region-tabs" role="group" aria-label="Region">' + DATA.sportsTabs.map(function (t) {
        return '<button class="tab" data-region="' + t.region + '" aria-pressed="' + (t.region === s.region) + '">' +
          esc(DATA.regions[t.region].label) + '</button>';
      }).join('') + '</div>' +
        '<div class="sport-tabs" role="group" aria-label="League">' + DATA.sportsTabs.filter(function (t) { return t.region === s.region; })[0].sports.map(function (sp, n) {
          return '<button class="pill" data-sport="' + n + '" aria-pressed="' + (n === s.sport) + '">' + esc(sp.label) + '</button>';
        }).join('') + '</div>';
    }
    if (s.kind === 'challenge') { // the target to beat, before the friend's pin is shown
      var fmiles = measure(feed.items[0], s.friend).r.miles;
      tabs = '<div class="vs-banner"><span class="vs-emoji" aria-hidden="true">🎯</span><span><b>A friend challenged you!</b> Their pin landed ' +
        (fmiles < 1 ? 'right on target' : fmt(fmiles) + ' miles off') + '. Can you beat it?</span></div>';
    }
    var sports = s.kind === 'sports', sportsDaily = s.kind === 'sportsdaily', daily = s.kind === 'daily';
    app.innerHTML =
      '<div class="screen feed' + (sports || sportsDaily ? ' sports' : '') + '">' +
      '<div class="topbar"><div class="topbar-left"><button class="icon-btn back-btn" id="back" aria-label="Back">' + ICON.back + '</button>' +
      WORDMARK + '</div>' + statChips() + '</div>' +
      (sports ? sportsDailyBanner() : '') + tabs +
      (sports ? meterHtml() : '') + (sportsDaily ? dailyRowHtml(true) : daily ? dailyRowHtml(false) : '') +
      '<div class="stage" id="stage"></div></div>';
    document.getElementById('back').onclick = sportsDaily ? function () { startFeed({ kind: 'sports', region: 'usa', sport: 0 }); } : showPicker;
    var sdb = document.getElementById('go-sports-daily');
    if (sdb) sdb.onclick = openSportsDaily;
    wireChrome();
    if (sports) renderMeter();
    if (sportsDaily || daily) renderDailyRow();
    music(sports || sportsDaily ? 'sports' : 'home'); // game-day music in Sports, the light tune everywhere else
    app.querySelectorAll('.tab').forEach(function (b) {
      b.onclick = function () { startFeed({ kind: 'sports', region: b.getAttribute('data-region'), sport: 0 }); };
    });
    app.querySelectorAll('.pill:not(.geo-pill)').forEach(function (b) {
      b.onclick = function () { startFeed({ kind: 'sports', region: s.region, sport: +b.getAttribute('data-sport') }); };
    });
    app.querySelectorAll('.geo-pill').forEach(function (b) {
      b.onclick = function () { startFeed({ kind: 'category', category: s.category, group: b.getAttribute('data-group') }); };
    });
    var on = app.querySelector('.geo-pill[aria-pressed="true"]');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    wireStage(document.getElementById('stage'));
    card = null;
    mountCard(false);
  }

  function metaLine(q) {
    var s = feed.spec, pos = (feed.idx % feed.base) + 1, sp = sportDef(q);
    if (s.kind === 'daily') return 'DAILY 10 · CARD ' + (feed.idx + 1) + ' OF ' + feed.base;
    if (s.kind === 'challenge') return 'FRIEND CHALLENGE · ' + CATS[q.category].label;
    if (s.kind === 'sports') return s.sportDef.full + ' · CARD ' + pos + ' OF ' + feed.base;
    if (s.kind === 'category') return CATS[s.category].label + (s.groupDef && s.groupDef.id !== 'all' ? ' · ' + s.groupDef.label : '') +
      ' · card ' + pos + ' of ' + feed.base;
    return (sp ? sp.full + ' · ' : '') + 'Scroll #' + (feed.idx + 1);
  }

  function buildCardEl(q) {
    var cat = CATS[q.category];
    var where = /^Where is /.test(q.prompt);
    var sp = sportDef(q);
    var chipText = q.category === 'sports' ? (q.league || (sp && sp.label) || cat.label) : cat.label;
    var showMeta = !isSportsLook(); // sports screens show the hot-streak meter / daily row instead
    var el = document.createElement('section');
    el.className = 'card' + (q.deepDive ? ' deep' : '');
    el.setAttribute('aria-label', q.deepDive ? 'Question card with a Deep Dive' : 'Question card');
    var next = isLastDaily() || feed.spec.kind === 'challenge' ? null : itemAt(feed.idx + 1);
    var nextLabel = feed.spec.kind === 'challenge' ? 'Explore the whole game' : 'Your Daily 10 results';
    el.innerHTML =
      '<div class="card-head">' + (showMeta ? soundButton() : '') +
      '<span class="chip-row"><span class="chip" style="background:' + cat.color + '">' + esc(chipText.toUpperCase()) + '</span>' +
      (q.deepDive ? '<span class="chip deep-chip">💎 DEEP DIVE</span>' : '') + '</span>' +
      (where ? '<div class="kicker">Where is…</div><h2 class="prompt' + (subjectOf(q).length > 18 ? ' long' : '') + '">' + esc(subjectOf(q)) + '</h2>'
        : '<h2 class="prompt long">' + esc(q.prompt) + '</h2>') +
      (showMeta && feed.spec.kind !== 'daily' ? '<div class="meta">' + esc(metaLine(q)) + '</div>' : '') + '</div>' + // the Daily 10 row already says CARD n OF 10
      '<div class="map-wrap"><div class="map"></div>' +
      '<div class="zoom-btns"><button class="zoom-in" aria-label="Zoom in">+</button><button class="zoom-out" aria-label="Zoom out">−</button>' +
      '<button class="zoom-reset" aria-label="Show the whole map">' + ICON.fit + '</button></div></div>' +
      '<div class="panel" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn ghost skip">Skip</button>' +
      '<button class="btn primary lock" disabled>Drop a pin first</button></div>' +
      '<button class="peek" aria-label="Next card">' + ICON.up +
      '<span class="peek-label">SWIPE UP · NEXT</span>' +
      '<span class="peek-next">' + (next ? esc(next.league || CATS[next.category].label) + ' — ' + esc(subjectOf(next)) : nextLabel) + '</span></button>';
    return el;
  }

  function hint(c) {
    var sports = c.q.category === 'sports' && /^Where do/.test(c.q.prompt); // team cards (not tennis venues)
    c.el.querySelector('.panel').innerHTML = c.guess
      ? '<div class="panel-label">GUESS PLACED</div><div class="panel-body">Happy with it? Lock in your guess. Changed your mind? Drop your pin somewhere else.</div>'
      : '<div class="panel-label">YOUR MOVE</div><div class="panel-body">' +
      (sports ? 'Drop a pin where you think they play their home games.' : 'Drop a pin where you think it is. Scroll, pinch or tap + to zoom in, and drag to move around.') + '</div>';
  }

  function mountCard(animate) {
    var stage = document.getElementById('stage');
    var q = itemAt(feed.idx);
    var el = buildCardEl(q);
    var c = { q: q, el: el, guess: null, revealed: false, t0: performance.now() };
    var old = card;
    if (animate) el.classList.add('below');
    stage.appendChild(el);
    c.map = createMap(el.querySelector('.map'), feed.spec.mapRegion || q.region, function (ll) {
      c.guess = ll;
      Sound.play('pin');
      var lock = el.querySelector('.lock');
      if (lock.disabled) { lock.classList.remove('ready'); void lock.offsetWidth; lock.classList.add('ready'); }
      lock.disabled = false; lock.textContent = 'Lock in my guess';
      hint(c);
    });
    hint(c);
    el.querySelector('.zoom-in').onclick = function () { c.map.zoomBy(2); };
    el.querySelector('.zoom-out').onclick = function () { c.map.zoomBy(0.5); };
    el.querySelector('.zoom-reset').onclick = function () { c.map.resetZoom(); };
    el.querySelector('.skip').onclick = advance;
    el.querySelector('.lock').onclick = function () { c.revealed ? advance() : lockIn(c); };
    el.querySelector('.peek').onclick = advance;
    card = c;
    if (q.deepDive) setTimeout(function () { if (card === c && !c.revealed) FX.rareFind(app.querySelector('.screen')); }, animate ? 450 : 250);
    if (isDailyKind()) renderDailyRow(); // move the row's "CARD n OF 10" along with the new card
    if (animate && old) {
      busy = true;
      void el.offsetWidth;
      el.classList.remove('below');
      old.el.classList.add('above');
      setTimeout(function () { old.el.remove(); busy = false; }, 420);
    }
  }

  // How far a pin is from a card's answer, the same way for every kind of card (used for your pin and a friend's).
  function measure(q, guess) {
    var shape = q.shape && COUNTRY_SHAPE[q.shape];
    var sd = shape ? shapeDistance(shape, guess) : null;
    var river = q.line ? G.lineDistance(q.line, guess) : null; // rivers: distance to the nearest bit of the river
    var area = q.area ? G.areaDistance(q.area, guess) : null; // deserts and ranges: 0 inside, else to the nearest edge
    var r = G.scoreGuess(guess, q, sd ? sd.miles : river ? river.miles : area ? area.miles : null);
    return { r: r, shape: shape, sd: sd, river: river, area: area };
  }

  function lockIn(c) {
    if (!c.guess || c.revealed) return;
    c.revealed = true;
    var m = measure(c.q, c.guess);
    var shape = m.shape, sd = m.sd, river = m.river, area = m.area, r = m.r;
    var secs = (performance.now() - c.t0) / 1000;
    c.map.reveal(c.q, sd ? { shape: shape, target: sd.point } : river ? { line: c.q.line, target: river.point }
      : area ? { area: c.q.area, target: area.point } : null);
    recordPoints(r.points);
    bumpStats();
    var isSport = c.q.category === 'sports', inSportsFeed = feed.spec.kind === 'sports';
    var hit = r.miles <= (isDailyKind() ? G.DAILY_HIT_MILES : G.HIT_MILES); // dailies are a bit more forgiving
    if (isDailyKind()) feed.results.push({ q: c.q, miles: r.miles, points: r.points, bullseye: r.bullseye, hit: hit, guess: c.guess });
    if (isDailyKind()) renderDailyRow();
    var vibe = G.vibeFor(r.miles, r.bullseye);
    var verdict = isSport && hit ? (SPORT_WORDS[c.q.sport] || pick(VIBE_WORDS[vibe])) : pick(VIBE_WORDS[vibe]);
    var rankBefore = G.rankFor(store.points - r.points).index;
    combo = G.comboStep(combo, r.bullseye || r.miles <= G.DAILY_HIT_MILES);
    Sound.play('lock');
    Sound.play('fly');
    setTimeout(function () {
      if (!c.el.isConnected) return;
      Sound.play(isSport && hit ? 'scorching' : VIBE_SOUND[vibe]);
      floatPoints(c, r.points, vibe);
      if (r.bullseye) bullseyeFx(c);
      reactFx(c, vibe, isSport && hit ? verdict.toUpperCase() : null);
      if (combo >= 2) showCombo(c, combo);
    }, 560);
    if (r.bullseye || (isSport && hit)) { // a little party for a great guess
      setTimeout(function () { if (c.el.isConnected) confetti(c.el, [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 60, 0.55); }, 600);
    }
    // Passport: a close guess stamps this place (once) into the player's passport.
    var newStamp = G.earnsStamp(r.miles, r.bullseye) && !(store.stamps || {})[c.q.id];
    if (newStamp) {
      store.stamps = Object.assign({}, store.stamps); store.stamps[c.q.id] = todayKey(); save();
      setTimeout(function () { if (c.el.isConnected) stampFx(c.q); }, 1300);
    }
    var rankNow = G.rankFor(store.points);
    if (rankNow.index > rankBefore) setTimeout(function () { if (c.el.isConnected) rankUpSheet(rankNow); }, newStamp ? 2900 : 1500);

    // "Beat my pin": a friend's challenge shows their pin too, and who won.
    var vsLine = '';
    if (feed.spec.kind === 'challenge') {
      var friend = feed.spec.friend, fm = measure(c.q, friend).r.miles;
      c.map.showFriend(friend);
      var won = r.miles < fm, tie = Math.round(r.miles) === Math.round(fm);
      verdict = tie ? 'It’s a tie!' : won ? 'You win!' : 'They win!';
      vsLine = '<div class="res-vs ' + (tie ? 'tie' : won ? 'won' : 'lost') + '"><span class="friend-dot"></span><span><b>Your friend’s pin:</b> ' +
        esc(placeOfPin(friend)) + ' · ' + fmt(fm) + ' mi off</span></div>';
      if (won && !tie) setTimeout(function () { if (c.el.isConnected) confetti(c.el, [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 80, 0.4); }, 700);
    }

    var streakNote = '';
    if (inSportsFeed) {
      var st = G.trophyStep(store.sportsRun, hit);
      store.sportsRun = st.run;
      if (st.award) store.trophies[st.award]++;
      save();
      renderMeter(st.award === 'gold' ? 10 : st.run);
      streakNote = hit ? ' · streak +1' : ' · streak reset';
      if (st.award) setTimeout(function () { showTrophy(st.award); }, 1000);
    }

    var milesLine = sd ? (r.miles === 0 ? 'Right inside the border' : fmt(r.miles) + ' mi from the border')
      : river ? (r.miles < 1 ? 'Right on the river' : fmt(r.miles) + ' mi from the river' + (r.bullseye ? ' · bullseye zone' : ''))
      : area ? (r.miles === 0 ? AREA_WORDS[c.q.kind || c.q.category][0]
        : fmt(r.miles) + ' mi from the ' + AREA_WORDS[c.q.kind || c.q.category][1] + (r.bullseye ? ' · bullseye zone' : ''))
      : r.bullseye ? r.miles + ' mi off · bullseye zone'
      : fmt(r.miles) + ' miles off';
    c.el.querySelector('.panel').innerHTML =
      '<div class="res-top"><span class="res-verdict v-' + vibe + (r.bullseye || (isSport && hit) ? ' bull' : '') + (isSport && hit ? ' sport' : '') + '">' + verdict + '</span>' +
      '<span class="res-right">' + (c.q.deepDive ? '<button class="deep-btn" aria-label="Open the Deep Dive">💎 Deep Dive</button>'
        : c.q.nerd ? '<button class="nerd-btn" aria-label="' + c.q.nerd.length + ' ' + nerdKind(c.q) + ' nerd facts"><span class="nerd-face" aria-hidden="true">🤓</span>Nerd facts<span class="nerd-count" aria-hidden="true">' + c.q.nerd.length + '</span></button>' : '') +
      '<span class="res-pts" data-pts="' + r.points + '">+0 pts</span></span></div>' +
      '<div class="res-miles">' + milesLine + streakNote + ' · ' + secs.toFixed(1) + 's</div>' +
      '<div class="res-answer"><span class="answer-dot"></span><span>' + esc(c.q.answer) + (c.q.venue ? '<span class="venue"> · ' + esc(c.q.venue) + '</span>' : '') + '</span></div>' +
      '<div class="res-pin"><span class="pin-dot"></span><span><b>Your pin:</b> ' + esc(placeOfPin(c.guess)) + '</span></div>' + vsLine +
      '<div class="res-fact' + (c.q.nerd ? ' has-nerd' : '') + '">' + ICON.bulb + '<span><b>Now you know:</b> ' + esc(c.q.fact) + '</span></div>';
    var nb = c.el.querySelector('.nerd-btn');
    if (nb) nb.onclick = function (e) { e.stopPropagation(); Sound.play('tap'); nb.classList.add('seen'); nerdSheet(c.q); };
    var db = c.el.querySelector('.deep-btn');
    if (db) {
      db.onclick = function (e) { e.stopPropagation(); deepSheet(c.q); };
      setTimeout(function () { if (c.el.isConnected) { FX.unlocked(app.querySelector('.screen')); db.classList.add('unlocked'); } }, 2300);
    }
    c.el.querySelector('.panel').classList.add('revealed');
    c.el.classList.add('revealed');
    countUpPoints(c.el.querySelector('.res-pts'), r.points);
    // After the guess, the Skip button turns into "Challenge": send a friend this card with your pin on it.
    var sk = c.el.querySelector('.skip');
    sk.innerHTML = '🎯 Challenge a friend';
    sk.classList.add('challenge-btn');
    sk.setAttribute('aria-label', 'Challenge a friend to beat your pin on this card');
    sk.onclick = function (e) {
      e.stopPropagation();
      var text = '🎯 ' + c.q.prompt + ' I was ' + (r.bullseye ? 'right on target' : fmt(r.miles) + ' miles off') + ' on World Scroll. Can you beat my pin?';
      WSShare.send({ text: text, url: challengeUrl(c.q, c.guess) }).then(function (how) { shareToast(how, 'Challenge sent!', 'Challenge link copied - paste and send to a friend and see whose pin is closer'); });
    };
    c.el.querySelector('.lock').textContent = feed.spec.kind === 'challenge' ? 'Keep playing' : isLastDaily() ? 'See my results' : 'Next card';
    if (navigator.vibrate) { try { navigator.vibrate(r.bullseye ? [18, 60, 40] : 18); } catch (e) { } }
  }

  // --- juice helpers ---
  function countUpPoints(el, pts) {
    if (!el) return;
    if (REDUCE_MOTION || !pts) { el.textContent = '+' + fmt(pts) + ' pts'; return; }
    var t0 = performance.now() + 560, dur = 650, ticks = 0;
    (function frame(now) {
      if (!el.isConnected) return;
      var k = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = '+' + fmt(pts * e) + ' pts';
      if (k > 0 && k < 1 && Math.floor(k * 10) > ticks) { ticks = Math.floor(k * 10); Sound.play('tick', ticks); }
      if (k < 1) requestAnimationFrame(frame); else { el.classList.add('pop'); }
    })(performance.now());
  }
  function floatPoints(c, pts, vibe) {
    if (REDUCE_MOTION) return;
    var wrap = c.el.querySelector('.map-wrap'), f = c.map.answerFrac();
    var d = document.createElement('div');
    d.className = 'float-pts v-' + vibe;
    d.textContent = '+' + fmt(pts);
    d.style.left = Math.max(18, Math.min(78, f[0] * 100)) + '%'; // keep clear of the zoom buttons and edges
    d.style.top = Math.max(18, Math.min(85, f[1] * 100)) + '%';
    wrap.appendChild(d);
    setTimeout(function () { d.remove(); }, 1400);
  }
  // The big reaction over the whole screen: a bullseye party, flames for hot guesses, snow for cold ones (fx.js).
  function reactFx(c, vibe, word) {
    var scr = app.querySelector('.screen'), wrap = c.el.querySelector('.map-wrap');
    if (!scr || !wrap) return;
    var sr = scr.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), f = c.map.answerFrac();
    var x = Math.max(40, Math.min(sr.width - 40, wr.left - sr.left + f[0] * wr.width));
    var y = Math.max(60, Math.min(sr.height - 60, wr.top - sr.top + f[1] * wr.height));
    FX.reveal(scr, vibe, { x: x, y: y }, word);
  }
  function bullseyeFx(c) {
    Sound.play('boom');
    c.map.shock();
    if (REDUCE_MOTION) return;
    var wrap = c.el.querySelector('.map-wrap');
    var fl = document.createElement('div'); fl.className = 'flash'; wrap.appendChild(fl);
    setTimeout(function () { fl.remove(); }, 700);
    wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
  }
  function showCombo(c, n) {
    var wrap = c.el.querySelector('.map-wrap');
    var b = document.createElement('div');
    b.className = 'combo-badge' + (n >= 5 ? ' mega' : '');
    b.innerHTML = '<span class="combo-fire">🔥</span><b>×' + n + '</b><span>COMBO</span>';
    wrap.appendChild(b);
    setTimeout(function () { Sound.play('combo', n); }, 120);
  }
  // A banner that drops in from the top of the screen for a moment (goal reached, new rank).
  function toast(icon, title, sub, kind) {
    var host = app.querySelector('.screen'); if (!host) return;
    var old = host.querySelector('.toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.setAttribute('role', 'status');
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span class="toast-text"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span>';
    host.appendChild(t);
    Sound.play('trophy', kind === 'rank' ? 'gold' : 'silver');
    confetti(host, [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 90, 0.12);
    setTimeout(function () { t.classList.add('out'); }, 2800);
    setTimeout(function () { t.remove(); }, 3300);
  }

  function advance() {
    if (!feed || !card || busy || app.querySelector('.sheet-overlay')) return;
    if (feed.spec.kind === 'challenge') { Sound.play('swoosh'); showPicker({ flyIn: true }); return; } // after a friend's challenge, show them the whole game
    if (!card.revealed) combo = 0; // skipping ends a combo
    if (isDailyKind() && !card.revealed) { feed.results.push({ q: card.q, skipped: true, points: 0, hit: false }); renderDailyRow(); }
    if (feed.spec.kind === 'sports' && !card.revealed && store.sportsRun) { store.sportsRun = 0; save(); renderMeter(); }
    if (isLastDaily()) {
      if (feed.spec.kind === 'sportsdaily') finishSportsDaily(); else finishDaily();
      return;
    }
    Sound.play('swoosh');
    feed.idx++;
    mountCard(true);
  }

  // Swipe up (touch or mouse drag), mouse wheel, and keyboard all move to the next card.
  function wireStage(stage) {
    var y0 = null, x0 = 0, wheelSum = 0, wheelAt = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.map')) { y0 = null; return; }
      y0 = e.clientY; x0 = e.clientX;
    });
    stage.addEventListener('pointerup', function (e) {
      if (y0 === null) return;
      var dy = y0 - e.clientY, dx = Math.abs(e.clientX - x0);
      y0 = null;
      if (dy > 60 && dy > dx) advance();
    });
    stage.addEventListener('wheel', function (e) {
      if (e.target.closest('.map')) return;
      e.preventDefault();
      var now = Date.now();
      if (now - wheelAt > 700) wheelSum = 0;
      wheelSum += e.deltaY;
      if (wheelSum > 80) { wheelSum = -10000; wheelAt = now; advance(); setTimeout(function () { wheelSum = 0; }, 700); }
    }, { passive: false });
  }
  document.addEventListener('keydown', function (e) {
    if (!card || !document.getElementById('stage')) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); card.map.zoomBy(2); return; } // computers: + and − zoom the map
    if (e.key === '-' || e.key === '_') { e.preventDefault(); card.map.zoomBy(0.5); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); advance(); }
    else if (e.key === 'Enter' && document.activeElement === document.body) {
      card.revealed ? advance() : lockIn(card);
    }
  });

  // --- Daily Sports 10 (inside Sports): one try a day, score out of 10, shareable ---
  function sportsDailyDone() { return store.sportsDaily && store.sportsDaily.date === todayKey() ? store.sportsDaily : null; }
  function sportsDailyBanner() {
    var done = sportsDailyDone();
    var res = done ? loadPicks(done.picks) : [], hits = res.filter(function (r) { return r.hit; }).length;
    // Played today: your score and your 10 squares (same colors as the results), plus a Share button that nudges.
    return '<div class="sd-wrap"><button class="daily-sports' + (done ? ' done' : '') + '" id="go-sports-daily"' + (done ? ' aria-label="Daily Sports 10: you scored ' + hits + ' out of 10. See and share"' : '') + '>' +
      '<span class="sd-icon">' + trophyIcon(TIERS.gold.color, 22, true) + '</span>' +
      '<span class="sd-text"><span class="sd-label">DAILY SPORTS 10</span>' +
      (done
        ? '<span class="sd-title sd-done"><b>' + hits + '/10</b><span class="sd-squares">' + res.map(function (r) { return '<i class="g-' + G.gradeFor(r) + '"></i>'; }).join('') + '</span></span>'
        : '<span class="sd-title">10 teams. Same for everyone.</span>') + '</span>' +
      '<span class="sd-go' + (done ? ' share-nudge' : '') + '">' + (done ? 'Share' : 'Play') + '</span></button></div>';
  }
  function openSportsDaily() {
    if (sportsDailyDone()) showSportsDailyResults(); else { Sound.play('lock'); startFeed({ kind: 'sportsdaily' }); }
  }
  // The running row of 10 squares (green = correct, red = wrong) shown while playing either daily game.
  // withSound: Sports screens put the mute button here; the Daily 10 keeps it on the card.
  function dailyRowHtml(withSound) {
    var sq = '';
    for (var i = 0; i < 10; i++) sq += '<span class="dsq" data-i="' + i + '"></span>';
    return '<div class="meter-row daily-row"><div class="meter"><div class="meter-label" id="daily-label"></div>' +
      '<div class="dsqs" id="dsqs">' + sq + '</div></div>' + (withSound ? soundButton() : '') + '</div>';
  }
  function renderDailyRow() {
    var box = document.getElementById('dsqs'), label = document.getElementById('daily-label');
    if (!box || !feed) return;
    var res = feed.results, hits = res.filter(function (r) { return r.hit; }).length;
    box.querySelectorAll('.dsq').forEach(function (el, i) {
      el.className = 'dsq' + (i < res.length ? ' g-' + G.gradeFor(res[i]) : i === feed.idx ? ' now' : '');
    });
    label.innerHTML = (feed.spec.kind === 'daily' ? 'DAILY 10' : 'DAILY SPORTS 10') + ' · CARD ' + Math.min(feed.idx + 1, 10) + ' OF 10 · <span class="sd-hits">' + hits + ' RIGHT</span>';
  }
  function finishSportsDaily() {
    store.sportsDaily = {
      date: todayKey(),
      picks: feed.results.map(savedPick)
    };
    save();
    showSportsDailyResults(true);
  }
  // A daily result as saved: the card, how far off, and where the pin went (for the picture and worst-miss shares).
  function savedPick(r) {
    return { id: r.q.id, miles: r.skipped ? null : r.miles, hit: !!r.hit, bullseye: !!r.bullseye, points: r.points || 0,
      g: r.guess ? [+r.guess.lat.toFixed(3), +r.guess.lon.toFixed(3)] : null };
  }
  function loadPicks(picks) {
    return picks.filter(function (p) { return BYID[p.id]; }).map(function (p) {
      return { q: BYID[p.id], miles: p.miles, skipped: p.miles == null, hit: p.hit, bullseye: p.bullseye, points: p.points || 0,
        guess: p.g ? { lat: p.g[0], lon: p.g[1] } : null };
    });
  }
  // Daily 10: one try a day (like the Daily Sports 10), so everyone shares a fair score.
  function dailyDone() { return store.daily && store.daily.date === todayKey() ? store.daily : null; }
  function finishDaily() {
    store.daily = { date: todayKey(), picks: feed.results.map(savedPick) };
    save();
    showDailyResults(true);
  }
  // A small message at the bottom of the screen after sharing ("Copied!").
  function shareToast(how, sharedMsg, copiedMsg) {
    var msg = how === 'shared' ? sharedMsg : how === 'copied' ? copiedMsg : how === 'saved' ? 'Picture saved! Post it anywhere.'
      : how === 'cancelled' ? null : 'Sharing isn’t available here. Try it on your phone!';
    if (!msg) return;
    var host = app.querySelector('.screen'); if (!host) return;
    var old = host.querySelector('.mini-toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'mini-toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    host.appendChild(t);
    if (how !== 'failed') Sound.play('hit');
    var stay = msg.length > 40 ? 4000 : 2200; // longer messages stay up long enough to read
    setTimeout(function () { t.classList.add('out'); }, stay);
    setTimeout(function () { t.remove(); }, stay + 500);
  }
  // The share box on both daily results screens: score text, a picture, and your worst miss.
  function shareBoxHtml(shareText, worst) {
    return '<div class="share-card"><div class="share-label">SHARE YOUR SCORE</div>' +
      '<pre class="share-text" id="share-text">' + esc(shareText) + '</pre>' +
      '<div class="grade-key" aria-label="What the colors mean"><span><i class="g-hit"></i>≤ ' + G.DAILY_HIT_MILES + ' mi</span>' +
      '<span><i class="g-warm"></i>≤ 600</span><span><i class="g-chilly"></i>≤ 1,500</span><span><i class="g-cold"></i>farther</span></div>' +
      '<button class="btn primary big" id="share-btn">' + ICON.share + 'Share my score</button>' +
      '<button class="btn ghost big" id="share-pic">🖼️ Share a picture</button>' +
      (worst ? '<button class="btn ghost big" id="share-worst">😅 Share my worst miss</button>' : '') +
      '<div class="share-note" id="share-note" aria-live="polite"></div></div>';
  }
  // The biggest miss (with a saved pin) that's farther than the daily limit, or null.
  function worstMiss(res) {
    var w = null;
    res.forEach(function (r) { if (r.guess && !r.skipped && !r.hit && (!w || r.miles > w.miles)) w = r; });
    return w;
  }
  function wireShareBox(game, dateShort, verdict, res, shareText) {
    var hits = res.filter(function (r) { return r.hit; }).length;
    document.getElementById('share-btn').onclick = function () {
      WSShare.send({ text: shareText, url: SITE_URL }).then(function (how) {
        if (how === 'failed') { // no clipboard here: select the text so it can be copied by hand
          var rg = document.createRange(); rg.selectNodeContents(document.getElementById('share-text'));
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
          document.getElementById('share-note').textContent = 'Your score is selected. Copy it and paste it anywhere.';
        } else shareToast(how, 'Shared!', 'Copied! Paste it into a text or chat.');
      });
    };
    var picBtn = document.getElementById('share-pic'), pic = null;
    picBtn.onclick = function () { picSheet(); };
    function picSheet() { // make the picture, show it, then share it with one more tap (phones need a tap to share)
      var made = pic ? Promise.resolve(pic) : WSShare.dailyCard({
        game: game, date: dateShort, hits: hits, verdict: verdict, url: SITE_SHORT,
        grades: res.map(function (r) { return G.gradeFor(r); }), land: { type: 'FeatureCollection', features: worldCountries },
        pins: res.map(function (r) { return { guess: r.guess, answer: { lat: r.q.lat, lon: r.q.lon }, grade: G.gradeFor(r) }; })
      });
      made.then(function (blob) {
        pic = blob;
        var src = URL.createObjectURL(blob);
        openSheet(sheetHead('<span class="pic-emoji" aria-hidden="true">🖼️</span>', 'YOUR SCORE CARD', 'Show off your map!') +
          '<img class="share-pic" src="' + src + '" alt="Your ' + esc(game) + ' score card: ' + hits + ' out of 10, with every pin on a world map">' +
          '<button class="btn primary big" id="pic-send">' + ICON.share + 'Share this picture</button>',
          { button: 'Done', cls: 'pic-sheet', onClose: function () { URL.revokeObjectURL(src); } });
        document.getElementById('pic-send').onclick = function () {
          var file = new File([blob], 'world-scroll-' + game.toLowerCase().replace(/\s+/g, '-') + '.png', { type: 'image/png' });
          WSShare.send({ text: shareText, url: SITE_URL, files: [file] }).then(function (how) { shareToast(how, 'Shared!', 'Copied!'); });
        };
      });
    }
    var wb = document.getElementById('share-worst'), w = worstMiss(res);
    if (wb && w) wb.onclick = function () {
      var team = w.q.category === 'sports' && /^Where do/.test(w.q.prompt);
      WSShare.send({ text: G.worstMissText(subjectOf(w.q), placeOfPin(w.guess), w.miles, team), url: challengeUrl(w.q, w.guess) })
        .then(function (how) { shareToast(how, 'Shared! Let’s see if they can beat it.', 'Copied! Paste it into a chat.'); });
    };
  }
  function countdownText() {
    var now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
    var mins = Math.round((next - now) / 60000);
    return 'New challenge in ' + Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
  }
  function showSportsDailyResults(justFinished) {
    var done = sportsDailyDone();
    feed = null; card = null;
    var picks = done.picks, res = loadPicks(picks), hits = picks.filter(function (p) { return p.hit; }).length;
    var dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var shareText = G.sportsShareText(dateLabel, picks);
    var rows = res.map(function (r) {
      var q = r.q;
      return '<li><span class="row-mark g-' + G.gradeFor(r) + '">' + (r.hit ? '✓' : r.skipped ? '–' : '✕') + '</span>' +
        '<span class="row-name">' + esc(fullName(q)) + '<small>' + esc(q.league || (sportDef(q) || {}).label || '') + '</small></span>' +
        '<span class="row-miles">' + (r.skipped ? 'skipped' : fmt(r.miles) + ' mi') + '</span></li>';
    }).join('');
    app.innerHTML =
      '<div class="screen results sports">' +
      '<div class="topbar"><div class="topbar-left"><button class="icon-btn back-btn" id="back" aria-label="Back to Sports">' + ICON.back + '</button>' +
      WORDMARK + '</div>' + statChips(soundButton()) + '</div>' +
      '<div class="results-body">' +
      '<div class="results-head"><div class="daily-label">DAILY SPORTS 10 · ' + esc(dateLabel.toUpperCase()) + '</div>' +
      '<div class="sd-score"><b>' + hits + '</b><span>/10</span></div>' +
      '<div class="sd-verdict">' + esc(G.sportsTitle(hits)) + '</div></div>' +
      '<div class="sd-grid" aria-label="' + hits + ' right out of 10">' + res.map(function (r, i) {
        return '<span class="dsq big g-' + G.gradeFor(r) + '" style="animation-delay:' + (i * 0.07) + 's"></span>';
      }).join('') + '</div>' +
      shareBoxHtml(shareText, worstMiss(res)) +
      '<ol class="result-list sd-list">' + rows + '</ol>' +
      '<p class="results-note">Correct = your pin landed within ' + G.DAILY_HIT_MILES + ' miles. ' + countdownText() + '.</p>' +
      '</div><div class="intro-foot"><button class="btn ghost big" id="done">Back to Sports</button></div></div>';
    document.getElementById('back').onclick = document.getElementById('done').onclick = function () { startFeed({ kind: 'sports', region: 'usa', sport: 0 }); };
    wireShareBox('Daily Sports 10', dateLabel, G.sportsTitle(hits), res, shareText);
    wireChrome();
    music('sports'); // the game-day music keeps going on the results
    if (justFinished) {
      dingSquares(picks);
      Sound.play('trophy', hits >= 8 ? 'gold' : hits >= 5 ? 'silver' : 'bronze');
      if (hits >= 5) confetti(app.querySelector('.screen'), [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 110, 0.25);
    }
  }
  // --- Daily 10 results: X/10 correct, green/red squares, and a score to share ---
  function showDailyResults(justFinished) {
    var res = loadPicks(dailyDone().picks);
    var total = res.reduce(function (s, r) { return s + r.points; }, 0);
    var answered = res.filter(function (r) { return !r.skipped; });
    var hits = res.filter(function (r) { return r.hit; }).length;
    var bulls = answered.filter(function (r) { return r.bullseye; }).length;
    var avg = answered.length ? answered.reduce(function (s, r) { return s + r.miles; }, 0) / answered.length : 0;
    var d = new Date();
    var dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    var shareText = G.dailyShareText('Daily 10', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), res);
    var rows = res.map(function (r) {
      return '<li><span class="row-mark g-' + G.gradeFor(r) + '">' + (r.hit ? '✓' : r.skipped ? '–' : '✕') + '</span>' +
        '<span class="dot" style="background:' + CATS[r.q.category].color + '"></span>' +
        '<span class="row-name">' + esc(fullName(r.q)) + '</span>' +
        '<span class="row-miles">' + (r.skipped ? 'skipped' : fmt(r.miles) + ' mi') + '</span>' +
        '<span class="row-pts">' + (r.skipped ? '0' : '+' + fmt(r.points)) + '</span></li>';
    }).join('');
    feed = null; card = null;
    music('home');
    if (justFinished) Sound.play('trophy', hits >= 8 ? 'gold' : hits >= 5 ? 'silver' : 'bronze');
    app.innerHTML =
      '<div class="screen results">' +
      '<div class="topbar">' + WORDMARK + statChips(soundButton()) + '</div>' +
      '<div class="results-body">' +
      '<div class="results-head"><div class="daily-label">DAILY 10 · ' + esc(dateLabel.toUpperCase()) + '</div>' +
      '<div class="sd-score"><b>' + hits + '</b><span>/10</span></div>' +
      '<div class="sd-verdict">' + esc(G.dailyTitle(hits)) + '</div></div>' +
      '<div class="sd-grid" aria-label="' + hits + ' correct out of 10">' + res.map(function (r, i) {
        return '<span class="dsq big g-' + G.gradeFor(r) + '" style="animation-delay:' + (i * 0.07) + 's"></span>';
      }).join('') + '</div>' +
      shareBoxHtml(shareText, worstMiss(res)) +
      '<div class="stat-grid">' +
      '<div><b>' + fmt(total) + '</b><span>points</span></div>' +
      '<div><b>' + bulls + '</b><span>bullseyes</span></div>' +
      '<div><b>' + fmt(avg) + '</b><span>avg miles off</span></div></div>' +
      '<ol class="result-list sd-list">' + rows + '</ol>' +
      '<p class="results-note">Correct = your pin landed within ' + G.DAILY_HIT_MILES + ' miles. Same 10 for everyone today. ' + countdownText() + '.</p>' +
      '</div><div class="intro-foot"><button class="btn primary big" id="done">Back to feeds</button></div></div>';
    document.getElementById('done').onclick = function () { showPicker(); };
    wireShareBox('Daily 10', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), G.dailyTitle(hits), res, shareText);
    wireChrome();
    if (justFinished) {
      if (hits >= 5) confetti(app.querySelector('.screen'), [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 110, 0.25);
      dingSquares(res);
    }
  }
  // Results squares "ding" in one at a time, high for a hit, low for a miss.
  function dingSquares(list) {
    list.forEach(function (r, i) { setTimeout(function () { Sound.play('square', !!r.hit); }, 250 + i * 70); });
  }

  FX.wireTaps(); // every button boings and bursts when tapped (fx.js)
  // Opened from a "Beat my pin" link (?beat=card~lat~lon): go straight to that card.
  var beat = G.parseChallenge(decodeURIComponent((location.search.match(/[?&]beat=([^&]+)/) || [])[1] || ''), Object.keys(BYID));
  if (beat) {
    try { history.replaceState(null, '', location.pathname); } catch (e) { } // a reload goes to the home screen, not the same challenge
    store.seenIntro = true; save(); // playing the challenge teaches the game
    startFeed({ kind: 'challenge', id: beat.id, friend: beat.guess });
    FX.slam(app, '🎯', 'BEAT MY PIN!');
  } else if (store.seenIntro) { if (store.sound) showGate(); else showPicker({ flyIn: true }); } else showIntro();
})();
