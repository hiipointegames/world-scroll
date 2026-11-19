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

  // Places the welcome globe shows off (lon, lat): gold pins pop here and planes fly between them.
  var SPOTS = [[-74, 40.7], [-0.1, 51.5], [2.35, 48.86], [139.7, 35.7], [151.2, -33.9], [-43.2, -22.9], [31.2, 30.0],
    [77.2, 28.6], [18.4, -33.9], [-99.1, 19.4], [37.6, 55.8], [103.8, 1.35], [-122.4, 37.8], [28.98, 41.0]];
  var COLORS = ['#FFB547', '#3DDCC4', '#FF6FA8', '#A9C6FF', '#9BE7A8', '#FFFFFF'];
  var EMOJI = ['🌍', '🗺️', '📍', '⭐', '✈️', '🧭', '🏔️', '🌊', '🏆', '🎉'];

  function sizeCanvas(cv, w, h) {
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  }
  var graticule = d3.geoGraticule10();

  // Draws one frame of a globe: glow halo, ocean, grid lines, land, then the extras on top.
  function drawGlobe(c, proj, w, h, opts) {
    var path = d3.geoPath(proj, c), r = proj.scale(), ctr = proj.translate();
    c.clearRect(0, 0, w, h);
    // the glow fades to nothing before the canvas edge, so it never ends in a hard line
    var glowR = Math.max(r + 4, Math.min(r * 1.35, Math.min(ctr[1], h - ctr[1], ctr[0], w - ctr[0])));
    var halo = c.createRadialGradient(ctr[0], ctr[1], r * 0.85, ctr[0], ctr[1], glowR);
    halo.addColorStop(0, 'rgba(61,220,196,' + (0.35 + 0.2 * Math.sin(opts.t * 3)) + ')');
    halo.addColorStop(1, 'rgba(61,220,196,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(ctr[0], ctr[1], glowR, 0, 2 * Math.PI); c.fill();
    var sea = c.createRadialGradient(ctr[0] - r * 0.35, ctr[1] - r * 0.35, r * 0.1, ctr[0], ctr[1], r);
    sea.addColorStop(0, '#1F3A86'); sea.addColorStop(1, '#0F1A40');
    c.fillStyle = sea; c.beginPath(); path({ type: 'Sphere' }); c.fill();
    c.strokeStyle = 'rgba(61,220,196,.18)'; c.lineWidth = 0.7; c.beginPath(); path(graticule); c.stroke();
    c.fillStyle = '#2E6F8E'; c.beginPath(); path(getLand()); c.fill();
    c.strokeStyle = 'rgba(61,220,196,.55)'; c.lineWidth = 0.8; c.stroke();
    if (opts.extras) opts.extras(c, path);
    // a bright rim so it reads as a ball
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.beginPath(); path({ type: 'Sphere' }); c.stroke();
  }
  var visible = function (proj, p) { var r = proj.rotate(); return d3.geoDistance(p, [-r[0], -r[1]]) < Math.PI / 2 - 0.05; };

  // ---------- welcome screen: spinning globe with pins, flight arcs and an orbiting plane ----------
  function welcomeGlobe(host) {
    var cv = document.createElement('canvas'); cv.className = 'fx-globe'; host.appendChild(cv);
    var w = host.clientWidth || 340, h = host.clientHeight || 200, c = sizeCanvas(cv, w, h);
    var proj = d3.geoOrthographic().clipAngle(90).translate([w / 2, h / 2]).scale(Math.min(w, h) / 2 - 14);
    var flights = [[0, 3], [1, 7], [4, 5], [2, 6], [8, 9], [10, 11], [12, 13], [3, 4]];
    var t0 = performance.now();
    function extras(c, path) {
      var t = (performance.now() - t0) / 1000;
      // flight arcs: a glowing line that draws itself, then fades, one after another
      flights.forEach(function (f, i) {
        var k = ((t * 0.45 + i * 0.37) % 1.6);
        if (k > 1.2) return;
        var a = SPOTS[f[0]], b = SPOTS[f[1]], ip = d3.geoInterpolate(a, b), n = 24, pts = [];
        for (var j = 0; j <= n * Math.min(1, k); j++) pts.push(ip(j / n));
        if (pts.length < 2) return;
        c.strokeStyle = i % 2 ? 'rgba(255,111,168,.9)' : 'rgba(255,181,71,.95)'; c.lineWidth = 2; c.setLineDash([5, 4]);
        c.lineDashOffset = -t * 30; c.beginPath(); path({ type: 'LineString', coordinates: pts }); c.stroke(); c.setLineDash([]);
      });
      // pins: pop in, bounce, send out a ring
      SPOTS.forEach(function (s, i) {
        if (!visible(proj, s)) return;
        var p = proj(s), ph = (t * 0.8 + i * 0.29) % 1, pop = Math.min(1, ph * 6), bounce = 1 + 0.4 * Math.sin(Math.min(1, ph * 6) * Math.PI);
        c.strokeStyle = 'rgba(255,181,71,' + (1 - ph) + ')'; c.lineWidth = 2;
        c.beginPath(); c.arc(p[0], p[1], 4 + ph * 22, 0, 2 * Math.PI); c.stroke();
        c.fillStyle = COLORS[i % 3]; c.beginPath(); c.arc(p[0], p[1], 4.5 * pop * bounce, 0, 2 * Math.PI); c.fill();
        c.fillStyle = '#0B1026'; c.beginPath(); c.arc(p[0], p[1], 1.6 * pop, 0, 2 * Math.PI); c.fill();
      });
    }
    if (calm) { proj.rotate([-20, -18, 0]); drawGlobe(c, proj, w, h, { t: 0 }); return; } // reduced motion: one still globe
    (function frame() {
      if (!cv.isConnected) return; // the welcome screen closed: stop
      var t = (performance.now() - t0) / 1000;
      proj.rotate([t * 28 - 20, -18 + 8 * Math.sin(t * 0.6), 0]);
      drawGlobe(c, proj, w, h, { t: t, extras: extras });
      // a plane circling the globe, with a sparkly trail
      var a = t * 1.3, r = proj.scale() + 16, ctr = proj.translate();
      var px = ctr[0] + Math.cos(a) * r * 1.05, py = ctr[1] + Math.sin(a) * r * 0.55;
      for (var i = 1; i < 10; i++) {
        var ta = a - i * 0.07;
        c.fillStyle = 'rgba(255,255,255,' + (0.5 - i * 0.05) + ')';
        c.beginPath(); c.arc(ctr[0] + Math.cos(ta) * r * 1.05, ctr[1] + Math.sin(ta) * r * 0.55, 2.2 - i * 0.18, 0, 2 * Math.PI); c.fill();
      }
      c.save(); c.translate(px, py); c.rotate(Math.atan2(Math.cos(a) * r * 0.55, -Math.sin(a) * r * 1.05) + Math.PI / 4);
      c.font = '18px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✈️', 0, 0); c.restore();
      requestAnimationFrame(frame);
    })();
  }

  // Emoji that float up the welcome screen behind the text.
  function floaters(host, n) {
    if (calm) return;
    var layer = document.createElement('div'); layer.className = 'fx-floaters'; layer.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.textContent = EMOJI[i % EMOJI.length];
      s.style.left = (5 + Math.random() * 90) + '%';
      s.style.fontSize = (16 + Math.random() * 18) + 'px';
      s.style.animationDuration = (6 + Math.random() * 6) + 's';
      s.style.animationDelay = (-Math.random() * 10) + 's';
      layer.appendChild(s);
    }
    host.insertBefore(layer, host.firstChild);
  }

  // ---------- home screen: the 2-second fly-in ----------
  // 0.0–1.0s: start zoomed way in on one spot, whoosh out while spinning fast.
  // ~1.0s: one flash, a shockwave, and WORLD SCROLL slams onto the screen. 1.0–1.6s: the globe spins, pins pop.
  // 1.6–2.0s: everything blasts away and the home screen bounces in. A tap skips it.
  function flyIn(host, done) {
    if (calm) { if (done) done(); return; }
    var ov = document.createElement('div'); ov.className = 'fx-flyin'; ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<canvas></canvas><div class="fx-flash"></div><div class="fx-ring"></div><div class="fx-ring r2"></div>' +
      '<div class="fx-logo"><span>WORLD</span><span>SCROLL</span></div>';
    host.appendChild(ov);
    var cv = ov.querySelector('canvas'), w = host.clientWidth, h = host.clientHeight, c = sizeCanvas(cv, w, h);
    var R = Math.min(w, h) * 0.36, start = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    var proj = d3.geoOrthographic().clipAngle(90).translate([w / 2, h * 0.42]);
    var t0 = performance.now(), finished = false, slammed = false;
    var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
    try { Sound.play('intro'); } catch (e) { }
    function finish() {
      if (finished) return; finished = true;
      ov.classList.add('out');
      setTimeout(function () { ov.remove(); }, 380);
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
          c.fillStyle = COLORS[i % 3]; c.beginPath(); c.arc(p[0], p[1], 5 * k * (1 + 0.5 * Math.sin(k * Math.PI)), 0, 2 * Math.PI); c.fill();
        });
      } : null });
      if (t > 0.95 && !slammed) { slammed = true; ov.classList.add('slam'); }
      if (t >= 2.0) return finish();
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

  root.FX = { welcomeGlobe: welcomeGlobe, floaters: floaters, flyIn: flyIn, burst: burst, slam: slam, wireTaps: wireTaps, calm: calm,
    reveal: reveal, pinBurst: pinBurst };
})(this);
