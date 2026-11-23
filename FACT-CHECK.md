# World Scroll fact check — November 20, 2026

Every fact in the game was reviewed on Friday, November 20, 2026. That covers the "Now you know" card facts, all 🤓 Nerd facts and all 💎 Deep Dive facts: **4,071 facts on 1,008 cards**.

## How it was checked

- **Read line by line:** every fact, grouped by category (each league, cities, capitals, countries, rivers & oceans, lakes & seas, mountains, deserts, landmarks).
- **Checked online:** anything that can change with time:
  - 2026 FIFA World Cup: Spain won, so Brazil's five titles are still the most.
  - 2026 Champions League: PSG won, so Real Madrid's 15 and Liverpool's 6 still stand.
  - 2026 WNBA title: Golden State won, so the Lynx still have four.
  - The Sagrada Família became the tallest church in 2026.
  - Mosquitoes were found in Iceland in October 2025.
  - The 2025-26 champions were checked online on November 18 (see the test "facts are current as of November 18, 2026").
- **Kid-friendly review:** two facts named coaches who later left over misconduct. Both were replaced, even though they were accurate.
- **Repeats:** facts that said nearly the same thing on two different cards were swapped for something new.

## What changed

| Card | Was | Now |
|---|---|---|
| Iceland | "no mosquitoes at all" | Mosquitoes were found in Oct 2025; now: no native snakes, frogs or lizards |
| Spokane (USL1) | hosted two world's fairs | hosted one, Expo '74 |
| New England Revolution | "set the MLS record" with 73 points | a record *at the time* (Inter Miami got 74 in 2024) |
| Atlanta United | Martino "later coached Argentina" | he coached Argentina *before* Atlanta; also Mexico and Inter Miami |
| Atlanta, Chicago Fire, D.C. United, LAFC, Portland Thorns | card fact was half a sentence ("Bob Bradley, who…") | "Their first coach was…" |
| Chicago Stars, NC Courage | named coaches who later left over misconduct | replaced with titles and finals |
| Angel City | "founded by Natalie Portman" | co-founded |
| Italy rugby | Stadio Olimpico "built for" 1960 Olympics | it opened in 1953 and *hosted* them |
| Cleveland Browns | half sentence about Paul Brown | full sentence, "helped invent" |
| Italian Open | 60 statues | about 60 |
| Seattle | first Starbucks "at" Pike Place | *near* it (it moved into the market in 1976) |
| Montreal | Cirque du Soleil started in Montreal | started in Quebec (Baie-Saint-Paul), based in Montreal |
| New York | "never sleeps *because* the subway runs all night" | the nickname and the subway are separate facts |
| Miami | "Biscayne Bay" national park | Biscayne National Park |
| Chicago | "the world's first skyscraper" | "often called" the first |
| Wyoming | first *state* to let women vote | first place in the US, while still a territory |
| Malé | about 3 square miles | an island smaller than one square mile |
| Rome | Pantheon "unsupported" dome | *unreinforced* dome |
| Canberra | roof "you can walk on" | built into a hill with grass over its roof |
| Managua | lava lake "you can peek into" | *sometimes* visible |
| New Zealand | five sheep per person | about four |
| Israel | invented "the" USB drive | "one of the first" (the claim is disputed) |
| Turkmenistan | gas crater burning "since 1971" | "for decades" (the start date isn't certain) |
| Potala Palace | "almost 12,000 feet" | about 12,000 (it's just over) |
| Gobi, Sahara, Gateway Arch, CN Tower | new nerd facts that repeated another card | swapped for new facts |

## Still worth refreshing later

- **NWSL final (Nov 21, 2026) and MLS Cup (December 2026):** update the winners after they're played.
- **League line-ups:** each summer, as clubs move up and down.
- **Populations:** the country nerd facts use rounded 2024-25 estimates. Update them when new UN numbers come out.
- **Long-term records** (tallest, biggest, oldest): these were true on November 20, 2026. Spot-check them once a year.

The test "fact check of November 20, 2026: corrections stay fixed" in `prototype/scoring.test.js` stops the fixed facts from coming back by mistake.

---

# Bodies of water check — November 23, 2026

Bryce dropped a pin west of Pisa and the game said "Mediterranean Sea". It now names the exact water and what it belongs to: "Tyrrhenian Sea, part of the Mediterranean Sea".

## What was checked
- **All 84 water cards** (31 rivers, 5 oceans, 15 seas, 33 lakes): every answer, fact and nerd fact re-read, and every card's answer spot tested against its own outline. One fix: the Black Sea reaches the Mediterranean through the Bosporus, **then the Sea of Marmara and the Dardanelles** (it used to say the Bosporus alone).
- **"Your pin" names for 292 seas, gulfs, bays and straits** (from Natural Earth, built by `prototype/tools/build-areas.js` into `data/waters.json`). Each name was read for accuracy. Choices made:
  - Smaller waters name the sea they sit in: Bay of Campeche → Gulf of Mexico, Bohai Sea → Yellow Sea, Gulf of Thailand → South China Sea, Bay of Fundy → Gulf of Maine.
  - Straits say what they join: "Strait of Gibraltar, between the Atlantic Ocean and the Mediterranean Sea".
  - The seas of Indonesia (Java, Banda, Flores, Bali, Savu, Arafura, Makassar Strait) say "where the Pacific and Indian oceans meet", because atlases disagree on which ocean owns them. Baffin Bay and Davis Strait say "between Greenland and Canada" for the same reason.
  - Six famous straits are drawn as thin slivers in Natural Earth (Gibraltar, Bab-el-Mandeb, Drake Passage, Yucatán Channel, Luzon, La Pérouse), so they got a simple hand-drawn outline.
  - Enclosed seas keep the game's rule: the Mediterranean, Black, Baltic, Red, Persian Gulf, Hudson Bay and Caspian aren't called part of an ocean.
- **Lakes:** a pin in a lake names it and its country ("Lake Victoria, in Uganda"). 321 lake names on the map were put into English (Lago Titicaca → Lake Titicaca, Bodensee → Lake Constance).
- The Gulf of Mexico keeps its international name (the US government calls it the Gulf of America since 2025). Change it if we decide otherwise.
