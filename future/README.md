# future

A single-file site with three rooms: Home (spider and silk), The line (a depth runway) and Kits (a 3D ring carousel). Open `index.html` by double-click. It makes no network requests.

## Files

- `index.html`: the built page. Fonts, images, CSS and JS are all inlined.
- `src/index.html`, `src/style.css`, `src/js/*.js`: the sources. The scripts are joined in name order into one IIFE. `00-constants.js` holds every number, table and string from the brief.
- `assets/`: the embedded font (Bricolage Grotesque, latin, `wght` axis, SIL OFL, see `OFL-bricolage-grotesque.txt`) and the four WebP images.
- `tools/make-assets.mjs`: draws the objects sheet, spider, idle head and fly as SVG, then renders them to transparent WebP in Chromium.
- `tools/build.mjs`: inlines everything into `index.html`.

## Build

```sh
node future/tools/make-assets.mjs   # only when the drawings change
node future/tools/build.mjs
```

## Notes

- The images are drawn illustrations, not photographs. The spider is drawn on the rig points from the brief, so the leg strips, masks and IK use the brief's numbers unchanged.
- The wordmark is 454u instead of 400u. At 400u, Bricolage Grotesque spans 1102u, and the brief asks for 1200u to 1300u.
- Values the brief does not give are grouped under a `Not given in the brief` comment in `00-constants.js`.
- Web shadows render at half resolution (`SILK.shadowRes`) to keep a full 160-thread web within the frame budget.
