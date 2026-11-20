// World Scroll — big, loud, fun effects (the "juice").
//  - FX.welcomeGlobe(host): the spinning 3D globe on the welcome screen, with pins, flight arcs and a plane.
//  - FX.flyIn(host, done): the 2-second opening on the home screen (zoom out from one spot to a spinning globe).
//  - FX.burst(x, y): confetti + emoji burst where a button is tapped.
//  - FX.slam(host, emoji, text): a big "LET'S GO!" pop-up that slams onto the screen.
//  - FX.wireTaps(): every button squashes and stretches ("boing") and bursts when tapped.
// Safety: nothing strobes (at most one flash at a time, never more than 3 per second), and if the phone
// asks for reduced motion (an accessibility setting) every effect here is skipped.
(function (root) {
  var calm = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var land = null;
  function getLand() { return land || (land = topojson.feature(root.WS_WORLD, root.WS_WORLD.objects.land)); }
  // Level of detail: a small globe doesn't need all 60,000 coastline points (drawing them every frame made the
  // welcome screen slow on older phones). Keep a point only once the coast has moved tol degrees from the last one.
  var landLod = {};
  function simplifyRing(ring, tol) {
    var out = [ring[0]], last = ring[0];
    for (var i = 1; i < ring.length - 1; i++) {
      var p = ring[i];
      if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) >= tol) { out.push(p); last = p; }
    }
    out.push(ring[ring.length - 1]);
    return out;
  }
  function landFor(radius) {
    var tol = radius < 160 ? 0.45 : radius < 420 ? 0.15 : 0; // little globe: light; zoomed in close: full detail
    if (!tol) return getLand();
    if (landLod[tol]) return landLod[tol];
    var feats = getLand().features.map(function (f) {
      var g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      var kept = polys.map(function (poly) {
        var s = poly.map(function (r) { return simplifyRing(r, tol); }).filter(function (r) { return r.length >= 4; });
        if (!s.length) return s; // islands too small to see at this size are left out
        // a shape squashed by simplifying can flip inside-out and paint the whole planet: keep the original then
        return d3.geoArea({ type: 'Polygon', coordinates: s }) < 2 * Math.PI ? s : poly;
      }).filter(function (poly) { return poly.length; });
      return { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: kept } };
    });
    return (landLod[tol] = { type: 'FeatureCollection', features: feats });
  }

  // Places the welcome globe shows off (lon, lat): gold pins pop here and planes fly between them.
  var SPOTS = [[-74, 40.7], [-0.1, 51.5], [2.35, 48.86], [139.7, 35.7], [151.2, -33.9], [-43.2, -22.9], [31.2, 30.0],
    [77.2, 28.6], [18.4, -33.9], [-99.1, 19.4], [37.6, 55.8], [103.8, 1.35], [-122.4, 37.8], [28.98, 41.0]];
  var COLORS = ['#FFB547', '#3DDCC4', '#FF6FA8', '#A9C6FF', '#9BE7A8', '#FFFFFF'];
  var EMOJI = ['🌍', '🗺️', '📍', '⭐', '✈️', '🧭', '🏔️', '🌊', '🏆', '🎉'];

  function sizeCanvas(cv, w, h) {
    var dpr = Math.min(3, root.devicePixelRatio || 1); // full phone resolution, so every line is razor sharp
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  }
  var graticule = d3.geoGraticule10();
  // Fine diagonal sheen for the land, like brushed metal (one gradient, built once per size).
  var sheenCache = {};
  function sheen(c, cx, cy, r) {
    var key = Math.round(r) + '|' + Math.round(cx) + '|' + Math.round(cy);
    if (sheenCache[key]) return sheenCache[key];
    var g = c.createLinearGradient(cx - r, cy - r * 0.6, cx + r, cy + r * 0.6);
    for (var i = 0; i <= 40; i++) g.addColorStop(i / 40, i % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,' + (0.035 + 0.03 * Math.sin(i * 1.7)) + ')');
    return (sheenCache[key] = g);
  }

  // Draws one frame of a polished, lit globe: atmosphere haze, deep ocean, brushed-metal land with hairline
  // coastlines, a night side, a sun highlight and a glowing rim. opts.behind / opts.extras draw around and on it.
  function drawGlobe(c, proj, w, h, opts) {
    var path = d3.geoPath(proj, c), r = proj.scale(), ctr = proj.translate(), cx = ctr[0], cy = ctr[1];
    var lx = cx - r * 0.42, ly = cy - r * 0.48; // the sun is up and to the left
    c.clearRect(0, 0, w, h);
    // atmosphere haze, fading out before the canvas edge so it never ends in a hard line
    var glowR = Math.max(r + 4, Math.min(r * 1.34, Math.min(cy, h - cy, cx, w - cx)));
    var breathe = 0.92 + 0.08 * Math.sin((opts.t || 0) * 1.4);
    var halo = c.createRadialGradient(cx, cy, r * 0.94, cx, cy, glowR);
    halo.addColorStop(0, 'rgba(110,200,255,' + (0.42 * breathe) + ')'); halo.addColorStop(0.4, 'rgba(61,220,196,' + (0.12 * breathe) + ')');
    halo.addColorStop(1, 'rgba(61,220,196,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, glowR, 0, 2 * Math.PI); c.fill();
    if (opts.behind) opts.behind(c); // things passing behind the globe (the far side of each orbit)
    // deep ocean: lit blue under the sun, nearly black at the edge
    var sea = c.createRadialGradient(lx, ly, r * 0.05, cx, cy, r * 1.05);
    sea.addColorStop(0, '#3170C4'); sea.addColorStop(0.35, '#163C86'); sea.addColorStop(0.75, '#0A1C4E'); sea.addColorStop(1, '#040A22');
    c.fillStyle = sea; c.beginPath(); path({ type: 'Sphere' }); c.fill();
    c.strokeStyle = 'rgba(150,210,255,.07)'; c.lineWidth = 0.5; c.beginPath(); path(graticule); c.stroke(); // hairline grid
    // land: cool brushed metal, bright where the light hits
    var landFill = c.createLinearGradient(cx - r, cy - r, cx + r * 0.9, cy + r);
    landFill.addColorStop(0, '#BDF2EC'); landFill.addColorStop(0.3, '#6CC0C6'); landFill.addColorStop(0.62, '#2F7C96'); landFill.addColorStop(1, '#123754');
    c.beginPath(); path(landFor(r)); // lighter coastline when the globe is small (level of detail)
    c.fillStyle = landFill; c.fill();
    c.save(); c.clip(); c.fillStyle = sheen(c, cx, cy, r); c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
    c.strokeStyle = 'rgba(225,255,250,.6)'; c.lineWidth = 0.45; c.stroke(); // razor-thin coastlines
    // night side: the far side of the ball falls into shadow
    var night = c.createRadialGradient(lx, ly, r * 0.2, cx + r * 0.1, cy + r * 0.1, r * 1.25);
    night.addColorStop(0, 'rgba(2,5,22,0)'); night.addColorStop(0.55, 'rgba(2,5,22,0)'); night.addColorStop(0.82, 'rgba(2,5,22,.5)'); night.addColorStop(1, 'rgba(2,5,22,.82)');
    c.fillStyle = night; c.beginPath(); path({ type: 'Sphere' }); c.fill();
    if (opts.extras) opts.extras(c, path);
    // the sun's highlight: a soft specular glint, so it reads as polished, not painted
    c.save(); c.globalCompositeOperation = 'lighter';
    var spec = c.createRadialGradient(lx, ly, 0, lx, ly, r * 0.55);
    spec.addColorStop(0, 'rgba(255,255,255,.24)'); spec.addColorStop(0.3, 'rgba(200,235,255,.09)'); spec.addColorStop(1, 'rgba(200,235,255,0)');
    c.fillStyle = spec; c.beginPath(); path({ type: 'Sphere' }); c.fill();
    // Fresnel rim: the edge of the atmosphere catches the light
    var rim = c.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
    rim.addColorStop(0, 'rgba(120,220,255,0)'); rim.addColorStop(1, 'rgba(120,220,255,.38)');
    c.fillStyle = rim; c.beginPath(); path({ type: 'Sphere' }); c.fill();
    c.restore();
    c.save(); c.shadowColor = 'rgba(110,210,255,.95)'; c.shadowBlur = Math.min(18, r * 0.16);
    c.strokeStyle = 'rgba(200,245,255,.8)'; c.lineWidth = 0.9; c.beginPath(); path({ type: 'Sphere' }); c.stroke(); c.restore();
  }
  var visible = function (proj, p) { var r = proj.rotate(); return d3.geoDistance(p, [-r[0], -r[1]]) < Math.PI / 2 - 0.05; };

  // ---------- welcome screen: a premium spinning globe in its own little space show ----------
  // On the globe: city lights, and flight paths that lift off the surface like real routes.
  // Around it: hairline orbits with light sweeping along them, satellites and comets that skim close around
  // the globe, passing behind and in front of it, a crisp starfield and a slow pulse. No cartoon emoji.
  function welcomeGlobe(host) {
    var cv = document.createElement('canvas'); cv.className = 'fx-globe'; host.appendChild(cv);
    var w = host.clientWidth || 340, h = host.clientHeight || 200, c = sizeCanvas(cv, w, h);
    var proj = d3.geoOrthographic().clipAngle(90).translate([w / 2, h / 2]).scale(Math.min(w * 0.2, h / 2 - 16)); // room around it for the orbits
    var flights = [[0, 3], [1, 7], [4, 5], [2, 6], [8, 9], [10, 11], [12, 13], [3, 4], [5, 1], [9, 12]];
    var R = proj.scale(), ctr = proj.translate(), t0 = performance.now();
    function center() { var rt = proj.rotate(); return [-rt[0], -rt[1]]; }
    // a point above the surface: altitude 0 = on the ground (orthographic, so lifting = pushing out from the center)
    function lifted(p, alt) { var s = proj(p); return [ctr[0] + (s[0] - ctr[0]) * (1 + alt), ctr[1] + (s[1] - ctr[1]) * (1 + alt)]; }
    function extras() {
      var t = (performance.now() - t0) / 1000, cen = center();
      // flight paths: a bright head with a fading tail, arcing up off the globe and back down
      flights.forEach(function (f, i) {
        var k = (t * 0.32 + i * 0.29) % 1.5;
        if (k > 1.25) return;
        var a = SPOTS[f[0]], b = SPOTS[f[1]], ip = d3.geoInterpolate(a, b), n = 40, head = Math.min(1, k), tail = Math.max(0, k - 0.45);
        var gold = i % 3 !== 1, prev = null;
        for (var j = Math.floor(tail * n); j <= head * n; j++) {
          var fr = j / n, p = ip(fr);
          if (d3.geoDistance(p, cen) > Math.PI / 2 - 0.02) { prev = null; continue; }
          var s = lifted(p, 0.2 * Math.sin(Math.PI * fr) * Math.min(1, d3.geoDistance(a, b) * 0.9));
          if (prev) {
            var al = (fr - tail) / Math.max(0.01, head - tail);
            c.strokeStyle = (gold ? 'rgba(255,200,110,' : 'rgba(150,235,255,') + (0.1 + 0.85 * al) + ')';
            c.lineWidth = 0.6 + 0.9 * al; c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(s[0], s[1]); c.stroke();
          }
          prev = s;
        }
        if (prev && k < 1) { // the moving head: a tiny bright light
          c.save(); c.shadowColor = gold ? '#FFC870' : '#9BE9FF'; c.shadowBlur = 8; c.fillStyle = '#FFFFFF';
          c.beginPath(); c.arc(prev[0], prev[1], 1.5, 0, 2 * Math.PI); c.fill(); c.restore();
        }
      });
      // cities: small glowing lights with a thin ring breathing out; they fade as they turn toward the edge
      SPOTS.forEach(function (s, i) {
        var d = d3.geoDistance(s, cen);
        if (d > Math.PI / 2 - 0.05) return;
        var p = proj(s), fade = Math.min(1, (Math.PI / 2 - d) * 3), ph = (t * 0.5 + i * 0.29) % 1;
        c.strokeStyle = 'rgba(255,210,140,' + (0.7 * (1 - ph) * fade) + ')'; c.lineWidth = 0.7;
        c.beginPath(); c.arc(p[0], p[1], 2 + ph * 9, 0, 2 * Math.PI); c.stroke();
        c.save(); c.shadowColor = 'rgba(255,190,90,1)'; c.shadowBlur = 7; c.fillStyle = 'rgba(255,236,200,' + fade + ')';
        c.beginPath(); c.arc(p[0], p[1], 1.6, 0, 2 * Math.PI); c.fill(); c.restore();
      });
    }
    // ---- around the globe ----
    // Tilted orbits (sizes are multiples of the globe's radius R). The far half of each is drawn behind the globe.
    // Kept close to the Earth: everything skims just above the globe (no moon or planets; the focus is our world).
    var ORBITS = [
      { rx: 1.32, ry: 0.34, tilt: -0.26, color: '120,230,215', speed: 0.6, sweep: 0.9, riders: [{ sat: '#9BF5E6', at: 0 }, { comet: '255,205,120', at: Math.PI }] },
      { rx: 1.2, ry: 0.46, tilt: 0.44, color: '255,160,200', speed: -0.48, sweep: -0.7, riders: [{ sat: '#FFC2DA', at: 1.2 }, { comet: '150,230,255', at: 4.3 }] },
      { rx: 1.46, ry: 0.24, tilt: 0.1, color: '255,205,120', speed: 0.36, sweep: 0.5, riders: [{ comet: '255,255,255', at: 0.6 }, { sat: '#FFE3A8', at: 3.6 }] }
    ];
    function onOrbit(o, a) { // a point on a tilted ellipse; depth > 0 means in front of the globe
      var x = Math.cos(a) * o.rx * R, y = Math.sin(a) * o.ry * R, ct = Math.cos(o.tilt), st = Math.sin(o.tilt);
      return { x: ctr[0] + x * ct - y * st, y: ctr[1] + x * st + y * ct, depth: Math.sin(a) };
    }
    // A crisp starfield (fixed spots; a few twinkle) and three lens glints.
    var STARS = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var s = 0; s < 70; s++) {
      var sx = rnd() * w, sy = rnd() * h;
      if (Math.hypot(sx - ctr[0], sy - ctr[1]) < R * 1.15) continue;
      STARS.push({ x: sx, y: sy, r: 0.35 + rnd() * 0.75, tw: rnd() < 0.35, ph: rnd() * 6.3, warm: rnd() < 0.2 });
    }
    var GLINTS = [[-1.75, -0.95, 0], [1.9, 0.75, 2.1], [2.35, -0.7, 4.2]].map(function (g) { return { x: ctr[0] + g[0] * R, y: ctr[1] + g[1] * R, ph: g[2] }; });
    function glint(x, y, size, alpha) { // a thin lens-flare cross, like light catching a camera lens
      c.save(); c.globalCompositeOperation = 'lighter';
      var gx = c.createLinearGradient(x - size, y, x + size, y);
      gx.addColorStop(0, 'rgba(200,235,255,0)'); gx.addColorStop(0.5, 'rgba(235,250,255,' + alpha + ')'); gx.addColorStop(1, 'rgba(200,235,255,0)');
      c.fillStyle = gx; c.fillRect(x - size, y - 0.4, size * 2, 0.8);
      var gy = c.createLinearGradient(x, y - size, x, y + size);
      gy.addColorStop(0, 'rgba(200,235,255,0)'); gy.addColorStop(0.5, 'rgba(235,250,255,' + alpha + ')'); gy.addColorStop(1, 'rgba(200,235,255,0)');
      c.fillStyle = gy; c.fillRect(x - 0.4, y - size * 0.6, 0.8, size * 1.2);
      c.shadowColor = 'rgba(200,240,255,1)'; c.shadowBlur = 6; c.fillStyle = 'rgba(255,255,255,' + alpha + ')';
      c.beginPath(); c.arc(x, y, 0.9, 0, 2 * Math.PI); c.fill(); c.restore();
    }
    // Orbit rings: hairlines, with a soft light sweeping around each one.
    function ring(o, front, t) {
      var n = 90, base = front ? 0.22 : 0.08, sw = t * o.sweep;
      c.lineWidth = front ? 0.8 : 0.6;
      for (var i = 0; i < n; i++) {
        var a0 = (front ? 0 : Math.PI) + Math.PI * i / n, a1 = a0 + Math.PI / n;
        var lit = Math.pow(Math.max(0, Math.cos(a0 - sw)), 10) * (front ? 0.7 : 0.25);
        var p0 = onOrbit(o, a0), p1 = onOrbit(o, a1);
        c.strokeStyle = 'rgba(' + o.color + ',' + (base + lit) + ')';
        c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
      }
    }
    function rider(o, rd, t, front) {
      var a = rd.at + t * o.speed, p = onOrbit(o, a);
      if ((p.depth > 0) !== front) return;
      var dim = front ? 1 : 0.4, dir = Math.sign(o.speed);
      if (rd.comet) { // a bright point with a long, thin, fading tail along the orbit
        var prev = p;
        for (var i = 1; i <= 26; i++) {
          var q = onOrbit(o, a - i * 0.022 * dir);
          c.strokeStyle = 'rgba(' + rd.comet + ',' + (dim * 0.7 * (1 - i / 27)) + ')'; c.lineWidth = 1.3 * (1 - i / 30);
          c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(q.x, q.y); c.stroke(); prev = q;
        }
        c.save(); c.shadowColor = 'rgba(' + rd.comet + ',1)'; c.shadowBlur = 9; c.fillStyle = 'rgba(255,255,255,' + dim + ')';
        c.beginPath(); c.arc(p.x, p.y, 1.4, 0, 2 * Math.PI); c.fill(); c.restore();
      } else { // a satellite: a steady white light with a colored glow and a tiny flare
        c.save(); c.globalAlpha = dim; c.shadowColor = rd.sat; c.shadowBlur = 10; c.fillStyle = '#FFFFFF';
        c.beginPath(); c.arc(p.x, p.y, front ? 1.8 : 1.3, 0, 2 * Math.PI); c.fill(); c.restore();
        if (front) glint(p.x, p.y, 6, 0.55);
      }
    }
    function behind(t) {
      return function () {
        STARS.forEach(function (st) {
          var a = st.tw ? 0.35 + 0.6 * Math.abs(Math.sin(t * 0.9 + st.ph)) : 0.55;
          c.fillStyle = (st.warm ? 'rgba(255,225,190,' : 'rgba(230,240,255,') + a + ')';
          c.beginPath(); c.arc(st.x, st.y, st.r, 0, 2 * Math.PI); c.fill();
        });
        GLINTS.forEach(function (g) { glint(g.x, g.y, 7, 0.25 + 0.5 * Math.abs(Math.sin(t * 0.7 + g.ph))); });
        var pulse = (t % 3.2) / 3.2; // a slow, thin ripple from the globe
        c.strokeStyle = 'rgba(140,220,255,' + (0.35 * (1 - pulse)) + ')'; c.lineWidth = 0.8;
        c.beginPath(); c.arc(ctr[0], ctr[1], R * (1.03 + pulse * 0.35), 0, 2 * Math.PI); c.stroke();
        ORBITS.forEach(function (o) { ring(o, false, t); o.riders.forEach(function (rd) { rider(o, rd, t, false); }); });
      };
    }
    function inFront(t) {
      ORBITS.forEach(function (o) { ring(o, true, t); o.riders.forEach(function (rd) { rider(o, rd, t, true); }); });
    }
    if (calm) { proj.rotate([-20, -18, 0]); drawGlobe(c, proj, w, h, { t: 0, behind: behind(0) }); inFront(0); return; } // reduced motion: one still picture
    (function frame() {
      if (!cv.isConnected) return; // the welcome screen closed: stop
      var t = (performance.now() - t0) / 1000;
      proj.rotate([t * 16 - 20, -18 + 5 * Math.sin(t * 0.35), 0]); // a slower, more stately spin
      drawGlobe(c, proj, w, h, { t: t, extras: extras, behind: behind(t) });
      inFront(t);
      requestAnimationFrame(frame);
    })();
  }

  // ---------- home screen: the fly-in (about 2.9 seconds) ----------
  // 0.0–1.0s: start zoomed way in on one spot, whoosh out while spinning fast.
  // ~1.0s: one flash, a shockwave, and WORLD SCROLL slams onto the screen. 1.0–1.6s: the globe spins, pins pop.
  // 1.6–2.0s: everything blasts away and the home screen bounces in. A tap skips it.
  function flyIn(host, done) {
    if (calm) { if (done) done(); return; }
    var ov = document.createElement('div'); ov.className = 'fx-flyin'; ov.setAttribute('aria-hidden', 'true');
    // Each letter is its own span so they can land one after another (see .fx-wm in app.html).
    var letters = function (word, from) {
      return word.split('').map(function (ch, i) { return '<i style="--i:' + (from + i) + '">' + ch + '</i>'; }).join('');
    };
    ov.innerHTML = '<canvas></canvas><div class="fx-flash"></div><div class="fx-ring"></div><div class="fx-ring r2"></div>' +
      '<div class="fx-logo"><div class="fx-wm"><span class="w">' + letters('World', 0) + '</span><span class="s">' + letters('Scroll', 5) + '</span></div>' +
      '<div class="fx-tag">LEARN GEOGRAPHY BY SCROLLING</div></div>';
    host.appendChild(ov);
    var cv = ov.querySelector('canvas'), w = host.clientWidth, h = host.clientHeight, c = sizeCanvas(cv, w, h);
    var R = Math.min(w, h) * 0.36, start = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    // The wordmark sits just under the globe on every phone (on short screens a fixed spot would overlap it).
    ov.querySelector('.fx-logo').style.top = Math.min(h - 118, h * 0.42 + R + 26) + 'px';
    var proj = d3.geoOrthographic().clipAngle(90).translate([w / 2, h * 0.42]);
    var t0 = performance.now(), finished = false, slammed = false;
    var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
    try { Sound.play('intro'); } catch (e) { }
    function finish() {
      if (finished) return; finished = true;
      ov.classList.add('out');
      setTimeout(function () { ov.remove(); }, 430);
      if (done) done();
    }
    ov.addEventListener('pointerdown', finish);
    (function frame(now) {
      if (finished || !ov.isConnected) return;
      var t = (now - t0) / 1000, z = easeOut(Math.min(1, t / 1.0));
      proj.scale(R * Math.pow(40, 1 - z)); // 40x zoomed in → whole globe
      proj.rotate([-start[0] + z * 540 + Math.max(0, t - 1) * 90, -start[1] * (1 - z) - 15 * z, 0]);
      drawGlobe(c, proj, w, h, { t: t, extras: t > 1 ? function (c) {
        SPOTS.forEach(function (s, i) {
          if (!visible(proj, s)) return;
          var p = proj(s), k = Math.min(1, Math.max(0, (t - 1 - i * 0.03) * 6));
          var rr = 5 * k * (1 + 0.5 * Math.sin(k * Math.PI));
          c.fillStyle = COLORS[i % 3]; c.beginPath(); c.arc(p[0], p[1], rr, 0, 2 * Math.PI); c.fill();
          c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(p[0], p[1], rr * 0.38, 0, 2 * Math.PI); c.fill(); // crisp white center
        });
      } : null });
      if (t > 0.85 && !slammed) { slammed = true; ov.classList.add('slam'); }
      if (t >= 2.9) return finish(); // long enough to land the letters, catch the shine and read the tagline
      requestAnimationFrame(frame);
    })(t0);
  }

  // ---------- tap bursts ----------
  var layer = null;
  function fxLayer() {
    if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.className = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); }
    return layer;
  }
  function burst(x, y, big) {
    if (calm) return;
    var L = fxLayer(), n = big ? 22 : 12;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = (big ? 90 : 55) + Math.random() * (big ? 90 : 50);
      var isEmoji = i % 4 === 0;
      p.className = isEmoji ? 'fx-bit emoji' : 'fx-bit';
      if (isEmoji) p.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
      else p.style.background = COLORS[i % COLORS.length];
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 30 + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      L.appendChild(p);
      setTimeout(function (el) { el.remove(); }, 800, p);
    }
    var ring = document.createElement('b'); ring.className = 'fx-tapring'; ring.style.left = x + 'px'; ring.style.top = y + 'px';
    L.appendChild(ring); setTimeout(function () { ring.remove(); }, 600);
  }

  // ---------- slam pop-ups ----------
  function slam(host, emoji, text) {
    if (calm || !host) return;
    var el = document.createElement('div'); el.className = 'fx-slam'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="fx-slam-emoji">' + emoji + '</span><span class="fx-slam-text">' + text + '</span>';
    host.appendChild(el);
    try { Sound.play('slam'); } catch (e) { }
    var r = host.getBoundingClientRect();
    setTimeout(function () { burst(r.left + r.width / 2, r.top + r.height * 0.42, true); }, 120);
    setTimeout(function () { el.remove(); }, 1100);
  }

  // ---------- result reactions: how close was the guess? ----------
  // screen: the game screen; vibe: bullseye / scorching / hot / warm / chilly / cold (scoring.js vibeFor);
  // at: where the answer is, in px from the screen's top-left; word: the big slam text (e.g. "GOOOAL!" for sports).
  var VIBE_FX = {
    bullseye: { emoji: '🎯', word: 'BULLSEYE!', sound: null },
    scorching: { emoji: '🔥', word: 'SCORCHING!', sound: 'fire', flames: 18, reach: 1 },
    hot: { emoji: '🔥', word: 'HOT!', sound: 'fire', flames: 10, reach: .55 },
    warm: { emoji: '☀️', word: 'WARM!', sound: null },
    chilly: { emoji: '❄️', word: 'CHILLY!', sound: 'freeze', snow: 9 },
    cold: { emoji: '🥶', word: 'BRRR!', sound: 'freeze', snow: 18, frost: true }
  };
  function reveal(screen, vibe, at, word) {
    var v = VIBE_FX[vibe];
    if (calm || !screen || !v) return;
    var el = document.createElement('div'); el.className = 'fx-reveal v-' + vibe; el.setAttribute('aria-hidden', 'true');
    var html = '';
    if (vibe === 'bullseye') {
      html += '<div class="fx-rays" style="left:' + at.x + 'px;top:' + at.y + 'px"></div>';
      for (var i = 0; i < 16; i++) { // a rain of stars and targets
        html += '<span class="fx-rain" style="left:' + (Math.random() * 96) + '%;animation-delay:' + (Math.random() * .6).toFixed(2) + 's;font-size:' +
          (18 + Math.random() * 16).toFixed(0) + 'px">' + ['⭐', '🎯', '🎉', '✨', '🏆'][i % 5] + '</span>';
      }
      screen.classList.remove('fx-quake'); void screen.offsetWidth; screen.classList.add('fx-quake');
      setTimeout(function () { screen.classList.remove('fx-quake'); }, 700);
      var r = screen.getBoundingClientRect();
      [0, 220, 440].forEach(function (d, k) { // three fireworks around the answer
        setTimeout(function () { burst(r.left + at.x + (k - 1) * 70, r.top + at.y - 30 + (k % 2) * 50, true); }, d);
      });
    }
    if (v.flames) { // a wall of fire burning up the screen
      html += '<div class="fx-heat"></div>';
      for (var j = 0; j < v.flames; j++) {
        html += '<span class="fx-flame" style="left:' + ((j + Math.random() * .6) / v.flames * 100).toFixed(1) + '%;--reach:' + v.reach +
          ';animation-delay:' + (Math.random() * .35).toFixed(2) + 's;font-size:' + (30 + Math.random() * 26).toFixed(0) + 'px">🔥</span>';
      }
    }
    if (v.snow) { // snowflakes drifting down
      for (var s = 0; s < v.snow; s++) {
        html += '<span class="fx-snow" style="left:' + (Math.random() * 96) + '%;animation-delay:' + (Math.random() * .7).toFixed(2) + 's;font-size:' +
          (14 + Math.random() * 16).toFixed(0) + 'px;--sway:' + (Math.random() * 60 - 30).toFixed(0) + 'px">' + (s % 5 === 0 && v.frost ? '🥶' : '❄️') + '</span>';
      }
      if (v.frost) html += '<div class="fx-frost"></div>';
    }
    if (vibe === 'warm') html += '<span class="fx-sun" style="left:' + at.x + 'px;top:' + at.y + 'px">☀️</span>';
    html += '<div class="fx-word" style="top:' + Math.max(70, at.y - 40) + 'px"><span>' + v.emoji + '</span><b>' + (word || v.word) + '</b><span>' + v.emoji + '</span></div>';
    el.innerHTML = html;
    screen.appendChild(el);
    if (v.sound) { try { Sound.play(v.sound); } catch (e) { } }
    if (vibe === 'cold' || vibe === 'chilly') { screen.classList.remove('fx-shiver'); void screen.offsetWidth; screen.classList.add('fx-shiver'); setTimeout(function () { screen.classList.remove('fx-shiver'); }, 650); }
    setTimeout(function () { el.remove(); }, 2300);
  }
  // A small sparkle where a pin lands on the map.
  function pinBurst(x, y) {
    if (calm) return;
    var L = fxLayer();
    for (var i = 0; i < 8; i++) {
      var p = document.createElement('i'), a = i / 8 * Math.PI * 2, d = 22 + Math.random() * 14;
      p.className = 'fx-bit small'; p.style.background = i % 2 ? '#FFB547' : '#FFFFFF';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px'); p.style.setProperty('--rot', '0deg');
      L.appendChild(p); setTimeout(function (el) { el.remove(); }, 800, p);
    }
  }

  // ---------- Deep Dives: a rare bonus card ----------
  // Landing on one: a gold RARE FIND! banner with sparkles. After the guess: DEEP DIVE UNLOCKED!
  function banner(screen, cls, emoji, title, sub, sound) {
    if (!screen) return;
    var el = document.createElement('div'); el.className = 'fx-banner ' + cls; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="fx-banner-emoji" aria-hidden="true">' + emoji + '</span><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
    screen.appendChild(el);
    try { Sound.play(sound); } catch (e) { }
    if (!calm) {
      var r = el.getBoundingClientRect();
      setTimeout(function () { burst(r.left + r.width / 2, r.top + r.height / 2, true); }, 150);
    }
    setTimeout(function () { el.remove(); }, calm ? 2200 : 2600);
  }
  function rareFind(screen) { banner(screen, 'rare', '💎', 'RARE FIND!', 'This spot hides a secret Deep Dive. Drop your pin to unlock it!', 'sparkle'); }
  function unlocked(screen) { banner(screen, 'unlocked', '🔓', 'DEEP DIVE UNLOCKED!', 'Tap the gold 💎 Deep Dive button for bonus facts.', 'hit'); }

  // ---------- every button: boing + burst ----------
  var SELECTOR = 'button, .tile, .pill, .tab';
  function wireTaps() {
    document.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest(SELECTOR);
      if (!b || b.disabled || b.closest('.map') || calm) return;
      b.classList.remove('fx-boing'); void b.offsetWidth; b.classList.add('fx-boing');
      setTimeout(function () { b.classList.remove('fx-boing'); }, 500);
      burst(e.clientX, e.clientY, b.classList.contains('big') || b.classList.contains('sports-hero'));
      try { Sound.play('boing'); } catch (err) { }
    }, true);
  }

  root.FX = { welcomeGlobe: welcomeGlobe, flyIn: flyIn, burst: burst, slam: slam, wireTaps: wireTaps, calm: calm,
    reveal: reveal, pinBurst: pinBurst, rareFind: rareFind, unlocked: unlocked };
})(this);
