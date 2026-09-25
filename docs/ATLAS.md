# Atlas provenance


Source: **Allen Mouse Brain Common Coordinate Framework v3 (CCFv3), 2017 annotation, 25 µm isotropic voxels**. The source grid is 528 × 320 × 456. Original source axes are anterior→posterior, superior→inferior, left→right. Render coordinates in millimetres are X=LR, Y=−DV, Z=−AP, centered on the source grid.

The preprocessing script reads the original volume without downsampling. It retains every nonzero labeled voxel. Easy and medium aggregate labels through Allen's adult mouse structure graph. Each voxel belongs to exactly one puzzle piece per difficulty. Bilateral or disconnected parts of one label remain one piece.

Meshes use marching cubes at original voxel spacing and are subsequently decimated for interactive rendering. **Rendering meshes are approximations, not 25 µm-accurate measurement surfaces.** No tiny region is discarded. Contacts come from face-sharing voxels at the full 25 µm resolution before mesh simplification. Snapping uses this contact graph and shared atlas coordinates, not approximate mesh collision boxes. No neuronal connectivity is implied by physical adjacency.

The source download URLs, SHA-256 checksums, mesh statistics, and processing notes are recorded in `public/data/manifest.json`. Allen's structure IDs, names, colors, hierarchy paths, voxel counts, and contact edges are stored in each level's JSON file. Binary geometry consists of contiguous little-endian float32 vertices and uint32 triangle indices, with offsets documented in the matching JSON.

Sources:

- [AllenSDK reference-space documentation](https://allensdk.readthedocs.io/en/latest/_static/examples/nb/reference_space.html)
- [Allen CCFv3 25 µm annotation](https://download.alleninstitute.org/informatics-archive/current-release/mouse_ccf/annotation/ccf_2017/annotation_25.nrrd)
- [Allen adult mouse structure graph](https://api.brain-map.org/api/v2/structure_graph_download/1.json)
- Wang Q, et al. *The Allen Mouse Brain Common Coordinate Framework: A 3D Reference Atlas.* Cell 181, 936–953.e20 (2020). [DOI:10.1016/j.cell.2020.04.007](https://doi.org/10.1016/j.cell.2020.04.007)

Atlas data and derived assets remain subject to Allen Institute's applicable terms and citation requirements. See [Allen terms of use](https://alleninstitute.org/terms-of-use/) and [citation policy](https://alleninstitute.org/citation-policy/). This game is an independent educational project, not an Allen Institute product.

