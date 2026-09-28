# Current exploration update

27 unit/data tests, the production build, the exploration browser scenarios, and the broader browser regression suite pass on `main` at `067ce79867682dd215130dfdd3f6349b39d80b55` in [GitHub Actions run 36358367946](https://github.com/ShankarD112/brain_party/actions/runs/36358367946). Exploration coverage includes saved-puzzle preservation and resumption, parent acronym search, isolation, hierarchy navigation, crosshair coordinates, pinning, and plane changes.

# Validation

Validated on 2026-09-27: **23 unit/data checks**, the production build, and **11 Chromium browser scenarios** pass at `227038830c64401709371d561a56bcbf41c62273` in [GitHub Actions run 36297429518](https://github.com/ShankarD112/brain_party/actions/runs/36297429518). The final follow-up separates the auto-complete control from the slice panel, adds a party-prop screenshot, stops rendering the hidden game behind the opaque homepage, matches preview surface rendering to the game, and enlarges the turntable framing. These small follow-ups were code-reviewed and rebuilt.

Browser scenarios cover lazy loading, tutorial, keyboard and real pointer dragging, save/resume, pause/shuffle, completion of all 15/324/671-region levels, movement after celebration, failed-download retry, mobile controls, linked slices, multi-region X-ray highlighting, theme persistence, animated difficulty previews, repeated menu/resume transitions, cancelling/confirming difficulty changes through the in-page restart dialog, auto-completion without celebration, camera presets and unrestricted polar orbit, Beige opacity/depth settings, and connected/unknown slice hover labels.

Unit/data checks cover atlas delivery, contact graphs, joining and moving arbitrary clusters, save migration, bounded movement and drift, mesh cross-sections, dorsal-side spin transforms, the delayed hat/blower and two jumps, and a ceiling that preserves reachability of anatomical assembly.

Earlier large-atlas browser runs completed their interaction assertions but exceeded the 90-second test budget during screenshot capture on the software GPU. Those two tests now allow 180 seconds; all assertions remain. Physical-device GPU performance remains unverified. Local Chromium could not launch in the current workspace, so final browser verification used GitHub Actions.

The 2D reference intersects simplified puzzle meshes at canonical atlas coordinates. It is not raw 25 µm imaging or a measurement tool. The homepage renders reduced atlas geometry in a live turntable for three difficulties, with Ocean and Beige palettes. Reduced-motion preferences stop rotation; a PNG poster is the graphics fallback.

The workflow stores production output and browser screenshots as private artifacts. Production hosting is managed separately through Vercel Git integration; CI success and deployment status should both be checked before treating a release as production-ready.
