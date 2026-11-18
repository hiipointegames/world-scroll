// Builds two map-data files from Natural Earth (public domain):
//  - data/areas.json: the outline of each desert and mountain-range card, so a pin anywhere inside
//    counts as a bullseye and outside it is measured to the nearest edge.
//  - prototype/vendor/lakes-50m.json: big lakes, painted as water so the Great Lakes (and Michigan's shape) show.
// 1. Download from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/
//      ne_10m_geography_regions_polys.geojson   and   ne_50m_lakes.geojson
// 2. node prototype/tools/build-areas.js path/to/ne_10m_geography_regions_polys.geojson path/to/ne_50m_lakes.geojson
const fs = require('fs');
const path = require('path');
const [regionsFile, lakesFile] = process.argv.slice(2);

// card id -> Natural Earth region names (exact). The Mojave isn't in Natural Earth, so it keeps its point.
const AREAS = {
  sahara: ['SAHARA'], gobi: ['GOBI DESERT'], arabian: ['ARABIAN PENINSULA'], kalahari: ['KALAHARI DESERT'], namib: ['NAMIB DESERT'],
  'great-victoria': ['GREAT VICTORIA DESERT'], 'great-sandy': ['GREAT SANDY DESERT'], atacama: ['DESIERTO DE ATACAMA'],
  sonoran: ['SONORAN DESERT'], chihuahuan: ['CHIHUAHUAN DESERT'], taklamakan: ['TAKLIMAKAN DESERT'], thar: ['THAR DESERT'],
  syrian: ['SYRIAN DESERT'], patagonian: ['PATAGONIA'], karakum: ['GARAGUM DESERT'], kyzylkum: ['QIZILQUM DESERT'],
  'great-basin': ['GREAT BASIN'], danakil: ['Danakil'],
  himalayas: ['HIMALAYAS'], andes: ['ANDES'], rockies: ['ROCKY MOUNTAINS'], alps: ['ALPS'], urals: ['URAL MOUNTAINS'],
  appalachians: ['APPALACHIAN MTS.'],
  'atlas-mountains': ['ATLAS MOUNTAINS', 'HAUT ATLAS', 'Anti Atlas', 'ATLAS SAHARIEN', 'Atlas Tellien', 'Moyen Atlas']
};

const round = (c) => [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100];
function thinRing(ring, step) {
  const out = [round(ring[0])];
  for (let i = 1; i < ring.length - 1; i++) {
    const a = out[out.length - 1], b = round(ring[i]);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) > step) out.push(b);
  }
  out.push(out[0]); // keep it closed
  return out.length >= 4 ? out : null;
}
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
// The map library (d3) wants the outer ring clockwise and holes counter-clockwise; Natural Earth uses the
// opposite, which d3 would draw as "the whole world except this lake". Flip rings as needed.
const signedArea = (r) => r.reduce((s, c, i) => { const n = r[(i + 1) % r.length]; return s + (n[0] - c[0]) * (n[1] + c[1]); }, 0); // > 0 = clockwise
const orient = (poly) => poly.map((r, i) => ((signedArea(r) > 0) === (i === 0) ? r : r.slice().reverse()));
const thinPolys = (list, step) => list.map((p) => orient(p.map((r) => thinRing(r, step)).filter(Boolean))).filter((p) => p.length);

const regions = JSON.parse(fs.readFileSync(regionsFile, 'utf8')).features;
const areas = {};
for (const [id, names] of Object.entries(AREAS)) {
  const found = regions.filter((f) => names.includes(f.properties.NAME));
  const missing = names.filter((n) => !found.some((f) => f.properties.NAME === n));
  if (missing.length) throw new Error(id + ': not found in Natural Earth: ' + missing.join(', '));
  areas[id] = { type: 'MultiPolygon', coordinates: thinPolys(found.flatMap((f) => polys(f.geometry)), 0.06) };
}
const areasFile = path.join(__dirname, '../../data/areas.json');
fs.writeFileSync(areasFile, JSON.stringify({
  _about: 'Outline of each desert and mountain-range card (lon, lat). Inside = bullseye; outside is measured to the nearest edge. Built by prototype/tools/build-areas.js from Natural Earth 1:10m geography regions (public domain).',
  areas
}));

const lakes = JSON.parse(fs.readFileSync(lakesFile, 'utf8')).features.map((f) => ({
  type: 'Feature', properties: { name: f.properties.name || '' },
  geometry: { type: 'MultiPolygon', coordinates: thinPolys(polys(f.geometry), 0.03) }
})).filter((f) => f.geometry.coordinates.length);
const lakesOut = path.join(__dirname, '../vendor/lakes-50m.json');
fs.writeFileSync(lakesOut, JSON.stringify({ type: 'FeatureCollection', features: lakes }));

console.log('areas.json:', Object.keys(areas).length, 'areas,', Math.round(fs.statSync(areasFile).size / 1024), 'KB');
console.log('lakes-50m.json:', lakes.length, 'lakes,', Math.round(fs.statSync(lakesOut).size / 1024), 'KB');
