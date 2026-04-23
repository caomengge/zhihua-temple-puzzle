# 夢遊智化寺 · Dream Journey to Zhihua Temple

A bilingual (Chinese / English) browser-based mini puzzle game built for the Zhihua Temple exhibition. Players explore four spaces — a carved stele, a coffered ceiling, Wanfo Pavilion, and a buddha niche — solving a drag-and-drop puzzle in each room and unlocking a poem tied to the space's history.

**Play:** [https://caomengge.github.io/zhihua-temple-puzzle/](https://caomengge.github.io/zhihua-temple-puzzle/)

---

## Puzzles

| # | Space | Mechanic |
|---|-------|----------|
| 1 | Carved Stele 石碑 | Rotate six stone tile fragments to match the correct orientation |
| 2 | Coffered Ceiling 藻井 | Drag the missing ceiling fragment into its gap in the overhead view |
| 3 | Wanfo Pavilion 萬佛閣 | Drag the miniature ceiling profile into the interior ceiling slot |
| 4 | Buddha Niche 佛龕 | Drag the small buddha figurine into its niche |

Each solved puzzle rewards a short poem and a portrait of a historical figure connected to the object.

---

## Running locally

No build step required. Open `index.html` directly in any modern browser, or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Project structure

```
index.html
css/
  main.css          — layout, fonts, poem overlay, end screen
  puzzles.css       — puzzle-specific styles
js/
  i18n.js           — EN / ZH string table
  state.js          — global game state
  screens.js        — screen navigation, progress dots
  puzzles/
    stele.js        — puzzle 1: tile rotation
    ceiling.js      — puzzle 2: ceiling fragment
    pavilion.js     — puzzle 3: pavilion ceiling
    niche.js        — puzzle 4: buddha niche + end screen
  ui/
    overlay.js      — poem overlay
    inventory.js    — inventory bar, fly-in animation
    toggle.js       — language & mute toggles
  main.js           — entry point
content/
  poems.json        — poem content for all four figures
fonts/
  GenWanMinJP-*     — Chinese serif typeface (明朝体)
  SourceSansVariable-* — English sans-serif typeface
Asset/              — all game artwork (PNG)
audio/              — sound effects (WAV)
```

---

## Sound effects

| File | Trigger |
|------|---------|
| `stone_click.wav` | Stele tile rotates (puzzle 1) |
| `ceiling_flip.wav` | Ceiling view toggles (puzzle 2) |
| `wall_down.wav` | Building view toggles (puzzle 3) |
| `walk.wav` | Niche view toggles (puzzle 4) |
| `push_in.wav` | Object snaps into gap (puzzles 2, 3, 4) |
| `OBJPack-cardboard_drop_on_th-Elevenlabs.wav` | Item obtained |
| `brush_writing.wav` | Poem overlay opens |
| `slide.wav` | Navigation arrow clicked |
| `bell.wav` | End screen appears |

---

## Fonts

- **GenWanMinJP** (明朝体) — Chinese text, weights 300–600
- **Source Sans Variable** — English text, variable weight 100–900

Both fonts are served locally from the `fonts/` directory.

---

## Credits

Built for the Zhihua Temple research project. Historical figures featured: Shen Tingfang 沈廷芳, Wang Zhen 王振, Liu Dunzhen 劉敦楨, Laurence Sickman 史克門.
