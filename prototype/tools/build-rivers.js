// Builds data/rivers.json: the real path of every river card, so a pin is scored by its distance
// to the river itself (not to one dot in the middle of it).
// Source: Natural Earth "rivers + lake centerlines" (public domain), 1:50m scale.
//   1. Download https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson
//   2. node prototype/tools/build-rivers.js path/to/ne_50m_rivers_lake_centerlines.geojson
const fs = require('fs');
const path = require('path');

const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
// card id -> which Natural Earth lines make up that river (name match, optional lon/lat box [w, s, e, n])
const RIVERS = {
  amazon: { names: /^(amazonas|marañón|ucayali)$/i }, // Marañón and Ucayali are its headwaters in Peru
  nile: { names: /^(nile|white nile|el bahr el abyad|bahr el jebel|mountain nile|albert nile|victoria nile|blue nile|abay|el bahr el azraq)$/i },
  yangtze: { names: /^(yangtze|chang jiang|jinsha|tongtian|tuotuo)$/i }, // upper Yangtze names in Tibet/Qinghai
  mississippi: { names: /^mississippi$/i },
  yenisei: { names: /yenis/i },
  yellow: { names: /^(huang|yellow)$/i, box: [90, 30, 125, 42] },
  ob: { names: /^ob$/i },
  parana: { names: /^paraná$/i },
  'congo-river': { names: /^(congo|lualaba)$/i },
  mekong: { names: /^(mekong|lancang)$/i },
  'niger-river': { names: /^niger$/i },
  murray: { names: /^murray$/i, box: [135, -40, 152, -33] },
  danube: { names: /^(danube|donau)$/i },
  volga: { names: /^volga$/i },
  ganges: { names: /^ganges$/i },
  indus: { names: /^indus$/i },
  rhine: { names: /^(rhine|rhein|rhin)$/i },
  mackenzie: { names: /^mackenzie$/i },
  zambezi: { names: /^zambezi$/i },
  'colorado-river': { names: /^colorado$/i, box: [-120, 30, -104, 44] },
  euphrates: { names: /^(euphrates|firat)$/i }, // Firat = its name in Turkey
  'st-lawrence': { names: /^st\.? lawrence$/i,
    // Natural Earth only has a short stretch, so the rest is drawn by hand through well-known points:
    // Lake Ontario outlet (Kingston) -> Montreal -> Trois-Rivieres -> Quebec City -> Tadoussac -> Gulf of St. Lawrence
    extra: [[[-76.48, 44.23], [-75.9, 44.38], [-75.2, 44.9], [-74.7, 45.0], [-73.55, 45.5], [-72.55, 46.34], [-71.21, 46.81], [-70.4, 47.4], [-69.72, 48.14], [-68.5, 48.75], [-67.4, 49.3]]] },
  'rio-grande': { names: /^rio grande$/i, box: [-110, 24, -96, 39] },
  thames: { names: /^thames$/i, box: [-3, 51, 1, 52.5] }
};

const inBox = (c, b) => !b || (c[0] >= b[0] && c[0] <= b[2] && c[1] >= b[1] && c[1] <= b[3]);
const round = (c) => [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100];
// Drop points closer than ~3 miles to the last kept one (keeps the file small, shape unchanged).
function thin(line) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const a = out[out.length - 1], b = line[i];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.045 || i === line.length - 1) out.push(b);
  }
  return out;
}

const out = {};
for (const [id, rule] of Object.entries(RIVERS)) {
  const lines = [];
  for (const f of src.features) {
    const p = f.properties;
    if (!rule.names.test(p.name || '') && !rule.names.test(p.name_en || '')) continue;
    const parts = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const part of parts) {
      const kept = part.filter((c) => inBox(c, rule.box)).map(round);
      if (kept.length >= 2) lines.push(thin(kept));
    }
  }
  for (const l of rule.extra || []) lines.push(l);
  if (!lines.length) throw new Error('No river lines found for ' + id);
  out[id] = lines;
}

const file = path.join(__dirname, '../../data/rivers.json');
const body = {
  _about: 'The path of each river card (lon, lat). A pin is scored by its distance to the nearest point on these lines. Built by prototype/tools/build-rivers.js from Natural Earth 1:50m rivers (public domain); the St. Lawrence is partly drawn by hand.',
  rivers: out
};
fs.writeFileSync(file, JSON.stringify(body));
const pts = Object.values(out).flat().reduce((n, l) => n + l.length, 0);
console.log('Wrote', Object.keys(out).length, 'rivers,', pts, 'points,', Math.round(fs.statSync(file).size / 1024), 'KB');
for (const [id, lines] of Object.entries(out)) {
  const all = lines.flat();
  const lat = [Math.min(...all.map((c) => c[1])), Math.max(...all.map((c) => c[1]))];
  console.log(id.padEnd(15), String(lines.length).padStart(3), 'pieces  lat', lat.map((x) => x.toFixed(1)).join('..'));
}
