// World Scroll — sound. Everything is synthesized with the Web Audio API (no audio files, no licensing).
// Sound effects play everywhere. Music: wind on the welcome screen, a light tune on home and the categories, game-day music in Sports.
// Browsers only allow audio after the player taps something, so the first tap unlocks it.
(function (root) {
  var ctx = null, master, sfxBus, musicBus;
  var enabled = true;

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
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
  //   home   — home screen and every non-sports feed: a light, happy marimba-and-bells tune (quiet on purpose)
  //   sports — Sports: game day! stadium organ, a crowd bed, "HEY!" shouts, "let's go" clap chants, crowd-roar build-ups
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
  // A marimba-ish pluck: a warm tone plus a quick bright "tock" on top.
  function mallet(n, t, vol, bus) {
    tone(midi(n), t, 0.45, { type: 'sine', vol: vol, attack: 0.004, bus: bus });
    tone(midi(n) * 4, t, 0.07, { type: 'sine', vol: vol * 0.25, attack: 0.002, bus: bus });
  }
  // A stadium organ note: two slightly detuned buzzy voices with a little wobble.
  function organ(n, t, dur, vol, bus) {
    [0.997, 1.003].forEach(function (k) {
      var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(midi(n) * k, t);
      lfo.frequency.value = 6; lg.gain.value = midi(n) * 0.006; lfo.connect(lg); lg.connect(o.frequency);
      f.type = 'lowpass'; f.frequency.value = 2800;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(bus); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
    });
  }
  // A crowd clap: several hands a hair apart.
  function crowdClap(t, vol, bus) {
    for (var k = 0; k < 4; k++) noise(t + Math.random() * 0.018, 0.12, { filter: 'bandpass', freq: 1300 + k * 350, q: 0.9, vol: vol, bus: bus });
  }
  // A crowd "HEY!": a short, voice-like burst (two vowel bands) with a low punch.
  function hey(t, bus) {
    noise(t, 0.22, { filter: 'bandpass', freq: 750, q: 3, vol: 0.5, bus: bus });
    noise(t, 0.2, { filter: 'bandpass', freq: 1800, q: 4, vol: 0.3, bus: bus });
    tone(180, t, 0.18, { type: 'sawtooth', vol: 0.06, cutoff: 900, to: 150, bus: bus });
  }

  // Home: C – Am – F – G. Melody phrases rest, play A, play B, play A, so it never feels like a loop on repeat.
  var HOME_CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  var HOME_ARP = [0, 1, 2, 1, 2, 1, 0, 1];
  var HOME_A = [[76, 0, 79, 0, 81, 79, 76, 0], [72, 0, 76, 0, 74, 72, 69, 0], [69, 72, 77, 0, 76, 0, 72, 0], [74, 0, 71, 74, 79, 0, 0, 0]];
  var HOME_B = [[79, 0, 76, 79, 84, 0, 79, 0], [81, 0, 76, 0, 72, 0, 76, 0], [77, 76, 74, 72, 69, 0, 72, 0], [74, 76, 74, 71, 67, 0, 0, 0]];
  // Sports: C – C – F – G, with a stadium-organ call, chants and a big build every fourth phrase.
  var SP_ROOTS = [36, 36, 41, 43];
  var SP_STAB = [[60, 64, 67], [60, 64, 67], [60, 65, 69], [59, 62, 67]];
  var SP_RIFF = [
    [67, 0, 72, 0, 76, 0, 79, 0, 0, 0, 76, 0, 79, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [77, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0, 74, 0, 76, 0],
    [79, 0, 0, 0, 79, 0, 0, 0, 81, 0, 79, 0, 83, 0, 0, 0]
  ];
  var TRACKS = {
    wind: { bpm: 60, vol: 0.9, step: function (s, t, bus) {
      if (s % 8 === 0) wash(t, 7, { freq: 280, peak: 650 + Math.random() * 500, to: 260, q: 0.9, vol: 0.12, bus: bus }); // the steady breeze
      if (s % 16 === 6 && Math.random() < 0.8) wash(t, 2.4 + Math.random() * 1.6, { freq: 400, peak: 1300 + Math.random() * 900, to: 350, q: 1.6, vol: 0.09, peakAt: 0.4, bus: bus }); // a gust
      if (s % 32 === 20) tone(midi(84 + [0, 3, 7][Math.floor(Math.random() * 3)]), t, 3, { type: 'sine', vol: 0.012, attack: 1.2, bus: bus }); // a faint whistle on the wind
    } },
    home: { bpm: 100, vol: 0.45, step: function (s, t, bus) {
      var bar = Math.floor(s / 16), i = s % 16, ch = HOME_CHORDS[bar % 4], phrase = Math.floor(bar / 4) % 4;
      if (i === 0 || i === 8) kick(t, 0.28, bus);
      if (i === 4 || i === 12) noise(t, 0.05, { filter: 'bandpass', freq: 2600, q: 1.2, vol: 0.12, bus: bus }); // a soft snap
      if (i % 2 === 0) noise(t, 0.04, { freq: 7500, vol: i % 4 === 2 ? 0.05 : 0.025, bus: bus }); // shaker
      if (i === 0 || i === 6 || i === 10) tone(midi(ch[i === 10 ? 2 : 0] - 12), t, 0.4, { type: 'triangle', vol: 0.22, bus: bus }); // bass
      if (i % 2 === 0) mallet(ch[HOME_ARP[i / 2]] + (i === 8 ? 12 : 0), t, i === 0 ? 0.09 : 0.06, bus); // marimba
      var mel = phrase === 1 || phrase === 3 ? HOME_A : phrase === 2 ? HOME_B : null;
      if (mel && i % 2 === 0 && mel[bar % 4][i / 2]) {
        var n = mel[bar % 4][i / 2];
        tone(midi(n + 12), t, 0.6, { type: 'sine', vol: 0.045, attack: 0.003, bus: bus }); // bells
        tone(midi(n), t, 0.35, { type: 'triangle', vol: 0.04, bus: bus });
      }
    } },
    sports: { bpm: 126, vol: 0.32, step: function (s, t, bus) {
      var bar = Math.floor(s / 16), i = s % 16, b4 = bar % 4, phrase = Math.floor(bar / 4) % 4;
      var build = phrase === 3; // every fourth phrase builds up to a big crowd roar
      if (i === 0) wash(t, 60 / 126 * 4 + 0.3, { freq: 900, q: 0.4, vol: build ? 0.05 : 0.035, fadeIn: 0.15, fadeOut: 0.15, bus: bus }); // crowd bed
      if (i % 4 === 0 && !(build && b4 === 3)) kick(t, 0.75, bus);
      if (i % 2 === 1) noise(t, 0.035, { freq: 8000, vol: 0.06, bus: bus }); // hats
      if ((i === 4 || i === 12) && !(build && b4 === 3)) crowdClap(t, 0.16, bus);
      if (i % 2 === 0) tone(midi(SP_ROOTS[b4] + (i % 8 === 6 ? 12 : 0)), t, 60 / 126 / 2 * 0.9, { type: 'sawtooth', vol: 0.14, cutoff: 600, bus: bus }); // driving bass
      if (phrase === 0 || phrase === 2) { // organ call
        var n = SP_RIFF[b4][i];
        if (n) organ(n, t, 60 / 126 / 4 * 1.8, 0.035, bus);
        if (b4 === 1 && i === 4) hey(t, bus);
        if (b4 === 1 && i === 12) hey(t, bus);
      }
      if (phrase === 1) { // the crowd chants: clap, clap, clap-clap-clap … HEY!
        if (b4 % 2 === 0 && (i === 0 || i === 4 || i === 8 || i === 10 || i === 12)) crowdClap(t, 0.24, bus);
        if (b4 % 2 === 1 && i === 0) hey(t, bus);
        if (i === 2 || i === 10) SP_STAB[b4].forEach(function (m) { tone(midi(m), t, 0.14, { type: 'sawtooth', vol: 0.03, cutoff: 2200, bus: bus }); }); // brass stabs
      }
      if (phrase === 2 && (i === 2 || i === 10)) SP_STAB[b4].forEach(function (m) { tone(midi(m), t, 0.14, { type: 'sawtooth', vol: 0.025, cutoff: 2200, bus: bus }); });
      if (build) {
        if (b4 === 0 && i === 0) wash(t, 60 / 126 * 16, { freq: 500, peak: 1600, peakAt: 0.95, to: 1400, q: 0.5, vol: 0.12, fadeIn: 60 / 126 * 14, fadeOut: 0.4, bus: bus }); // the roar rises
        if (b4 === 2 && i % 4 === 0) organ(67 + i / 2, t, 0.2, 0.03, bus); // organ climbs
        if (b4 === 3) { // snare roll that speeds up, then the crowd shouts
          if (i < 8 ? i % 2 === 0 : true) noise(t, 0.06, { filter: 'bandpass', freq: 2000, q: 0.7, vol: 0.05 + i * 0.012, bus: bus });
          if (i === 14) hey(t, bus);
        }
      }
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
    bus.gain.setValueAtTime(0, now); bus.gain.linearRampToValueAtTime(def.vol, now + 1.2);
    bus.connect(master);
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
