// World Scroll — sound. Everything is synthesized with the Web Audio API (no audio files, no licensing).
// Sound effects play everywhere; the instrumental "stadium" loop plays only in the Sports feed.
// Browsers only allow audio after the player taps something, so the first tap unlocks it.
(function (root) {
  var ctx = null, master, sfxBus, musicBus;
  var enabled = true, musicOn = false, timer = null, nextTime = 0, step = 0;
  var BPM = 112, STEP = 60 / BPM / 4; // 16th notes

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
  function play(name, arg) {
    if (!enabled || !ensure()) return;
    try { SFX[name](ctx.currentTime + 0.01, arg); } catch (e) { }
    if (name === 'trophy') duck(1.6);
  }

  // ---------- stadium loop (instrumental, 112 BPM, C–G–Am–F) ----------
  var CHORDS = [[261.6, 329.6, 392], [246.9, 293.7, 392], [220, 261.6, 329.6], [220, 261.6, 349.2]]; // C, G/B, Am, F/A
  var ROOTS = [65.4, 98, 110, 87.3]; // C2 G2 A2 F2
  var LEAD = [N.E5, 0, N.G5, 0, N.A5, N.G5, 0, N.E5, N.D5, 0, N.C5, 0, N.D5, N.E5, 0, 0];

  function scheduleStep(s, t) {
    var bar = Math.floor(s / 16) % 4, i = s % 16, mb = musicBus;
    if (i === 0 || i === 8 || i === 10) { // kick
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(mb); o.start(t); o.stop(t + 0.3);
    }
    if (i === 4 || i === 12) { noise(t, 0.14, { filter: 'bandpass', freq: 1600, q: 0.6, vol: 0.32, bus: mb }); } // clap
    if (i % 2 === 1) noise(t, 0.035, { freq: 8000, vol: 0.07, bus: mb }); // hats
    if (i % 2 === 0) tone(ROOTS[bar] * (i === 6 || i === 14 ? 2 : 1), t, STEP * 1.7, { type: 'sawtooth', vol: 0.14, cutoff: 520, bus: mb });
    if (i === 2 || i === 6 || i === 10 || i === 14) {
      CHORDS[bar].forEach(function (f) { tone(f, t, STEP * 1.4, { type: 'triangle', vol: 0.05, bus: mb }); });
    }
    if ((Math.floor(s / 16) % 8) >= 4 && LEAD[i]) { // stadium-organ hook every other phrase
      tone(LEAD[i], t, STEP * 1.6, { type: 'square', vol: 0.045, cutoff: 2600, bus: mb });
    }
  }
  function tick() {
    while (nextTime < ctx.currentTime + 0.12) { scheduleStep(step, nextTime); step++; nextTime += STEP; }
  }
  function setMusic(on) {
    if (on === musicOn) return;
    musicOn = on;
    if (!ensure()) return;
    var now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    if (on) {
      musicBus.gain.linearRampToValueAtTime(0.32, now + 0.8);
      if (!timer) { step = 0; nextTime = now + 0.05; timer = setInterval(tick, 25); }
    } else {
      musicBus.gain.linearRampToValueAtTime(0, now + 0.4);
      setTimeout(function () { if (!musicOn && timer) { clearInterval(timer); timer = null; } }, 450);
    }
  }
  function duck(secs) {
    if (!ctx || !musicOn) return;
    var now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(0.08, now);
    musicBus.gain.linearRampToValueAtTime(0.32, now + secs);
  }
  function setEnabled(on) {
    enabled = on;
    if (ctx) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
  }

  root.WSSound = {
    play: play, setMusic: setMusic, setEnabled: setEnabled,
    isEnabled: function () { return enabled; }, unlock: ensure
  };
})(this);
