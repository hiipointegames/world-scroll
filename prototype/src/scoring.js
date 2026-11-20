// World Scroll — game math (ported from design/screens/Sports.dc.html).
// Plain script so it can be inlined into the prototype page AND required by tests.
(function (root) {
  var EARTH_RADIUS_MI = 3958.8;
  var D = Math.PI / 180;

  // Great-circle distance between two {lat, lon} points, in miles (haversine formula).
  function haversineMiles(a, b) {
    var dLat = (b.lat - a.lat) * D;
    var dLon = (b.lon - a.lon) * D;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * D) * Math.cos(b.lat * D) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // points = round(1000 * e^(-miles / 350)), never below 0.
  function pointsFor(miles) {
    return Math.max(0, Math.round(1000 * Math.exp(-miles / 350)));
  }

  // Score one guess against a question card. Miles are rounded first, as in the prototype.
  // milesOverride: pass a distance you measured another way (e.g. to a country's border).
  function scoreGuess(guess, card, milesOverride) {
    var tolerance = card.toleranceMiles == null ? 25 : card.toleranceMiles;
    var miles = Math.round(milesOverride != null ? milesOverride : haversineMiles(guess, card));
    var bullseye = miles <= tolerance;
    var verdict = bullseye ? 'Bullseye!' : miles <= Math.max(tolerance * 4, 250) ? 'So close!' : 'Not quite';
    return { miles: miles, points: pointsFor(miles), bullseye: bullseye, verdict: verdict };
  }

  // Small seeded random generator (mulberry32) so the Daily 10 is the same for everyone.
  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function seededRandom(seedStr) {
    var t = hashString(seedStr);
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  // Mix cards so every category gets a fair turn (sports has far more cards than the rest).
  // Deals round-robin across categories in a random order; a category drops out once it runs dry.
  function mixByCategory(questions, rand, count) {
    return mixBy(questions, function (q) { return q.category; }, rand, count);
  }
  // Same fair deal, grouped by any key (e.g. "usa/nfl", "europe/tennis").
  function mixBy(questions, keyOf, rand, count) {
    var groups = {}, cats = [];
    questions.forEach(function (q) {
      var k = keyOf(q);
      if (!groups[k]) { groups[k] = []; cats.push(k); }
      groups[k].push(q);
    });
    cats.forEach(function (c) { groups[c] = shuffle(groups[c], rand); });
    var out = [], order = [];
    count = count || questions.length;
    while (out.length < count) {
      if (!order.length) {
        order = shuffle(cats.filter(function (c) { return groups[c].length; }), rand);
        if (!order.length) break;
      }
      var c = order.shift();
      if (groups[c].length) out.push(groups[c].shift());
    }
    return out;
  }

  // Pick today's cards. dateKey is "YYYY-MM-DD".
  function dailyPick(questions, dateKey, count) {
    return mixByCategory(questions, seededRandom('world-scroll-daily-' + dateKey), count || 10);
  }

  // Daily Sports 10: the same 10 sports cards for everyone today, one from each sport/region
  // (NFL, NBA, Premier League, tennis, AFL...) so no single league takes over.
  function dailySportsPick(questions, dateKey, count) {
    var sports = questions.filter(function (q) { return q.category === 'sports'; });
    return mixBy(sports, function (q) { return q.region + '/' + q.sport; },
      seededRandom('world-scroll-sports-daily-' + dateKey), count || 10);
  }
  // Colors that tell a story: every daily square shows how close the pin was, not just right or wrong.
  // hit = correct (within DAILY_HIT_MILES), then warm, chilly and cold misses, and skip for a skipped card.
  var GRADE_SQUARE = { hit: '🟩', warm: '🟨', chilly: '🟧', cold: '🟥', skip: '⬛' };
  function gradeFor(r) {
    if (r.hit) return 'hit';
    if (r.skipped || (r.miles == null && 'miles' in r)) return 'skip';
    if (r.miles == null) return 'cold';
    return r.miles <= 600 ? 'warm' : r.miles <= 1500 ? 'chilly' : 'cold';
  }
  // The text players share: the game and date, the score, and a colored square per card.
  // Used by both daily games; only the game name in the first line changes.
  function dailyShareText(gameName, dateLabel, results) {
    var hits = results.filter(function (r) { return r.hit; }).length;
    return 'World Scroll · ' + gameName + ' · ' + dateLabel + '\n' +
      hits + '/' + results.length + ' ' + (hits >= 8 ? '🏆' : hits >= 5 ? '🎯' : '📍') + '\n' +
      results.map(function (r) { return GRADE_SQUARE[gradeFor(r)]; }).join('');
  }
  // "Beat my pin" links: the card and where the friend's pin landed, packed into one short link part.
  function challengeCode(id, guess) {
    return id + '~' + guess.lat.toFixed(2) + '~' + guess.lon.toFixed(2);
  }
  function parseChallenge(code, knownIds) {
    var m = /^([a-z0-9-]+)~(-?\d{1,2}(?:\.\d+)?)~(-?\d{1,3}(?:\.\d+)?)$/.exec(String(code || ''));
    if (!m) return null;
    var lat = +m[2], lon = +m[3];
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    if (knownIds && knownIds.indexOf(m[1]) < 0) return null;
    return { id: m[1], guess: { lat: lat, lon: lon } };
  }
  // The funniest share: your worst miss. Teams "play" somewhere; places get "put" somewhere.
  function worstMissText(subject, place, miles, isTeam) {
    var where = /^(Pacific|Atlantic|Indian|Arctic|Southern) Ocean$|Sea$|Gulf$|Bay$/.test(place) ? 'the ' + place : place;
    if (place === 'In the water') where = 'the middle of the ocean';
    var dist = Math.round(miles).toLocaleString('en-US');
    var who = String(subject).replace(/^The /, 'the '); // "The Eiffel Tower" reads "the Eiffel Tower" mid-sentence
    return (isTeam ? 'I thought ' + who + ' played in ' + where : 'I put ' + who + ' in ' + where) +
      ' 🤦 ' + dist + ' miles off! Can you beat my pin?';
  }
  // ---------- map feel: momentum after a drag (framework-free, so the phone app can reuse it) ----------
  // samples: recent { t (ms), x, y } positions of the map while a finger drags it.
  // Returns the release speed { vx, vy } in px per ms, measured over the last ~100 ms (0 if the finger paused first).
  var FLING_WINDOW_MS = 100, FLING_MIN_SPEED = 0.25, FLING_FRICTION = 0.94; // friction per 16 ms frame
  function flingVelocity(samples, now) {
    var recent = samples.filter(function (s) { return now - s.t <= FLING_WINDOW_MS; });
    if (recent.length < 2) return { vx: 0, vy: 0 };
    var a = recent[0], b = recent[recent.length - 1], dt = b.t - a.t;
    if (dt <= 0 || now - b.t > 50) return { vx: 0, vy: 0 }; // the finger stopped before lifting: no glide
    var v = { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    return Math.hypot(v.vx, v.vy) < FLING_MIN_SPEED ? { vx: 0, vy: 0 } : v;
  }
  // One frame of the glide: slow down smoothly, the same on 60 Hz and 120 Hz screens. Returns null when it stops.
  function flingStep(v, dtMs) {
    var f = Math.pow(FLING_FRICTION, dtMs / 16.67);
    var nv = { vx: v.vx * f, vy: v.vy * f };
    return Math.hypot(nv.vx, nv.vy) < 0.02 ? null : nv;
  }
  // Two taps close together in time and space count as a double-tap (zoom in there).
  function isDoubleTap(prev, cur) {
    return !!prev && cur.t - prev.t < 320 && Math.hypot(cur.x - prev.x, cur.y - prev.y) < 30;
  }
  // Sharing a card's nerd facts: a title, then each fact on its own line.
  function nerdShareText(name, facts) {
    return '🤓 ' + facts.length + ' nerd facts about ' + String(name).replace(/^The /, 'the ') + ':\n\n' +
      facts.map(function (f) { return '• ' + f[1]; }).join('\n') + '\n\nLearn more on World Scroll!';
  }
  // Passport stamps: land within HIT_MILES (or hit the bullseye) to stamp that place into your passport.
  function earnsStamp(miles, bullseye) { return !!bullseye || miles <= HIT_MILES; }
  function sportsShareText(dateLabel, results) { return dailyShareText('Daily Sports 10', dateLabel, results); }
  // A fun, kid-friendly title for a Daily 10 score.
  function dailyTitle(hits) {
    return hits === 10 ? 'Perfect 10! World explorer.' : hits >= 8 ? 'Globe trotter!' : hits >= 6 ? 'Sharp navigator!'
      : hits >= 4 ? 'Finding your way!' : 'Warm-up round. Back tomorrow!';
  }
  // A fun, kid-friendly title for a Daily Sports 10 score.
  function sportsTitle(hits) {
    return hits === 10 ? 'Perfect 10! Legend status.' : hits >= 8 ? 'All-Star!' : hits >= 6 ? 'Starting lineup!'
      : hits >= 4 ? 'Rising rookie!' : 'Warm-up round. Back tomorrow!';
  }

  // Sports trophies: a "hit" is a guess within HIT_MILES. 3 hits in a row = bronze,
  // 7 = silver, 10 = gold. After gold the run starts over. A miss resets the run.
  var HIT_MILES = 100;
  // Daily 10 and Daily Sports 10: a guess counts as correct (green square) within this many miles.
  var DAILY_HIT_MILES = 250;
  function trophyStep(run, hit) {
    if (!hit) return { run: 0, award: null };
    var n = run + 1;
    var award = n === 3 ? 'bronze' : n === 7 ? 'silver' : n === 10 ? 'gold' : null;
    return { run: n >= 10 ? 0 : n, reached: n, award: award };
  }

  // Day streak: given the last day played and today (both "YYYY-MM-DD"), return the new streak.
  function nextStreak(lastDay, today, streak) {
    if (lastDay === today) return streak || 1;
    var y = new Date(today + 'T12:00:00Z'); y.setUTCDate(y.getUTCDate() - 1);
    var yesterday = y.toISOString().slice(0, 10);
    return lastDay === yesterday ? (streak || 0) + 1 : 1;
  }

  // Pop-up tips. visitDays counts the different days someone has opened the game on this device.
  function countVisit(visitDays, lastVisit, today) {
    return lastVisit === today ? (visitDays || 1) : (visitDays || 0) + 1;
  }
  // Day 2: "share your daily results". Day 4: "explore every section". Each shows once, ever.
  function tipForDay(visitDays, seen) {
    seen = seen || {};
    if (visitDays >= 4 && !seen.explore) return 'explore';
    if (visitDays >= 2 && !seen.share) return 'share';
    return null;
  }

  // Distance from a pin to the nearest point on a river (a list of lines of [lon, lat]).
  // Each short segment is flattened around the pin, the closest point found, then measured for real.
  function lineDistance(lines, guess) {
    var best = { miles: Infinity, point: null };
    var k = Math.cos(guess.lat * Math.PI / 180);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      for (var j = 0; j < line.length; j++) {
        var a = line[j], b = line[j + 1] || a;
        var ax = (a[0] - guess.lon) * k, ay = a[1] - guess.lat, bx = (b[0] - guess.lon) * k, by = b[1] - guess.lat;
        var dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
        var t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
        var p = { lon: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t };
        var d = haversineMiles(guess, p);
        if (d < best.miles) best = { miles: d, point: p };
      }
    }
    return best;
  }

  // Is a point inside a ring of [lon, lat]? (ray casting; fine for desert- and range-sized shapes)
  function inRing(ring, x, y) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  // Distance from a pin to a desert or mountain range (a GeoJSON MultiPolygon): 0 anywhere inside,
  // otherwise the distance to its nearest edge.
  // Is the guess inside the outline? (Same rule as areaDistance's 0 miles, without measuring.)
  function inArea(area, guess) {
    var polys = area.type === 'Polygon' ? [area.coordinates] : area.coordinates;
    return polys.some(function (p) {
      return inRing(p[0], guess.lon, guess.lat) && !p.slice(1).some(function (h) { return inRing(h, guess.lon, guess.lat); });
    });
  }
  function areaDistance(area, guess) {
    var polys = area.type === 'Polygon' ? [area.coordinates] : area.coordinates, rings = [];
    for (var i = 0; i < polys.length; i++) {
      var p = polys[i];
      if (inRing(p[0], guess.lon, guess.lat) && !p.slice(1).some(function (h) { return inRing(h, guess.lon, guess.lat); })) {
        return { miles: 0, point: guess };
      }
      rings = rings.concat(p);
    }
    return lineDistance(rings, guess);
  }

  // ---------- fun layer: how a guess feels, combos, daily goal, explorer ranks ----------
  // How close a guess was, as a "temperature". Drives the verdict words, colors and sounds.
  function vibeFor(miles, bullseye) {
    if (bullseye) return 'bullseye';
    return miles <= 100 ? 'scorching' : miles <= 250 ? 'hot' : miles <= 600 ? 'warm' : miles <= 1500 ? 'chilly' : 'cold';
  }
  // Combo: consecutive good guesses (bullseye or within 250 miles) in one sitting. A skip or a far guess resets it.
  function comboStep(combo, good) { return good ? (combo || 0) + 1 : 0; }
  // Daily goal: cards locked in today.
  var DAILY_GOAL = 15;
  function cardsToday(state, today) { return state && state.date === today ? state.n : 0; }
  // Explorer ranks: grow with lifetime points.
  // Each rank has its own badge (emoji) and color.
  var RANKS = [
    { name: 'Rookie Explorer', min: 0, emoji: '🎒', color: '#3DDCC4' },
    { name: 'Trail Finder', min: 5000, emoji: '🥾', color: '#9BE7A8' },
    { name: 'Map Reader', min: 15000, emoji: '🗺️', color: '#7CC4FF' },
    { name: 'Navigator', min: 35000, emoji: '🧭', color: '#A9C6FF' },
    { name: 'Globetrotter', min: 70000, emoji: '✈️', color: '#FF8F6B' },
    { name: 'World Wanderer', min: 125000, emoji: '🌍', color: '#D7A8FF' },
    { name: 'Atlas Ace', min: 200000, emoji: '🚀', color: '#FF6FA8' },
    { name: 'World Legend', min: 350000, emoji: '👑', color: '#FFB547' }
  ];
  function rankFor(points) {
    var i = 0;
    while (i + 1 < RANKS.length && points >= RANKS[i + 1].min) i++;
    var next = RANKS[i + 1] || null;
    return { index: i, name: RANKS[i].name, min: RANKS[i].min, emoji: RANKS[i].emoji, color: RANKS[i].color, next: next,
      progress: next ? (points - RANKS[i].min) / (next.min - RANKS[i].min) : 1 };
  }

  var api = {
    EARTH_RADIUS_MI: EARTH_RADIUS_MI, haversineMiles: haversineMiles, pointsFor: pointsFor,
    scoreGuess: scoreGuess, seededRandom: seededRandom, shuffle: shuffle, dailyPick: dailyPick,
    gradeFor: gradeFor, GRADE_SQUARE: GRADE_SQUARE, nerdShareText: nerdShareText, flingVelocity: flingVelocity, flingStep: flingStep, isDoubleTap: isDoubleTap, challengeCode: challengeCode, parseChallenge: parseChallenge, worstMissText: worstMissText, earnsStamp: earnsStamp,
    mixByCategory: mixByCategory, mixBy: mixBy, nextStreak: nextStreak, HIT_MILES: HIT_MILES, DAILY_HIT_MILES: DAILY_HIT_MILES, trophyStep: trophyStep, dailyShareText: dailyShareText, dailyTitle: dailyTitle, countVisit: countVisit, tipForDay: tipForDay, lineDistance: lineDistance, areaDistance: areaDistance, inArea: inArea, vibeFor: vibeFor, comboStep: comboStep, DAILY_GOAL: DAILY_GOAL, cardsToday: cardsToday, RANKS: RANKS, rankFor: rankFor,
    dailySportsPick: dailySportsPick, sportsShareText: sportsShareText, sportsTitle: sportsTitle
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WSGame = api;
})(this);
