# Validation

Current update: local `npm test` passes **23** unit/data checks and `npm run build` passes. Eleven Chromium scenarios have been prepared for the revised home, themes, camera views, slice hover labels and auto-complete. GitHub Actions browser verification is pending for this commit.

Browser scenarios cover lazy loading, tutorial, keyboard and real pointer dragging, save/resume, pause/shuffle, completion of all 15/324/671-region levels, movement after celebration, failed-download retry, mobile controls, linked slices, multi-region X-ray highlighting, theme persistence, animated difficulty previews, repeated menu/resume transitions, and cancelling/confirming difficulty changes through the in-page restart dialog.

Unit/data checks cover atlas delivery, contact graphs, joining and moving arbitrary clusters, save migration, bounded movement and drift, mesh cross-sections, dorsal-side spin transforms, the delayed hat/blower and two jumps, and a ceiling that preserves reachability of anatomical assembly.

Earlier large-atlas browser runs completed their interaction assertions but exceeded the 90-second test budget during screenshot capture on the software GPU. Those two tests now allow 180 seconds; all assertions remain. Physical-device GPU performance remains unverified. Local Chromium could not launch in the current workspace, so final browser verification used GitHub Actions.

The 2D reference intersects simplified puzzle meshes at canonical atlas coordinates. It is not raw 25 µm imaging or a measurement tool. The homepage renders reduced atlas geometry in a live turntable for three difficulties, with Ocean and Beige palettes. Reduced-motion preferences stop rotation; a PNG poster is the graphics fallback.

The workflow stores production output and browser screenshots as private artifacts. Hosting uses the separately managed private Site identified by `.openai/hosting.json`; publication status is checked separately from CI.
