# World Scroll — Project Brief (for Claude Code)

## What it is
World Scroll is a mobile geography game from HiiPointe Games. It works like a map-tap quiz, but you play it as a vertical feed, the way TikTok works. Each card asks "Where is ___?" The player taps a map to guess, locks in the guess, and sees how far off they were (in miles), their points, and a fun fact. Then they swipe up to get the next card.

Tagline idea: "Doomscrolling, but you get smarter."

## Core loop (one card)
1. A category chip shows at the top (RIVERS, COUNTRIES, CAPITALS, CITIES, MOUNTAINS, DESERTS, SPORTS…).
2. A prompt shows, e.g. "Where is the Gobi Desert?" or "Where do the Chiefs play?"
3. The map starts with **no pins and no labels**. Nothing on screen gives away the answer.
4. The player taps the map, and a gold guess pin drops there. Tapping again moves the pin.
5. The "Lock in my guess" button stays disabled until a pin is placed.
6. On lock-in:
   - the real location appears (teal ring), with a dashed line from the guess to it
   - distance is calculated with the haversine formula (miles, Earth radius 3958.8 mi)
   - "Bullseye!" shows if the guess is within the card's tolerance (default 25 mi)
   - points = round(1000 * e^(-miles / 350)), never below 0
   - a city/answer line and a fun fact appear
7. Swiping up or tapping "Next" loads the next card. "Skip" also moves on.

## Areas vs points
Some answers are areas or lines (rivers, deserts, mountain ranges). For the MVP, each card has one representative lat/lon plus `toleranceMiles`. Any guess within the tolerance counts as a bullseye, and the distance is measured from the representative point. Later this can be upgraded to distance-to-polygon or distance-to-line using GeoJSON.

## Feeds
- **Shuffle the whole world**: a mixed feed across all categories.
- **Single category**: Countries, Capitals, Cities, Rivers, Mountains, Deserts.
- **Sports**: two levels of tabs.
  - Region row: USA · Europe · Australia
  - Sport row (changes with the region):
    - USA → NFL, NBA, MLB
    - Europe → Premier League, La Liga, Rugby (France Top 14)
    - Australia → Football (AFL), Rugby (NRL), Cricket (Big Bash)
  - The map is always zoomed to the whole region (all of Europe even for a Liverpool question). It is never zoomed to the answer's country.
- **Daily 10 Challenge**: the same 10 cards for every player each day (seeded by date).

## Maps
- Use real map data: Natural Earth via the `world-atlas` npm package (countries-50m), and `us-atlas` (states-10m) for US state lines.
- Region views (lon/lat bounds):
  - USA: lon -126 to -65, lat 23.5 to 50 (lower 48 + edges of Canada/Mexico)
  - Europe: lon -14 to 38, lat 34.5 to 61.5
  - Australia: lon 111 to 179, lat -47.5 to -9.5 (includes NZ and Tasmania)
  - World/globe: a full world view for the main feed
- The prototype used an equirectangular projection scaled by cos(center latitude), so taps are easy to convert back to lat/lon. In the app, use `d3-geo` with any projection that has `.invert()` (geoMercator or geoNaturalEarth1 are fine). Convert the tap to lat/lon with `projection.invert`.
- Color the focus region teal (#2E6F8E), neighboring land dark blue (#1D2B5E), water #0F1A40, and borders white at 18–28% opacity. **Never draw city names.**
- Later: pinch-to-zoom and pan on the map.

## Design system (from the prototype)
- Background ink: #0B1026 · Card surface: #151C42 · Raised: #1A2350 · Outline: #232C60 / #2A3570
- Text: #F4F1E8 · Muted text: #B9BEDA · Dim text: #8E95BD
- Primary accent (gold): #FFB547, for guess pins and primary buttons (dark text #0B1026 on top)
- Secondary accent (teal): #3DDCC4, for correct answers, points, and selected sub-tabs
- Sports chip / region tab selected: #FF6FA8
- Category chip colors: Countries #FFB547 · Capitals #FF8F6B · Cities #9BE7A8 · Rivers #3DDCC4 · Mountains #A9C6FF · Deserts #F7C873 · Sports #FF6FA8
- Fonts: **Fredoka** (headings, buttons, wordmark) + **Inter** (body), from Google Fonts
- Wordmark: "World" in text color + "Scroll" in gold
- Rounded everything: buttons 18px radius, chips fully round, cards 16–22px
- Touch targets ≥ 44px. Keep text contrast ≥ 4.5:1.

## Reference files in this folder
- `design/screens/*.dc.html`: the four prototype screens (The Scroll, Result, Pick your feed, Sports). They are written in a design-canvas format and won't run standalone. Read them for **layout, copy, colors and logic**. The `class Component` script in `Sports.dc.html` has the working tap → lat/lon → miles → points logic to port.
- `data/questions.json`: starter question bank (lat/lon, tolerance, facts).

## Recommended stack (confirm with the dev partner before scaffolding)
- **Expo (React Native) + TypeScript**, so it runs on a real phone right away through Expo Go
- `expo-router` for screens
- `react-native-svg` + `d3-geo` + `topojson-client` for maps
- `react-native-gesture-handler` + `react-native-reanimated` for the vertical swipe feed (or a paged FlatList for the MVP)
- Local state first (zustand or React context). Persist streak/points with AsyncStorage.
- No backend for the MVP. Questions ship as JSON in the app.

## MVP scope (build in this order)
1. Scaffold the Expo app, theme tokens, fonts
2. Map component: renders a region from topojson, handles a tap → lat/lon, draws guess/answer pins and the dashed line
3. Card screen with the full core loop (guess → lock in → miles/points/fact → next)
4. Vertical swipe feed between cards
5. Pick your feed screen + Sports region/sport tabs
6. Score, streak and daily-10 (seeded) stored locally
7. Polish: haptics on lock-in, a little animation on the reveal, sound toggle

## Out of scope for now
Accounts, leaderboards, multiplayer, ads/IAP, official team logos (these need league licenses; use team names only).

## Content rules (always)
- **Kid-friendly facts only.** Every fact (countries, capitals, cities, sports, anything new) must be child-friendly. Good topics: famous foods, inventions, positive famous people, big exports, upbeat history. Never: war, murder, death, crime, alcohol, sexual content, or anything negative. Keep facts ≤160 characters. `prototype/scoring.test.js` has a banned-word test that must keep passing. Extend its list; don't loosen it.
- **Never say "tap the map"** (or "map tap" / "tap the globe"). A competing game is called Map Tap. Use "Drop a pin" and "Lock in your guess" instead.
- **Sports questions never name the city or state.** Ask "Where do the Grizzlies play?", not "Where do the Memphis Grizzlies play?". Short names live in `data/usa-teams.json` (`shortNames`) and in each card's `prompt` (full name in `team`). Clubs named only after a place use their official nickname; true exceptions (e.g. national rugby teams) keep the place. A test checks this.
- **Wording changes apply everywhere.** When copy changes, update every screen that says the same thing, including the first-open welcome screen (`showIntro` in `prototype/src/app.js`). Grep for the old wording before calling it done.

## Working style
- Ask before adding big dependencies.
- Keep components small. Put question data in JSON, not hard-coded in components.
- After each MVP step, tell Bryce how to run it on his phone (`npx expo start`, then scan the QR code with Expo Go).
- Bryce leads marketing and strategy, and his business partner handles development. Explain things in plain language and keep the code clean for the partner to pick up.
