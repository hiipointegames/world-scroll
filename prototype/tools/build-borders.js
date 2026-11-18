// Builds prototype/vendor/provinces.json: the borders between Canada's provinces and territories and
// between Australia's states and territories (US state lines come from us-atlas already).
// Source: Natural Earth 1:10m admin-1 boundary lines (public domain).
// 1. Download https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces_lines.geojson
// 2. node prototype/tools/build-borders.js path/to/ne_10m_admin_1_states_provinces_lines.geojson
const fs = require('fs');
const path = require('path');
const src = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const COUNTRIES = ['Canada', 'Australia'];

const round = (c) => [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100];
function thin(line) { // drop points closer than ~2 miles to the last one kept (keeps the file small)
  const out = [round(line[0])];
  for (let i = 1; i < line.length; i++) {
    const a = out[out.length - 1], b = round(line[i]);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.03 || i === line.length - 1) out.push(b);
  }
  return out;
}

const features = [];
for (const f of src.features) {
  const p = f.properties;
  if (!COUNTRIES.includes(p.ADM0_NAME)) continue;
  // Australia's unnamed pieces are sea boundaries in Bass Strait (Victoria-Tasmania); skip them so no line crosses water.
  // Canada's unnamed pieces are real land borders (Northwest Territories-Nunavut across the Arctic islands), so they stay.
  if (p.ADM0_NAME === 'Australia' && !p.NAME) continue;
  const parts = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const lines = parts.map(thin).filter((l) => l.length >= 2);
  if (lines.length) features.push({ type: 'Feature', properties: { country: p.ADM0_NAME, name: p.NAME || '' }, geometry: { type: 'MultiLineString', coordinates: lines } });
}
const file = path.join(__dirname, '../vendor/provinces.json');
fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
const names = [...new Set(features.map((f) => f.properties.country + ': ' + f.properties.name).filter((n) => !n.endsWith(': ')))].sort();
console.log('provinces.json:', features.length, 'border lines,', Math.round(fs.statSync(file).size / 1024), 'KB');
console.log(names.join('\n'));
