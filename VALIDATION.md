# Validation

Local validation on 2026-09-24:

- `npm test`: **13 passed**. Covers seeded scatter, non-neighbor rejection, tolerance, floating-cluster movement, anchor invariance, all real atlas meshes and complete graphs, save/restore, corrupt saves, storage denial, gravity/height assistance, and shuffle preservation.
- `npm run build`: **passed**. Produces a static Vite website with relative asset URLs.
- Browser checks: **not run successfully in the local workspace**. Chromium is blocked by the workspace's socket restrictions before game execution; the connected cloud browser cannot access the local development server. This is not a passing visual or interaction check.

The GitHub Actions workflow runs Playwright on Ubuntu and saves screenshots under the `browser-checks` artifact. Browser scenarios cover menu lazy loading, tutorial, keyboard and actual pointer dragging, refresh/resume, pause/shuffle, completion of each real atlas graph, failed-download retry, and touch-sized controls. Consult the workflow result for the current branch before production deployment.

No live website has been deployed by this branch. Production hosting and real-device GPU performance remain to be verified.
