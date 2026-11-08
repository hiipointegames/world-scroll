// Builds the one-file clickable prototype: prototype/world-scroll.html
// Run from the project folder:  node prototype/build.js
// It inlines the game math, the question bank (data/questions.json) and the map data,
// so the page works with no server. Re-run it after editing anything in src/ or questions.json.
const fs = require('fs');
const path = require('path');
const { loadData } = require('./src/data.js');

const dir = __dirname;
const read = (p) => fs.readFileSync(path.join(dir, p), 'utf8');
const json = (p) => JSON.stringify(JSON.parse(read(p)));

const parts = {
  '/*__SCORING__*/': read('src/scoring.js'),
  '/*__SOUND__*/': read('src/sound.js'),
  '/*__QUESTIONS__*/': JSON.stringify(loadData()),
  '/*__WORLD__*/': json('vendor/countries-50m.json'),
  '/*__US__*/': json('vendor/states-10m.json'),
  '/*__APP__*/': read('src/app.js'),
};

let html = read('src/app.html');
for (const [marker, content] of Object.entries(parts)) {
  if (!html.includes(marker)) throw new Error('Missing marker ' + marker + ' in src/app.html');
  html = html.split(marker).join(content);
}
const out = path.join(dir, 'world-scroll.html');
fs.writeFileSync(out, html);
console.log('Built ' + path.relative(process.cwd(), out) + ' (' + Math.round(html.length / 1024) + ' KB)');
