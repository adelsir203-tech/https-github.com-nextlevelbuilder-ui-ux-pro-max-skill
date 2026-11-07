# future company

A single-file Russian site for a country-house builder. Open `index.html` by double-click. Everything is inlined except the tower media on the главная room, which streams from the Higgsfield CDN (see below). The page has five rooms, all in one file, with a circular wipe between them:

- **главная**: a glass tower by a misty lake at dawn, with a frosted «Выберите свой этаж» panel. Hovering a floor lights its real windows; Войти flies through the balcony glass into the hall, and the hotspots walk into the kitchen, bath and bedroom and back out.
- **дом**: a barnhouse in fog with an Утро / Вечер toggle. The house sinks into a WebGL2 fog, swaps time of day while hidden, and floats back up.
- **проекты**: six house projects on a receding street, with a rail of cards. Drag, scroll or use the arrow keys.
- **участки**: six plots (house, banya, gazebo) on a 3D ring, with option pickers and a 10% bundle price.
- **вопросы**: build stages, a price comparison table, guarantees, FAQ and a call to action.

## Files

- `index.html`: the built page. Fonts, images, CSS and JS are all inlined.
- `src/index.html`, `src/style.css`, `src/js/*.js`: the sources. The scripts are joined in name order into one IIFE. `00-constants.js` holds every number, table and string (products, prices, plots, copy).
- `assets/`: Onest (latin, cyrillic and a ₽ subset; SIL OFL, see `OFL-onest.txt`) and the WebP renders.
- `tools/studio/scene.js`: the 3D models (three.js, used only at build time): six houses, a banya, a gazebo and the fog-house scene in morning and evening light (wide and tall framings).
- `tools/make-assets.mjs`: renders the models in headless Chromium and writes the WebP files. It prints the porch light position for `HOUSE` in `00-constants.js`.
- `tools/build.mjs`: inlines everything into `index.html`.

## Tower media

The tower room uses the original media from the brief: the scene plate and its lit twin (CSS, through `images.higgs.ai` at w=2400), the scene loop, the fly and in clips, four stills and six walk clips (`TOWER.media` in `00-constants.js`, under `d8j0ntlcm91z4.cloudfront.net`). Clips are fetched whole into blob URLs, at most two at a time: fly and in once the page is idle, the room clips after Войти. The page needs a network connection for this room, and those files belong to the CDN account that uploaded them.

## Build

```sh
(cd future/tools && npm install)    # three.js, for rendering only
node future/tools/make-assets.mjs   # only when the models change
node future/tools/build.mjs
```

## Before publishing

The business details are placeholders and must be checked against the real company: prices (`PRODUCTS` and the table in the вопросы room), the 120-day term, the guarantees, the 150 km radius and the FAQ answers. There are no contact details yet; the call to action opens the local подборка, which the visitor can copy and send.
