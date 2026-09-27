# Validation

Validated on 2026-09-27 at application commit `bfd6e3528d388e99c7e4ac76b9ab2e805ef755da`. The final follow-up changes the display name to Brain Party and updates documentation and the matching title assertion.

- `npm test`: **22 passed**, locally and in GitHub Actions.
- `npm run build`: **passed**.
- Chromium browser checks: **9 passed** in [GitHub Actions run 36281587241](https://github.com/ShankarD112/brain_party/actions/runs/36281587241), also passing in the independent push-triggered run 36281584820.

Browser scenarios cover lazy loading, tutorial, keyboard and real pointer dragging, save/resume, pause/shuffle, completion of all 15/324/671-region levels, movement after celebration, failed-download retry, mobile controls, linked slices, multi-region X-ray highlighting, theme persistence, animated difficulty previews, repeated menu/resume transitions, and cancelling/confirming difficulty changes through the in-page restart dialog.

Unit/data checks cover atlas delivery, contact graphs, joining and moving arbitrary clusters, save migration, bounded movement and drift, mesh cross-sections, dorsal-side spin transforms, the delayed hat/blower and two jumps, and a ceiling that preserves reachability of anatomical assembly.

Earlier large-atlas browser runs completed their interaction assertions but exceeded the 90-second test budget during screenshot capture on the software GPU. Those two tests now allow 180 seconds; all assertions remain. Physical-device GPU performance remains unverified. Local Chromium could not launch in the current workspace, so final browser verification used GitHub Actions.

The 2D reference intersects simplified puzzle meshes at canonical atlas coordinates. It is not raw 25 µm imaging or a measurement tool. The nine animated previews are rendered from the shipped atlas for three difficulties and three themes; each has a static reduced-motion poster.

The workflow stores production output and browser screenshots as private artifacts. Hosting uses the separately managed private Site identified by `.openai/hosting.json`; publication status is checked separately from CI.
