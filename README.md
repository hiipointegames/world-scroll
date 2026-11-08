# World Scroll

A TikTok-style scrolling geography game from HiiPointe Games. *Learn geography by scrolling.*

## What's in here
- `CLAUDE.md`: the project brief: game rules, design system, stack, MVP plan, content rules. Claude Code reads it automatically every session.
- `PROMPT.md`: the original kickoff message for Claude Code.
- `data/`: the question bank, all JSON.
  - `questions.json`: regions, categories, sports tabs, and hand-written cards (rivers, mountains, deserts, cities, Europe/Australia sports)
  - `countries.json`: 197 countries and capitals, plus the 50 US state capitals
  - `place-facts.json`: kid-friendly facts for every country and capital
  - `usa-teams.json`: 220 US/Canada pro sports teams (NFL, NBA, MLB, NHL, MLS, NWSL, USL)
- `design/screens/`: the original design-canvas screens (reference only; they don't run on their own).
- `prototype/`: a clickable web prototype of the full game.

## Play the prototype
Open `prototype/world-scroll.html` in a browser. It's one self-contained file and needs no server.

## Work on the prototype
You need Node.js (LTS).
- Edit files in `prototype/src/` or `data/`, then rebuild: `node prototype/build.js`
- Run the tests: `node --test prototype/scoring.test.js`

`prototype/vendor/` holds the map data (Natural Earth via `world-atlas` countries-50m, and `us-atlas` states-10m).

## Next step
Build the real phone app (Expo + React Native). See the MVP plan in `CLAUDE.md`. The scoring logic in `prototype/src/scoring.js` and the JSON data carry over directly.
