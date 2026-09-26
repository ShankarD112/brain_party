# Validation

Validated on 2026-09-26 at application commit `b7046d9673ccdd5b475af30e5656f9f5edef7293`.

- `npm test`: **20 passed**, locally and in GitHub Actions. Covers atlas delivery, seeded scatter, neighbor and tolerance rules, all three real atlas graphs, free cluster movement, save migration, bounded movement, size-dependent drift, mesh cross-sections, and celebration transforms.
- `npm run build`: **passed**, locally and in GitHub Actions.
- Chromium browser checks: **7 passed** in [GitHub Actions run 36261556681](https://github.com/ShankarD112/brain_party/actions/runs/36261556681), and in the independent push-triggered run 36261555543.

Browser scenarios cover menu lazy loading, tutorial, keyboard and actual pointer dragging, save/resume, pause/shuffle, completion of all 15/324/671-region levels, continued movement after the celebration, failed-download retry, mobile controls, arbitrary cluster joining, board bounds, linked 2D selection, plane changes, and selection transparency. Desktop, linked-slice, completion, and mobile screenshots from the passing run were inspected.

Initial browser runs exposed slow software rendering and animation timing. The celebration now advances by wall-clock time, and sustained slow frames lower drawing resolution without changing anatomical geometry or picking coordinates. The drag test settles the selected piece after checking upward drift, so it does not chase a moving target. No browser assertions were removed.

The 2D reference intersects simplified puzzle meshes at canonical atlas coordinates. It is not raw 25 µm imaging or a measurement tool. Physical touch-device and real-device GPU performance remain unverified. Local Chromium could not launch in the current workspace, so the final browser verification used GitHub Actions.

The workflow stores production output and browser screenshots as private artifacts. Hosting uses the separately managed private Site identified by `.openai/hosting.json`; publication status is checked separately from CI.
