// World Scroll — sound. Everything is synthesized with the Web Audio API (no audio files, no licensing).
// Sound effects play everywhere. Music: wind on the welcome screen, a light tune on home and the categories, game-day music in Sports.
// Browsers only allow audio after the player taps something, so the first tap unlocks it.
(function (root) {
  var ctx = null, master, sfxBus, reverbIn;
  var enabled = true;

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      // A hall echo (reverb) the music sends into: it's what makes synthesized instruments sound like a real room.
      reverbIn = ctx.createGain();
      if (ctx.createConvolver) {
        var conv = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
        conv.buffer = ir; reverbIn.connect(conv); conv.connect(master);
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, t, dur, opts) {
    opts = opts || {};
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opts.type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    var v = opts.vol == null ? 0.3 : opts.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (opts.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var out = g;
    if (opts.cutoff) {
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.cutoff;
      g.connect(f); out = f;
    }
    o.connect(g); out.connect(opts.bus || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  var noiseBuf = null;
  function noise(t, dur, opts) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = opts.filter || 'highpass'; f.frequency.value = opts.freq || 6000; f.Q.value = opts.q || 0.8;
    if (opts.to) { f.frequency.setValueAtTime(opts.freq || 6000, t); f.frequency.exponentialRampToValueAtTime(opts.to, t + dur); }
    g.gain.setValueAtTime(opts.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(opts.bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------- sound effects ----------
  var N = { C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
  var SFX = {
    tap: function (t) { tone(880, t, 0.09, { type: 'sine', vol: 0.18, to: 660 }); },
    lock: function (t) { tone(330, t, 0.16, { type: 'triangle', vol: 0.22, to: 660 }); noise(t, 0.12, { freq: 3000, vol: 0.06 }); },
    swoosh: function (t) { noise(t, 0.25, { filter: 'bandpass', freq: 1200, q: 0.7, vol: 0.12 }); },
    hit: function (t) { [N.C5, N.E5, N.G5].forEach(function (f, i) { tone(f, t + i * 0.07, 0.22, { vol: 0.2 }); }); },
    bullseye: function (t) {
      [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, t + i * 0.065, 0.3, { vol: 0.22 }); });
      tone(N.G6, t + 0.3, 0.4, { type: 'sine', vol: 0.1 });
    },
    miss: function (t) { tone(N.G4, t, 0.18, { type: 'sine', vol: 0.18 }); tone(N.E4, t + 0.14, 0.28, { type: 'sine', vol: 0.16 }); },
    // --- fun layer ---
    pin: function (t) { var f = 740 + Math.random() * 260; tone(f, t, 0.1, { type: 'sine', vol: 0.2, to: f * 1.5 }); tone(f * 2, t + 0.02, 0.06, { type: 'sine', vol: 0.05 }); },
    fly: function (t) { noise(t, 0.55, { filter: 'bandpass', freq: 500, to: 3200, q: 1.4, vol: 0.13 }); tone(220, t, 0.5, { type: 'sine', vol: 0.05, to: 660 }); },
    tick: function (t, i) { tone(1200 + (i || 0) * 40, t, 0.03, { type: 'square', vol: 0.025, cutoff: 4000 }); },
    scorching: function (t) { [N.D5, N.F5, N.A5, N.D5 * 2].forEach(function (f, i) { tone(f, t + i * 0.06, 0.24, { vol: 0.2 }); }); },
    warm: function (t) { tone(N.E5, t, 0.2, { vol: 0.17 }); tone(N.G5, t + 0.09, 0.26, { vol: 0.15 }); },
    chilly: function (t) { tone(N.A4, t, 0.2, { type: 'sine', vol: 0.16 }); tone(N.F4, t + 0.13, 0.3, { type: 'sine', vol: 0.14 }); },
    cold: function (t) { // a shivery "brrr"
      var o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(392, t); o.frequency.exponentialRampToValueAtTime(196, t + 0.5);
      lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g); g.connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    combo: function (t, n) { // climbs a step higher with every combo
      var base = 523.3 * Math.pow(2, Math.min(n || 2, 14) / 12);
      [1, 1.26, 1.5, 2].forEach(function (k, i) { tone(base * k, t + i * 0.05, 0.2, { type: 'square', vol: 0.06, cutoff: 3600 }); });
      noise(t + 0.18, 0.3, { freq: 7000, vol: 0.05 });
    },
    boom: function (t) { // bullseye impact
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.4);
      noise(t, 0.4, { filter: 'lowpass', freq: 1800, vol: 0.12 });
    },
    square: function (t, hit) { if (hit) tone(N.C6 * (0.9 + Math.random() * 0.2), t, 0.12, { type: 'sine', vol: 0.14 }); else tone(N.E4, t, 0.12, { type: 'triangle', vol: 0.1 }); },
    sparkle: function (t) { [N.E6, N.G6, N.C6 * 2].forEach(function (f, i) { tone(f, t + i * 0.05, 0.18, { type: 'sine', vol: 0.06 }); }); },
    pop: function (t) { tone(600, t, 0.06, { type: 'sine', vol: 0.06, to: 900 }); },
    // Button taps: a springy cartoon "boing" (a little different every time).
    boing: function (t) { var f = 260 + Math.random() * 120; tone(f, t, 0.18, { type: 'sine', vol: 0.16, to: f * 2.6 }); tone(f * 1.5, t + 0.05, 0.12, { type: 'triangle', vol: 0.05, to: f * 3 }); },
    // Pop-up slams ("LET'S GO!"): a punchy thump with a bright chord on top.
    slam: function (t) {
      noise(t, 0.18, { freq: 900, vol: 0.14 });
      tone(110, t, 0.22, { type: 'sine', vol: 0.32, to: 55 });
      [N.C5, N.G5, N.C6].forEach(function (f) { tone(f, t + 0.03, 0.28, { type: 'square', vol: 0.05, cutoff: 3000 }); });
    },
    // Hot guesses: a roaring whoosh of fire with crackles.
    fire: function (t) {
      noise(t, 0.9, { filter: 'bandpass', freq: 400, to: 1800, q: 0.8, vol: 0.14 });
      for (var i = 0; i < 9; i++) noise(t + 0.05 + Math.random() * 0.8, 0.03, { freq: 2500 + Math.random() * 3000, vol: 0.08 });
    },
    // Cold guesses: a glassy, icy shimmer coming down.
    freeze: function (t) { [N.C6 * 2, N.G6, N.E6, N.C6].forEach(function (f, i) { tone(f, t + i * 0.08, 0.3, { type: 'sine', vol: 0.05 }); }); noise(t, 0.5, { freq: 7000, vol: 0.03 }); },
    // The home-screen fly-in: a big swirling gust of wind as the globe spins in, then a boom and a fanfare when the logo lands.
    intro: function (t) {
      wash(t, 1.15, { freq: 220, peak: 1500, peakAt: 0.55, to: 600, q: 1.4, vol: 0.9, fadeIn: 0.5, fadeOut: 0.5 }); // the gust
      wash(t + 0.15, 1.0, { freq: 900, peak: 3200, peakAt: 0.6, to: 1800, q: 4, vol: 0.25, fadeIn: 0.45, fadeOut: 0.4 }); // wind whistling past
      noise(t, 1.0, { filter: 'bandpass', freq: 300, to: 4000, q: 1.2, vol: 0.08 });
      var hit = t + 0.95;
      tone(90, hit, 0.5, { type: 'sine', vol: 0.4, to: 40 });
      noise(hit, 0.6, { freq: 2500, vol: 0.1 });
      [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, hit + 0.05 + i * 0.06, 0.6, { type: 'square', vol: 0.06, cutoff: 3200 }); });
    },
    trophy: function (t, tier) {
      var runs = {
        bronze: [N.G4, N.C5, N.E5, N.G5],
        silver: [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6],
        gold: [N.C5, N.E5, N.G5, N.C6, N.E6, N.C6, N.E6, N.G6]
      }[tier] || [];
      runs.forEach(function (f, i) { tone(f, t + i * 0.1, 0.32, { type: 'square', vol: 0.09, cutoff: 3200 }); tone(f / 2, t + i * 0.1, 0.3, { vol: 0.12 }); });
      var end = t + runs.length * 0.1;
      [N.C5, N.E5, N.G5].forEach(function (f) { tone(f, end, 0.9, { type: 'sawtooth', vol: 0.06, cutoff: 2400, attack: 0.03 }); });
      noise(end, 0.8, { freq: 5000, vol: 0.05 }); // crowd-ish shimmer
    }
  };
  // Before the player's first tap the browser keeps sound locked; skip effects then so they don't all burst out at that tap.
  function locked() { var ua = root.navigator && root.navigator.userActivation; return !!ua && !ua.hasBeenActive; }
  function play(name, arg) {
    if (!enabled || locked() || !ensure()) return;
    try { SFX[name](ctx.currentTime + 0.01, arg); } catch (e) { }
    if (name === 'trophy') duck(1.6);
  }

  // ---------- music: three tracks that crossfade (all original, all synthesized) ----------
  //   wind   — the welcome screen: soft gusts of wind while the globe spins
  //   home   — home screen and every non-sports feed: "Expedition", a calm documentary-style theme (pads, plucks, hand drums, flute)
  //   sports — Sports: "Prime Time", an original stadium-rock anthem (distorted guitars, rock drums, a brass fanfare, crowd-roar builds)
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  // A long, held noise (crowd, wind): fades in, holds, fades out, through a filter that can sweep.
  function wash(t, dur, opts) {
    noise(t, 0.001, { vol: 0.0001, bus: opts.bus }); // makes sure the noise buffer exists
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = opts.filter || 'bandpass'; f.Q.value = opts.q || 0.5;
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.peak) f.frequency.exponentialRampToValueAtTime(opts.peak, t + dur * (opts.peakAt || 0.5));
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    var fadeIn = opts.fadeIn || dur * 0.4, fadeOut = opts.fadeOut || dur * 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.vol, t + fadeIn);
    g.gain.setValueAtTime(opts.vol, t + dur - fadeOut);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(opts.bus || sfxBus);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }
  function kick(t, vol, bus) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
  }
  // Sends a sound left or right (a little stereo width makes it sound like a real recording).
  function out(node, pan, bus) {
    if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(bus); }
    else node.connect(bus);
  }
  // A held note with a soft start and end (organ pipes, pads).
  function held(freq, t, dur, vol, type, dest, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain(), a = attack || 0.01;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.1);
    return o;
  }
  // A warm string-like pad: two slightly detuned voices per note, softened, slowly breathing open.
  function pad(notes, t, dur, vol, bus) {
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1300, t + dur * 0.5); f.frequency.linearRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.7);
    g.gain.setValueAtTime(vol, t + dur - 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
    f.connect(g); g.connect(bus);
    notes.forEach(function (n, k) {
      [0.996, 1.004].forEach(function (d, j) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(midi(n) * d, t);
        out(o, (k % 2 ? 0.3 : -0.3) * (j ? 1 : -1), f); o.start(t); o.stop(t + dur + 0.4);
      });
    });
  }
  // A soft plucked string (like a muted guitar or a kora): bright at the start, quickly mellowing.
  function pluck(n, t, vol, pan, bus) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(midi(n), t);
    f.type = 'lowpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(380, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f); f.connect(g); out(g, pan, bus); o.start(t); o.stop(t + 0.55);
  }
  // A breathy wooden flute: a pure tone, a touch of breath, and vibrato that blooms as the note holds.
  function flute(n, t, dur, vol, bus) {
    var fr = midi(n), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.09);
    g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.1, dur - 0.12)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(fr, t);
    o2.type = 'triangle'; o2.frequency.setValueAtTime(fr * 2, t); g2.gain.value = 0.12;
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(fr * 0.007, t + Math.min(0.5, dur));
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    o.connect(g); o2.connect(g2); g2.connect(g); out(g, 0.1, bus);
    [o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + dur + 0.2); });
    noise(t, Math.min(dur, 0.35), { filter: 'bandpass', freq: fr * 2, q: 6, vol: vol * 0.5, bus: bus }); // breath
  }
  // Hand drums: a deep frame drum and a bright slap.
  function frameDrum(t, vol, bus) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(68, t + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); out(g, -0.1, bus); o.start(t); o.stop(t + 0.45);
    noise(t, 0.05, { filter: 'lowpass', freq: 700, vol: vol * 0.3, bus: bus });
  }
  function slap(t, vol, bus) {
    noise(t, 0.07, { filter: 'bandpass', freq: 1100, q: 1.6, vol: vol, bus: bus });
    tone(330, t, 0.06, { type: 'sine', vol: vol * 0.4, to: 230, bus: bus });
  }
  // ---- Rock instruments for the Sports anthem ----
  // Distorted guitar: one amp per side (left and right), like a double-tracked rock record.
  function amp(bus, pan) {
    var key = '_amp' + pan;
    if (bus[key]) return bus[key];
    var inp = ctx.createGain(), sh = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    var k = 60, n = 1024, curve = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    sh.curve = curve; sh.oversample = '2x';
    hp.type = 'highpass'; hp.frequency.value = 90;
    lp.type = 'lowpass'; lp.frequency.value = 3400; lp.Q.value = 0.9; // the speaker cabinet
    g.gain.value = 0.11;
    inp.connect(sh); sh.connect(hp); hp.connect(lp); lp.connect(g); out(g, pan, bus);
    return (bus[key] = inp);
  }
  // A power chord (root, fifth, octave). Muted = short, dark chug; open = rings out bright.
  function powerChord(root, t, dur, muted, bus) {
    [-0.65, 0.65].forEach(function (pan, side) {
      var dest = amp(bus, pan), g = ctx.createGain(), f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(muted ? 700 : 2600, t);
      var len = muted ? 0.11 : dur;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
      g.gain.setValueAtTime(0.9, t + Math.max(0.005, len - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.03);
      f.connect(g); g.connect(dest);
      [0, 7, 12].forEach(function (iv) {
        var o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(midi(root + iv) * (side ? 1.003 : 0.997), t);
        o.connect(f); o.start(t); o.stop(t + len + 0.06);
      });
    });
  }
  // Brass section: bright, punchy horns for the TV-sports fanfare.
  function brass(n, t, dur, vol, bus) {
    var f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(3800, t + 0.05); f.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.035);
    g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.05, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    f.connect(g); out(g, 0.15, bus);
    [[1, 0.993], [1, 1.007], [0.5, 1]].forEach(function (v) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(midi(n) * v[0] * v[1], t);
      o.connect(f); o.start(t); o.stop(t + dur + 0.12);
    });
  }
  // Rock drums.
  function rockKick(t, vol, bus) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.35);
    noise(t, 0.012, { freq: 3000, vol: vol * 0.25, bus: bus }); // the beater click
  }
  function snare(t, vol, bus) {
    noise(t, 0.2, { filter: 'bandpass', freq: 1900, q: 0.7, vol: vol, bus: bus });
    noise(t, 0.12, { freq: 5000, vol: vol * 0.4, bus: bus });
    tone(200, t, 0.09, { type: 'triangle', vol: vol * 0.6, to: 160, bus: bus });
  }
  function crash(t, vol, bus) { noise(t, 1.8, { freq: 4200, vol: vol, bus: bus }); noise(t, 0.6, { filter: 'bandpass', freq: 7000, q: 0.5, vol: vol * 0.6, bus: bus }); }
  function tom(t, f, vol, bus) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g); out(g, (f - 130) / 120, bus); o.start(t); o.stop(t + 0.4);
  }

  // Home: "Expedition" in D minor (Dm7 – Bbmaj7 – F – Cmaj7), like a nature documentary.
  // A 16-bar cycle: (1) pads and plucks settle in, (2) drums and the flute theme, (3) a second theme, (4) the theme rests.
  var HOME_CH = [[62, 65, 69, 72], [58, 62, 65, 69], [60, 65, 69, 72], [60, 64, 67, 71]];
  var HOME_BASS = [50, 46, 53, 48];
  var HOME_ARP = [0, 2, 1, 3, 2, 1, 3, 2];
  var MEL_A = [[0, 74, 6], [6, 72, 2], [8, 69, 8], [16, 65, 4], [20, 67, 4], [24, 69, 8], [32, 72, 6], [38, 69, 2], [40, 72, 4], [44, 74, 4], [48, 76, 12], [60, 74, 4]];
  var MEL_B = [[0, 77, 4], [4, 76, 4], [8, 74, 8], [16, 72, 4], [20, 74, 4], [24, 70, 8], [32, 69, 6], [38, 72, 2], [40, 77, 8], [48, 76, 8], [56, 74, 8]];
  // Sports: "Prime Time", an original stadium-rock anthem in E (132 BPM).
  // 16-bar cycle: (1) the guitar riff, (2) the brass fanfare chorus, (3) the riff with horn hits, (4) a tom-drum build with the crowd roaring.
  // Riff: one entry per 8th note: a power-chord root, negative = palm-muted chug, 0 = rest.
  var RIFF = [
    [-40, -40, -40, 43, -40, -40, 45, 43],
    [-40, -40, -40, 43, -40, -40, 38, 0],
    [-36, -36, -36, 38, -36, -36, 40, 0],
    [-38, -38, -38, -38, 38, 38, 35, 35]
  ];
  var CHORUS = [40, 36, 43, 38]; // E5 – C5 – G5 – D5, ringing out
  // Fanfare: [16th step within the 4 bars, note, length in 16ths]
  var FANFARE = [[0, 71, 2], [2, 76, 2], [4, 78, 2], [6, 79, 10], [16, 79, 2], [18, 78, 2], [20, 76, 4], [24, 72, 8],
    [32, 74, 2], [34, 79, 2], [36, 81, 2], [38, 83, 10], [48, 81, 4], [52, 78, 4], [56, 74, 8]];
  var TRACKS = {
    wind: { bpm: 60, vol: 0.9, wet: 0.2, step: function (s, t, bus) {
      if (s % 8 === 0) wash(t, 7, { freq: 280, peak: 650 + Math.random() * 500, to: 260, q: 0.9, vol: 0.12, bus: bus }); // the steady breeze
      if (s % 16 === 6 && Math.random() < 0.8) wash(t, 2.4 + Math.random() * 1.6, { freq: 400, peak: 1300 + Math.random() * 900, to: 350, q: 1.6, vol: 0.09, peakAt: 0.4, bus: bus }); // a gust
      if (s % 32 === 20) tone(midi(84 + [0, 3, 7][Math.floor(Math.random() * 3)]), t, 3, { type: 'sine', vol: 0.012, attack: 1.2, bus: bus }); // a faint whistle on the wind
    } },
    home: { bpm: 90, vol: 0.36, wet: 0.4, step: function (s, t, bus) {
      var bar = Math.floor(s / 16), i = s % 16, b4 = bar % 4, ch = HOME_CH[b4], phrase = Math.floor(bar / 4) % 4;
      var sl = 60 / 90 / 4, drums = phrase !== 0;
      if (i === 0) pad(ch, t, sl * 16 + 0.2, 0.016, bus);
      if (i === 0 || i === 10) tone(midi(HOME_BASS[b4]), t, sl * (i === 0 ? 9 : 6), { type: 'triangle', vol: 0.2, attack: 0.02, bus: bus }); // bass
      if (i % 2 === 0) pluck(ch[HOME_ARP[i / 2]] + 12, t, i === 0 ? 0.05 : 0.035, i % 4 === 0 ? -0.35 : 0.35, bus); // the pulse, left-right
      if (drums) {
        if (i === 0 || i === 6 || i === 10) frameDrum(t, i === 0 ? 0.45 : 0.3, bus);
        if (i === 4 || i === 12) slap(t, 0.14, bus);
        if (i === 15) slap(t, 0.05, bus);
      }
      noise(t, 0.045, { freq: 6500, vol: (i % 4 === 2 ? 0.035 : 0.015) * (drums ? 1 : 0.6), bus: bus }); // shaker
      var mel = phrase === 1 ? MEL_A : phrase === 2 ? MEL_B : null, ps = s % 64;
      if (mel) mel.forEach(function (e) { if (e[0] === ps) flute(e[1], t, e[2] * sl, 0.06, bus); });
      if (phrase === 3 && i === 0) tone(midi(ch[3] + 24), t, 2.4, { type: 'sine', vol: 0.02, attack: 0.01, bus: bus }); // a distant bell
    } },
    sports: { bpm: 132, vol: 0.25, wet: 0.16, step: function (s, t, bus) {
      var sl = 60 / 132 / 4, bar = Math.floor(s / 16), i = s % 16, b4 = bar % 4, phrase = Math.floor(bar / 4) % 4, ps = s % 64;
      var chorus = phrase === 1, build = phrase === 3, fill = build && b4 === 3;
      // Drums: kick on 1 and 3 (with a push), snare on 2 and 4, eighth-note hats, a crash at the top of each section.
      if (ps === 0) crash(t, 0.16, bus);
      if (!fill) {
        if (i === 0 || i === 8 || i === 10 || (chorus && i === 3)) rockKick(t, 0.95, bus);
        if (i === 4 || i === 12) snare(t, 0.42, bus);
        if (i % 2 === 0) noise(t, chorus ? 0.12 : 0.04, { freq: chorus ? 6000 : 8500, vol: chorus ? 0.035 : 0.06, bus: bus }); // hats (washy ride in the chorus)
      } else { // the fill: snare, then toms tumbling down into the crash
        if (i < 8) snare(t, 0.2 + i * 0.03, bus);
        else tom(t, [260, 260, 200, 200, 160, 160, 120, 120][i - 8], 0.6, bus);
      }
      // Guitars and bass
      if (chorus) {
        if (i === 0) powerChord(CHORUS[b4], t, sl * 15, false, bus);
        if (i % 2 === 0) tone(midi(CHORUS[b4]), t, sl * 1.8, { type: 'sawtooth', vol: 0.13, cutoff: 700, bus: bus });
      } else if (i % 2 === 0) {
        var r = RIFF[b4][i / 2];
        if (build && b4 === 2) r = -40; // the build: straight chugs on E…
        if (fill) r = -[40, 40, 43, 43, 45, 45, 47, 47][i / 2]; // …then climbing E, G, A, B into the crash
        if (r) {
          powerChord(Math.abs(r), t, sl * 2, r < 0, bus);
          tone(midi(Math.abs(r)), t, sl * 1.8, { type: 'sawtooth', vol: 0.13, cutoff: 700, bus: bus }); // bass locks with the guitar
        }
      }
      // Brass: the fanfare over the chorus, and horn hits on the riff's accents in the third section.
      if (chorus) FANFARE.forEach(function (e) { if (e[0] === ps) brass(e[1], t, e[2] * sl, 0.05, bus); });
      if (phrase === 2 && i % 2 === 0 && RIFF[b4][i / 2] > 0) brass(RIFF[b4][i / 2] + 24, t, sl * 1.5, 0.04, bus);
      // The crowd roars up through the build.
      if (build && ps === 0) wash(t, sl * 64, { freq: 500, peak: 1500, peakAt: 0.95, to: 1300, q: 0.5, vol: 0.1, fadeIn: sl * 56, fadeOut: 0.3, bus: bus });
    } }
  };

  var current = null; // { name, bus, timer, step, next, stepLen }
  function stopTrack(tr, fade) {
    if (!tr) return;
    clearInterval(tr.timer);
    var now = ctx.currentTime;
    tr.bus.gain.cancelScheduledValues(now);
    tr.bus.gain.setValueAtTime(tr.bus.gain.value, now);
    tr.bus.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(function () { try { tr.bus.disconnect(); } catch (e) { } }, fade * 1000 + 600);
  }
  // setMusic('home' | 'sports' | 'wind'), or false for silence. Switching tracks crossfades. (true = 'sports', the old meaning.)
  function setMusic(name) {
    if (name === true) name = 'sports';
    if (!name || !TRACKS[name]) name = null;
    if ((current && current.name) === name) return;
    if (!ensure()) return;
    stopTrack(current, name ? 0.8 : 0.5);
    current = null;
    if (!name) return;
    var def = TRACKS[name], now = ctx.currentTime, bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now); bus.gain.linearRampToValueAtTime(def.vol, now + 0.6);
    bus.connect(master);
    var send = ctx.createGain(); send.gain.value = def.wet || 0; bus.connect(send); send.connect(reverbIn); // some of it into the hall echo
    var tr = current = { name: name, bus: bus, step: 0, next: now + 0.08, stepLen: 60 / def.bpm / 4 };
    tr.timer = setInterval(function () {
      while (tr.next < ctx.currentTime + 0.15) {
        try { def.step(tr.step, tr.next, bus); } catch (e) { }
        tr.step++; tr.next += tr.stepLen;
      }
    }, 25);
  }
  function duck(secs) {
    if (!ctx || !current) return;
    var now = ctx.currentTime, g = current.bus.gain, v = TRACKS[current.name].vol;
    g.cancelScheduledValues(now);
    g.setValueAtTime(v * 0.25, now);
    g.linearRampToValueAtTime(v, now + secs);
  }
  function setEnabled(on) {
    enabled = on;
    if (ctx) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
  }
  // Pause all sound while the app is in the background (another tab, phone locked), pick it back up on return.
  if (root.document) root.document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (root.document.hidden) ctx.suspend(); else if (enabled) ctx.resume();
  });

  root.WSSound = {
    play: play, setMusic: setMusic, setEnabled: setEnabled,
    isEnabled: function () { return enabled; }, unlock: ensure,
    music: function () { return current ? current.name : null; }, tracks: Object.keys(TRACKS)
  };
})(this);
