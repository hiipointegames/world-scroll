// Run from the project folder with: node --test prototype/scoring.test.js
const test = require('node:test');
const assert = require('node:assert');
const G = require('./src/scoring.js');
const { loadData } = require('./src/data.js');
const bank = loadData();
const questions = bank.questions;

test('distance from a point to itself is 0', () => {
  assert.strictEqual(G.haversineMiles({ lat: 39.05, lon: -94.48 }, { lat: 39.05, lon: -94.48 }), 0);
});

test('New York to Los Angeles is about 2,445 miles', () => {
  const mi = G.haversineMiles({ lat: 40.7128, lon: -74.006 }, { lat: 34.0522, lon: -118.2437 });
  assert.ok(Math.abs(mi - 2445) < 10, `got ${mi}`);
});

test('points: 1000 at 0 miles, ~368 at 350 miles, never negative', () => {
  assert.strictEqual(G.pointsFor(0), 1000);
  assert.strictEqual(G.pointsFor(350), 368);
  assert.strictEqual(G.pointsFor(20000), 0);
});

test('bullseye uses the card tolerance', () => {
  const amazon = questions.find(q => q.id === 'amazon'); // tolerance 400
  const near = G.scoreGuess({ lat: -3.4, lon: -55.0 }, amazon); // ~345 mi east
  assert.strictEqual(near.bullseye, true);
  assert.strictEqual(near.verdict, 'Bullseye!');
  const chiefs = questions.find(q => q.id === 'nfl-kansas-city-chiefs'); // tolerance 25
  const far = G.scoreGuess({ lat: 41.88, lon: -87.63 }, chiefs); // Chicago
  assert.strictEqual(far.bullseye, false);
  assert.ok(far.miles > 400);
});

test('daily 10 is the same for the same date and different across dates', () => {
  const a = G.dailyPick(questions, '2026-11-08').map(q => q.id);
  const b = G.dailyPick(questions, '2026-11-08').map(q => q.id);
  const c = G.dailyPick(questions, '2026-11-09').map(q => q.id);
  assert.strictEqual(a.length, 10);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
  assert.strictEqual(new Set(a).size, 10);
});

test('daily 10 is not swamped by sports (every category gets a turn)', () => {
  const picks = G.dailyPick(questions, '2026-11-08');
  const cats = new Set(picks.map(q => q.category));
  assert.strictEqual(cats.size, 7, 'all 7 categories appear');
});

test('mixByCategory deals every card exactly once', () => {
  const mixed = G.mixByCategory(questions, G.seededRandom('x'));
  assert.strictEqual(mixed.length, questions.length);
  assert.strictEqual(new Set(mixed.map(q => q.id)).size, questions.length);
});

test('trophies: bronze at 3, silver at 7, gold at 10, then the run starts over', () => {
  let run = 0;
  const awards = [];
  for (let i = 0; i < 10; i++) { const s = G.trophyStep(run, true); run = s.run; awards.push(s.award); }
  assert.deepStrictEqual(awards.map((a, i) => a && (i + 1) + a).filter(Boolean), ['3bronze', '7silver', '10gold']);
  assert.strictEqual(run, 0);
  assert.strictEqual(G.trophyStep(run, true).run, 1);
  assert.deepStrictEqual(G.trophyStep(6, false), { run: 0, award: null });
});

test('USA roster: full leagues, unique ids, every team inside the USA map', () => {
  const usa = questions.filter(q => q.region === 'usa');
  const count = (league) => usa.filter(q => q.league === league).length;
  assert.deepStrictEqual(
    ['NFL', 'NBA', 'MLB', 'NHL', 'MLS', 'NWSL', 'USL Championship', 'USL League One', 'USL Super League'].map(count),
    [32, 30, 30, 32, 30, 16, 25, 17, 8]);
  assert.strictEqual(new Set(questions.map(q => q.id)).size, questions.length, 'ids are unique');
  const b = bank.regions.usa.bounds;
  for (const q of usa) {
    assert.ok(q.lat > b.latMin && q.lat < b.latMax && q.lon > b.lonMin && q.lon < b.lonMax, q.id + ' is off the map');
    assert.ok(q.fact && q.answer && q.prompt.startsWith('Where do '), q.id + ' is missing text');
  }
  const tabs = bank.sportsTabs.find(t => t.region === 'usa').sports.map(s => s.id);
  for (const q of usa) assert.ok(tabs.includes(q.sport), q.id + ' has no tab');
});

test('every sports card belongs to a tab in its region (incl. Europe: Football, Tennis, Rugby)', () => {
  for (const q of questions.filter(x => x.category === 'sports')) {
    const tab = bank.sportsTabs.find(t => t.region === q.region);
    assert.ok(tab && tab.sports.some(s => s.id === q.sport), q.id + ' (' + q.sport + ') has no tab');
  }
  const europe = bank.sportsTabs.find(t => t.region === 'europe').sports.map(s => s.label);
  assert.deepStrictEqual(europe, ['Football (Soccer)', 'Tennis', 'Rugby']);
  const count = (sport) => questions.filter(q => q.region === 'europe' && q.sport === sport).length;
  assert.ok(count('football') >= 6 && count('tennis') >= 15 && count('rugby') >= 9);
});

test('Daily Sports 10: same 10 for everyone today, spread across sports and regions', () => {
  const a = G.dailySportsPick(questions, '2026-11-08'), b = G.dailySportsPick(questions, '2026-11-08');
  assert.strictEqual(a.length, 10);
  assert.deepStrictEqual(a.map(q => q.id), b.map(q => q.id));
  assert.notDeepStrictEqual(a.map(q => q.id), G.dailySportsPick(questions, '2026-11-09').map(q => q.id));
  assert.ok(a.every(q => q.category === 'sports'));
  assert.strictEqual(new Set(a.map(q => q.region + '/' + q.sport)).size, 10, 'ten different sport/region combos');
  assert.deepStrictEqual([...new Set(a.map(q => q.region))].sort(), ['australia', 'europe', 'usa']);
});

test('Daily Sports 10 share text shows the score and one square per card', () => {
  const results = [true, true, false, true, true, true, false, true, false, true].map(hit => ({ hit }));
  assert.strictEqual(G.sportsShareText('Nov 8', results),
    'World Scroll · Daily Sports 10 · Nov 8\n7/10 🎯\n🟩🟩🟥🟩🟩🟩🟥🟩🟥🟩\nCan you beat my score? Learn geography by scrolling.');
  assert.strictEqual(G.sportsTitle(10), 'Perfect 10! Legend status.');
  assert.strictEqual(G.sportsTitle(0), 'Warm-up round. Back tomorrow!');
});

test('geography: category sizes', () => {
  const count = (c) => questions.filter(q => q.category === c).length;
  assert.strictEqual(count('countries'), 197); // incl. Vatican City, Palestine, Taiwan, Kosovo
  assert.strictEqual(count('capitals'), 195 + 50); // Israel and Palestine have no capital card
  assert.ok(count('rivers') >= 20 && count('mountains') >= 20 && count('deserts') >= 15 && count('cities') >= 50);
});

test('every country shape exists in the map file', () => {
  const atlas = require('./vendor/countries-50m.json');
  const names = new Set(atlas.objects.countries.geometries.map(g => g.properties.name));
  const missing = questions.filter(q => q.shape && !names.has(q.shape)).map(q => q.shape);
  assert.deepStrictEqual(missing, []);
  assert.strictEqual(questions.filter(q => q.category === 'countries' && !q.shape).length, 1, 'only Tuvalu has no shape');
});

test('every capital sits inside its continent map', () => {
  for (const q of questions.filter(x => x.category === 'capitals' && x.region === 'world')) {
    const tab = bank.geoTabs.find(t => t.id === q.continent);
    assert.ok(tab, q.id + ' has no continent tab');
    const b = bank.regions[tab.region].bounds;
    const lon = b.lonMax > 180 && q.lon < 0 ? q.lon + 360 : q.lon; // Oceania wraps past 180°
    assert.ok(q.lat > b.latMin && q.lat < b.latMax && lon > b.lonMin && lon < b.lonMax, q.id + ' is off the ' + tab.label + ' map');
  }
});

test('every country and capital has a hand-written fact (no auto-filled ones)', () => {
  const facts = require('../data/place-facts.json');
  const used = new Set(Object.values(facts.countries).concat(Object.values(facts.capitals), Object.values(facts.stateCapitals)));
  const auto = questions.filter(q => (q.category === 'countries' || q.category === 'capitals') && !used.has(q.fact)).map(q => q.id);
  assert.deepStrictEqual(auto, []);
});

test('facts are kid-friendly and fit on the result card', () => {
  // Whole-word check for topics we keep out of the game.
  const banned = /\b(war|wars|battle|kill\w*|murder\w*|death|dead|died|die|blood\w*|bomb\w*|weapon\w*|gun\w*|sex\w*|nude|drunk|beer|wine|whisk(e)?y|vodka|rum|alcohol\w*|drug\w*|prison|slave\w*|massacre|genocide|terror\w*|violen\w*|invad\w*|invasion|conquer\w*|executed)\b/i;
  const okNames = /Dead Sea|Death Valley|Star Wars/g; // place names and a movie title, not the topics themselves
  const flagged = questions.filter(q => banned.test(q.fact.replace(okNames, ''))).map(q => q.id + ': ' + q.fact);
  assert.deepStrictEqual(flagged, []);
  const long = questions.filter(q => q.fact.length > 160).map(q => q.id + ' (' + q.fact.length + ')');
  assert.deepStrictEqual(long, []);
  // Sports nerd facts get the same check.
  const nerd = questions.flatMap(q => (q.nerd || []).map(([label, text]) => ({ id: q.id, label, text })));
  assert.deepStrictEqual(nerd.filter(f => banned.test(f.text.replace(okNames, ''))).map(f => f.id + ': ' + f.text), []);
  assert.deepStrictEqual(nerd.filter(f => f.text.length > 160 || !f.label).map(f => f.id), []);
});

test('every sports card has at least 2 nerd facts, and USA teams lead with a real one', () => {
  const sports = questions.filter(q => q.category === 'sports');
  assert.deepStrictEqual(sports.filter(q => !q.nerd || q.nerd.length < 2).map(q => q.id), []);
  const generic = sports.filter(q => q.region === 'usa' && /^They’ve been in the |^Brand new: they joined/.test(q.fact));
  assert.deepStrictEqual(generic.map(q => q.id), []);
  const known = require('../data/sports-facts.json');
  assert.deepStrictEqual(known._verify.filter(id => !known.facts[id]), [], 'the fact-check list only names real cards');
});

test('a pin inside a country scores a bullseye via the border distance', () => {
  const card = questions.find(q => q.id === 'country-france');
  assert.strictEqual(card.toleranceMiles, 0);
  const r = G.scoreGuess({ lat: 46, lon: 2 }, card, 0);
  assert.strictEqual(r.bullseye, true);
  assert.strictEqual(r.points, 1000);
  assert.strictEqual(G.scoreGuess({ lat: 46, lon: 2 }, card, 120).bullseye, false);
});

test('streak grows on consecutive days and resets after a gap', () => {
  assert.strictEqual(G.nextStreak(null, '2026-11-08', 0), 1);
  assert.strictEqual(G.nextStreak('2026-11-07', '2026-11-08', 4), 5);
  assert.strictEqual(G.nextStreak('2026-11-08', '2026-11-08', 5), 5);
  assert.strictEqual(G.nextStreak('2026-11-01', '2026-11-08', 5), 1);
  assert.strictEqual(G.nextStreak('2026-10-31', '2026-11-01', 2), 3); // across a month boundary
});

test('"Now you know" facts are never cut off with "..." on any screen size', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, 'src/app.html'), 'utf8');
  const rules = css.split('}').filter(r => /\.res-fact/.test(r.split('{')[0] || ''));
  const clipped = rules.filter(r => /line-clamp|text-overflow|white-space:\s*nowrap/.test(r));
  assert.deepStrictEqual(clipped.map(r => r.trim().slice(0, 80)), []);
});
