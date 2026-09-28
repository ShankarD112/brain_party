# Contributing

Brain Party is a browser-first Vite/Three.js project. Small, reviewable pull requests are preferred.

## Development workflow

1. Branch from `main`.
2. Make the smallest coherent change.
3. Run:
   ```sh
   npm ci
   npm test
   npm run build
   npx playwright install chromium
   npm run test:browser
   ```
4. Open a pull request back to `main`.
5. Merge only after CI passes.

The production Vercel project should track `main`. Feature branches may receive preview deployments, but they should not be treated as the long-term production branch.

## Atlas and generated assets

The application code is MIT licensed. Allen Institute atlas data and derived atlas assets remain subject to their own terms and citation requirements. See `THIRD_PARTY_NOTICES.txt` and `docs/ATLAS.md`.

Do not replace or regenerate atlas assets without preserving provenance, source URLs/checksums, and applicable notices.

## Release hygiene

Before a release or production merge:

- confirm unit/data tests pass;
- confirm the production Vite build succeeds;
- confirm Chromium browser tests pass;
- verify the Vercel preview/production deployment loads the Easy, Medium, and Hard assets;
- update `VALIDATION.md` when validation coverage or known limitations materially change.
