// Loads the question bank for the prototype build (Node only).
// questions.json holds hand-written cards; usa-teams.json holds the USA sports roster,
// which is turned into one "Where do ___ play?" card per team.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));

function slug(s) {
  return s.toLowerCase().replace(/^the /, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function teamQuestions(roster) {
  const col = Object.fromEntries(roster.columns.map((c, i) => [c, i]));
  return roster.teams.map((row) => {
    const league = roster.leagues[row[col.league]];
    const name = row[col.name];
    const venue = row[col.venue];
    const joined = row[col.joined];
    return {
      id: row[col.league] + '-' + slug(name),
      category: 'sports',
      region: 'usa',
      sport: league.sport,
      league: league.label,
      prompt: 'Where do ' + name + ' play?',
      answer: row[col.city],
      venue: venue,
      lat: row[col.lat],
      lon: row[col.lon],
      toleranceMiles: 25,
      fact: row[col.fact] || (joined >= 2026
        ? 'Brand new: they joined the ' + league.label + ' in ' + joined + '.'
        : 'They’ve been in the ' + league.label + ' since ' + joined + '.'),
    };
  });
}

// "the Netherlands" → "The Netherlands" (for answer lines that start a sentence)
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const bare = (s) => s.replace(/^the /, '');

// One "Where is ___?" country card per country (scored against its border shape),
// one capital card per country, and one card per US state capital.
function placeQuestions(world, facts) {
  const col = Object.fromEntries(world.columns.map((c, i) => [c, i]));
  const out = [];
  for (const row of world.countries) {
    const atlas = row[col.atlas], name = row[col.name], continent = row[col.continent], capital = row[col.capital];
    out.push({
      id: 'country-' + slug(name), category: 'countries', region: 'world', continent,
      shape: atlas || undefined, // border shape in the world-atlas map; missing → scored by distance to the capital
      prompt: 'Where is ' + name + '?', answer: cap(bare(name)) + ' · ' + continent,
      lat: row[col.lat], lon: row[col.lon], toleranceMiles: atlas ? 0 : 50,
      fact: facts.countries[bare(name)] ||
        (capital ? cap(name) + ' is in ' + continent + '. Its capital is ' + capital + '.' : cap(name) + ' is in ' + continent + '.'),
    });
    if (!capital) continue;
    out.push({
      id: 'capital-' + slug(name), category: 'capitals', region: 'world', continent,
      prompt: 'Where is ' + capital + '?', answer: capital + ', ' + bare(name),
      lat: row[col.lat], lon: row[col.lon], toleranceMiles: 40,
      fact: facts.capitals[capital] || capital + ' is the capital of ' + name + '.',
    });
  }
  for (const [state, capital, lat, lon] of world.usStateCapitals) {
    out.push({
      id: 'state-capital-' + slug(state), category: 'capitals', region: 'us-states', continent: 'us-states',
      prompt: 'Where is ' + capital + ', ' + state + '?', answer: capital + ', ' + state,
      lat, lon, toleranceMiles: 30,
      fact: facts.stateCapitals[capital + ', ' + state] || capital + ' is the capital of ' + state + '.',
    });
  }
  return out;
}

function loadData() {
  const bank = readJson('questions.json');
  const roster = readJson('usa-teams.json');
  const world = readJson('countries.json');
  const facts = readJson('place-facts.json');
  bank.questions = bank.questions.concat(placeQuestions(world, facts), teamQuestions(roster));
  // Which continent each shape on the map belongs to (for coloring continent maps).
  bank.atlasContinents = Object.assign({}, world.atlasExtras);
  for (const row of world.countries) if (row[0]) bank.atlasContinents[row[0]] = row[2];
  return bank;
}

module.exports = { loadData, teamQuestions, placeQuestions, slug };
