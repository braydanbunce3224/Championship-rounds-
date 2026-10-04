# Championship Rounds

An MMA simulation game for mobile from **SpecMagic Games**. Build a fighter from the regional circuit to a world title, or run a fight promotion as its matchmaker.

The whole game runs in the browser with no build step and no server. It installs to a phone home screen and plays offline.

## Game modes

### Fighter Career
- Create a fighter: name, country, weight class, fighting style, personality and starting attributes.
- Win three fights on the regional circuit to earn a Contender Showcase. Win that, and TFC, GFL and RYUJIN bid for your contract.
- Take two training sessions a week in five playable drills: Mitt Work, Heavy Bag, Takedown Drill, Scramble Drill and Sprint Intervals. Sparring trains everything at a higher injury risk.
- In fight camp, study film to scout your opponent, promote the fight to build hype, and manage fatigue and injuries.
- On fight night, pick a gameplan and watch the fight play out round by round. Call out rivals, chase belts, negotiate contracts, and retire with a legacy score.

### Matchmaker
- Run one of three promotions while the other two run as AI rivals:
  - **TFC (Titan Fighting Championship)**: cage, rankings decide title shots, TV or pay-per-view events.
  - **GFL (Global Fight League)**: season points, a championship card for the top four, and a $1M prize for each champion.
  - **RYUJIN Fighting Championships**: ring, 10-minute first rounds, soccer kicks, open-weight fights.
- Book 4 to 12 bouts per card. Fighters can turn fights down, get injured, miss weight or call each other out.
- Manage purses, venues, contracts, free agency and owner directives. If owner approval hits zero, you're fired.

Both modes share a **News** tab with headlines, media grades and fan reactions to every result.

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
js/game.js             Game code: simulation, both modes, UI, input
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

- Corner advice between rounds during career fights
- A full GFL playoff bracket in career mode
- Animated fighters on fight night
- Wrapping the game with Capacitor for the App Store and Google Play

## License

Copyright © 2026 SpecMagic Games. All rights reserved. See [LICENSE](LICENSE).
