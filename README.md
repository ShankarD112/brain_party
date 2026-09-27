# Brain Party

A browser-first 3D anatomical jigsaw puzzle. Open the website, choose a difficulty, and put a real mouse brain back together. No desktop installation or account is needed.

## Current version

This imports the attached Neurospace game into `ShankarD112/brain_party`. Ground-plane dragging, gravity, height assistance, the skippable opening, and connection feedback are recovered from Windows 1.2. The original source package supplies the smaller precomputed meshes, full contact graphs, atlas preprocessing, and rule tests.

- **15 / 324 / 671 regions:** Easy, Medium, and Hard.
- **On-demand loading:** the menu loads a small preview; only the chosen level's geometry is downloaded. Geometry is gzip compressed and decoded in the browser. Easy is approximately 1.5 MB compressed; Medium and Hard approximately 6 MB each.
- **Device-local save/resume:** saves every five seconds after the opening, on pause/menu, and when the page is hidden. Resume restores clusters, offsets, time, seed, selection, and assistance settings. The timer stops while away. One active puzzle is saved per browser/origin; clearing browser data removes it. Storage denial is shown in the UI.
- **Skippable tutorial**, keyboard controls, and an expandable region/control panel on narrow screens.
- **Restartable downloads:** a failed atlas request shows Retry and Back to menu.

This remains a single-player puzzle. Shared rooms, accounts, online leaderboards, and multiplayer are not implemented. The source repository may remain private while the built website is deployed publicly.

The homepage starts with an unsegmented rotating brain and no difficulty selected. Hover or focus Easy/Medium/Hard to preview it, then select a difficulty to enable Start. Resume appears beneath Start for an existing session. Ocean is the default theme; Beige provides a light alternative. Real-time atlas turntables rotate smoothly and stop for reduced-motion preferences. Region palettes use anatomical adjacency to separate neighbouring colours.

## Play

Choose a difficulty and **Start**. Skip the opening if desired.

- Drag a loose region across the ground. Drag empty space to orbit; scroll to zoom.
- **E / Q** lift/lower; arrow keys move across the ground. **Shift** makes finer steps; **F** focuses the selection. Lift/Lower buttons also support press-and-hold.
- Gravity starts on. Turn it off for gentle upward drift; small-volume regions rise faster than larger regions or joined clusters. Holding a piece pauses its drift. Floating pieces stop six atlas units above their floor position. Manual lifting has a shared ceiling above the full atlas, so the height limit never prevents anatomical assembly. The floor and finite board keep pieces within reach.
- With height assist on, a true anatomical neighbor glows gold when close enough horizontally. Release or press Enter to connect. Turn assistance off for manual vertical alignment.
- Search finds regions by name, acronym, or Allen ID. Click successive results to keep multiple regions highlighted in both views; remove individual chips or clear the search highlights. X-ray is off by default. When enabled, highlighted surfaces remain opaque with normal depth rendering; theme-specific transparency keeps surrounding anatomy visible. Placement guides mark the anatomical target.
- Start with any neighboring pair: there is no fixed core. Joined clusters remain movable, even after completion. Shuffle moves only unconnected pieces.
- The completion bar counts connections across all clusters. Finish by joining every region into one anatomical assembly.
- The linked 2D panel shows coronal, sagittal, and horizontal sections in atlas coordinates. Joined regions appear in colour, with faint remaining anatomy for context. Selection is linked across views; use the depth slider or Find selected. Optional transparency reveals a selected region inside its cluster.
- Completion triggers a brief, skippable dorsal-side headspin, then adds a party hat and animated paper blower for two jumps. Reduced-motion preferences skip the spin; the model remains explorable afterwards.

Desktop mouse/keyboard is recommended for the larger levels. Modern WebGL2 and `DecompressionStream` support are required. Touch controls are included; mobile performance still depends on GPU and memory.

## Develop and verify

Node.js 22.12+ or 24:

```sh
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Use Default 3D, XY, YZ and ZX to reset the camera; orbit beneath the brain to inspect ventral anatomy. The floor disappears when viewed from below. Auto-complete joins remaining clusters sequentially, can be stopped, and excludes the run from celebrations and best times. Explore completed brain removes the party props. Slice hover labels show the acronym and name of joined regions, and `???` for loose regions.

The production website is `dist/`. `npm run preview` serves the build locally. Open it through HTTP(S); this web version is not a standalone file to double-click.

The CI workflow runs rule/data tests, the production build, and Chromium browser tests. It uploads the website and browser screenshots as private workflow artifacts. See [VALIDATION.md](VALIDATION.md) for current verification and [docs/MIGRATION.md](docs/MIGRATION.md) for recovery details.

## Hosting

Import this private repository into the chosen static host with access limited to this repository:

- Build command: `npm run build`
- Output directory: `dist`
- Node: 22.12+ or 24
- No server, environment variables, API keys, or database required.

`netlify.toml` and `vercel.json` include those settings. A relative Vite base also supports hosting beneath a subpath. The loader accepts `.bin.gz` both as ordinary files and as HTTP gzip responses: it checks the received bytes before decompression to avoid decoding twice. The host may compress JS/CSS normally.

Choose the website audience separately from repository visibility. A private source repository does not make the deployed website private. `.openai/hosting.json` identifies the separately managed private Sites build; no deployment credentials are included. GitHub changes do not automatically publish to Sites.

## Slice interpretation

Slices are intersections of the same simplified rendering meshes used in the puzzle, not raw 25 µm label voxels, microscopy, MRI, or bregma coordinates. The reference reassembles regions at their canonical atlas coordinates regardless of where clusters sit on the board. The optional 3D plane follows the selected cluster. Internal cavities are retained with even-odd contour filling.

## Atlas and source

Allen Mouse Common Coordinate Framework v3, 2017 annotation, 25 µm source voxels. All three levels retain the original annotation coverage and full-resolution contact graph. Surfaces are simplified rendering meshes, not measurement-accurate 25 µm surfaces. This independent educational project is not an Allen Institute product.

See [atlas provenance](docs/ATLAS.md), `public/data/manifest.json`, and [third-party notices](THIRD_PARTY_NOTICES.txt). All served builds include the notices at `THIRD_PARTY_NOTICES.txt`.

To regenerate atlas assets (requires Python, internet, and several GB of RAM):

```sh
python -m pip install -r requirements.txt
python scripts/build_atlas.py
```

The script emits the compressed binary files consumed by the web app. The optional `scripts/render_preview.py` uses NumPy and Pillow to regenerate the menu preview from Easy's real geometry.

## Layout

- `src/main.js`: rendering, interaction, timing, menu, tutorial, and saving integration.
- `src/puzzle.js`: anatomical groups, contact constraints, and snapping.
- `src/physics.js`: ground plane, gravity, intro, height assistance, and shuffle.
- `src/session.js`: versioned save format and validated reconstruction.
- `src/atlas.js`: selected-level download and decompression.
- `src/sections.js` and `src/slices.js`: mesh-plane intersections and linked 2D reference.
- `src/party.js`: temporary celebration transforms and props.
- `public/data/`: meshes, region metadata, and provenance.
- `tests/`: atlas, rule, session, physics, and browser checks.

The application code is licensed under the [MIT License](LICENSE). Third-party dependencies and Allen atlas assets retain their respective terms and citation requirements; see [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).

The lightweight real-time homepage meshes are regenerated with `python scripts/build_preview_meshes.py` (NumPy required). Static PNG posters remain available as a graphics fallback.

## Just explore and atlas markers

Choose **Just explore** above Difficulty, then Start, to open the assembled 671-region brain without a timer, shuffle, intro or celebration. Existing puzzle saves are preserved. Search the Allen hierarchy by acronym, full name or ID, expand parent branches, and select a parent to highlight all represented descendant labels (including residual parent voxels). Show selected region only isolates that selection in 3D. Hierarchy navigation also updates the 2D reference.

Move over a slice to position its crosshair; click to pin it and use Unpin marker to resume tracking. The marker readout shows **ML, DV, AP in millimetres from the CCF volume origin**, not bregma or stereotaxic coordinates. The transformation is the inverse of the atlas builder: ML = game X + 5.7, DV = 4 − game Y, AP = 6.6 − game Z. The 3D marker follows the selected cluster when the slice plane is enabled. Rendering meshes remain simplified.

Auto-complete now budgets roughly four seconds for all remaining clusters, processes multiple small joins per frame when needed, and updates slices/storage once per frame. Actual wall time depends on rendering performance. Camera presets are grouped at the bottom right.
