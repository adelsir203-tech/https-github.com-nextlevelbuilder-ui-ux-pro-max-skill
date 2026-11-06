# future company

A single-file Russian site for a country-house builder. Open `index.html` by double-click; it makes no network requests. The page has five rooms, all in one file, with a circular wipe between them:

- **главная**: the spider hero on sand. A spider follows the cursor-fly and spins silk between the wordmark and five 3D buildings.
- **дом**: a barnhouse in fog with an Утро / Вечер toggle. The house sinks into a WebGL2 fog, swaps time of day while hidden, and floats back up.
- **проекты**: six house projects on a receding street, with a rail of cards. Drag, scroll or use the arrow keys.
- **участки**: six plots (house, banya, gazebo) on a 3D ring, with option pickers and a 10% bundle price.
- **вопросы**: build stages, a price comparison table, guarantees, FAQ and a call to action.

## Files

- `index.html`: the built page. Fonts, images, CSS and JS are all inlined.
- `src/index.html`, `src/style.css`, `src/js/*.js`: the sources. The scripts are joined in name order into one IIFE. `00-constants.js` holds every number, table and string (products, prices, plots, copy).
- `assets/`: Onest (latin, cyrillic and a ₽ subset; SIL OFL, see `OFL-onest.txt`) and the WebP renders.
- `tools/studio/scene.js`: the 3D models (three.js, used only at build time): six houses, a banya, a gazebo, the hero lawn scene in morning and evening light (wide and tall framings), the spider, its idle face and the fly.
- `tools/make-assets.mjs`: renders the models in headless Chromium and writes the WebP files. It prints the porch light position for `HOUSE` in `00-constants.js`.
- `tools/build.mjs`: inlines everything into `index.html`.

## Build

```sh
(cd future/tools && npm install)    # three.js, for rendering only
node future/tools/make-assets.mjs   # only when the models change
node future/tools/build.mjs
```

## Before publishing

The business details are placeholders and must be checked against the real company: prices (`PRODUCTS` and the table in the вопросы room), the 120-day term, the guarantees, the 150 km radius and the FAQ answers. There are no contact details yet; the call to action opens the local подборка, which the visitor can copy and send.
