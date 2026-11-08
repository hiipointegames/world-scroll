# Kickoff prompt: paste this into Claude Code

---

Hi Claude! This folder is the starter pack for **World Scroll**, a mobile geography game from HiiPointe Games. Before you do anything else, read `CLAUDE.md` all the way through. Then read every file in `design/screens/` and `data/questions.json`. Don't start from fragments; I want you to have the whole picture first.

The `.dc.html` files in `design/screens/` are design prototypes made on a design canvas. They won't run on their own, so treat them as the visual and logic spec. The script at the bottom of `Sports.dc.html` has the working logic for tap → lat/lon → miles off → points. Port that logic.

**Goal for this session:** turn the prototype into a basic working app I can play on my own phone.

Please do this:
1. Give me a short summary of what you understood and the plan, in plain language. Confirm the stack (Expo + React Native + TypeScript, per CLAUDE.md). If you think something else is better, tell me why before you start.
2. Ask me any clarifying questions, interview style, one at a time, before you write a lot of code.
3. Then build the MVP in the order listed in CLAUDE.md, one step at a time. After each step, tell me exactly how to run it on my phone with Expo Go, and wait for me to say "next."

Rules that matter most:
- The map must **never** give away the answer before the player locks in. No labels and no pins until the player taps.
- The map is always zoomed out to the whole region (all of Europe for a Liverpool question, the whole lower 48 for a US team).
- After lock-in, show the real spot, a dashed line from the guess, **how many miles off** the guess was, the points, and the fun fact.
- Use real map data (world-atlas / us-atlas), not hand-drawn shapes.
- Match the colors, fonts (Fredoka + Inter) and dark look from the design files.
- Use team names only. No team or league logos.

Let's start with step 1.

---
