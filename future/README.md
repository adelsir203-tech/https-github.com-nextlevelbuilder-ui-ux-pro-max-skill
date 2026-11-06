# future

A single-file site with three rooms: Home (spider and silk), The line (a depth runway) and Kits (a 3D ring carousel). Open `index.html` by double-click. It makes no network requests.

## Files

- `index.html`: the built page. Fonts, images, CSS and JS are all inlined.
- `src/index.html`, `src/style.css`, `src/js/*.js`: the sources. The scripts are joined in name order into one IIFE. `00-constants.js` holds every number, table and string from the brief.
- `assets/`: the embedded font (Bricolage Grotesque, latin, `wght` axis, SIL OFL, see `OFL-bricolage-grotesque.txt`) and the four WebP images.
- `tools/studio/scene.js`: the 3D models (three.js, used only at build time). The eight objects, the spider, its idle face and the fly are modelled from primitives with PBR materials, instanced hairs for fur, and a soft top-left key light.
- `tools/make-assets.mjs`: renders those models in headless Chromium on transparent backgrounds and writes the WebP files.
- `tools/build.mjs`: inlines everything into `index.html`.

## Build

```sh
(cd future/tools && npm install)    # three.js, for rendering only
node future/tools/make-assets.mjs   # only when the models change
node future/tools/build.mjs
```

## Notes

- The images are 3D renders of original models, not photographs. The spider and fly are modelled on the rig points and wing polygon from the brief, so the leg strips, masks, eyelids and IK use the brief's numbers unchanged. The page itself still loads no library.
- The wordmark is 454u instead of 400u. At 400u, Bricolage Grotesque spans 1102u, and the brief asks for 1200u to 1300u.
- Values the brief does not give are grouped under a `Not given in the brief` comment in `00-constants.js`.
- Web shadows render at half resolution (`SILK.shadowRes`) to keep a full 160-thread web within the frame budget.
