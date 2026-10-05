# Championship Rounds

An MMA game for mobile from **SpecMagic Games**. Build a fighter from the regional circuit to a world title, run a fight promotion as its matchmaker, or jump straight into a fight. Every fight can be played hands-on, with pixel-art fighters and direct control.

The whole game runs in the browser with no build step and no server. It installs to a phone home screen and plays offline.

## Game modes

### Hands-on fights
Every fight can be played live in a side-on pixel-art arena:
- **Striking:** jab, cross/hook combos, overhand, leg kicks and head kicks, blocking, checking kicks, and dodging.
- **Six divisions** from featherweight (145 lb) to heavyweight, with hand-made stars like TFC middleweight champion Lane "Too Far" Johnson and featherweight contender Eric "The Machine" Duncle.
- **Octagon fights:** fighters move freely around the cage: circle, cut off the cage, pin a man against any side of the fence. A SNES-style "Mode 7" broadcast camera swings around the action, with seating all around the cage and a mini-map in the corner.
- **Dynamic striking:** combos that flow faster when you chain them, uppercuts up close, body hooks and body kicks, teeps, a superman punch and a spinning back kick (risky if they miss), dash-ins, knockback against the fence, rocked states, and a momentum meter that puts you on fire.
- **Counters:** parries (block right as a punch lands), catch kicks, counter knees into a shot, and front-headlock follow-ups after a sprawl (go behind or guillotine).
- **Damage that matters:** separate head, body and leg damage, stamina, knockdowns, and wobbled fighters.
- **Grappling:** clinch work, takedowns and sprawls, five ground positions (guard, half guard, side control, mount, back), ground and pound, sweeps, escapes, and submissions decided by tap battles. Bottom fighters build scramble momentum, can wall-walk up from side control, and the referee stands up stalling fighters, so a takedown is a phase of the fight, not the end of it.
- **Rules by promotion:** cage or ring, and soccer kicks in RYUJIN.
- **Between rounds:** your corner gives advice based on how the round went. Three judges score every round.
- **AI opponents** fight to their style (striker, kickboxer, wrestler, BJJ, brawler, all-rounder) on Easy, Normal or Hard.


### Fighter Career
- Create a fighter: name, country, weight class, fighting style, personality and starting attributes.
- Win three fights on the regional circuit to earn a Contender Showcase. Win that, and TFC, GFL and RYUJIN bid for your contract.
- Take two training sessions a week in five playable drills: Mitt Work, Heavy Bag, Takedown Drill, Scramble Drill and Sprint Intervals. Sparring trains everything at a higher injury risk.
- In fight camp, study film to scout your opponent, promote the fight to build hype, and manage fatigue and injuries.
- On fight night, fight it yourself or pick a gameplan and simulate it round by round. Call out rivals, chase belts, negotiate contracts, and retire with a legacy score.

### Quick Fight
- Pick your style and an opponent, choose the arena, rounds and difficulty, and fight.

### Matchmaker
- Run one of three promotions while the other two run as AI rivals:
  - **TFC (Titan Fighting Championship)**: cage, rankings decide title shots, TV or pay-per-view events.
  - **GFL (Global Fight League)**: season points, a championship card for the top four, and a $1M prize for each champion.
  - **RYUJIN Fighting Championships**: ring, 10-minute first rounds, soccer kicks, open-weight fights.
- Book 4 to 12 bouts per card. Fighters can turn fights down, get injured, miss weight or call each other out.
- Manage purses, venues, contracts, free agency and owner directives. If owner approval hits zero, you're fired.
- Tap **Go live** on any bout on fight night to watch it play out, or take control of either fighter.

Both modes share a **News** tab with headlines, media grades and fan reactions to every result.

## Fight controls

| Touch | Keyboard | Standing | Clinch | Ground (top / bottom) |
|---|---|---|---|---|
| Stick | WASD / arrows | Move anywhere in the cage (double-tap away to dodge, toward to dash in, up or down to slip sideways) | | Hold to stand up / — |
| Block | Space | Guard up, check kicks, tap to sprawl, time it to parry | Break | Posture / Defend |
| Jab | J | Jab | Short punches | Punch / Strike |
| Power | K | Cross, hook, uppercut up close (hold: overhand; back: body hook; forward + hold: superman) | Knee | Elbow / Submit (guard) |
| Kick | L | Leg kick (hold: head kick; forward: body kick; back: teep; forward + hold: spinning back kick) | Trip | Submit / Get up (wall-walk from side) |
| Shoot | I | Takedown (up close: clinch; as a kick comes in: catch it; after a sprawl: go behind) | Body lock | Advance / Sweep or escape |

Scrambles and submissions are tap battles: tap any button as fast as you can. Press P or the pause button for help mid-fight.

## Play it

### Locally
Open `index.html` in a browser. To test the install and offline features, serve the folder over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### On GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

On a phone, open that link and use **Add to Home Screen** to install it like an app.

## Project structure

```
index.html             Page shell, meta tags, font and file links
css/styles.css         All styles (dark broadcast theme, mobile-first layout)
js/fight.js            Live fight engine: striking, grappling, AI, judging
js/fightview.js        Fight screen: pixel-art renderer, controls, HUD, sound
js/game.js             Game code: careers, matchmaking, simulation, menus
manifest.webmanifest   Home-screen install settings
sw.js                  Service worker for offline play
icons/                 App and browser icons
.nojekyll              Tells GitHub Pages to serve files as-is
```

## Development notes

- **Plain JavaScript.** No framework, no dependencies, no bundler. Edit the files and refresh.
- **Saves** live in the browser's `localStorage` under the key `championship-rounds.save.v1`. Clearing site data erases the save.
- **Releasing an update:** change `VERSION` at the top of `sw.js` (for example `cr-v1` to `cr-v2`). Otherwise players with the installed app may keep an older cached copy until their next online visit.
- **Fonts** (Big Shoulders Display, Barlow and Barlow Condensed) load from Google Fonts and are cached for offline play after the first visit.
- **Names:** all promotions, fighters and media outlets are fictional.

## Roadmap ideas

- A full GFL playoff bracket in career mode
- Multiple control schemes and a training mode for the fight controls
- Wrapping the game with Capacitor for the App Store and Google Play

## License

Copyright © 2026 SpecMagic Games. All rights reserved. See [LICENSE](LICENSE).
