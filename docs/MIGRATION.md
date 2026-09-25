# Recovery and browser migration

The repository initially contained only a direction/status README. The attached Allen Brain Jigsaw ZIP has readable version 1.0 source. Windows 1.2 contains a bundled, minified application, not its original source modules.

The 1.2 application's puzzle, physics, UI, CSS, and markup were recovered from its local bundled files. Three.js/OrbitControls bundle code was replaced with the pinned package imports. Application identifiers were expanded to descriptive names and code was formatted. The original pure puzzle implementation was retained from the source ZIP; physics was recovered into `src/physics.js`. This is recovered source, not a claim to possess the original unpublished 1.2 source tree.

The Windows meshes total about 182 MB uncompressed. For browser delivery this branch uses the smaller source-ZIP meshes (about 28.5 MB uncompressed, about 14.5 MB gzip across all levels). No labels or graph edges are intentionally removed. The original data-integrity tests validate full voxel coverage, geometry offsets/index ranges, and complete assembly for each graph. Geometry is still an approximation; the original manifest and source hashes are retained.

New browser work includes branding, selected-level compressed fetching, a lightweight menu thumbnail rendered from the real atlas, retry UI, validated local saves, onboarding, mobile panel controls, static hosting configuration, and CI browser checks. The desktop shell and standalone offline packager are excluded from the web project.

Remaining work before production signoff: inspect the CI browser screenshots, check real touch-device performance, choose a hosting account/audience, and connect/deploy the private repository. Multiplayer is a separate future feature, not part of this migration.
