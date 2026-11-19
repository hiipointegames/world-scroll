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
  const amazon = questions.find(q => q.id === 'amazon'); // 250 miles either side of the river
  const pin = { lat: -3.4, lon: -55.0 }; // near the river, far east of the card's map point
  const near = G.scoreGuess(pin, amazon, G.lineDistance(amazon.line, pin).miles);
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
  assert.strictEqual(cats.size, 9, 'all 9 categories appear');
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

test('Daily 10 and Daily Sports 10 count a guess as correct within 250 miles (trophy hits stay at 100)', () => {
  assert.strictEqual(G.DAILY_HIT_MILES, 250);
  assert.strictEqual(G.HIT_MILES, 100);
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes('isDailyKind() ? G.DAILY_HIT_MILES : G.HIT_MILES'), 'daily games use the daily limit');
  assert.ok(!/Correct = your pin landed within 100 miles/.test(app), 'results screen shows the daily limit');
});

test('Daily 10 share text matches the Daily Sports 10 format, with its own name', () => {
  const results = [true, false, true, true, true, true, true, false, true, true].map(hit => ({ hit }));
  assert.strictEqual(G.dailyShareText('Daily 10', 'Nov 10', results),
    'World Scroll · Daily 10 · Nov 10\n8/10 🏆\n🟩🟥🟩🟩🟩🟩🟩🟥🟩🟩\nCan you beat my score? Learn geography by scrolling.');
  assert.strictEqual(G.dailyTitle(10), 'Perfect 10! World explorer.');
  assert.strictEqual(G.dailyTitle(2), 'Warm-up round. Back tomorrow!');
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("G.dailyShareText('Daily 10'"), 'the Daily 10 results screen offers a share');
});

test('both daily games show the running row of 10 squares while you play', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("daily ? dailyRowHtml(false)"), 'the Daily 10 feed builds the row');
  assert.ok(app.includes("if (sportsDaily || daily) renderDailyRow();"), 'the row is filled in when the Daily 10 starts');
  assert.ok(app.includes("if (isDailyKind()) renderDailyRow();"), 'each locked-in guess updates the row in both dailies');
  assert.ok(app.includes("' · CARD ' + Math.min(feed.idx + 1, 10)"), 'the row names the card on screen, not the next one');
});

test('pop-up tips: share on day 2, explore on day 4, each only once', () => {
  assert.strictEqual(G.countVisit(undefined, undefined, '2026-11-10'), 1);
  assert.strictEqual(G.countVisit(1, '2026-11-10', '2026-11-10'), 1, 'opening twice in a day is still one day');
  assert.strictEqual(G.countVisit(1, '2026-11-10', '2026-11-14'), 2, 'days do not need to be in a row');
  assert.strictEqual(G.tipForDay(1, {}), null);
  assert.strictEqual(G.tipForDay(2, {}), 'share');
  assert.strictEqual(G.tipForDay(3, { share: true }), null);
  assert.strictEqual(G.tipForDay(4, { share: true }), 'explore');
  assert.strictEqual(G.tipForDay(9, { share: true, explore: true }), null);
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const tips = app.slice(app.indexOf('var TIPS = {'), app.indexOf('var TIP_BUTTONS'));
  assert.ok(/Have you shared your daily results with a friend yet\?/.test(tips));
  assert.ok(/Have you explored it all\?/.test(tips));
  assert.ok(!/tap the (map|globe)|map tap/i.test(tips), 'never say "tap the map"');
});

test('fun layer: closeness tiers, combos, daily goal and explorer ranks', () => {
  assert.strictEqual(G.vibeFor(500, true), 'bullseye');
  assert.deepStrictEqual([60, 200, 450, 1200, 4000].map(m => G.vibeFor(m, false)), ['scorching', 'hot', 'warm', 'chilly', 'cold']);
  assert.strictEqual(G.comboStep(2, true), 3);
  assert.strictEqual(G.comboStep(5, false), 0);
  assert.strictEqual(G.cardsToday({ date: '2026-11-10', n: 7 }, '2026-11-10'), 7);
  assert.strictEqual(G.cardsToday({ date: '2026-11-09', n: 7 }, '2026-11-10'), 0, 'the goal starts fresh each day');
  assert.strictEqual(G.rankFor(0).name, 'Rookie Explorer');
  const mid = G.rankFor(10000);
  assert.strictEqual(mid.name, 'Trail Finder');
  assert.strictEqual(mid.next.name, 'Map Reader');
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-9);
  assert.strictEqual(G.rankFor(1e9).next, null);
  for (let i = 1; i < G.RANKS.length; i++) assert.ok(G.RANKS[i].min > G.RANKS[i - 1].min, 'ranks climb');
});

test('fun layer copy stays kid-friendly and never says "tap the map"', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const words = app.slice(app.indexOf('var VIBE_WORDS'), app.indexOf('var VIBE_SOUND'));
  assert.ok(words.includes("'Bullseye!'"), 'a bullseye still says Bullseye!');
  const banned = /\b(war|kill\w*|death|dead|die|blood\w*|bomb\w*|gun\w*|stupid|loser|fail\w*)\b/i;
  assert.ok(!banned.test(words), 'verdict words are friendly');
  assert.ok(!/tap the (map|globe)|map tap/i.test(app), 'never say "tap the map"');
});

test('the game frame can never scroll (desktop Chrome got stuck with the top cut off)', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, 'src/app.html'), 'utf8');
  assert.ok(/\.phone \{[^}]*overflow: clip/.test(html), 'the frame clips instead of scrolling');
  assert.ok(/\.stage \{[^}]*overflow: clip/.test(html), 'the card stage clips instead of scrolling');
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("document.addEventListener('scroll'"), 'a safety net snaps the frame back if anything scrolls it');
});

test('sports questions never name the city or state (it would give the answer away)', () => {
  // Names that are nothing but a place keep it: there is no other way to ask about them.
  const allowed = new Set(['rugby-england', 'rugby-france', 'rugby-wales', 'rugby-scotland', 'rugby-ireland', 'rugby-italy', 'toulouse',
    'monte-carlo', 'paris-masters', 'kitzbuhel', 'vienna-open', 'basel', 'italian-open', 'stuttgart',
    'wimbledon']); // "All England Club" is the venue's real name and only names the country
  const usa = require('../data/usa-teams.json');
  const kept = new Set(Object.entries(usa.shortNames).filter(([k, v]) => k === v).map(([k]) => k));
  const generic = /^(area|city|park|united|north|south|east|west|new|saint|mount|county|club|garden|gardens|university|bay|beach)$/i;
  const leaks = [];
  for (const q of questions.filter(x => x.category === 'sports')) {
    if (allowed.has(q.id) || kept.has(q.team)) continue;
    const words = q.answer.replace(/\(.*?\)/g, ' ').split(/[^A-Za-zÀ-ÿ]+/).filter(w => w.length >= 4 && !generic.test(w));
    const hit = words.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(q.prompt));
    if (hit.length) leaks.push(q.id + ': "' + q.prompt + '" names ' + hit.join(', '));
  }
  assert.deepStrictEqual(leaks, []);
  assert.strictEqual(questions.find(q => q.id === 'nba-memphis-grizzlies').prompt, 'Where do the Grizzlies play?');
  assert.strictEqual(questions.find(q => q.id === 'mlb-san-francisco-giants').prompt, 'Where do the Giants play?');
  assert.strictEqual(questions.find(q => q.id === 'nba-memphis-grizzlies').team, 'the Memphis Grizzlies', 'the full name is kept for after the guess');
  assert.ok(kept.size <= 40, 'only a few teams keep a place in their name');
});

test('rivers are scored by distance to the river itself, not one dot in the middle', () => {
  const miss = questions.find(q => q.id === 'mississippi');
  assert.ok(miss.line && miss.line.length, 'the Mississippi carries its path');
  const score = (lat, lon) => { const g = { lat, lon }; return G.scoreGuess(g, miss, G.lineDistance(miss.line, g).miles); };
  assert.strictEqual(score(47.24, -95.21).bullseye, true, 'Lake Itasca, where it starts, is a bullseye');
  assert.strictEqual(score(29.95, -90.07).bullseye, true, 'New Orleans, near the mouth, is a bullseye');
  assert.strictEqual(score(38.63, -90.2).bullseye, true, 'St. Louis is a bullseye');
  assert.strictEqual(score(39.74, -104.99).bullseye, false, 'Denver is too far west');
  for (const q of questions.filter(x => x.category === 'rivers')) {
    assert.ok(q.line && q.line.length, q.id + ' has a river path');
    const mid = G.lineDistance(q.line, { lat: q.lat, lon: q.lon }).miles;
    assert.ok(mid < 150, q.id + ': its map point sits near its own river (' + Math.round(mid) + ' mi)');
    assert.ok(q.toleranceMiles <= 250, q.id + ' bullseye zone is at most 250 miles either side');
  }
});

test('US state outlines show on every map that includes the United States', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(/world: Object\.assign\([^\n]*inner: usStateLines/.test(app), 'the world map draws state lines');
  assert.ok(app.includes("inner: showsUS ? usStateLines : null"), 'continent maps that show the US draw state lines');
});

test('at least 7 US rivers, each with its real path', () => {
  const us = ['mississippi', 'colorado-river', 'rio-grande', 'missouri-river', 'ohio-river', 'columbia-river', 'hudson-river', 'potomac-river', 'yukon-river', 'arkansas-river'];
  for (const id of us) {
    const q = questions.find(x => x.id === id);
    assert.ok(q && q.category === 'rivers' && q.line && q.line.length, id + ' is a river card with a path');
  }
  const hudson = questions.find(q => q.id === 'hudson-river');
  const nyc = { lat: 40.75, lon: -73.99 };
  assert.ok(G.scoreGuess(nyc, hudson, G.lineDistance(hudson.line, nyc).miles).bullseye, 'a pin at New York City is on the Hudson');
});

test('deserts and mountain ranges use their real outline: inside is a bullseye', () => {
  const shaped = questions.filter(q => q.area);
  assert.ok(shaped.length >= 24, 'almost every desert and range has an outline');
  const score = (id, lat, lon) => { const q = questions.find(x => x.id === id), g = { lat, lon }; return G.scoreGuess(g, q, G.areaDistance(q.area, g).miles); };
  assert.ok(score('sahara', 23, 5).bullseye, 'deep in the Sahara');
  assert.ok(score('sahara', 17, -10).bullseye, 'western Sahara, far from the old center point');
  assert.ok(!score('sahara', 48.8, 2.35).bullseye, 'Paris is not the Sahara');
  assert.ok(score('rockies', 39.7, -105.5).bullseye, 'Colorado Rockies');
  assert.ok(score('rockies', 51.2, -115.6).bullseye, 'Banff, in the Canadian Rockies');
  assert.ok(!score('rockies', 41.9, -87.6).bullseye, 'Chicago is not in the Rockies');
  for (const q of shaped) {
    const inside = G.areaDistance(q.area, { lat: q.lat, lon: q.lon }).miles;
    assert.ok(inside < 150, q.id + ': its map point sits in or near its outline (' + Math.round(inside) + ' mi)');
  }
  // single peaks (Everest, Fuji...) and the Mojave keep the point-and-circle scoring
  assert.ok(!questions.find(q => q.id === 'everest').area);
});

test('big lakes are drawn as water (the Great Lakes show Michigan)', () => {
  const lakes = require('./vendor/lakes-50m.json').features.map(f => f.properties.name);
  for (const n of ['Lake Superior', 'Lake Michigan', 'Lake Huron', 'Lake Erie', 'Lake Ontario']) assert.ok(lakes.includes(n), n);
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("attr('class', 'm-lakes')"), 'every map paints the lakes');
});

test('players can zoom in deep, toward their pin, and jump back out', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const m = /var maxZoom = regionId === 'world' \? (\d+) : (\d+);/.exec(app);
  assert.ok(m && +m[1] >= 80 && +m[2] >= 40, 'world map zooms to 80x, region maps to 40x');
  assert.ok(app.includes('zoom.scaleBy, k, on ? p : [W / 2, H / 2]'), '+ and - zoom toward the pin');
  assert.ok(app.includes('class="zoom-reset"') && app.includes('resetZoom'), 'a button shows the whole map again');
});

test('Canada and Australia show their province and state borders', () => {
  const b = require('./vendor/provinces.json').features.map(f => f.properties.country + ': ' + f.properties.name);
  for (const n of ['Canada: Manitoba - Saskatchewan', 'Canada: Ontario - Manitoba', 'Canada: Nunavut - Manitoba', 'Canada: Alberta - British Columbia',
    'Canada: Québec - Ontario', 'Australia: Victoria - New South Wales', 'Australia: Queensland - Northern Territory', 'Australia: Western Australia - South Australia',
    'Australia: Australian Capital Territory - New South Wales']) assert.ok(b.includes(n), n);
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("provinces: DATA.regions[regionId].projection === 'albersUsa' ? '' : path(WS_PROVINCES)"), 'maps draw the borders');
  const lakes = require('./vendor/lakes-50m.json').features.map(f => f.properties.name);
  for (const n of ['Lake Winnipeg', 'Lake Manitoba', 'Great Slave Lake', 'Great Bear Lake', 'Lake Eyre North', 'Lake Torrens']) assert.ok(lakes.includes(n), n);
});

test('the Europe map counts Russia as Europe and shows the big European lakes', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const list = /var EUROPE = \[([\s\S]*?)\];/.exec(app)[1];
  assert.ok(/'Russia'/.test(list), 'Moscow and St. Petersburg are in the Europe colour, not the "neighbour" colour');
  const lakes = require('./vendor/lakes-50m.json').features.map(f => f.properties.name);
  for (const n of ['Lake Geneva', 'Bodensee', 'Vänern', 'Vättern', 'Lake Ladoga', 'Lake Onega', 'Lake Balaton', 'IJsselmeer']) assert.ok(lakes.includes(n), n);
});

test('Turkey belongs to both Europe and Asia', () => {
  const inGroup = (q, g) => q.continent === g || (q.alsoIn || []).includes(g);
  const country = questions.find(q => q.id === 'country-turkiye-turkey');
  const capital = questions.find(q => q.category === 'capitals' && /Ankara/.test(q.prompt));
  for (const q of [country, capital]) {
    assert.ok(inGroup(q, 'Europe'), q.id + ' shows in the Europe tab');
    assert.ok(inGroup(q, 'Asia'), q.id + ' still shows in the Asia tab');
  }
  assert.match(country.answer, /Europe and Asia/);
  const b = bank.regions['europe-wide'].bounds;
  assert.ok(capital.lon > b.lonMin && capital.lon < b.lonMax && capital.lat > b.latMin && capital.lat < b.latMax, 'Ankara fits on the Europe map');
  assert.deepStrictEqual(bank.atlasAlsoIn.Turkey, ['Europe'], 'the Europe continent map colors Turkey as Europe');
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(/'Turkey'/.test(/var EUROPE = \[([\s\S]*?)\];/.exec(app)[1]), 'the Europe sports map colors Turkey as Europe');
});

test('AFL: all 18 clubs, each pinned in its home city', () => {
  const afl = questions.filter(q => q.region === 'australia' && q.sport === 'afl');
  const ids = ['eagles', 'crows', 'swans', 'magpies', 'blues', 'bombers', 'tigers', 'hawks', 'demons', 'saints',
    'kangaroos', 'bulldogs', 'cats', 'lions', 'suns', 'giants', 'dockers', 'power'];
  assert.deepStrictEqual(afl.map(q => q.id).sort(), ids.slice().sort());
  const b = bank.regions.australia.bounds;
  for (const q of afl) {
    assert.ok(q.venue, q.id + ' names its home ground');
    assert.ok(q.lon > b.lonMin && q.lon < b.lonMax && q.lat > b.latMin && q.lat < b.latMax, q.id + ' fits on the Australia map');
  }
  const melb = afl.filter(q => q.answer === 'Melbourne, Victoria').length;
  assert.strictEqual(melb, 9, 'nine clubs are based in Melbourne');
});

test('NRL has all 17 clubs and the Big Bash all 8 teams, each with its home ground', () => {
  const ids = (sport) => questions.filter(q => q.region === 'australia' && q.sport === sport).map(q => q.id).sort();
  assert.deepStrictEqual(ids('nrl'), ['broncos', 'bulldogs-nrl', 'cowboys', 'dolphins', 'dragons', 'eels', 'knights', 'nzwarriors',
    'panthers', 'rabbitohs', 'raiders', 'roosters', 'sea-eagles', 'sharks', 'storm', 'titans', 'wests-tigers']);
  assert.deepStrictEqual(ids('bbl'), ['heat', 'hurricanes', 'renegades', 'scorchers', 'sixers', 'stars', 'strikers', 'thunder']);
  const b = bank.regions.australia.bounds;
  for (const q of questions.filter(q => q.region === 'australia')) {
    assert.ok(q.venue, q.id + ' names its home ground');
    assert.ok(!/bet|beer|brew|pines/i.test(q.venue), q.id + ': kid-friendly venue name (no betting or beer brands)');
    assert.ok(q.lon > b.lonMin && q.lon < b.lonMax && q.lat > b.latMin && q.lat < b.latMax, q.id + ' fits on the Australia map');
  }
});

test('Premier League and La Liga: all 20 clubs of the 2026-27 season, each with its stadium', () => {
  const clubs = (league) => questions.filter(q => q.sport === 'football' && q.league === league);
  const epl = clubs('Premier League'), liga = clubs('La Liga');
  assert.strictEqual(epl.length, 20, 'Premier League clubs');
  assert.strictEqual(liga.length, 20, 'La Liga clubs');
  for (const id of ['coventry', 'ipswich', 'hull', 'everton', 'spurs']) assert.ok(epl.some(q => q.id === id), id + ' in the Premier League');
  for (const id of ['racing', 'deportivo', 'malaga', 'atletico', 'villarreal']) assert.ok(liga.some(q => q.id === id), id + ' in La Liga');
  const b = bank.regions.europe.bounds;
  for (const q of epl.concat(liga)) {
    assert.ok(q.venue, q.id + ' names its stadium');
    assert.ok(q.lon > b.lonMin && q.lon < b.lonMax && q.lat > b.latMin && q.lat < b.latMax, q.id + ' fits on the Europe map');
  }
});

test('Top 14: all 14 clubs of the 2026-27 season, each with its stadium', () => {
  const top14 = questions.filter(q => q.sport === 'rugby' && q.league === 'Top 14');
  assert.deepStrictEqual(top14.map(q => q.id).sort(), ['bayonne', 'castres', 'clermont', 'larochelle', 'lou', 'mhr', 'pau',
    'racing92', 'stadefrancais', 'toulon', 'toulouse', 'ubb', 'usap', 'vannes']);
  for (const q of top14) assert.ok(q.venue, q.id + ' names its stadium');
});

test('US leagues have every team', () => {
  const usa = require('../data/usa-teams.json');
  const count = (lg) => usa.teams.filter(t => t[0] === lg).length;
  assert.deepStrictEqual({ nfl: count('nfl'), nba: count('nba'), mlb: count('mlb'), nhl: count('nhl'), mls: count('mls'), nwsl: count('nwsl') },
    { nfl: 32, nba: 30, mlb: 30, nhl: 32, mls: 30, nwsl: 16 });
});

test('Russia belongs to both Europe and Asia', () => {
  const inGroup = (q, g) => q.continent === g || (q.alsoIn || []).includes(g);
  const country = questions.find(q => q.id === 'country-russia');
  const capital = questions.find(q => q.category === 'capitals' && /Moscow/.test(q.prompt));
  for (const q of [country, capital]) {
    assert.ok(inGroup(q, 'Europe'), q.id + ' still shows in the Europe tab');
    assert.ok(inGroup(q, 'Asia'), q.id + ' shows in the Asia tab');
  }
  assert.match(country.answer, /Asia and Europe/);
  assert.deepStrictEqual(bank.atlasAlsoIn.Russia, ['Asia'], 'the Asia continent map colors Russia as Asia');
});

test('Lakes: the most important lakes, every Great Lake, scored by their outline', () => {
  const lakes = questions.filter(q => q.category === 'lakes');
  assert.ok(lakes.length >= 30, lakes.length + ' lakes');
  for (const id of ['lake-superior', 'lake-michigan', 'lake-huron', 'lake-erie', 'lake-ontario']) {
    const q = lakes.find(x => x.id === id);
    assert.ok(q && q.area, id + ' is a lake card with its real outline');
  }
  const sup = lakes.find(q => q.id === 'lake-superior');
  const pin = (lat, lon) => G.scoreGuess({ lat, lon }, sup, G.areaDistance(sup.area, { lat, lon }).miles);
  assert.ok(pin(47.3, -89.9).bullseye, 'a pin in the western end of Lake Superior counts');
  assert.ok(!pin(41.88, -87.63).bullseye, 'Chicago is not on Lake Superior');
  assert.ok(lakes.filter(q => !q.area).length <= 4, 'only a few small lakes fall back to a point');
});

test('Landmarks: 50 famous places with precise spots and kid-friendly facts', () => {
  const lm = questions.filter(q => q.category === 'landmarks');
  assert.strictEqual(lm.length, 50);
  for (const id of ['eiffel-tower', 'golden-gate-bridge', 'statue-of-liberty', 'taj-mahal', 'great-wall', 'sydney-opera-house', 'machu-picchu']) {
    assert.ok(lm.find(q => q.id === id), id);
  }
  for (const q of lm) {
    assert.ok(q.lat >= -90 && q.lat <= 90 && q.lon >= -180 && q.lon <= 180 && q.fact && q.prompt.startsWith('Where '), q.id);
    assert.ok(q.toleranceMiles <= 300, q.id);
  }
  const eiffel = lm.find(q => q.id === 'eiffel-tower');
  assert.ok(G.scoreGuess({ lat: 48.86, lon: 2.35 }, eiffel).bullseye, 'a pin in central Paris finds the Eiffel Tower');
  const cats = bank.categories.map(c => c.id);
  assert.ok(cats.includes('lakes') && cats.includes('landmarks'), 'both are categories on the home screen');
});

test('home screen: no daily goal line, Daily 10 sits above the tiles and Shuffle below them', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(!app.includes('TODAY’S GOAL') && !app.includes('Daily goal smashed'), 'the daily goal is gone');
  const home = app.slice(app.indexOf('function showPicker'), app.indexOf("document.getElementById('go-sports').onclick"));
  const daily = home.indexOf('id="go-daily"'), tiles = home.indexOf('class="tiles"'), shuffle = home.indexOf('id="go-shuffle"');
  assert.ok(daily > 0 && daily < tiles && tiles < shuffle, 'order: Daily 10, tiles, Shuffle');
});

test('home tiles: short subtitles that never need "...", and room under the text', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const subs = /var CATEGORY_SUBS = \{([\s\S]*?)\};/.exec(app)[1].match(/'[^']*'/g).map(s => s.slice(1, -1));
  assert.ok(subs.includes('Famous lakes'));
  assert.deepStrictEqual(subs.filter(s => s.length > 23), [], 'subtitles fit on one line of a half-width tile');
  const html = require('fs').readFileSync(require('path').join(__dirname, 'src/app.html'), 'utf8');
  assert.ok(/\.tile \{ min-height: 92px;[^}]*padding: 12px 15px 14px/.test(html), 'tiles grow with their text and keep bottom padding');
});

test('Cities are iconic cities that are not capitals (those belong in Capitals)', () => {
  const name = q => q.prompt.replace(/^Where is /, '').replace(/\?$/, '').split(',')[0].trim().toLowerCase();
  const capitals = new Set(questions.filter(q => q.category === 'capitals').map(name)); // every national capital + US state capital
  // Cities that are capitals even though the Capitals category files a different one
  for (const extra of ['cape town', 'bloemfontein', 'edinburgh', 'cardiff', 'belfast', 'la paz', 'amsterdam', 'abidjan']) capitals.add(extra);
  const cities = questions.filter(q => q.category === 'cities');
  assert.strictEqual(cities.length, 50);
  assert.deepStrictEqual(cities.filter(q => capitals.has(name(q))).map(q => q.prompt), []);
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes("cities: 'Iconic cities'"));
});

test('the Explorer Rank card opens a pop-up listing every rank and what comes next', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  assert.ok(app.includes('<button class="progress-card" id="rank-card"'), 'the rank card is a button');
  assert.ok(app.includes("rc.onclick = rankSheet"), 'tapping it opens the rank pop-up');
  assert.ok(/function rankSheet\(\)[\s\S]*G\.RANKS\.map[\s\S]*Next up: /.test(app), 'the pop-up lists all ranks and the next one');
});

test('"Your pin" names only the spot (country or US state), never a distance to a nearby city', () => {
  const app = require('fs').readFileSync(require('path').join(__dirname, 'src/app.js'), 'utf8');
  const fn = app.slice(app.indexOf('function placeOfPin'), app.indexOf('function shapeDistance'));
  assert.ok(!/mi from|right by|PLACES/.test(fn), 'no "about 73 mi from Zagreb" part');
  assert.ok(fn.includes("return where || 'In the water'"));
});
