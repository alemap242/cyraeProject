# Breathing Building Skin — Bahamian House (WebXR)

A walkable VR house in Nassau: a Mediterranean "time capsule" home with a **conch shell roof** that spirals open in 3 stages, a **diamond-shingle breathing wall** (flat → wave → semi-open), and three passive-cooling interiors (stairwell chimney, garden wall + water trough, folding sea-fan dividers). Built with three.js; runs on desktop browsers and Meta Quest (WebXR).

## Preview locally

Needs [Node.js](https://nodejs.org) 18 or newer (no `npm install` required).

```bash
cd ~/Documents/breathing-building-skin
node dev.mjs
```

Open **http://localhost:5173**. Edit any file in `src/` and the page rebuilds and reloads itself.

No Node? Just double-click `index.html` (it is the already-built page).

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The built page (generated — edit `src/` instead) |
| `src/template.html` | Page shell: HTML, CSS, import map |
| `src/p1_core.js` | Renderer, VR rig, procedural textures & materials, geometry helpers |
| `src/p2_env.js` | Sky, sun, day/dusk/night, weather, ocean, palms, olive tree, rain |
| `src/p3_house.js` | The house: walls, arches, bay window, stairs, garage, terraces, doors |
| `src/p4_systems.js` | Conch roof, diamond wave wall, interior cooling systems, furniture, airflow |
| `src/p5_ui.js` | Labels, X-ray section, exploded view, control panels, desktop + VR controls |
| `build.mjs` | Joins `src/` into `index.html` (`node build.mjs`) |
| `dev.mjs` | Local server with auto-rebuild + live reload |

## Controls

- **Desktop:** drag to look · WASD / arrows to walk (Shift = faster, Q/E turn) · click doors, sea-fan screens and the wooden control panels. Doors also open automatically as you walk up.
- **VR (Quest):** left stick walks · right stick ↑ aims a teleport arc, release to jump · right stick ←/→ snap-turn · trigger presses buttons and opens doors.

## Viewing in a Meta Quest

WebXR only runs on `https://` or `localhost`. Two easy routes:

1. **Publish** — push this repo to GitHub and turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root). Open the Pages URL in the Quest Browser and press **ENTER VR**.
2. **USB (dev)** — with `node dev.mjs` running and the Quest connected by cable with developer mode on: `adb reverse tcp:5173 tcp:5173`, then open `http://localhost:5173` in the Quest Browser.

## Pushing to GitHub

```bash
gh repo create breathing-building-skin --private --source=. --push
# or: create an empty repo on github.com, then
git remote add origin https://github.com/<you>/breathing-building-skin.git
git push -u origin main
```
