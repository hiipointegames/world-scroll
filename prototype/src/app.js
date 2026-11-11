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
  var CATEGORY_SUBS = {
    countries: 'Every one, by continent', capitals: 'World + US states', cities: 'Big, small, famous',
    rivers: 'Follow the water', mountains: 'Peaks and ranges', deserts: 'Sand, ice and rock'
  };

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
  var ICON = {
    flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 3 3 3"/></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DDCC4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
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
  Sound.setEnabled(store.sound);
  document.addEventListener('pointerdown', function () { if (store.sound) Sound.unlock(); }, { once: true });
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
  var EUROPE = ['Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia',
    'Cyprus', 'N. Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Faeroe Is.', 'Finland', 'France', 'Germany', 'Greece',
    'Guernsey', 'Hungary', 'Iceland', 'Ireland', 'Isle of Man', 'Italy', 'Jersey', 'Kosovo', 'Latvia', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Macedonia', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'Norway',
    'Poland', 'Portugal', 'Romania', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
    'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican', 'Åland'];
  function fc(features) { return { type: 'FeatureCollection', features: features }; }
  function split(isFocus) {
    return {
      focus: fc(worldCountries.filter(function (f) { return isFocus(f.properties.name); })),
      other: fc(worldCountries.filter(function (f) { return !isFocus(f.properties.name); }))
    };
  }
  var LAYERS = {
    world: Object.assign(split(function (n) { return n !== 'Antarctica'; }), { borders: countryBorders }),
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
  function layersFor(regionId) {
    if (LAYERS[regionId]) return LAYERS[regionId];
    var r = DATA.regions[regionId];
    if (r.projection === 'albersUsa') LAYERS[regionId] = { focus: usNation, inner: usStateLines, other: null, borders: null };
    else LAYERS[regionId] = Object.assign(split(function (n) { return CONTINENT_OF[n] === r.continent; }), { borders: countryBorders });
    return LAYERS[regionId];
  }
  var COUNTRY_SHAPE = {};
  worldCountries.forEach(function (f) { COUNTRY_SHAPE[f.properties.name] = f; });

  // ---------- "Your pin landed in ..." (shown after lock-in) ----------
  var usStates = topojson.feature(WS_US, WS_US.objects.states).features;
  var ATLAS_NAMES = DATA.atlasNames || {};
  // Named places we can measure a pin against: capitals, cities and stadium towns from the bank.
  var PLACES = (function () {
    var seen = {}, out = [];
    QUESTIONS.forEach(function (q) {
      if (['capitals', 'cities', 'sports'].indexOf(q.category) < 0 || !q.answer) return;
      var label = q.answer.replace(/\s*\(.*?\)/g, '').trim();
      if (/ area\b/.test(label) || seen[label]) return;
      seen[label] = 1;
      out.push({ label: label, city: label.split(',')[0], lat: q.lat, lon: q.lon });
    });
    return out;
  })();
  function placeOfPin(g) {
    var pt = [g.lon, g.lat], where = null;
    for (var i = 0; i < worldCountries.length && !where; i++) {
      if (d3.geoContains(worldCountries[i], pt)) where = worldCountries[i].properties.name;
    }
    if (where === 'United States of America') {
      var st = usStates.filter(function (f) { return d3.geoContains(f, pt); })[0];
      where = st ? st.properties.name + ', USA' : 'USA';
    } else if (where) where = ATLAS_NAMES[where] || where;
    var best = null, bestMi = Infinity;
    PLACES.forEach(function (p) { var d = G.haversineMiles(g, p); if (d < bestMi) { bestMi = d; best = p; } });
    var region = where ? where.split(', ')[0] : '';
    var name = best && region && best.label.indexOf(region) >= 0 ? best.city : best && best.label;
    var near = !best ? '' : bestMi < 8 ? 'right by ' + name : 'about ' + fmt(Math.round(bestMi)) + ' mi from ' + name;
    return (where || 'in the water') + (near ? ', ' + near : '');
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

  function makeProjection(regionId, W, H) {
    var r = DATA.regions[regionId];
    if (r.projection === 'albersUsa') { // lower 48 with Alaska and Hawaii insets
      return d3.geoAlbersUsa().fitExtent([[8, 8], [W - 8, H - 8]], usNation);
    }
    var b = r.bounds;
    var pts = [];
    for (var i = 0; i <= 20; i++) {
      var lon = b.lonMin + (b.lonMax - b.lonMin) * i / 20, lat = b.latMin + (b.latMax - b.latMin) * i / 20;
      pts.push([lon, b.latMin], [lon, b.latMax], [b.lonMin, lat], [b.lonMax, lat]);
    }
    var proj = regionId === 'world' ? d3.geoNaturalEarth1() : d3.geoMercator();
    if (r.rotate) proj.rotate([r.rotate, 0]); // Oceania straddles the 180° line
    proj.fitExtent([[6, 6], [W - 6, H - 6]], { type: 'MultiPoint', coordinates: pts });
    proj.clipExtent([[0, 0], [W, H]]);
    return proj;
  }

  var pathCache = {};
  function regionPaths(regionId, W, H, proj) {
    var key = regionId + '|' + W + '|' + H;
    if (pathCache[key]) return pathCache[key];
    var path = d3.geoPath(proj), L = layersFor(regionId);
    var out = {
      other: L.other ? path(L.other) || '' : '', focus: path(L.focus) || '', borders: L.borders ? path(L.borders) || '' : '',
      inner: L.inner ? path(L.inner) || '' : '',
      sphere: regionId === 'world' ? path({ type: 'Sphere' }) : '',
      grid: regionId === 'world' ? path(d3.geoGraticule10()) : ''
    };
    pathCache[key] = out;
    return out;
  }

  // ---------- Map component ----------
  // Renders a region, turns taps into lat/lon, draws the guess pin and (after lock-in) the answer.
  function createMap(host, regionId, onTap) {
    var W = Math.max(200, Math.round(host.clientWidth)), H = Math.max(140, Math.round(host.clientHeight));
    var proj = makeProjection(regionId, W, H);
    var P = regionPaths(regionId, W, H, proj);
    var NS = 'http://www.w3.org/2000/svg';
    var svgEl = document.createElementNS(NS, 'svg');
    host.appendChild(svgEl);
    // If the card layout shifts later, the map scales to fit; matching the backdrop hides the edges.
    host.style.background = regionId === 'world' ? COLOR.ink : COLOR.water;
    var svg = d3.select(svgEl)
      .attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('role', 'img')
      .attr('aria-label', 'Map of ' + DATA.regions[regionId].label + '. Drop a pin where you think it is.');

    svg.append('rect').attr('width', W).attr('height', H).attr('fill', regionId === 'world' ? COLOR.ink : COLOR.water);
    var zg = svg.append('g');
    if (P.sphere) zg.append('path').attr('d', P.sphere).attr('fill', COLOR.water);
    if (P.grid) zg.append('path').attr('d', P.grid).attr('class', 'm-grid');
    zg.append('path').attr('d', P.other).attr('fill', COLOR.other);
    zg.append('path').attr('d', P.focus).attr('fill', COLOR.focus);
    if (P.inner) zg.append('path').attr('d', P.inner).attr('class', 'm-inner');
    zg.append('path').attr('d', P.borders).attr('class', 'm-borders');
    var tolPath = zg.append('path').attr('class', 'm-tol');

    var pins = svg.append('g');
    var line = pins.append('line').attr('class', 'm-line').style('display', 'none');
    var answer = pins.append('g').style('display', 'none');
    var answerBody = answer.append('g').attr('class', 'm-answer');
    answerBody.append('circle').attr('r', 10).attr('fill', 'none').attr('stroke', COLOR.teal).attr('stroke-width', 3);
    answerBody.append('circle').attr('r', 3.5).attr('fill', COLOR.teal);
    var guessPin = pins.append('g').style('display', 'none');
    var guessBody = guessPin.append('g').attr('class', 'm-pin');
    guessBody.append('circle').attr('r', 8).attr('fill', COLOR.gold).attr('stroke', COLOR.ink).attr('stroke-width', 2);
    guessBody.append('circle').attr('r', 3).attr('fill', COLOR.ink);

    var t = d3.zoomIdentity, guess = null, target = null, progress = 0, locked = false;

    function screenOf(ll) { return t.apply(proj([ll.lon, ll.lat])); }
    function place() {
      zg.attr('transform', t.toString());
      if (guess) {
        var g = screenOf(guess);
        guessPin.style('display', null).attr('transform', 'translate(' + g[0] + ',' + g[1] + ')');
        if (target) {
          var a = screenOf(target);
          line.style('display', null).attr('x1', g[0]).attr('y1', g[1])
            .attr('x2', g[0] + (a[0] - g[0]) * progress).attr('y2', g[1] + (a[1] - g[1]) * progress);
          answer.style('display', progress >= 1 ? null : 'none').attr('transform', 'translate(' + a[0] + ',' + a[1] + ')');
        }
      }
    }

    // How far players can zoom in: the world map needs more room to find small countries.
    var maxZoom = regionId === 'world' ? 20 : 12;
    var zoom = d3.zoom().scaleExtent([1, maxZoom]).extent([[0, 0], [W, H]]).translateExtent([[0, 0], [W, H]])
      .on('zoom', function (e) { t = e.transform; place(); });
    svg.call(zoom).on('dblclick.zoom', null);

    svg.on('click', function (e) {
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
      guessBody.classed('drop', false);
      void guessBody.node().getBoundingClientRect();
      guessBody.classed('drop', true);
      onTap(guess);
    });

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      zoomBy: function (k) { svg.transition().duration(220).call(zoom.scaleBy, k); },
      // opts.shape: a country to light up; opts.target: where the dashed line should end.
      reveal: function (card, opts) {
        locked = true;
        target = (opts && opts.target) || { lat: card.lat, lon: card.lon };
        if (opts && opts.shape) {
          tolPath.attr('d', d3.geoPath(proj)(opts.shape) || '').classed('m-shape', true);
        } else {
          var deg = (card.toleranceMiles || 25) / G.EARTH_RADIUS_MI * 180 / Math.PI;
          tolPath.attr('d', d3.geoPath(proj)(d3.geoCircle().center([card.lon, card.lat]).radius(deg)()) || '');
        }
        svg.classed('revealed', true);
        // If the player zoomed in and the answer is off screen, zoom back out first.
        var a = screenOf(target), g = screenOf(guess);
        var off = [a, g].some(function (p) { return p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H; });
        if (off) svg.transition().duration(reduceMotion ? 0 : 350).call(zoom.transform, d3.zoomIdentity);
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
  }

  // ---------- screens ----------
  var app = document.getElementById('app');
  var feed = null;      // the feed being played
  var card = null;      // the card on screen
  var busy = false;     // true while a card is sliding

  function statChips(extra) {
    return '<div class="stats">' +
      '<button class="stat" id="stat-streak" aria-label="Day streak. What is this?">' + ICON.flame + '<span>' + shownStreak() + '</span></button>' +
      '<button class="stat" id="stat-points" aria-label="Points. What is this?">' + ICON.star + '<span>' + fmt(store.points) + '</span></button>' +
      (extra || '') + '</div>';
  }
  function soundButton() {
    return '<button class="icon-btn sound-btn" aria-pressed="' + store.sound + '" aria-label="Sound on or off">' +
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
    if (tc) tc.onclick = trophySheet;
  }
  // Mute / unmute from any sound button on any screen (home, Sports, or the corner of each card).
  function toggleSound() {
    store.sound = !store.sound; save();
    Sound.setEnabled(store.sound);
    if (store.sound) { Sound.unlock(); Sound.play('tap'); }
    Sound.setMusic(store.sound && isSportsLook());
    app.querySelectorAll('.sound-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', store.sound);
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
    ov.querySelector('[data-close]').focus();
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
    openSheet(sheetHead('<span class="nerd-emoji" aria-hidden="true">🤓</span>', 'SPORTS NERD FACTS', esc(subjectOf(q))) +
      (q.venue ? '<div class="sheet-text small">' + esc(q.venue) + ' · ' + esc(q.answer.replace(/\s*\(.*?\)/g, '')) + '</div>' : '') +
      '<div class="nerd-list">' + rows + '</div>', { button: 'Back to the game', cls: 'nerd-sheet' });
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
    var from = shownPoints == null ? +span.textContent.replace(/,/g, '') : shownPoints, to = store.points, t0 = performance.now();
    shownPoints = to;
    p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
    (function tick(now) { // count up to the new total
      var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      span.textContent = fmt(from + (to - from) * e);
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
    Sound.setMusic(false);
    var P = regionPaths('world', 390, 200, makeProjection('world', 390, 200));
    var spots = [[-60, -3.4], [32.3, 1.4], [103.5, 42.8], [149.1, -35.3], [-94.5, 39], [-2.96, 53.4]];
    var proj = makeProjection('world', 390, 200);
    var dots = spots.map(function (s, i) {
      var p = proj(s);
      return '<circle class="intro-dot" style="animation-delay:' + (i * 0.45) + 's" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/>';
    }).join('');
    app.innerHTML =
      '<div class="screen intro">' +
      '<svg class="intro-map" viewBox="0 0 390 200" aria-hidden="true"><path d="' + P.sphere + '" fill="#0F1A40"/>' +
      '<path d="' + P.focus + '" fill="#2E6F8E"/><path d="' + P.borders + '" class="m-borders"/>' + dots + '</svg>' +
      '<div class="intro-body">' +
      '<div class="intro-brand"><div class="wordmark big">' + GLOBE + 'World<span>Scroll</span></div>' +
      '<h1 class="intro-title">Learn geography by scrolling.</h1>' +
      '<p class="intro-sub">Doomscrolling, but you get smarter. Every card is a place on the map, and every swipe teaches you something new.</p></div>' +
      '<ol class="intro-steps">' +
      '<li><span class="step-n">1</span><span><b>See a place.</b> Countries, capitals, rivers, deserts, and where your favorite sports teams play.</span></li>' +
      '<li><span class="step-n">2</span><span><b>Drop a pin.</b> Put it where you think the place is, then lock in your guess.</span></li>' +
      '<li><span class="step-n">3</span><span><b>Learn and swipe.</b> See how close you got, pick up a fact, and swipe up for the next one.</span></li>' +
      '</ol></div>' +
      '<div class="intro-foot"><button class="btn primary big" id="intro-go">Start scrolling</button></div>' +
      '</div>';
    document.getElementById('intro-go').onclick = function () {
      store.seenIntro = true; save(); Sound.play('swoosh'); showPicker();
    };
  }

  // --- Pick your feed ---
  function showPicker() {
    feed = null; card = null;
    Sound.setMusic(false);
    var count = function (cat) { return QUESTIONS.filter(function (q) { return q.category === cat; }).length; };
    var tiles = DATA.categories.filter(function (c) { return c.id !== 'sports'; }).map(function (c) {
      var n = count(c.id);
      return '<button class="tile" data-cat="' + c.id + '" style="--c:' + c.color + '">' +
        '<span class="tile-top"><span class="dot" style="background:' + c.color + '"></span>' +
        '<span class="tile-count">' + n + (n === 1 ? ' card' : ' cards') + '</span></span>' +
        '<span class="tile-text"><span class="tile-name">' + esc(c.label) + '</span>' +
        '<span class="tile-sub">' + esc(CATEGORY_SUBS[c.id] || '') + '</span></span></button>';
    }).join('');
    // Teams only (tennis cards are famous venues, not teams)
    var sportsCount = QUESTIONS.filter(function (q) { return q.category === 'sports' && q.sport !== 'tennis'; }).length;
    app.innerHTML =
      '<div class="screen picker">' +
      '<div class="topbar">' + WORDMARK + statChips(soundButton()) + '</div>' +
      '<div class="picker-body">' +
      '<div class="picker-head"><h1>Where do you wanna scroll today?</h1><p>Every scroll teaches you a new spot on the map.</p></div>' +
      '<button class="sports-hero" id="go-sports">' +
      '<span class="hero-text"><span class="hero-kicker">WHERE DO THEY PLAY?</span>' +
      '<span class="hero-name">Sports</span>' +
      '<span class="hero-sub">' + sportsCount + ' sports teams · USA, Europe and Australia</span></span>' +
      '<span class="hero-side"><span class="hero-trophies">' + trophyCaseHtml(false) + '</span>' +
      '<span class="hero-go">Play</span></span></button>' +
      '<button class="btn primary big" id="go-shuffle">' + ICON.shuffle + 'Shuffle the whole world</button>' +
      '<div class="tiles">' + tiles + '</div>' +
      '<div class="daily"><div><div class="daily-label">DAILY 10 CHALLENGE</div>' +
      '<div class="daily-title">Same 10 for everyone, today</div></div>' +
      '<button class="btn teal" id="go-daily">Play</button></div>' +
      '<button class="reset" id="reset">Reset my points and streak</button>' +
      '</div></div>';
    document.getElementById('go-sports').onclick = function () { startFeed({ kind: 'sports', region: 'usa', sport: 0 }); };
    document.getElementById('go-shuffle').onclick = function () { startFeed({ kind: 'shuffle' }); };
    document.getElementById('go-daily').onclick = function () { startFeed({ kind: 'daily' }); };
    document.getElementById('reset').onclick = function () {
      var keepSound = store.sound;
      store = freshStore(); store.sound = keepSound; save(); showPicker();
    };
    app.querySelectorAll('.tile').forEach(function (b) {
      b.onclick = function () { startFeed({ kind: 'category', category: b.getAttribute('data-cat') }); };
    });
    wireChrome();
  }

  // --- Feed ---
  function buildFeed(spec) {
    var items;
    if (spec.kind === 'shuffle') items = G.mixByCategory(QUESTIONS, Math.random);
    else if (spec.kind === 'daily') items = G.dailyPick(QUESTIONS, todayKey(), 10);
    else if (spec.kind === 'sportsdaily') items = G.dailySportsPick(QUESTIONS, todayKey(), 10);
    else if (spec.kind === 'category') {
      var group = spec.group || 'all';
      var gtab = DATA.geoTabs.filter(function (t) { return t.id === group; })[0];
      spec.groupDef = gtab;
      spec.mapRegion = gtab && gtab.region; // a continent tab zooms the map to that continent
      items = G.shuffle(QUESTIONS.filter(function (q) {
        if (q.category !== spec.category) return false;
        if (group === 'all') return q.continent !== 'us-states'; // state capitals live in their own tab
        return q.continent === group;
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
    var sports = s.kind === 'sports', sportsDaily = s.kind === 'sportsdaily';
    app.innerHTML =
      '<div class="screen feed' + (sports || sportsDaily ? ' sports' : '') + '">' +
      '<div class="topbar"><div class="topbar-left"><button class="icon-btn back-btn" id="back" aria-label="Back">' + ICON.back + '</button>' +
      WORDMARK + '</div>' + statChips() + '</div>' +
      (sports ? sportsDailyBanner() : '') + tabs +
      (sports ? meterHtml() : '') + (sportsDaily ? dailyRowHtml() : '') +
      '<div class="stage" id="stage"></div></div>';
    document.getElementById('back').onclick = sportsDaily ? function () { startFeed({ kind: 'sports', region: 'usa', sport: 0 }); } : showPicker;
    var sdb = document.getElementById('go-sports-daily');
    if (sdb) sdb.onclick = openSportsDaily;
    wireChrome();
    if (sports) renderMeter();
    if (sportsDaily) renderDailyRow();
    Sound.setMusic((sports || sportsDaily) && store.sound);
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
    el.className = 'card';
    el.setAttribute('aria-label', 'Question card');
    var next = isLastDaily() ? null : itemAt(feed.idx + 1);
    el.innerHTML =
      '<div class="card-head">' + (showMeta ? soundButton() : '') +
      '<span class="chip" style="background:' + cat.color + '">' + esc(chipText.toUpperCase()) + '</span>' +
      (where ? '<div class="kicker">Where is…</div><h2 class="prompt">' + esc(subjectOf(q)) + '</h2>'
        : '<h2 class="prompt long">' + esc(q.prompt) + '</h2>') +
      (showMeta ? '<div class="meta">' + esc(metaLine(q)) + '</div>' : '') + '</div>' +
      '<div class="map-wrap"><div class="map"></div>' +
      '<div class="zoom-btns"><button class="zoom-in" aria-label="Zoom in">+</button><button class="zoom-out" aria-label="Zoom out">−</button></div></div>' +
      '<div class="panel" aria-live="polite"></div>' +
      '<div class="actions"><button class="btn ghost skip">Skip</button>' +
      '<button class="btn primary lock" disabled>Drop a pin first</button></div>' +
      '<button class="peek" aria-label="Next card">' + ICON.up +
      '<span class="peek-label">SWIPE UP · NEXT</span>' +
      '<span class="peek-next">' + (next ? esc(next.league || CATS[next.category].label) + ' — ' + esc(subjectOf(next)) : 'Your Daily 10 results') + '</span></button>';
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
      Sound.play('tap');
      var lock = el.querySelector('.lock');
      if (lock.disabled) { lock.classList.remove('ready'); void lock.offsetWidth; lock.classList.add('ready'); }
      lock.disabled = false; lock.textContent = 'Lock in my guess';
      hint(c);
    });
    hint(c);
    el.querySelector('.zoom-in').onclick = function () { c.map.zoomBy(2); };
    el.querySelector('.zoom-out').onclick = function () { c.map.zoomBy(0.5); };
    el.querySelector('.skip').onclick = advance;
    el.querySelector('.lock').onclick = function () { c.revealed ? advance() : lockIn(c); };
    el.querySelector('.peek').onclick = advance;
    card = c;
    if (animate && old) {
      busy = true;
      void el.offsetWidth;
      el.classList.remove('below');
      old.el.classList.add('above');
      setTimeout(function () { old.el.remove(); busy = false; }, 420);
    }
  }

  function lockIn(c) {
    if (!c.guess || c.revealed) return;
    c.revealed = true;
    var shape = c.q.shape && COUNTRY_SHAPE[c.q.shape];
    var sd = shape ? shapeDistance(shape, c.guess) : null;
    var r = G.scoreGuess(c.guess, c.q, sd ? sd.miles : null);
    var secs = (performance.now() - c.t0) / 1000;
    c.map.reveal(c.q, sd ? { shape: shape, target: sd.point } : null);
    recordPoints(r.points);
    bumpStats();
    var isSport = c.q.category === 'sports', inSportsFeed = feed.spec.kind === 'sports';
    var hit = r.miles <= (isDailyKind() ? G.DAILY_HIT_MILES : G.HIT_MILES); // dailies are a bit more forgiving
    if (isDailyKind()) feed.results.push({ q: c.q, miles: r.miles, points: r.points, bullseye: r.bullseye, hit: hit });
    if (feed.spec.kind === 'sportsdaily') renderDailyRow();
    var verdict = isSport && hit ? (SPORT_WORDS[c.q.sport] || r.verdict) : r.verdict;
    Sound.play('lock');
    setTimeout(function () { Sound.play(r.bullseye ? 'bullseye' : hit || r.verdict === 'So close!' ? 'hit' : 'miss'); }, 480);
    if (r.bullseye || (isSport && hit)) { // a little party for a great guess
      setTimeout(function () { if (c.el.isConnected) confetti(c.el, [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 60, 0.55); }, 520);
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
      : r.bullseye ? r.miles + ' mi off · bullseye zone'
      : fmt(r.miles) + ' miles off';
    c.el.querySelector('.panel').innerHTML =
      '<div class="res-top"><span class="res-verdict' + (r.bullseye || (isSport && hit) ? ' bull' : '') + (isSport && hit ? ' sport' : '') + '">' + verdict + '</span>' +
      '<span class="res-right">' + (c.q.nerd ? '<button class="nerd-btn" aria-label="Sports nerd facts">🤓 Nerd facts</button>' : '') +
      '<span class="res-pts">+' + fmt(r.points) + ' pts</span></span></div>' +
      '<div class="res-miles">' + milesLine + streakNote + ' · ' + secs.toFixed(1) + 's</div>' +
      '<div class="res-answer"><span class="answer-dot"></span><span>' + esc(c.q.answer) + (c.q.venue ? '<span class="venue"> · ' + esc(c.q.venue) + '</span>' : '') + '</span></div>' +
      '<div class="res-pin"><span class="pin-dot"></span><span><b>Your pin:</b> ' + esc(placeOfPin(c.guess)) + '</span></div>' +
      '<div class="res-fact' + (c.q.nerd ? ' has-nerd' : '') + '">' + ICON.bulb + '<span><b>Now you know:</b> ' + esc(c.q.fact) + '</span></div>';
    var nb = c.el.querySelector('.nerd-btn');
    if (nb) nb.onclick = function (e) { e.stopPropagation(); Sound.play('tap'); nerdSheet(c.q); };
    c.el.querySelector('.panel').classList.add('revealed');
    c.el.classList.add('revealed');
    c.el.querySelector('.skip').style.display = 'none';
    c.el.querySelector('.lock').textContent = isLastDaily() ? 'See my results' : 'Next card';
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { } }
  }

  function advance() {
    if (!feed || !card || busy || app.querySelector('.sheet-overlay')) return;
    if (isDailyKind() && !card.revealed) feed.results.push({ q: card.q, skipped: true, points: 0, hit: false });
    if (feed.spec.kind === 'sports' && !card.revealed && store.sportsRun) { store.sportsRun = 0; save(); renderMeter(); }
    if (isLastDaily()) {
      if (feed.spec.kind === 'sportsdaily') finishSportsDaily(); else showDailyResults();
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
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); advance(); }
    else if (e.key === 'Enter' && document.activeElement === document.body) {
      card.revealed ? advance() : lockIn(card);
    }
  });

  // --- Daily Sports 10 (inside Sports): one try a day, score out of 10, shareable ---
  function sportsDailyDone() { return store.sportsDaily && store.sportsDaily.date === todayKey() ? store.sportsDaily : null; }
  function sportsDailyBanner() {
    var done = sportsDailyDone();
    var hits = done ? done.picks.filter(function (p) { return p.hit; }).length : 0;
    return '<div class="sd-wrap"><button class="daily-sports" id="go-sports-daily">' +
      '<span class="sd-icon">' + trophyIcon(TIERS.gold.color, 22, true) + '</span>' +
      '<span class="sd-text"><span class="sd-label">DAILY SPORTS 10</span>' +
      '<span class="sd-title">' + (done ? 'You scored ' + hits + '/10 today' : '10 teams, all sports. Same for everyone.') + '</span></span>' +
      '<span class="sd-go">' + (done ? 'Share' : 'Play') + '</span></button></div>';
  }
  function openSportsDaily() {
    if (sportsDailyDone()) showSportsDailyResults(); else { Sound.play('lock'); startFeed({ kind: 'sportsdaily' }); }
  }
  function dailyRowHtml() {
    var sq = '';
    for (var i = 0; i < 10; i++) sq += '<span class="dsq" data-i="' + i + '"></span>';
    return '<div class="meter-row daily-row"><div class="meter"><div class="meter-label" id="daily-label"></div>' +
      '<div class="dsqs" id="dsqs">' + sq + '</div></div>' + soundButton() + '</div>';
  }
  function renderDailyRow() {
    var box = document.getElementById('dsqs'), label = document.getElementById('daily-label');
    if (!box || !feed) return;
    var res = feed.results, hits = res.filter(function (r) { return r.hit; }).length;
    box.querySelectorAll('.dsq').forEach(function (el, i) {
      el.className = 'dsq' + (i < res.length ? (res[i].hit ? ' hit' : ' miss') : i === res.length ? ' now' : '');
    });
    label.innerHTML = 'DAILY SPORTS 10 · CARD ' + Math.min(res.length + 1, 10) + ' OF 10 · <span class="sd-hits">' + hits + ' RIGHT</span>';
  }
  function finishSportsDaily() {
    store.sportsDaily = {
      date: todayKey(),
      picks: feed.results.map(function (r) { return { id: r.q.id, miles: r.skipped ? null : r.miles, hit: !!r.hit }; })
    };
    save();
    showSportsDailyResults(true);
  }
  function countdownText() {
    var now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
    var mins = Math.round((next - now) / 60000);
    return 'New challenge in ' + Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
  }
  function showSportsDailyResults(justFinished) {
    var done = sportsDailyDone();
    feed = null; card = null;
    var byId = {};
    QUESTIONS.forEach(function (q) { byId[q.id] = q; });
    var picks = done.picks, hits = picks.filter(function (p) { return p.hit; }).length;
    var dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var shareText = G.sportsShareText(dateLabel, picks);
    var rows = picks.map(function (p, i) {
      var q = byId[p.id] || {};
      return '<li><span class="row-mark ' + (p.hit ? 'hit' : 'miss') + '">' + (p.hit ? '✓' : '✕') + '</span>' +
        '<span class="row-name">' + esc(q.prompt ? subjectOf(q) : p.id) + '<small>' + esc(q.league || (sportDef(q) || {}).label || '') + '</small></span>' +
        '<span class="row-miles">' + (p.miles == null ? 'skipped' : fmt(p.miles) + ' mi') + '</span></li>';
    }).join('');
    app.innerHTML =
      '<div class="screen results sports">' +
      '<div class="topbar"><div class="topbar-left"><button class="icon-btn back-btn" id="back" aria-label="Back to Sports">' + ICON.back + '</button>' +
      WORDMARK + '</div>' + statChips() + '</div>' +
      '<div class="results-body">' +
      '<div class="results-head"><div class="daily-label">DAILY SPORTS 10 · ' + esc(dateLabel.toUpperCase()) + '</div>' +
      '<div class="sd-score"><b>' + hits + '</b><span>/10</span></div>' +
      '<div class="sd-verdict">' + esc(G.sportsTitle(hits)) + '</div></div>' +
      '<div class="sd-grid" aria-label="' + hits + ' right out of 10">' + picks.map(function (p, i) {
        return '<span class="dsq big ' + (p.hit ? 'hit' : 'miss') + '" style="animation-delay:' + (i * 0.07) + 's"></span>';
      }).join('') + '</div>' +
      '<div class="share-card"><div class="share-label">SHARE YOUR SCORE</div>' +
      '<pre class="share-text" id="share-text">' + esc(shareText) + '</pre>' +
      '<button class="btn primary big" id="share-btn">' + ICON.share + 'Share my score</button>' +
      '<div class="share-note" id="share-note" aria-live="polite"></div></div>' +
      '<ol class="result-list sd-list">' + rows + '</ol>' +
      '<p class="results-note">Correct = your pin landed within ' + G.DAILY_HIT_MILES + ' miles. ' + countdownText() + '.</p>' +
      '</div><div class="intro-foot"><button class="btn ghost big" id="done">Back to Sports</button></div></div>';
    document.getElementById('back').onclick = document.getElementById('done').onclick = function () { startFeed({ kind: 'sports', region: 'usa', sport: 0 }); };
    document.getElementById('share-btn').onclick = function () { shareScore(shareText); };
    wireChrome();
    Sound.setMusic(false);
    if (justFinished) {
      Sound.play('trophy', hits >= 8 ? 'gold' : hits >= 5 ? 'silver' : 'bronze');
      if (hits >= 5) confetti(app.querySelector('.screen'), [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 110, 0.25);
    }
  }
  // Share: use the phone's share sheet when there is one, otherwise copy to the clipboard.
  function shareScore(text) {
    var note = document.getElementById('share-note'), btn = document.getElementById('share-btn');
    function copied() { note.textContent = 'Copied! Paste it into a text or chat to challenge a friend.'; btn.classList.add('done'); Sound.play('hit'); }
    function manual() {
      var r = document.createRange(); r.selectNodeContents(document.getElementById('share-text'));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      note.textContent = 'Your score is selected. Copy it and paste it anywhere.';
    }
    var isPhone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isPhone && navigator.share) { // phones: open the share sheet (Messages, WhatsApp...)
      navigator.share({ text: text }).then(function () { note.textContent = 'Shared!'; Sound.play('hit'); }).catch(function () { tryCopy(); });
    } else tryCopy(); // computers: copy to the clipboard
    function tryCopy() {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(copied, manual);
      else manual();
    }
  }

  // --- Daily 10 results: X/10 correct, green/red squares, and a score to share ---
  function showDailyResults() {
    var res = feed.results;
    var total = res.reduce(function (s, r) { return s + r.points; }, 0);
    var answered = res.filter(function (r) { return !r.skipped; });
    var hits = res.filter(function (r) { return r.hit; }).length;
    var bulls = answered.filter(function (r) { return r.bullseye; }).length;
    var avg = answered.length ? answered.reduce(function (s, r) { return s + r.miles; }, 0) / answered.length : 0;
    var d = new Date();
    var dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    var shareText = G.dailyShareText('Daily 10', d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), res);
    var rows = res.map(function (r) {
      return '<li><span class="row-mark ' + (r.hit ? 'hit' : 'miss') + '">' + (r.hit ? '✓' : '✕') + '</span>' +
        '<span class="dot" style="background:' + CATS[r.q.category].color + '"></span>' +
        '<span class="row-name">' + esc(subjectOf(r.q)) + '</span>' +
        '<span class="row-miles">' + (r.skipped ? 'skipped' : fmt(r.miles) + ' mi') + '</span>' +
        '<span class="row-pts">' + (r.skipped ? '0' : '+' + fmt(r.points)) + '</span></li>';
    }).join('');
    feed = null; card = null;
    Sound.setMusic(false);
    Sound.play('trophy', hits >= 8 ? 'gold' : hits >= 5 ? 'silver' : 'bronze');
    app.innerHTML =
      '<div class="screen results">' +
      '<div class="topbar">' + WORDMARK + statChips() + '</div>' +
      '<div class="results-body">' +
      '<div class="results-head"><div class="daily-label">DAILY 10 · ' + esc(dateLabel.toUpperCase()) + '</div>' +
      '<div class="sd-score"><b>' + hits + '</b><span>/10</span></div>' +
      '<div class="sd-verdict">' + esc(G.dailyTitle(hits)) + '</div></div>' +
      '<div class="sd-grid" aria-label="' + hits + ' correct out of 10">' + res.map(function (r, i) {
        return '<span class="dsq big ' + (r.hit ? 'hit' : 'miss') + '" style="animation-delay:' + (i * 0.07) + 's"></span>';
      }).join('') + '</div>' +
      '<div class="share-card"><div class="share-label">SHARE YOUR SCORE</div>' +
      '<pre class="share-text" id="share-text">' + esc(shareText) + '</pre>' +
      '<button class="btn primary big" id="share-btn">' + ICON.share + 'Share my score</button>' +
      '<div class="share-note" id="share-note" aria-live="polite"></div></div>' +
      '<div class="stat-grid">' +
      '<div><b>' + fmt(total) + '</b><span>points</span></div>' +
      '<div><b>' + bulls + '</b><span>bullseyes</span></div>' +
      '<div><b>' + fmt(avg) + '</b><span>avg miles off</span></div></div>' +
      '<ol class="result-list sd-list">' + rows + '</ol>' +
      '<p class="results-note">Correct = your pin landed within ' + G.DAILY_HIT_MILES + ' miles. Same 10 for everyone today. ' + countdownText() + '.</p>' +
      '</div><div class="intro-foot"><button class="btn primary big" id="done">Back to feeds</button></div></div>';
    document.getElementById('done').onclick = showPicker;
    document.getElementById('share-btn').onclick = function () { shareScore(shareText); };
    wireChrome();
    if (hits >= 5) confetti(app.querySelector('.screen'), [COLOR.gold, COLOR.teal, COLOR.pink, '#FFFFFF'], 110, 0.25);
  }

  if (store.seenIntro) showPicker(); else showIntro();
})();
