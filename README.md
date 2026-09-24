# Brain Part(s)y

A browser-first 3D anatomical jigsaw puzzle. Open the website, choose a difficulty, and put a real mouse brain back together. No desktop installation or account is needed.

## Current version

This imports the attached Neurospace game into `ShankarD112/brain_party`. Ground-plane dragging, gravity, height assistance, the skippable opening, and connection feedback are recovered from Windows 1.2. The original source package supplies the smaller precomputed meshes, full contact graphs, atlas preprocessing, and rule tests.

- **15 / 324 / 671 regions:** Easy (Shallows), Medium (Open water), and Hard (The deep).
- **On-demand loading:** the menu loads a small preview; only the chosen level's geometry is downloaded. Geometry is gzip compressed and decoded in the browser. Easy is approximately 1.5 MB compressed; Medium and Hard approximately 6 MB each.
- **Device-local save/resume:** saves every five seconds after the opening, on pause/menu, and when the page is hidden. Resume restores clusters, offsets, time, seed, selection, and assistance settings. The timer stops while away. One active puzzle is saved per browser/origin; clearing browser data removes it. Storage denial is shown in the UI.
- **Skippable tutorial**, keyboard controls, and an expandable region/control panel on narrow screens.
- **Restartable downloads:** a failed atlas request shows Retry and Back to menu.

This remains a single-player puzzle. Shared rooms, accounts, online leaderboards, and multiplayer are not implemented. The repository remains private; this branch does not publish a live website automatically.

## Play

Choose a difficulty and **Begin voyage**. Skip the opening if desired.

- Drag a loose region across the ground. Drag empty space to orbit; scroll to zoom.
- **E / Q** lift/lower; arrow keys move across the ground. **Shift** makes finer steps; **F** focuses the selection. Lift/Lower buttons also support press-and-hold.
- Gravity starts on. Turn it off to leave raised pieces suspended. The floor remains solid.
- With height assist on, a true anatomical neighbor glows gold when close enough horizontally. Release or press Enter to connect. Turn assistance off for manual vertical alignment.
- Search finds regions by name, acronym, or Allen ID. Placement guides mark the anatomical target.
- Shuffle moves only unconnected pieces. Joined clusters and the anchored reference stay unchanged.
- The completion bar counts connections, including floating clusters. Finish by connecting every region to the reference assembly.

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

The production website is `dist/`. `npm run preview` serves the build locally. Open it through HTTP(S); this web version is not a standalone file to double-click.

The CI workflow runs rule/data tests, the production build, and Chromium browser tests. It uploads the website and browser screenshots as private workflow artifacts. See [VALIDATION.md](VALIDATION.md) for current verification and [docs/MIGRATION.md](docs/MIGRATION.md) for recovery details.

## Hosting

Import this private repository into the chosen static host with access limited to this repository:

- Build command: `npm run build`
- Output directory: `dist`
- Node: 22.12+ or 24
- No server, environment variables, API keys, or database required.

`netlify.toml` and `vercel.json` include those settings. A relative Vite base also supports hosting beneath a subpath. Serve `.bin.gz` as ordinary binary files: do **not** add a `Content-Encoding: gzip` header to these files, since the app explicitly decompresses them. The host may compress JS/CSS normally.

Choose the website audience separately from repository visibility. A private source repository does not make the deployed website private. No deployment credentials are included and no live deployment is configured here.

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
- `public/data/`: meshes, region metadata, and provenance.
- `tests/`: atlas, rule, session, physics, and browser checks.

No public distribution license is assigned to the application code. Third-party dependency and atlas terms remain applicable.
