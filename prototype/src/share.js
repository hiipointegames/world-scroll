// World Scroll: share pictures and share links.
// - WSShare.dailyCard(opts): draws the Daily 10 / Daily Sports 10 result as a picture (a PNG Blob)
//   with the score, the colored squares and a world map of every pin.
// - WSShare.send({ text, url, files }): opens the phone's share sheet, or copies to the clipboard on a computer.
(function () {
  var W = 1080, H = 1350; // 4:5, the shape Instagram and most chats show without cropping
  var C = {
    ink: '#0B1026', surface: '#151C42', raised: '#1A2350', water: '#0F1A40', land: '#2E6F8E', border: 'rgba(255,255,255,.22)',
    text: '#F4F1E8', muted: '#B9BEDA', gold: '#FFB547', teal: '#3DDCC4'
  };
  // The same five colors as the squares in the game.
  var GRADE = { hit: '#3DDCC4', warm: '#F7C948', chilly: '#FF8F3C', cold: '#E25C6B', skip: '#3A4377' };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['700 80px Fredoka', '600 40px Fredoka', '500 30px Inter', '600 30px Inter'].map(function (f) {
      return document.fonts.load(f).catch(function () { });
    }));
  }
  var DISPLAY = 'Fredoka, "SF Pro Rounded", system-ui, sans-serif', BODY = 'Inter, system-ui, sans-serif';

  // opts: { game: 'Daily 10', date: 'Nov 20', hits, verdict, grades: ['hit', 'warm', ...],
  //         pins: [{ guess: {lat, lon}, answer: {lat, lon}, grade }], land: GeoJSON, url: 'hiipointegames.github.io/…' }
  function dailyCard(opts) {
    return fonts().then(function () {
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');

      // Background: deep ink with a teal glow at the top and a pink one at the bottom.
      ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
      var g1 = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 760);
      g1.addColorStop(0, 'rgba(61,220,196,.22)'); g1.addColorStop(1, 'rgba(61,220,196,0)');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
      var g2 = ctx.createRadialGradient(W, H, 0, W, H, 700);
      g2.addColorStop(0, 'rgba(255,111,168,.16)'); g2.addColorStop(1, 'rgba(255,111,168,0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

      // Wordmark: "World" + gold "Scroll", centered.
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 64px ' + DISPLAY;
      var w1 = ctx.measureText('World').width, w2 = ctx.measureText('Scroll').width, x0 = (W - w1 - w2) / 2;
      ctx.fillStyle = C.text; ctx.fillText('World', x0, 120);
      ctx.fillStyle = C.gold; ctx.fillText('Scroll', x0 + w1, 120);

      ctx.textAlign = 'center';
      ctx.font = '600 30px ' + BODY; ctx.fillStyle = C.muted;
      ctx.fillText((opts.game + ' · ' + opts.date).toUpperCase().split('').join(' '), W / 2, 178);

      // The big score.
      ctx.font = '700 200px ' + DISPLAY;
      var score = String(opts.hits), sw = ctx.measureText(score).width;
      ctx.font = '700 84px ' + DISPLAY;
      var tw = ctx.measureText('/10').width, sx = (W - sw - tw) / 2;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255,181,71,.55)'; ctx.shadowBlur = 50;
      ctx.font = '700 200px ' + DISPLAY; ctx.fillStyle = C.gold; ctx.fillText(score, sx, 380);
      ctx.shadowBlur = 0;
      ctx.font = '700 84px ' + DISPLAY; ctx.fillStyle = C.muted; ctx.fillText('/10', sx + sw + 6, 380);
      ctx.textAlign = 'center';
      ctx.font = '600 44px ' + DISPLAY; ctx.fillStyle = C.text; ctx.fillText(opts.verdict, W / 2, 446);

      // One colored square per card.
      var n = opts.grades.length, size = 72, gap = 14, rowW = n * size + (n - 1) * gap, rx = (W - rowW) / 2;
      opts.grades.forEach(function (gr, i) {
        roundRect(ctx, rx + i * (size + gap), 486, size, size, 16);
        ctx.fillStyle = GRADE[gr] || GRADE.skip; ctx.fill();
      });

      // The map of every pin: a dashed line from your pin to the answer, in that card's color.
      var mx = 60, my = 600, mw = W - 120, mh = 560;
      ctx.save();
      roundRect(ctx, mx, my, mw, mh, 36); ctx.fillStyle = C.surface; ctx.fill(); ctx.clip();
      var proj = d3.geoNaturalEarth1().fitExtent([[mx + 24, my + 24], [mx + mw - 24, my + mh - 24]], { type: 'Sphere' });
      var path = d3.geoPath(proj, ctx);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = C.water; ctx.fill();
      ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); path(opts.land); ctx.fillStyle = C.land; ctx.fill();
      ctx.strokeStyle = C.border; ctx.lineWidth = 0.8; ctx.stroke();
      (opts.pins || []).forEach(function (p) {
        if (!p.guess) return;
        var a = proj([p.answer.lon, p.answer.lat]), gp = proj([p.guess.lon, p.guess.lat]);
        if (!a || !gp) return;
        var col = GRADE[p.grade] || GRADE.cold;
        ctx.setLineDash([12, 10]); ctx.lineWidth = 5; ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(gp[0], gp[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(a[0], a[1], 13, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = C.teal; ctx.stroke();
        ctx.beginPath(); ctx.arc(gp[0], gp[1], 11, 0, Math.PI * 2); ctx.fillStyle = C.gold; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke();
      });
      ctx.restore();

      // The invite.
      ctx.font = '700 46px ' + DISPLAY; ctx.fillStyle = C.text;
      ctx.fillText('Can you beat me?', W / 2, 1238);
      ctx.font = '500 30px ' + BODY; ctx.fillStyle = C.teal;
      ctx.fillText(opts.url, W / 2, 1290);

      return new Promise(function (resolve) { cv.toBlob(resolve, 'image/png'); });
    });
  }

  // Share text (and a link, and maybe a picture). Phones get the share sheet; computers copy the text
  // (pictures are saved as a file instead). Resolves to 'shared', 'copied', 'saved' or 'failed'.
  function send(o) {
    var isPhone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var full = o.text + (o.url ? '\n' + o.url : '');
    if (o.files && o.files.length) {
      var data = { files: o.files, text: full };
      if (navigator.canShare && navigator.canShare(data)) {
        return navigator.share(data).then(function () { return 'shared'; }, function (e) { return e && e.name === 'AbortError' ? 'cancelled' : save(); });
      }
      return Promise.resolve(save());
    }
    if (isPhone && navigator.share) {
      return navigator.share({ text: o.text, url: o.url }).then(function () { return 'shared'; }, function (e) {
        return e && e.name === 'AbortError' ? 'cancelled' : copy();
      });
    }
    return copy();
    function copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(full).then(function () { return 'copied'; }, function () { return 'failed'; });
      return Promise.resolve('failed');
    }
    function save() { // computers: download the picture
      var f = o.files[0], a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return 'saved';
    }
  }

  window.WSShare = { dailyCard: dailyCard, send: send, GRADE: GRADE };
})();
