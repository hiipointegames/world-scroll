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
  // The text players share: score, a green/red square per card, and an invite.
  function sportsShareText(dateLabel, results) {
    var hits = results.filter(function (r) { return r.hit; }).length;
    return 'World Scroll · Daily Sports 10 · ' + dateLabel + '\n' +
      hits + '/' + results.length + ' ' + (hits >= 8 ? '🏆' : hits >= 5 ? '🎯' : '📍') + '\n' +
      results.map(function (r) { return r.hit ? '🟩' : '🟥'; }).join('') + '\n' +
      'Can you beat my score? Learn geography by scrolling.';
  }
  // A fun, kid-friendly title for a Daily Sports 10 score.
  function sportsTitle(hits) {
    return hits === 10 ? 'Perfect 10! Legend status.' : hits >= 8 ? 'All-Star!' : hits >= 6 ? 'Starting lineup!'
      : hits >= 4 ? 'Rising rookie!' : 'Warm-up round. Back tomorrow!';
  }

  // Sports trophies: a "hit" is a guess within HIT_MILES. 3 hits in a row = bronze,
  // 7 = silver, 10 = gold. After gold the run starts over. A miss resets the run.
  var HIT_MILES = 100;
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

  var api = {
    EARTH_RADIUS_MI: EARTH_RADIUS_MI, haversineMiles: haversineMiles, pointsFor: pointsFor,
    scoreGuess: scoreGuess, seededRandom: seededRandom, shuffle: shuffle, dailyPick: dailyPick,
    mixByCategory: mixByCategory, mixBy: mixBy, nextStreak: nextStreak, HIT_MILES: HIT_MILES, trophyStep: trophyStep,
    dailySportsPick: dailySportsPick, sportsShareText: sportsShareText, sportsTitle: sportsTitle
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WSGame = api;
})(this);
