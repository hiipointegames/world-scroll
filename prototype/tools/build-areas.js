// Builds two map-data files from Natural Earth (public domain):
//  - data/areas.json: the outline of each desert and mountain-range card, so a pin anywhere inside
//    counts as a bullseye and outside it is measured to the nearest edge.
//    It also holds each ocean and sea card's outline, from Natural Earth's marine areas.
//  - prototype/vendor/lakes-50m.json: big lakes, painted as water so the Great Lakes (and Michigan's shape) show.
// 1. Download from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/
//      ne_10m_geography_regions_polys.geojson, ne_50m_lakes.geojson and ne_10m_geography_marine_polys.geojson
// 2. node prototype/tools/build-areas.js path/to/ne_10m_geography_regions_polys.geojson path/to/ne_50m_lakes.geojson path/to/ne_10m_geography_marine_polys.geojson
const fs = require('fs');
const path = require('path');
const [regionsFile, lakesFile, marineFile] = process.argv.slice(2);

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
// The map draws each edge as the shortest path over the globe, which bends toward the pole. Ocean edges
// that follow a line of latitude (the Southern Ocean starts at 60°S) need points every degree to stay on it.
function densify(ring, maxDeg) {
  const out = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / maxDeg);
    for (let k = 0; k < n; k++) out.push(round([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]));
  }
  out.push(ring[ring.length - 1]);
  return out;
}
const densePolys = (list) => list.map((p) => p.map((r) => densify(r, 1)));

// Lake cards -> Natural Earth lake names (exact). Crater Lake, Loch Ness, Lake Como and the Caspian Sea
// aren't in the 1:50m lakes, so those keep a point and a bullseye circle.
const LAKE_AREAS = {
  'lake-superior': ['Lake Superior'], 'lake-michigan': ['Lake Michigan'], 'lake-huron': ['Lake Huron'], 'lake-erie': ['Lake Erie'],
  'lake-ontario': ['Lake Ontario'], 'great-salt-lake': ['Great Salt Lake'], 'lake-tahoe': ['Lake Tahoe'], 'lake-okeechobee': ['Lake Okeechobee'],
  'lake-champlain': ['Lake Champlain'], 'great-bear-lake': ['Great Bear Lake'], 'lake-winnipeg': ['Lake Winnipeg'], 'lake-titicaca': ['Lago Titicaca'],
  'lake-nicaragua': ['Lago de Nicaragua'], 'lake-baikal': ['Lake Baikal'], 'dead-sea': ['Dead Sea'], 'lake-victoria': ['Lake Victoria'],
  'lake-tanganyika': ['Lake Tanganyika'], 'lake-malawi': ['Lake Malawi'], 'lake-chad': ['Lake Chad'], 'lake-turkana': ['Lake Turkana'],
  'lake-tana': ['Lake Tana'], 'lake-volta': ['Lake Volta'], 'lake-geneva': ['Lake Geneva'], 'lake-ladoga': ['Lake Ladoga'],
  'lake-balaton': ['Lake Balaton'], 'issyk-kul': ['Issyk-Kul'], 'lake-eyre': ['Lake Eyre North', 'Lake Eyre South'], 'lake-taupo': ['Lake Taupo'],
  'lake-vanern': ['Vänern'], 'sea-of-galilee': ['Sea of Galilee']
};

const regions = JSON.parse(fs.readFileSync(regionsFile, 'utf8')).features;
const areas = {};
for (const [id, names] of Object.entries(AREAS)) {
  const found = regions.filter((f) => names.includes(f.properties.NAME));
  const missing = names.filter((n) => !found.some((f) => f.properties.NAME === n));
  if (missing.length) throw new Error(id + ': not found in Natural Earth: ' + missing.join(', '));
  areas[id] = { type: 'MultiPolygon', coordinates: thinPolys(found.flatMap((f) => polys(f.geometry)), 0.06) };
}
const lakeSource = JSON.parse(fs.readFileSync(lakesFile, 'utf8')).features;
for (const [id, names] of Object.entries(LAKE_AREAS)) {
  const found = lakeSource.filter((f) => names.includes(f.properties.name));
  const missing = names.filter((n) => !found.some((f) => f.properties.name === n));
  if (missing.length) throw new Error(id + ': lake not found in Natural Earth: ' + missing.join(', '));
  areas[id] = { type: 'MultiPolygon', coordinates: thinPolys(found.flatMap((f) => polys(f.geometry)), 0.02) };
}
// ---------- Oceans and seas (Natural Earth marine areas) ----------
// Natural Earth cuts the water into pieces: 7 ocean pieces plus ~300 seas, gulfs, bays and straits that
// share exact borders. Each ocean card = its ocean pieces + every open sea, gulf or strait connected to it
// (the Caribbean and Gulf of Mexico are Atlantic, the Coral Sea is Pacific...). Seas almost fully closed in
// by land stay out, along with everything you can only reach through them (the Adriatic via the Mediterranean).
const OCEAN_PARTS = {
  'pacific-ocean': ['North Pacific Ocean', 'South Pacific Ocean'], 'atlantic-ocean': ['North Atlantic Ocean', 'South Atlantic Ocean'],
  'indian-ocean': ['INDIAN OCEAN'], 'arctic-ocean': ['Arctic Ocean'], 'southern-ocean': ['SOUTHERN OCEAN']
};
const NOT_IN_AN_OCEAN = ['Mediterranean Sea', 'Strait of Gibraltar', 'Alboran Sea', 'Black Sea', 'Sea of Marmara', 'Bosporus', 'Dardanelles',
  'Baltic Sea', 'Kattegat', 'Øresund', 'Mecklenburger Bucht', 'Red Sea', 'Persian Gulf', 'Caspian Sea', 'Hudson Bay', 'James Bay', 'Foxe Basin'];
const NOT_WATER_AREAS = ['river', 'lagoon']; // river mouths and lagoons are drawn as marine areas too; leave them out
// Sea cards -> the Natural Earth pieces that make up each sea.
const SEA_AREAS = {
  'mediterranean-sea': ['Mediterranean Sea', 'Alboran Sea', 'Balearic Sea', 'Ligurian Sea', 'Tyrrhenian Sea', 'Ionian Sea', 'Adriatic Sea',
    'Aegean Sea', 'Sea of Crete', 'Golfe du Lion', 'Gulf of Sidra', 'Gulf of Gabès'],
  'caribbean-sea': ['Caribbean Sea', 'Gulf of Honduras'], 'red-sea': ['Red Sea', 'Gulf of Suez', 'Gulf of Aqaba'], 'black-sea': ['Black Sea'],
  'baltic-sea': ['Baltic Sea', 'Gulf of Bothnia', 'Gulf of Finland', 'Gulf of Riga', 'Mecklenburger Bucht'], 'north-sea': ['North Sea'],
  'arabian-sea': ['Arabian Sea'], 'south-china-sea': ['South China Sea'], 'bering-sea': ['Bering Sea'], 'sea-of-japan': ['Sea of Japan'],
  'coral-sea': ['Coral Sea'], 'tasman-sea': ['Tasman Sea'], 'sargasso-sea': ['Sargasso Sea'], 'yellow-sea': ['Yellow Sea'],
  'caspian-sea': ['Caspian Sea', 'Garabogaz Bay']
};
if (marineFile) {
  const marine = JSON.parse(fs.readFileSync(marineFile, 'utf8')).features;
  const nameOf = (f) => f.properties.name || '';
  for (const [id, names] of Object.entries(SEA_AREAS)) {
    const found = marine.filter((f) => names.includes(nameOf(f)));
    const missing = names.filter((n) => !found.some((f) => nameOf(f) === n));
    if (missing.length) throw new Error(id + ': sea not found in Natural Earth: ' + missing.join(', '));
    areas[id] = { type: 'MultiPolygon', coordinates: densePolys(thinPolys(found.flatMap((f) => polys(f.geometry)), 0.05)) };
  }
  // Which pieces touch: count the border points two pieces share.
  const key = (c) => c[0].toFixed(3) + ',' + c[1].toFixed(3);
  const owners = new Map();
  marine.forEach((f, i) => {
    for (const p of polys(f.geometry)) for (const r of p) for (const c of r) {
      const k = key(c); if (!owners.has(k)) owners.set(k, new Set()); owners.get(k).add(i);
    }
  });
  const shared = marine.map(() => new Map());
  for (const set of owners.values()) for (const a of set) for (const b of set) if (a !== b) shared[a].set(b, (shared[a].get(b) || 0) + 1);
  const ocean = marine.map((f) => Object.keys(OCEAN_PARTS).find((id) => OCEAN_PARTS[id].includes(nameOf(f))) || null);
  const blocked = (i) => NOT_IN_AN_OCEAN.includes(nameOf(marine[i])) || NOT_WATER_AREAS.includes(marine[i].properties.featurecla);
  // Spread outward from the oceans, one ring of neighbours at a time; each piece joins the ocean it shares the most border with.
  for (let changed = true; changed;) {
    changed = false;
    const next = ocean.slice();
    marine.forEach((f, i) => {
      if (ocean[i] || blocked(i)) return;
      const votes = {};
      for (const [j, n] of shared[i]) if (ocean[j]) votes[ocean[j]] = (votes[ocean[j]] || 0) + n;
      const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
      if (best) { next[i] = best; changed = true; }
    });
    ocean.splice(0, ocean.length, ...next);
  }
  for (const id of Object.keys(OCEAN_PARTS)) {
    const parts = marine.filter((f, i) => ocean[i] === id);
    areas[id] = { type: 'MultiPolygon', coordinates: densePolys(thinPolys(parts.flatMap((f) => polys(f.geometry)), 0.4)) }; // coarser: a pin on a phone can't tell 25 miles of coastline apart
    console.log(id + ':', parts.map(nameOf).filter(Boolean).sort().join(', '));
  }

  // ---------- data/waters.json: the name of every named piece of sea, for "Your pin: ..." ----------
  // A pin west of Pisa says "Tyrrhenian Sea, part of the Mediterranean Sea", not just "Mediterranean Sea".
  // The pieces fit together like a puzzle, so a pin is in exactly one. Each piece's "part of" comes from,
  // in order: PART_OF / BETWEEN below, the sea card it belongs to (SEA_AREAS), then the ocean it joined above
  // (the same ocean its card scores it in, so the name and the bullseye always agree).
  const OCEAN_NAME = { 'pacific-ocean': 'Pacific Ocean', 'atlantic-ocean': 'Atlantic Ocean', 'indian-ocean': 'Indian Ocean',
    'arctic-ocean': 'Arctic Ocean', 'southern-ocean': 'Southern Ocean' };
  // English names (Natural Earth's English name, or these where it reads oddly).
  const NAME_FIX = { 'Cook Inlet': 'Cook Inlet', 'Hangzhou Bay': 'Hangzhou Bay', 'Garabogaz Bay': 'Garabogaz Bay',
    'Uummannaq Fjord': 'Uummannaq Fjord', 'Kaliningrad': 'Vistula Lagoon', 'Amazon River': 'Amazon River', 'Yangtze River': 'Yangtze River',
    'Gulf of Anadyr\'': 'Gulf of Anadyr', 'Uda Bay': 'Uda Bay', 'Gulf of Yana': 'Yana Bay', 'Inner Sea': 'Seto Inland Sea' };
  // Smaller seas, gulfs and bays that sit inside a bigger named sea.
  const PART_OF = {
    'Bahía de Campeche': 'Gulf of Mexico', 'Golfo de Urabá': 'Caribbean Sea', 'Bo Hai': 'Yellow Sea',
    'Gulf of Thailand': 'South China Sea', 'Gulf of Tonkin': 'South China Sea', 'Gulf of Oman': 'Arabian Sea',
    'Gulf of Kutch': 'Arabian Sea', 'Gulf of Khambhät': 'Arabian Sea', 'Gulf of Masira': 'Arabian Sea',
    'Gulf of Mannar': 'Laccadive Sea', 'Gulf of Martaban': 'Andaman Sea',
    'Bristol Bay': 'Bering Sea', 'Norton Sound': 'Bering Sea', 'Gulf of Anadyr\'': 'Bering Sea', 'Karaginskiy Gulf': 'Bering Sea',
    'Kotzebue Sound': 'Chukchi Sea', 'Shelikhova Gulf': 'Sea of Okhotsk', 'Gulf of Sakhalin': 'Sea of Okhotsk', 'Uda Bay': 'Sea of Okhotsk',
    'East Korea Bay': 'Sea of Japan (East Sea)', 'White Sea': 'Barents Sea', 'Bight of Benin': 'Gulf of Guinea', 'Bight of Biafra': 'Gulf of Guinea',
    'Great Barrier Reef': 'Coral Sea', 'James Bay': 'Hudson Bay', 'Wager Bay': 'Hudson Bay', 'Waddenzee': 'North Sea', 'Gulf of Boothia': 'Arctic Ocean',
    'Bay of Fundy': 'Gulf of Maine', 'Massachusetts Bay': 'Gulf of Maine', 'Cook Inlet': 'Gulf of Alaska', 'Prince William Sound': 'Gulf of Alaska',
    'Baird Inlet': 'Bering Sea', 'Gulf of Carpentaria': 'Arafura Sea', 'Joseph Bonaparte Gulf': 'Timor Sea', 'Gulf of Papua': 'Coral Sea',
    'Sognefjorden': 'North Sea', 'Boknafjorden': 'North Sea', 'Trondheimsfjorden': 'Norwegian Sea', 'Vestfjorden': 'Norwegian Sea',
    'Melville Bay': 'Baffin Bay', 'Disko Bay': 'Baffin Bay', 'Uummannaq Fjord': 'Baffin Bay', 'Bay Inútil': 'Strait of Magellan'
  };
  // Straits and in-between waters: say what they join instead.
  const BETWEEN = {
    'Strait of Gibraltar': 'between the Atlantic Ocean and the Mediterranean Sea', 'Bosporus': 'between the Black Sea and the Sea of Marmara',
    'Dardanelles': 'between the Sea of Marmara and the Aegean Sea', 'Sea of Marmara': 'between the Black Sea and the Aegean Sea',
    'Sea of Azov': 'joined to the Black Sea', 'Gulf of Aden': 'between the Red Sea and the Arabian Sea',
    'Bab el Mandeb': 'between the Red Sea and the Gulf of Aden', 'Kattegat': 'between Denmark and Sweden', 'Øresund': 'between Denmark and Sweden',
    'Yucatan Channel': 'between the Gulf of Mexico and the Caribbean Sea', 'Straits of Florida': 'between the Gulf of Mexico and the Atlantic Ocean',
    'Tatar Strait': 'between the Sea of Japan and the Sea of Okhotsk', 'Lago de Maracaibo': 'joined to the Caribbean Sea',
    'Skagerrak': 'between Norway and Denmark', 'Strait of Malacca': 'between the Andaman Sea and the South China Sea',
    'Strait of Singapore': 'between the Strait of Malacca and the South China Sea', 'Estrecho de Magellanes': 'between the Atlantic and Pacific oceans',
    'Bass Strait': 'between Tasmania and mainland Australia', 'Torres Strait': 'between Australia and New Guinea',
    'Drake Passage': 'between South America and Antarctica', 'Hudson Strait': 'between Hudson Bay and the Labrador Sea',
    'Baffin Bay': 'between Greenland and Canada', 'La Pérouse Strait': 'between Sakhalin and Hokkaido',
    'Luzon Strait': 'between Taiwan and the Philippines', 'Davis Strait': 'between Greenland and Canada',
    // The seas of Indonesia sit where two oceans meet, and atlases disagree on which one owns them.
    'Java Sea': 'where the Pacific and Indian oceans meet', 'Banda Sea': 'where the Pacific and Indian oceans meet',
    'Flores Sea': 'where the Pacific and Indian oceans meet', 'Bali Sea': 'where the Pacific and Indian oceans meet',
    'Savu Sea': 'where the Pacific and Indian oceans meet', 'Arafura Sea': 'where the Pacific and Indian oceans meet',
    'Makassar Strait': 'where the Pacific and Indian oceans meet'
  };
  // Natural Earth draws a few famous straits as thin slivers along the coast (the open water in the middle belongs
  // to the seas on each side). These get a simple outline across the water instead; land never matters, because
  // a pin on land is named by its country first. [lon, lat] corners.
  const box = (w, s, e, n) => ({ type: 'Polygon', coordinates: [[[w, s], [w, n], [e, n], [e, s], [w, s]]] });
  const STRAIT_SHAPES = {
    'Strait of Gibraltar': box(-6.0, 35.78, -5.35, 36.2), 'Bab el Mandeb': box(43.15, 12.4, 43.6, 12.85),
    'Drake Passage': box(-67.5, -62, -58, -55.8), 'Yucatan Channel': box(-86.8, 21.3, -84.9, 22.2),
    'Luzon Strait': box(119.5, 18.6, 122.5, 21.9), 'La Pérouse Strait': box(141.6, 45.35, 142.4, 46.0)
  };
  for (const f of marine) if (STRAIT_SHAPES[nameOf(f)]) f.geometry = STRAIT_SHAPES[nameOf(f)];
  const the = (p) => (/Bay$/.test(p) && !/^Bay of/.test(p) ? p : 'the ' + p);
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/questions.json'), 'utf8'));
  const cardName = {};
  (bank.questions || bank).forEach((q) => { if (SEA_AREAS[q.id]) cardName[q.id] = q.answer.split(',')[0]; });
  const seaPart = {}, seaMain = {};
  for (const [id, names] of Object.entries(SEA_AREAS)) names.forEach((n, k) => { if (k) seaPart[n] = cardName[id]; else seaMain[n] = cardName[id]; });
  const labels = new Map(); // label -> pieces (Natural Earth splits some waters in two, e.g. North and South Pacific)
  marine.forEach((f, i) => {
    const name = nameOf(f), oceanId = ocean[i];
    let label;
    if (Object.values(OCEAN_PARTS).some((parts) => parts.includes(name)) || !name) {
      if (!oceanId) return; // an unnamed piece outside every ocean: leave it to the sea cards
      label = OCEAN_NAME[oceanId];
    } else {
      const display = seaMain[name] || NAME_FIX[name] || f.properties.name_en || name;
      const part = PART_OF[name] || seaPart[name] || (oceanId && OCEAN_NAME[oceanId]);
      label = BETWEEN[name] ? display + ', ' + BETWEEN[name] : part ? display + ', part of ' + the(part) : display;
    }
    if (!labels.has(label)) labels.set(label, { piece: !!name && !Object.values(OCEAN_NAME).includes(label), polys: [] });
    labels.get(label).polys.push(...polys(f.geometry));
  });
  // Smallest first, oceans last: where two outlines overlap (a strait and the seas on each side), the smaller water wins.
  const spanOf = (w) => {
    const xs = w.polys.flatMap((p) => p[0].map((c) => c[0])), ys = w.polys.flatMap((p) => p[0].map((c) => c[1]));
    return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  };
  const waters = [...labels].map(([n, w]) => ({ n, w, span: w.piece ? spanOf(w) : 1e9 })).sort((a, b) => a.span - b.span)
    // Small waters (a strait a few miles wide) keep their detail; big ones are simplified to keep the game small.
    .map(({ n, w, span }) => ({ n, area: { type: 'MultiPolygon', coordinates: thinPolys(w.polys, !w.piece ? 0.25 : span < 2 ? 0.02 : 0.1) } }));
  const watersFile = path.join(__dirname, '../../data/waters.json');
  fs.writeFileSync(watersFile, JSON.stringify({
    _about: 'Every named sea, gulf, bay and strait with its outline (lon, lat), for "Your pin: Tyrrhenian Sea, part of the Mediterranean Sea". Built by prototype/tools/build-areas.js from Natural Earth 1:10m marine areas (public domain).',
    waters
  }));
  console.log('waters.json:', waters.length, 'waters,', Math.round(fs.statSync(watersFile).size / 1024), 'KB');
}

const areasFile = path.join(__dirname, '../../data/areas.json');
fs.writeFileSync(areasFile, JSON.stringify({
  _about: 'Outline of each desert, mountain-range, lake, sea and ocean card (lon, lat). Inside = bullseye; outside is measured to the nearest edge. Built by prototype/tools/build-areas.js from Natural Earth 1:10m geography regions and marine areas (public domain).',
  areas
}));

// Lake names in English for "Your pin: Lake Titicaca" (Natural Earth's English names drop the word "Lake").
const LAKE_NAME_FIX = { 'Bodensee': 'Lake Constance', 'Lago Madre': 'Laguna Madre', 'Lac Moeru': 'Lake Mweru', 'Lac Tumba': 'Lake Tumba',
  'Kaliningradskiy Zaliv': 'Vistula Lagoon', 'Zalev Wislany': 'Vistula Lagoon', 'Biwa Ko': 'Lake Biwa', 'Danau Toba': 'Lake Toba',
  'Ft. Peck Lake': 'Fort Peck Lake', 'Toktogul Res.': 'Toktogul Reservoir', 'Rés. de La Grande 3': 'La Grande-3 Reservoir',
  'Rés. de La Grande 2': 'Robert-Bourassa Reservoir', 'Lago Gatun': 'Gatun Lake', 'Inarijärvi': 'Lake Inari', "Lake Il'Men'": 'Lake Ilmen',
  'Lake Äbaya': 'Lake Abaya', 'Van Blommestein Meer': 'Brokopondo Reservoir', 'Represa de Sobradinho': 'Sobradinho Reservoir',
  'Represa de Tucuruí': 'Tucuruí Reservoir', 'Represa Três Marias': 'Três Marias Reservoir', 'Itaipú Reservoir': 'Itaipu Reservoir' };
const lakeName = (n) => LAKE_NAME_FIX[n] || (n || '').replace(/^Lago (de )?/, 'Lake ').replace(/^Ozero /, 'Lake ').replace(/^L\. /, 'Lake ')
  .replace(/ L\.$/, ' Lake').replace(/ (Hu|Nuur|Köli)$/, ' Lake');
const lakes = JSON.parse(fs.readFileSync(lakesFile, 'utf8')).features.map((f) => ({
  type: 'Feature', properties: { name: lakeName(f.properties.name) },
  geometry: { type: 'MultiPolygon', coordinates: thinPolys(polys(f.geometry), 0.03) }
})).filter((f) => f.geometry.coordinates.length);
const lakesOut = path.join(__dirname, '../vendor/lakes-50m.json');
fs.writeFileSync(lakesOut, JSON.stringify({ type: 'FeatureCollection', features: lakes }));

console.log('areas.json:', Object.keys(areas).length, 'areas,', Math.round(fs.statSync(areasFile).size / 1024), 'KB');
console.log('lakes-50m.json:', lakes.length, 'lakes,', Math.round(fs.statSync(lakesOut).size / 1024), 'KB');
