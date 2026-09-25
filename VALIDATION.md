# Validation

Validation on 2026-09-25:

- `npm test`: **15 passed** locally and in GitHub Actions. Covers seeded scatter, non-neighbor rejection, tolerance, floating-cluster movement, anchor invariance, all real atlas meshes and complete graphs, save/restore, corrupt saves, storage denial, gravity/height assistance, shuffle preservation, and compressed/already-decoded geometry delivery.
- `npm run build`: **passed**. Produces a static Vite website with relative asset URLs.
- Browser checks: **6 passed** locally in Chromium and in [GitHub Actions run 36158053844](https://github.com/ShankarD112/brain_party/actions/runs/36158053844), testing commit `bf6e525325c8f72647b27d646d1f69afd5f18c6d`.

The original migration failed all browser checks at atlas loading. Vite serves `.gz` with HTTP content encoding, so Fetch decodes the geometry before the application receives it. The loader now checks the received bytes and only decompresses when still needed.

The GitHub Actions workflow runs Playwright on Ubuntu and saves screenshots under the `browser-checks` artifact. Browser scenarios cover menu lazy loading, tutorial, keyboard and actual pointer dragging, refresh/resume, pause/shuffle, completion of each real atlas graph, failed-download retry, and touch-sized controls. Desktop and narrow-screen screenshots were inspected locally. These checks use software-rendered Chromium; physical touch-device and real-device GPU performance remain unverified.

The build artifact is retained before browser tests, including on failing runs. Its existence alone is not evidence that browser validation passed. Hosting uses the private Site identified by `.openai/hosting.json`; publication status must be checked separately from CI.
